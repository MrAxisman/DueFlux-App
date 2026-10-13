(function (root) {
  let records = {};
  let locked = true;
  const listeners = new Set();
  const writes = new Map();
  const sensitive = key => /^(df_offline_(cache|queue|history)_|df_accounts$|df_active_account$|df_saved_filters$)/.test(key);
  const notify = () => listeners.forEach(listener => listener(locked));
  async function open(password) {
    if (!root.DueFluxVault) throw new Error('Secure platform storage unavailable');
    try {
    records = await root.DueFluxVault.unlock(password);
    for (const name of Object.keys(localStorage).filter(sensitive)) {
      if (records[name] !== undefined && records[name] !== localStorage.getItem(name)) {
        records = {}; await root.DueFluxVault.lock();
        throw new Error('Migration conflict: both copies were preserved');
      }
      if (records[name] === undefined) {
        const value = localStorage.getItem(name);
        await root.DueFluxVault.put(name, value);
        if (await root.DueFluxVault.get(name) !== value) throw new Error('Migration verification failed');
        records[name] = value;
      }
      localStorage.removeItem(name);
    }
    locked = false; notify();
    } catch (error) { records = {}; locked = true; await root.DueFluxVault.lock(); throw error; }
  }
  function getItem(name) { if (locked) throw new Error('Vault locked'); return records[name] ?? null; }
  function setItem(name, value) {
    if (locked) return Promise.reject(new Error('Vault locked'));
    const previous = writes.get(name) || Promise.resolve();
    const task = previous.catch(() => {}).then(async () => {
      if (locked) throw new Error('Vault locked');
      await root.DueFluxVault.put(name, value);
      if (!locked) records[name] = value;
    });
    writes.set(name, task);
    task.then(() => { if (writes.get(name) === task) writes.delete(name); }, () => { if (writes.get(name) === task) writes.delete(name); });
    return task;
  }
  function lock() { locked = true; records = {}; void root.DueFluxVault?.lock(); notify(); }
  root.DueFluxVault?.onLock(lock);
  root.DueFluxLocalStore = { open, lock, getItem, setItem, isLocked: () => locked,
    status: () => root.DueFluxVault ? root.DueFluxVault.status() : Promise.resolve({ available: false, configured: false, locked: true }),
    subscribe: listener => { listeners.add(listener); return () => listeners.delete(listener); } };
})(window);
