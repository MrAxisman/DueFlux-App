const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const desktop = require("../DueFlux_app_desktop/Windows/renderer/product-intelligence");
const mobile = require("../DueFlux_app_mobile/expo/productIntelligence");
const linux = require("../DueFlux_app_desktop/Linux/renderer/product-intelligence");
const backendPath = path.join(__dirname, "../functions/product-intelligence.js");
const implementations = [desktop, linux, mobile];
if (fs.existsSync(backendPath)) implementations.push(require(backendPath));

const fixtures = [
  {
    id: "netflix-feb",
    company: "Netflix",
    category: "Subscription",
    amount: 59.99,
    currency: "RON",
    issueDate: "2026-02-10T00:00:00.000Z",
    dueDate: "2026-02-12T00:00:00.000Z",
    source: "gmail",
    attachmentName: "invoice.pdf",
    status: "paid",
  },
  {
    id: "netflix-mar",
    company: "Netflix",
    category: "Subscription",
    amount: 61.99,
    currency: "RON",
    issueDate: "2026-03-10T00:00:00.000Z",
    dueDate: "2026-03-12T00:00:00.000Z",
    source: "gmail",
    status: "unpaid",
  },
];

for (const implementation of implementations) {
  const providers = implementation.providerCatalog("business");
  assert.ok(providers.length >= 10, "universal provider catalog is incomplete");
  assert.equal(providers.find((item) => item.id === "gmail").mode, "oauth");
  assert.equal(providers.find((item) => item.id === "icloud").mode, "forward");

  const enriched = implementation.enrichInvoice(fixtures[1], fixtures);
  assert.ok(enriched.intelligence.evidence.confidence >= 50);
  assert.equal(enriched.intelligence.recurrence.cadence, "monthly");
  assert.ok(enriched.intelligence.actions.paymentUrl?.startsWith("https://"));
  assert.ok(enriched.intelligence.actions.cancellationUrl?.startsWith("https://"));

  const pulse = implementation.computePulse(fixtures);
  assert.equal(pulse.attention.length + pulse.verified, 2);
  assert.ok(Array.isArray(pulse.attention));
  assert.ok(Array.isArray(pulse.upcoming));

  const untrusted = implementation.enrichInvoice({
    ...fixtures[0], source: "gmail", paymentSource: "manual_confirmation",
    paymentUrl: "https://netflix.com.attacker.invalid/pay",
    cancellationUrl: "javascript:alert(1)",
  }, fixtures).intelligence;
  assert.ok(untrusted.evidence.items.every((item) => !item.verified), "self-reported fields must not count as verified evidence");
  assert.equal(new URL(untrusted.actions.paymentUrl).hostname, "www.netflix.com");
  assert.equal(new URL(untrusted.actions.cancellationUrl).protocol, "https:");
  const unknown = implementation.enrichInvoice({ company: "notnetflix", paymentUrl: "https://attacker.invalid" }, []).intelligence;
  assert.equal(unknown.actions.paymentUrl, "", "unknown providers cannot supply an official URL");
}

const desktopResult = desktop.enrichInvoice(fixtures[1], fixtures).intelligence;
const mobileResult = mobile.enrichInvoice(fixtures[1], fixtures).intelligence;
assert.deepEqual(mobileResult, desktopResult, "mobile intelligence differs from desktop");
for (const implementation of implementations) {
  assert.deepEqual(implementation.enrichInvoice(fixtures[1], fixtures).intelligence, desktopResult);
}

console.log(`Product intelligence: trust checks and ${implementations.length}-implementation parity passed.`);
