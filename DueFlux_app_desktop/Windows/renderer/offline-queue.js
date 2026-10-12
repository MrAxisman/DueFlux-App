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
    function edit(uid, transform) {
      const previous = locks.get(uid) || Promise.resolve();
      const next = previous.catch(function () {}).then(async function () {
        const stored = read(uid);
        const items = stored && typeof stored.then === "function" ? await stored : stored;
        const queue = items.map(function (item) {
          return Object.assign({}, item, { operationId: item.operationId || newId() });
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
        return result;
      });
      locks.set(uid, next);
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
    return { edit, flush };
  }
  return { create, newId };
});
