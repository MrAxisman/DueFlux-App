const crypto = require('node:crypto');
const fs = require('node:fs/promises');
const path = require('node:path');

function createVault({ directory, safeStorage, platform = process.platform, now = Date.now }) {
  let master = null;
  let opening = Promise.resolve();
  let generation = 0;
  const writes = new Map();
  const metadataPath = path.join(directory, 'key.json');
  const allowed = key => typeof key === 'string' && /^(df_offline_(cache|queue|history)_[A-Za-z0-9_-]+|df_accounts|df_active_account|df_saved_filters)$/.test(key);
  const available = () => safeStorage.isEncryptionAvailable() &&
    !(platform === 'linux' && safeStorage.getSelectedStorageBackend() === 'basic_text');
  function seal(key, value, aad) {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    cipher.setAAD(Buffer.from(aad));
    const bytes = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
    return { v: 1, iv: iv.toString('base64'), tag: cipher.getAuthTag().toString('base64'), data: bytes.toString('base64') };
  }
  function unseal(key, envelope, aad) {
    if (envelope.v !== 1) throw new Error('Unsupported vault format');
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(envelope.iv, 'base64'));
    decipher.setAAD(Buffer.from(aad));
    decipher.setAuthTag(Buffer.from(envelope.tag, 'base64'));
    return Buffer.concat([decipher.update(Buffer.from(envelope.data, 'base64')), decipher.final()]).toString('utf8');
  }
  async function readMetadata() {
    try { return JSON.parse(await fs.readFile(metadataPath, 'utf8')); }
    catch (error) { if (error.code === 'ENOENT') return null; throw error; }
  }
  async function atomicWrite(file, value) {
    await fs.mkdir(directory, { recursive: true, mode: 0o700 });
    const temporary = `${file}.${crypto.randomUUID()}.tmp`;
    try { await fs.writeFile(temporary, value, { mode: 0o600, flag: 'wx' }); await fs.rename(temporary, file); }
    finally { await fs.unlink(temporary).catch(() => {}); }
  }
  const derive = (password, salt, secret) => new Promise((resolve, reject) => {
    crypto.scrypt(password + secret, salt, 32, { N: 65536, r: 8, p: 1, maxmem: 128 * 1024 * 1024 },
      (error, key) => error ? reject(error) : resolve(key));
  });
  function assertOpen(key) {
    if (!master) throw new Error('Vault locked');
    if (!allowed(key)) throw new Error('Invalid vault record');
  }
  const recordPath = key => path.join(directory, crypto.createHash('sha256').update(key).digest('hex') + '.json');
  async function status() { return { available: available(), configured: !!await readMetadata(), locked: !master }; }
  async function unlockInternal(password, version) {
    if (!available()) throw new Error('Secure platform storage unavailable');
    if (typeof password !== 'string' || password.length < 8 || password.length > 256) throw new Error('Local password must have 8 to 256 characters');
    let metadata = await readMetadata();
    if (metadata && metadata.retryAt > now()) throw new Error('Try again later');
    if (!metadata) {
      const secret = crypto.randomBytes(32).toString('hex');
      const salt = crypto.randomBytes(32).toString('hex');
      const wrappingKey = await derive(password, salt, secret);
      const candidate = crypto.randomBytes(32);
      metadata = { v: 1, salt, osSecret: safeStorage.encryptString(secret).toString('base64'),
        wrapped: seal(wrappingKey, candidate.toString('hex'), 'DueFlux-vault-key'), failures: 0, retryAt: 0 };
      wrappingKey.fill(0);
      await atomicWrite(metadataPath, JSON.stringify(metadata));
      if (version !== generation) { candidate.fill(0); throw new Error('Vault locked'); }
      master = candidate;
    } else {
      const secret = safeStorage.decryptString(Buffer.from(metadata.osSecret, 'base64'));
      const wrappingKey = await derive(password, metadata.salt, secret);
      let candidate;
      try { candidate = Buffer.from(unseal(wrappingKey, metadata.wrapped, 'DueFlux-vault-key'), 'hex'); }
      catch (_) {
        metadata.failures = (metadata.failures || 0) + 1;
        metadata.retryAt = metadata.failures >= 5 ? now() + 30000 : 0;
        await atomicWrite(metadataPath, JSON.stringify(metadata));
        throw new Error('Unlock failed');
      } finally { wrappingKey.fill(0); }
      metadata.failures = 0; metadata.retryAt = 0;
      await atomicWrite(metadataPath, JSON.stringify(metadata));
      if (master) master.fill(0);
      if (version !== generation) { candidate.fill(0); throw new Error('Vault locked'); }
      master = candidate;
    }
    const records = {};
    for (const file of await fs.readdir(directory)) {
      if (!/^[a-f0-9]{64}\.json$/.test(file)) continue;
      const envelope = JSON.parse(await fs.readFile(path.join(directory, file), 'utf8'));
      if (!allowed(envelope.key) || recordPath(envelope.key) !== path.join(directory, file)) throw new Error('Invalid vault record');
      records[envelope.key] = unseal(master, envelope, envelope.key);
    }
    return records;
  }
  async function get(key) {
    assertOpen(key);
    try { return unseal(master, JSON.parse(await fs.readFile(recordPath(key), 'utf8')), key); }
    catch (error) { if (error.code === 'ENOENT') return null; throw error; }
  }
  function put(key, value) {
    assertOpen(key);
    if (typeof value !== 'string' || Buffer.byteLength(value) > 24 * 1024 * 1024) throw new Error('Invalid vault value');
    const previous = writes.get(key) || Promise.resolve();
    const task = previous.catch(() => {}).then(async () => {
      assertOpen(key);
      const envelope = { ...seal(master, value, key), key };
      await atomicWrite(recordPath(key), JSON.stringify(envelope));
    });
    writes.set(key, task);
    task.then(() => { if (writes.get(key) === task) writes.delete(key); }, () => { if (writes.get(key) === task) writes.delete(key); });
    return task;
  }
  function lock() { generation++; if (master) master.fill(0); master = null; }
  function unlock(password) {
    const version = generation;
    const task = opening.catch(() => {}).then(() => unlockInternal(password, version)).catch(error => { lock(); throw error; });
    opening = task;
    return task;
  }
  return { status, unlock, get, put, lock };
}
module.exports = { createVault };
