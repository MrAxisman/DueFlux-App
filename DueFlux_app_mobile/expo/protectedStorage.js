const AsyncStorage = require('@react-native-async-storage/async-storage').default;
const SecureStore = require('expo-secure-store');
const Crypto = require('expo-crypto');
const LocalAuthentication = require('expo-local-authentication');

const KEY_NAME = 'dueflux.device.encryption.v1';
const PREFIX = 'df_protected_v1_';
let key = null;
let opening = null;
let generation = 0;
const listeners = new Set();
const waiters = new Set();
const writes = new Map();
const encode = value => btoa(unescape(encodeURIComponent(value)));
const decode = value => decodeURIComponent(escape(atob(value)));
const notify = () => listeners.forEach(listener => listener(!key));
const options = () => ({ requireAuthentication: SecureStore.canUseBiometricAuthentication(),
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY, authenticationPrompt: 'DueFlux' });
const storageKey = name => PREFIX + encodeURIComponent(name);
const assertOpen = () => { if (!key) throw new Error('Vault locked'); };
const CHUNK_SIZE = 128 * 1024;
const MAX_CHUNKS = 256;
const chunkName = (name, token, index) => `${storageKey(name)}_${token}_${index}`;
async function readEncrypted(name) {
  assertOpen();
  const version = generation;
  const nativeKey = key;
  const raw = await AsyncStorage.getItem(storageKey(name));
  if (!raw) return null;
  const envelope = JSON.parse(raw);
  let combined;
  if (envelope.v === 1) combined = envelope.sealed;
  else if (envelope.v === 2 && /^[a-f0-9]{32}$/.test(envelope.token) &&
    Number.isInteger(envelope.count) && envelope.count > 0 && envelope.count <= MAX_CHUNKS) {
    const pieces = [];
    for (let index = 0; index < envelope.count; index++) {
      const piece = await AsyncStorage.getItem(chunkName(name, envelope.token, index));
      if (piece === null || piece.length > CHUNK_SIZE) throw new Error('Incomplete encrypted record');
      pieces.push(piece);
    }
    combined = pieces.join('');
  } else throw new Error('Unsupported vault format');
  if (version !== generation) throw new Error('Vault locked');
  const plaintext = await Crypto.aesDecryptAsync(Crypto.AESSealedData.fromCombined(combined), nativeKey,
    { output: 'base64', additionalData: encode(name) });
  if (version !== generation) throw new Error('Vault locked');
  return decode(plaintext);
}
async function removeChunks(name, raw) {
  try {
    const envelope = JSON.parse(raw || 'null');
    if (envelope?.v !== 2 || !/^[a-f0-9]{32}$/.test(envelope.token) ||
      !Number.isInteger(envelope.count) || envelope.count < 1 || envelope.count > MAX_CHUNKS) return;
    await AsyncStorage.multiRemove(Array.from({ length: envelope.count }, (_, index) => chunkName(name, envelope.token, index)));
  } catch (_) { /* Orphaned ciphertext is safe to retain if cleanup fails. */ }
}

