const test = require('node:test');
const assert = require('node:assert/strict');
const { create } = require('../DueFlux_app_desktop/Windows/renderer/offline-queue');

test('lost acknowledgement retries the same operation, without losing new entries', async () => {
  let stored = [{ type: 'addInvoice', localId: 'local_1', data: {} }];
  const receipts = new Set(); let calls = 0; let appended = false;
  const queue = create({ read: () => structuredClone(stored), write: (_uid, value) => { stored = structuredClone(value); },
    apply: async (_uid, item) => {
      receipts.add(item.operationId);
      if (++calls === 1) throw new Error('lost acknowledgement');
      if (!appended) { appended = true; await queue.edit('a', items => [...items, { type: 'deleteInvoice', id: 'other' }]); }
    },
  });
  await assert.rejects(queue.flush('a', () => true), /lost acknowledgement/);
  assert.equal(stored.length, 1);
  await queue.flush('a', () => true);
  assert.equal(receipts.size, 1);
  assert.equal(stored.length, 1, 'new mutation must survive the snapshot acknowledgement');
  await queue.flush('a', () => true);
  assert.equal(stored.length, 0);
});
test('parallel flushes share one consumer; changing accounts pauses replay', async () => {
  let stored = [{ type: 'deleteInvoice', id: 'a' }, { type: 'deleteInvoice', id: 'b' }]; let active = true; let calls = 0;
  const queue = create({ read: async () => structuredClone(stored), write: async (_uid, value) => { stored = structuredClone(value); },
    apply: async () => { calls++; active = false; },
  });
  await Promise.all([queue.flush('a', () => active), queue.flush('a', () => active)]);
  assert.equal(calls, 1); assert.equal(stored.length, 1);
});
test('storage failure never reports a mutation as saved', async () => {
  const queue = create({ read: () => [], write: () => { throw new Error('disk full'); }, apply: async () => {} });
  await assert.rejects(queue.edit('a', () => [{ type: 'addInvoice' }]), /disk full/);
});

test('pending payload is read at dispatch time and dispatch state survives a lost response', async () => {
  let stored = [{ type: 'addInvoice', localId: 'local_1', data: { amount: 10 } }];
  let sent;
  const queue = create({ read: () => structuredClone(stored), write: (_uid, value) => { stored = structuredClone(value); },
    apply: async (_uid, item) => { sent = item; throw new Error('response lost'); },
  });
  await assert.rejects(queue.flush('a', () => true), /response lost/);
  assert.equal(stored[0].dispatched, true);
  await queue.edit('a', items => {
    const pending = items.find(item => item.type === 'addInvoice' && !item.dispatched);
    if (pending) pending.data.amount = 20;
    else items.push({ type: 'updateInvoice', id: 'local_1', data: { amount: 20 } });
    return items;
  });
  assert.equal(stored[0].data.amount, sent.data.amount);
  assert.equal(stored[1].data.amount, 20);
  assert.notEqual(stored[0].operationId, stored[1].operationId);
});

test('cancelling a mutation that has not been dispatched prevents its submission', async () => {
  let stored = [{ type: 'deleteInvoice', id: 'a' }, { type: 'addInvoice', localId: 'b', data: {} }];
  const sent = [];
  const queue = create({ read: () => structuredClone(stored), write: (_uid, value) => { stored = structuredClone(value); },
    apply: async (_uid, item) => {
      sent.push(item.id || item.localId);
      await queue.edit('a', items => items.filter(current => current.localId !== 'b'));
    },
  });
  await queue.flush('a', () => true);
  assert.deepEqual(sent, ['a']);
  assert.equal(stored.length, 0);
});

test('consecutive edits depend on the previous operation, not a stale cached revision', async () => {
  let stored = [];
  const queue = create({ read: () => structuredClone(stored), write: (_uid, value) => { stored = structuredClone(value); }, apply: async () => {} });
  await queue.edit('a', items => [...items, { type: 'addInvoice', localId: 'local_1', data: {} }]);
  await queue.edit('a', items => [...items, { type: 'updateInvoice', id: 'local_1', data: { amount: 20 }, baseUpdatedAt: 'stale' }]);
  assert.equal(stored[1].dependsOn, stored[0].operationId);
  assert.equal(stored[1].baseUpdatedAt, undefined);
});
