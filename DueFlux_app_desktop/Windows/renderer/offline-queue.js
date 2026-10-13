(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.DueFluxOfflineQueue = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  function newId() {
    if (globalThis.crypto && globalThis.crypto.randomUUID) return globalThis.crypto.randomUUID();
    return Date.now().toString(36) + "-" + Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
  }
  function create({ read, write, apply }) {
    const locks = new Map();
    const running = new Map();
    const listeners = new Set();
    function edit(uid, transform) {
      const previous = locks.get(uid) || Promise.resolve();
      const next = previous.catch(function () {}).then(async function () {
        const stored = read(uid);
        const items = stored && typeof stored.then === "function" ? await stored : stored;
        const queue = items.map(function (item) {
          return Object.assign({}, item, { data: item.data && Object.assign({}, item.data), operationId: item.operationId || newId() });
        });
        const result = transform(queue).map(function (item) {
          return Object.assign({}, item, { operationId: item.operationId || newId() });
        });
        const previousForInvoice = new Map();
        result.forEach(function (item) {
          const invoiceId = item.id || item.localId;
          const previous = previousForInvoice.get(invoiceId);
          if (!item.dispatched && !item.dependsOn && previous && item.type !== "addInvoice" && previous.type !== "deleteInvoice") {
            item.dependsOn = previous.operationId;
            delete item.baseUpdatedAt;
          }
          previousForInvoice.set(invoiceId, item);
        });
        await write(uid, result);
        listeners.forEach(function (listener) {
          try { listener(uid, result.length); } catch (_) { /* UI observers cannot fail a durable write. */ }
        });
        return result;
      });
      locks.set(uid, next);
      const unlock = function () { if (locks.get(uid) === next) locks.delete(uid); };
      next.then(unlock, unlock);
      return next;
    }
    function flush(uid, active) {
      if (running.has(uid)) return running.get(uid);
      const promise = (async function () {
        const snapshot = await edit(uid, function (queue) { return queue; });
        for (const item of snapshot) {
          if (!active()) break;
          // Persist the dispatch boundary. Its payload must stay immutable even
          // when the response is lost; subsequent edits get their own operation.
          const currentQueue = await edit(uid, function (queue) {
            return queue.map(function (current) {
              return current.operationId === item.operationId
                ? Object.assign({}, current, { dispatched: true }) : current;
            });
          });
          const dispatched = currentQueue.find(function (current) { return current.operationId === item.operationId; });
          if (!dispatched || !active()) continue;
          // Server receipts make retry after a lost acknowledgement idempotent.
          await apply(uid, dispatched);
          await edit(uid, function (queue) { return queue.filter(function (current) {
            return current.operationId !== item.operationId;
          }); });
        }
        return (await read(uid)).length;
      })();
      running.set(uid, promise);
      promise.then(function () { running.delete(uid); }, function () { running.delete(uid); });
      return promise;
    }
    function subscribe(listener) {
      listeners.add(listener);
      return function () { listeners.delete(listener); };
    }
    return { edit, flush, subscribe };
  }
  function projectInvoices(invoices, queue) {
    const records = new Map((invoices || []).map(function (invoice) { return [invoice.id, Object.assign({}, invoice)]; }));
    // Cloud snapshots are a base, not a replacement for changes still on this device.
    (queue || []).forEach(function (mutation) {
      const id = mutation.id || mutation.localId;
      if (!id) return;
      if (mutation.type === "deleteInvoice") records.delete(id);
      else if (mutation.type === "addInvoice" || mutation.type === "updateInvoice") {
        const current = records.get(id);
        if (current || mutation.type === "addInvoice") {
          records.set(id, Object.assign({}, current, mutation.data, { id: id, offlinePending: true }));
        }
      }
    });
    return Array.from(records.values());
  }
  function matchesInvoice(invoice, term) {
    const normalize = function (value) {
      return String(value == null ? "" : value).normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    };
    const haystack = normalize([invoice.company, invoice.category, invoice.number, invoice.amount, invoice.currency].join(" "));
    return normalize(term).trim().split(/\s+/).every(function (token) { return haystack.includes(token); });
  }
  return { create, newId, projectInvoices, matchesInvoice };
});