async function open(prompt) {
  if (opening) return opening;
  const version = generation;
  opening = (async () => {
    if (!await SecureStore.isAvailableAsync()) throw new Error('Secure storage unavailable');
    const authentication = await LocalAuthentication.authenticateAsync({ promptMessage: prompt,
      disableDeviceFallback: false, biometricsSecurityLevel: 'strong' });
    if (!authentication.success) throw new Error('Unlock cancelled');
    const nativeOptions = options();
    const encodedKey = await SecureStore.getItemAsync(KEY_NAME, nativeOptions);
    let candidate;
    if (encodedKey) candidate = await Crypto.AESEncryptionKey.import(encodedKey, 'hex');
    else {
      if ((await AsyncStorage.getAllKeys()).some(name => name.startsWith(PREFIX))) {
        throw new Error('Encryption key unavailable. Existing encrypted changes were preserved.');
      }
      candidate = await Crypto.AESEncryptionKey.generate(256);
      await SecureStore.setItemAsync(KEY_NAME, await candidate.encoded('hex'), nativeOptions);
    }
    if (version !== generation) { candidate.release?.(); throw new Error('Vault locked'); }
    key = candidate;
    try {
      const legacyKeys = (await AsyncStorage.getAllKeys()).filter(name => /^(df_mobile_(cache|queue|account_plan)_|firebase:authUser:)/.test(name));
      for (const name of legacyKeys) await getItem(name);
      if (version !== generation) throw new Error('Vault locked');
    } catch (error) { lock(); throw error; }
    notify();
    waiters.forEach(resolve => resolve()); waiters.clear();
  })();
  try { return await opening; } finally { opening = null; }
}
async function getItem(name) {
  assertOpen();
  if (writes.has(name)) await writes.get(name);
  const plaintext = await readEncrypted(name);
  const legacy = await AsyncStorage.getItem(name);
  if (plaintext !== null) {
    if (legacy !== null && legacy !== plaintext) throw new Error('Migration conflict: both copies were preserved');
    if (legacy !== null) await AsyncStorage.removeItem(name);
    return plaintext;
  }
  if (legacy !== null) {
    // Verify the durable encrypted copy before deleting legacy plaintext.
    await setItem(name, legacy);
    if (await readEncrypted(name) !== legacy) throw new Error('Migration verification failed');
    await AsyncStorage.removeItem(name);
  }
  return legacy;
}
function setItem(name, value) {
  const previous = writes.get(name) || Promise.resolve();
  const task = previous.catch(() => {}).then(async () => {
    assertOpen();
    const version = generation;
    const old = await AsyncStorage.getItem(storageKey(name));
    const sealed = await Crypto.aesEncryptAsync(encode(value), key, { additionalData: encode(name) });
    const combined = await sealed.combined('base64');
    const count = Math.ceil(combined.length / CHUNK_SIZE);
    if (!count || count > MAX_CHUNKS) throw new Error('Encrypted record too large');
    const token = Crypto.randomUUID().replace(/-/g, '');
    // Publish the manifest only after every immutable ciphertext chunk is durable.
    for (let index = 0; index < count; index++) {
      if (version !== generation) throw new Error('Vault locked');
      await AsyncStorage.setItem(chunkName(name, token, index), combined.slice(index * CHUNK_SIZE, (index + 1) * CHUNK_SIZE));
    }
    if (version !== generation) throw new Error('Vault locked');
    await AsyncStorage.setItem(storageKey(name), JSON.stringify({ v: 2, token, count }));
    await removeChunks(name, old);
  });
  writes.set(name, task);
  const done = () => { if (writes.get(name) === task) writes.delete(name); };
  task.then(done, done);
  return task;
}
function removeItem(name) {
  const previous = writes.get(name) || Promise.resolve();
  const task = previous.catch(() => {}).then(async () => {
    assertOpen();
    const old = await AsyncStorage.getItem(storageKey(name));
    await AsyncStorage.removeItem(storageKey(name)); await removeChunks(name, old); await AsyncStorage.removeItem(name);
  });
  writes.set(name, task);
  const done = () => { if (writes.get(name) === task) writes.delete(name); };
  task.then(done, done); return task;
}
function lock() { generation++; key?.release?.(); key = null; notify(); }
function subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); }
const waitUntilOpen = () => key ? Promise.resolve() : new Promise(resolve => waiters.add(resolve));
const authStorage = {
  getItem: async name => { await waitUntilOpen(); return getItem(name); },
  setItem: async (name, value) => { await waitUntilOpen(); return setItem(name, value); },
  removeItem: async name => { await waitUntilOpen(); return removeItem(name); },
};
module.exports = { open, lock, subscribe, getItem, setItem, removeItem, authStorage, isLocked: () => !key };
