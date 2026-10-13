const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { createVault } = require('../DueFlux_app_desktop/Windows/local-vault.cjs');
const testKeystore = { isEncryptionAvailable: () => true, getSelectedStorageBackend: () => 'gnome_libsecret',
  encryptString: value => Buffer.from(value), decryptString: value => value.toString() };

async function fixture(run) {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'dueflux-vault-test-'));
  try { await run(directory); }
  finally {
    assert(path.resolve(directory).startsWith(path.resolve(os.tmpdir()) + path.sep + 'dueflux-vault-test-'));
    await fs.rm(directory, { recursive: true, force: true });
  }
}
test('AES-GCM records survive restart, reject tampering and never contain invoice plaintext', async () => fixture(async directory => {
  const create = () => createVault({ directory, safeStorage: testKeystore });
  const vault = create();
  await vault.unlock('test-password-eight');
  await vault.put('df_offline_queue_alice', '[{"company":"Sensitive utility","amount":123}]');
  assert.equal(await vault.get('df_offline_queue_alice'), '[{"company":"Sensitive utility","amount":123}]');
  const record = (await fs.readdir(directory)).find(file => /^[a-f0-9]{64}\.json$/.test(file));
  const filename = path.join(directory, record);
  assert(!String(await fs.readFile(filename)).includes('Sensitive utility'));
  vault.lock(); await assert.rejects(vault.get('df_offline_queue_alice'), /locked/);
  const restarted = create();
  await assert.rejects(restarted.unlock('wrong-password'), /Unlock failed/);
  await restarted.unlock('test-password-eight');
  assert.match(await restarted.get('df_offline_queue_alice'), /Sensitive utility/);
  const envelope = JSON.parse(await fs.readFile(filename, 'utf8'));
  const bytes = Buffer.from(envelope.data, 'base64'); bytes[0] ^= 1; envelope.data = bytes.toString('base64');
  await fs.writeFile(filename, JSON.stringify(envelope));
  await assert.rejects(restarted.get('df_offline_queue_alice'));
}));
test('missing secure providers and Linux basic_text fail closed', async () => fixture(async directory => {
  const unavailable = createVault({ directory, safeStorage: { ...testKeystore, isEncryptionAvailable: () => false } });
  await assert.rejects(unavailable.unlock('test-password-eight'), /unavailable/);
  const insecure = createVault({ directory, platform: 'linux', safeStorage: { ...testKeystore, getSelectedStorageBackend: () => 'basic_text' } });
  assert.equal((await insecure.status()).available, false);
  await assert.rejects(insecure.unlock('test-password-eight'), /unavailable/);
}));
test('concurrent enrollment is serialized; paths and locked writes are rejected', async () => fixture(async directory => {
  const vault = createVault({ directory, safeStorage: testKeystore });
  await Promise.all([vault.unlock('test-password-eight'), vault.unlock('test-password-eight')]);
  assert.throws(() => vault.put('../escape', 'secret'), /Invalid vault record/);
  await vault.put('df_offline_cache_alice', '{"invoices":[]}');
  vault.lock();
  assert.throws(() => vault.put('df_offline_cache_alice', 'changed'), /locked/);
  await vault.unlock('test-password-eight');
  assert.equal(await vault.get('df_offline_cache_alice'), '{"invoices":[]}');
}));
