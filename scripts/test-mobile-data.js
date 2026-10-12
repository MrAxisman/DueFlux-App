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
