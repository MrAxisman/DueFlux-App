const test = require('node:test');
const assert = require('node:assert/strict');
const { create, projectInvoices, matchesInvoice } = require('../DueFlux_app_desktop/Windows/renderer/offline-queue');
const fs = require('node:fs');
const path = require('node:path');

test('all shipped platforms use the same offline queue implementation', () => {
  const canonical = fs.readFileSync(path.join(__dirname, '../DueFlux_app_desktop/Windows/renderer/offline-queue.js'), 'utf8');
  for (const file of ['../DueFlux_app_desktop/Linux/renderer/offline-queue.js', '../DueFlux_app_mobile/expo/offlineQueue.js']) {
    assert.equal(fs.readFileSync(path.join(__dirname, file), 'utf8'), canonical);
  }
});

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

test('failed writes cannot mutate nested data or announce a saved change', async () => {
  const stored = [{ type: 'addInvoice', localId: 'a', data: { amount: 10 } }];
  let announced = false;
  const queue = create({ read: () => stored, write: () => { throw new Error('disk full'); }, apply: async () => {} });
  queue.subscribe(() => { announced = true; });
  await assert.rejects(queue.edit('a', items => { items[0].data.amount = 20; return items; }), /disk full/);
  assert.equal(stored[0].data.amount, 10);
  assert.equal(announced, false);
});

test('observers see durable queue counts and can unsubscribe without affecting replay', async () => {
  let stored = []; const counts = [];
  const queue = create({ read: () => stored, write: (_uid, items) => { stored = items; }, apply: async () => {} });
  const unsubscribe = queue.subscribe((uid, count) => counts.push([uid, count]));
  queue.subscribe(() => { throw new Error('UI unmounted'); });
  await queue.edit('alice', () => [{ type: 'deleteInvoice', id: 'a' }]);
  unsubscribe();
  await queue.flush('alice', () => true);
  assert.deepEqual(counts, [['alice', 1]]);
  assert.equal(stored.length, 0);
});

test('cloud snapshots preserve pending additions, payments and deletes without duplicates', () => {
  const base = [{ id: 'a', status: 'unpaid', company: 'Cloud' }, { id: 'b' }, { id: 'local_c', amount: 5 }];
  const queue = [{ type: 'updateInvoice', id: 'a', data: { status: 'paid' }, dispatched: true },
    { type: 'deleteInvoice', id: 'b' }, { type: 'addInvoice', localId: 'local_c', data: { amount: 10 } },
    { type: 'addInvoice', localId: 'local_d', data: { amount: 20 } }];
  const result = projectInvoices(base, queue);
  assert.deepEqual(result.map(item => item.id), ['a', 'local_c', 'local_d']);
  assert.equal(result[0].status, 'paid');
  assert.equal(result[1].amount, 10);
  assert.equal(base[0].status, 'unpaid', 'cloud base must not be mutated');
  assert.equal(projectInvoices(result, queue).length, result.length, 'projection is idempotent');
});

test('search matches accents, multiple terms, numbers and non-Latin text', () => {
  const invoice = { company: 'Energie România', category: 'Acasă', number: 'DF-42', amount: 123, currency: 'RON' };
  assert.equal(matchesInvoice(invoice, 'romania 42'), true);
  assert.equal(matchesInvoice(invoice, ' acasa 123 '), true);
  assert.equal(matchesInvoice(invoice, 'romania EUR'), false);
  assert.equal(matchesInvoice({ company: '電気 العربية' }, 'العربية'), true);
  assert.equal(matchesInvoice(invoice, ''), true);
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
