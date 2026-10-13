const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const vm = require('node:vm');

function fixture() {
  const records = new Map(), secrets = new Map();
  let failWrites = false, authenticate = true;
  const storage = {
    getItem: async name => records.get(name) ?? null,
    setItem: async (name, value) => { if (failWrites) throw new Error('disk full'); records.set(name, value); },
    removeItem: async name => records.delete(name),
    multiRemove: async names => names.forEach(name => records.delete(name)),
    getAllKeys: async () => [...records.keys()],
  };
  // Test adapter uses actual AES-GCM, not the native keystore or biometric hardware.
  const modules = {
    '@react-native-async-storage/async-storage': { default: storage },
    'expo-secure-store': { isAvailableAsync: async () => true, canUseBiometricAuthentication: () => true,
      getItemAsync: async name => secrets.get(name), setItemAsync: async (name, value) => secrets.set(name, value) },
    'expo-local-authentication': { authenticateAsync: async () => ({ success: authenticate }) },
    'expo-crypto': {
      randomUUID: crypto.randomUUID,
      AESEncryptionKey: { generate: async () => makeKey(crypto.randomBytes(32)), import: async value => makeKey(Buffer.from(value, 'hex')) },
      AESSealedData: { fromCombined: value => Buffer.from(value, 'base64') },
      aesEncryptAsync: async (value, key, options) => {
        const iv = crypto.randomBytes(12), cipher = crypto.createCipheriv('aes-256-gcm', key.bytes, iv);
        cipher.setAAD(Buffer.from(options.additionalData, 'base64'));
        const data = Buffer.concat([cipher.update(Buffer.from(value, 'base64')), cipher.final()]);
        return { combined: async () => Buffer.concat([iv, cipher.getAuthTag(), data]).toString('base64') };
      },
      aesDecryptAsync: async (value, key, options) => {
        const cipher = crypto.createDecipheriv('aes-256-gcm', key.bytes, value.subarray(0, 12));
        cipher.setAAD(Buffer.from(options.additionalData, 'base64')); cipher.setAuthTag(value.subarray(12, 28));
        return Buffer.concat([cipher.update(value.subarray(28)), cipher.final()]).toString('base64');
      },
    },
  };
  function makeKey(bytes) { return { bytes, encoded: async () => bytes.toString('hex'), release: () => bytes.fill(0) }; }
  function instance() {
    const context = { module: { exports: {} }, require: name => modules[name], btoa, atob, encodeURIComponent, decodeURIComponent, escape, unescape };
    vm.runInNewContext(fs.readFileSync('DueFlux_app_mobile/expo/protectedStorage.js', 'utf8'), context);
    return context.module.exports;
  }
  return { instance, records, secrets, fail: value => { failWrites = value; }, authenticate: value => { authenticate = value; } };
}

test('mobile encryption chunks large records and survives restart without plaintext', async () => {
  const f = fixture(), vault = f.instance(); await vault.open('Unlock');
  const value = 'Private invoice '.repeat(150000);
  await vault.setItem('cache_alice', value);
  assert.equal(await vault.getItem('cache_alice'), value);
  assert([...f.records.values()].every(row => row.length < 150000 && !row.includes('Private invoice')));
  vault.lock(); const restarted = f.instance(); await restarted.open('Unlock');
  assert.equal(await restarted.getItem('cache_alice'), value);
});
test('failed writes preserve the prior record and legacy migration input', async () => {
  const f = fixture(), vault = f.instance(); await vault.open('Unlock');
  await vault.setItem('queue', 'previous'); f.fail(true);
  await assert.rejects(vault.setItem('queue', 'new'));
  assert.equal(await vault.getItem('queue'), 'previous');
  f.records.set('legacy', 'unacknowledged changes');
  await assert.rejects(vault.getItem('legacy'));
  assert.equal(f.records.get('legacy'), 'unacknowledged changes');
});
test('lost keys, cancelled unlock and ciphertext record swapping fail closed', async () => {
  const f = fixture(), vault = f.instance(); await vault.open('Unlock');
  await vault.setItem('alice', 'private'); await vault.setItem('bob', 'other');
  f.records.set('df_protected_v1_bob', f.records.get('df_protected_v1_alice'));
  const alice = JSON.parse(f.records.get('df_protected_v1_alice'));
  for (let i = 0; i < alice.count; i++) f.records.set(`df_protected_v1_bob_${alice.token}_${i}`, f.records.get(`df_protected_v1_alice_${alice.token}_${i}`));
  await assert.rejects(vault.getItem('bob'));
  vault.lock(); f.authenticate(false); await assert.rejects(f.instance().open('Unlock'), /cancelled/);
  f.authenticate(true); f.secrets.clear(); await assert.rejects(f.instance().open('Unlock'), /key unavailable/);
  assert(f.records.size > 0);
});
test('migration collisions preserve both copies; auth persistence waits for unlocking', async () => {
  const f = fixture(), vault = f.instance(); let read = false;
  const pending = vault.authStorage.getItem('auth').then(value => { read = true; return value; });
  await Promise.resolve(); assert.equal(read, false);
  f.records.set('auth', 'token'); await vault.open('Unlock');
  assert.equal(await pending, 'token'); assert.equal(f.records.has('auth'), false);
  f.records.set('auth', 'newer-token'); await assert.rejects(vault.getItem('auth'), /Migration conflict/);
  assert.equal(f.records.get('auth'), 'newer-token');
});
test('unlock migrates sensitive legacy caches for all known accounts before revealing the app', async () => {
  const f = fixture(), vault = f.instance();
  f.records.set('df_mobile_cache_previous_user', 'private invoices');
  f.records.set('df_mobile_queue_previous_user', 'pending edits');
  await vault.open('Unlock');
  assert.equal(f.records.has('df_mobile_cache_previous_user'), false);
  assert.equal(f.records.has('df_mobile_queue_previous_user'), false);
  assert.equal(await vault.getItem('df_mobile_queue_previous_user'), 'pending edits');
});
test('desktop migration verifies durability and preserves conflicting legacy copies', async () => {
  const records = { df_offline_queue_alice: 'encrypted-version' };
  const legacy = { df_offline_queue_alice: 'different-legacy-version' };
  const localStorage = { ...legacy, getItem: name => legacy[name] ?? null, removeItem: name => { delete legacy[name]; } };
  let locked = true;
  const window = { DueFluxVault: { unlock: async () => ({ ...records }), lock: async () => { locked = true; },
    put: async (name, value) => { records[name] = value; }, get: async name => records[name], onLock: () => {} } };
  vm.runInNewContext(fs.readFileSync('DueFlux_app_desktop/Windows/renderer/protected-storage.js', 'utf8'), { window, localStorage });
  await assert.rejects(window.DueFluxLocalStore.open('password'), /Migration conflict/);
  assert.equal(records.df_offline_queue_alice, 'encrypted-version');
  assert.equal(legacy.df_offline_queue_alice, 'different-legacy-version');
  assert(locked && window.DueFluxLocalStore.isLocked());
  delete records.df_offline_queue_alice;
  window.DueFluxVault.put = async () => { throw new Error('disk full'); };
  await assert.rejects(window.DueFluxLocalStore.open('password'), /disk full/);
  assert.equal(legacy.df_offline_queue_alice, 'different-legacy-version');
});
