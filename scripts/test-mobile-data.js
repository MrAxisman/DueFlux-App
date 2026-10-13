const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const source = fs.readFileSync(path.join(__dirname, "../DueFlux_app_mobile/expo/App.js"), "utf8");
const names = ["resolveDate", "normalizeInvoiceDoc", "loadOfflineCache", "getOfflineQueue", "offlineCacheKey", "offlineQueueKey"];
const helpers = names.map(name => {
  const match = source.match(new RegExp(`(?:async )?function ${name}\\([^]*?\\n\\}`));
  assert.ok(match, `Missing helper ${name}`);
  return match[0];
}).join("\n");

function setup(stored) {
  const context = vm.createContext({ Date, OFFLINE_CACHE_PREFIX: "cache_", OFFLINE_QUEUE_PREFIX: "queue_",
    AsyncStorage: { getItem: async () => stored },
  });
  vm.runInContext(helpers, context);
  return context;
}

test("mobile cache restores dates and preserves evidence and workspace metadata", async () => {
  const ctx = setup(JSON.stringify({ invoices: [{ id: "x", issueDate: "2026-10-07T12:00:00.000Z",
    dueDate: "2026-10-10T12:00:00.000Z", amount: 10, source: "gmail", spaceId: "business",
    evidenceVerification: { source: true }, updatedAt: "2026-10-07T13:00:00.000Z" }] }));
  const { invoices } = await ctx.loadOfflineCache("alice");
  assert.equal(invoices[0].issueDate.getMonth(), 9);
  assert.equal(invoices[0].dueDate.getDate(), 10);
  assert.equal(invoices[0].updatedAt.toISOString(), "2026-10-07T13:00:00.000Z");
  assert.equal(invoices[0].source, "gmail");
  assert.equal(invoices[0].spaceId, "business");
  assert.equal(invoices[0].evidenceVerification.source, true);
});

test("corrupt caches are ignored, but corrupt mutation queues fail closed", async () => {
  for (const raw of ['{broken', '{"not":"an array"}']) {
    const ctx = setup(raw);
    await assert.rejects(ctx.getOfflineQueue("alice"), /could not be read/);
  }
  assert.equal(await setup('{broken').loadOfflineCache("alice"), null);
});

test("invalid invoice dates cannot crash date-based dashboard calculations", () => {
  const ctx = setup(null);
  const invoice = ctx.normalizeInvoiceDoc({ id: "x", data: () => ({ issueDate: "invalid", dueDate: null }) });
  assert.equal(invoice.issueDate, null);
  assert.equal(invoice.dueDate, null);
});

test("mobile offline save waits for durable storage and leaves the editor open on failure", async () => {
  const match = source.match(/async function handleSaveInvoice\([^]*?\n  \}/);
  assert.ok(match);
  const changes = { rendered: false, closed: false, busy: false, error: '' };
  const context = vm.createContext({ Date, Number,
    user: { uid: 'alice' }, auth: { currentUser: { uid: 'alice' } }, savingInvoice: false,
    invoiceCompany: 'Utility', invoiceCategory: '', invoiceNumber: '', invoiceAmount: '12',
    invoiceIssueDate: '', invoiceDueDate: '', invoiceCurrency: 'RON', invoiceStatus: 'unpaid',
    planWorkspaceSpace: 'home', isOnline: false, invoices: [],
    OfflineQueue: { newId: () => 'new-id' }, parseDateInput: () => null, serializeForCache: value => value,
    offlineQueueEngine: { edit: async () => { throw new Error('Storage is full'); } },
    t: key => key, setInvoiceError: value => { changes.error = value; }, setInvoiceMessage: () => {},
    setSavingInvoice: value => { changes.busy = value; }, setInvoices: () => { changes.rendered = true; },
    closeInvoiceModal: () => { changes.closed = true; },
  });
  vm.runInContext(match[0], context);
  await context.handleSaveInvoice();
  assert.deepEqual(changes, { rendered: false, closed: false, busy: false, error: 'sync_storage_error' });
});

test("failed payment confirmation never claims success or closes the action panel", async () => {
  const match = source.match(/async function handleActionPaid\([^]*?\n  \}/);
  assert.ok(match);
  let announced = false; let closed = false;
  const context = vm.createContext({ Date, actionInvoice: { id: 'a' },
    patchInvoiceFromAction: async () => false, setSyncMessage: () => { announced = true; },
    setActionInvoice: () => { closed = true; }, t: key => key,
  });
  vm.runInContext(match[0], context);
  await context.handleActionPaid();
  assert.equal(announced, false);
  assert.equal(closed, false);
});
