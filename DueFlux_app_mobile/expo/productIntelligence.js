(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.DueFluxIntelligence = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const DAY_MS = 24 * 60 * 60 * 1000;
  const DIRECT_PROVIDERS = new Set(["gmail", "outlook"]);
  const PROVIDERS = [
    { id: "gmail", name: "Gmail / Google Workspace", mode: "oauth", plans: ["basic", "business"] },
    { id: "outlook", name: "Outlook / Microsoft 365", mode: "oauth", plans: ["business"] },
    { id: "icloud", name: "iCloud Mail", mode: "forward", plans: ["basic", "business"] },
    { id: "yahoo", name: "Yahoo Mail", mode: "forward", plans: ["basic", "business"] },
    { id: "proton", name: "Proton Mail", mode: "forward", plans: ["basic", "business"] },
    { id: "zoho", name: "Zoho Mail", mode: "forward", plans: ["basic", "business"] },
    { id: "fastmail", name: "Fastmail", mode: "forward", plans: ["basic", "business"] },
    { id: "gmx", name: "GMX / Mail.com", mode: "forward", plans: ["basic", "business"] },
    { id: "aol", name: "AOL Mail", mode: "forward", plans: ["basic", "business"] },
    { id: "custom", name: "Custom IMAP / business email", mode: "forward", plans: ["basic", "business"] },
  ];

  const OFFICIAL_ACTIONS = {
    netflix: { pay: "https://www.netflix.com/account", cancel: "https://www.netflix.com/cancelplan" },
    spotify: { pay: "https://www.spotify.com/account/overview/", cancel: "https://www.spotify.com/account/subscription/" },
    youtube: { pay: "https://payments.google.com/", cancel: "https://www.youtube.com/paid_memberships" },
    google: { pay: "https://payments.google.com/", cancel: "https://myaccount.google.com/subscriptions" },
    microsoft: { pay: "https://account.microsoft.com/billing/", cancel: "https://account.microsoft.com/services/" },
    adobe: { pay: "https://account.adobe.com/plans", cancel: "https://account.adobe.com/plans" },
    apple: { pay: "https://account.apple.com/", cancel: "https://support.apple.com/billing" },
    icloud: { pay: "https://account.apple.com/", cancel: "https://support.apple.com/billing" },
    dropbox: { pay: "https://www.dropbox.com/account/billing", cancel: "https://www.dropbox.com/account/plan" },
    notion: { pay: "https://www.notion.so/my-integrations", cancel: "https://www.notion.so/help/billing" },
    canva: { pay: "https://www.canva.com/settings/billing-and-plans", cancel: "https://www.canva.com/settings/billing-and-plans" },
    openai: { pay: "https://platform.openai.com/settings/organization/billing/overview", cancel: "https://help.openai.com/en/articles/7232927-how-do-i-cancel-my-chatgpt-subscription" },
  };

  function asDate(value) {
    if (!value) return null;
    if (typeof value.toDate === "function") return value.toDate();
    if (value.seconds) return new Date(value.seconds * 1000);
    const date = value instanceof Date ? value : new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  function cleanText(value) {
    return String(value == null ? "" : value).trim();
  }

  function normalizeProvider(value) {
    const token = cleanText(value).toLowerCase();
    if (/gmail|google/.test(token)) return "gmail";
    if (/outlook|hotmail|live|office|microsoft/.test(token)) return "outlook";
    if (/icloud|me\.com|mac\.com/.test(token)) return "icloud";
    if (/yahoo/.test(token)) return "yahoo";
    if (/proton/.test(token)) return "proton";
    if (/zoho/.test(token)) return "zoho";
    if (/fastmail/.test(token)) return "fastmail";
    if (/gmx|mail\.com/.test(token)) return "gmx";
    if (/aol/.test(token)) return "aol";
    return "custom";
  }

  function providerForEmail(email) {
    const domain = cleanText(email).toLowerCase().split("@").pop() || "";
    return normalizeProvider(domain);
  }

  function providerCatalog(plan) {
    const normalizedPlan = cleanText(plan || "basic").toLowerCase();
    return PROVIDERS.map(function (provider) {
      return Object.assign({}, provider, {
        available: provider.plans.includes(normalizedPlan),
        direct: DIRECT_PROVIDERS.has(provider.id),
      });
    });
  }

  function invoiceDate(invoice) {
    return asDate(invoice && (invoice.issueDate || invoice.receivedAt || invoice.createdAt || invoice.dueDate));
  }

  function invoiceKey(invoice) {
    return [
      cleanText(invoice && invoice.company).toLowerCase(),
      cleanText(invoice && invoice.currency || "RON").toUpperCase(),
    ].join("|");
  }

  function sourceLabel(invoice) {
    const source = cleanText(invoice && invoice.source).toLowerCase();
    if (source.includes("phone") || source.includes("sms") || source.includes("whatsapp")) return "phone";
    if (source.includes("manual")) return "manual";
    if (source.includes("email") || invoice && (invoice.messageId || invoice.sourceAccountEmail)) return "email";
    return source || "cloud";
  }

  function buildEvidence(invoice) {
    const evidence = [];
    const source = sourceLabel(invoice);
    const verification = invoice && invoice.evidenceVerification || {};
    evidence.push({ type: source, label: source, verified: verification.source === true, value: cleanText(invoice && (invoice.sourceAccountEmail || invoice.from || invoice.phoneFrom)) });
    if (invoice && (invoice.attachmentPath || invoice.attachmentUrl || invoice.storagePath || invoice.attachmentName)) {
      evidence.push({ type: "document", label: "attachment", verified: verification.document === true, value: cleanText(invoice.attachmentName || invoice.fileName) });
    }
    if (invoice && (invoice.paymentSource || invoice.paymentConfirmationMessageId || invoice.paidAt)) {
      evidence.push({ type: "payment", label: "payment_confirmation", verified: verification.payment === true && invoice.paymentSource !== "manual_confirmation", value: cleanText(invoice.paymentSource || "confirmation") });
    }
    if (invoice && (invoice.amountSource || invoice.extractionSource)) {
      evidence.push({ type: "extraction", label: "extraction", verified: verification.extraction === true, value: cleanText(invoice.amountSource || invoice.extractionSource) });
    }
    const confidence = Math.min(100, Math.round(
      34 +
      evidence.filter(function (item) { return item.verified; }).length * 17 +
      (Number(invoice && invoice.amount) > 0 ? 12 : 0) +
      (invoiceDate(invoice) ? 8 : 0)
    ));
    return { items: evidence, confidence: confidence };
  }

  function median(numbers) {
    if (!numbers.length) return null;
    const sorted = numbers.slice().sort(function (a, b) { return a - b; });
    const middle = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
  }

  function recurrenceFor(invoice, allInvoices) {
    const related = (allInvoices || [])
      .filter(function (candidate) { return invoiceKey(candidate) === invoiceKey(invoice); })
      .map(invoiceDate)
      .filter(Boolean)
      .sort(function (a, b) { return a.getTime() - b.getTime(); });
    const gaps = [];
    for (let index = 1; index < related.length; index += 1) {
      gaps.push(Math.round((related[index].getTime() - related[index - 1].getTime()) / DAY_MS));
    }
    let intervalDays = median(gaps);
    if (!intervalDays && invoice && invoice.recurring) intervalDays = 30;
    let cadence = "unknown";
    if (intervalDays) {
      if (intervalDays <= 10) cadence = "weekly";
      else if (intervalDays <= 45) cadence = "monthly";
      else if (intervalDays <= 120) cadence = "quarterly";
      else cadence = "yearly";
    }
    const latest = related.length ? related[related.length - 1] : invoiceDate(invoice);
    const nextExpectedAt = latest && intervalDays ? new Date(latest.getTime() + intervalDays * DAY_MS) : null;
    const expectedAmount = median(
      (allInvoices || []).filter(function (candidate) { return invoiceKey(candidate) === invoiceKey(invoice); })
        .map(function (candidate) { return Number(candidate.amount); })
        .filter(function (amount) { return Number.isFinite(amount) && amount > 0; })
    );
    return { cadence: cadence, intervalDays: intervalDays ? Math.round(intervalDays) : null, nextExpectedAt: nextExpectedAt, expectedAmount: expectedAmount, samples: related.length };
  }

  function officialActions(invoice) {
    const haystack = [invoice && invoice.company, invoice && invoice.from, invoice && invoice.subject].join(" ").toLowerCase();
    const key = Object.keys(OFFICIAL_ACTIONS).find(function (candidate) { return new RegExp("\\b" + candidate + "\\b", "i").test(haystack); });
    const mapped = key ? OFFICIAL_ACTIONS[key] : {};
    const explicitPayment = cleanText(invoice && (invoice.paymentUrl || invoice.payUrl || invoice.officialPaymentUrl));
    const explicitCancel = cleanText(invoice && (invoice.cancellationUrl || invoice.cancelUrl || invoice.manageSubscriptionUrl));
    return {
      paymentUrl: trustedActionUrl(explicitPayment, mapped.pay),
      cancellationUrl: trustedActionUrl(explicitCancel, mapped.cancel),
      providerMatched: key || "",
    };
  }

  function trustedActionUrl(candidate, fallback) {
    if (!fallback) return "";
    try {
      const url = new globalThis.URL(candidate);
      const official = new globalThis.URL(fallback);
      // Exact origin only: neither lookalike suffixes nor arbitrary HTTPS links are official.
      if (url.protocol === "https:" && !url.username && !url.password && url.origin === official.origin) return url.href;
    } catch (_) { /* Unknown links use the maintained provider landing page. */ }
    return fallback;
  }

  function riskFor(invoice, recurrence, evidence) {
    const flags = [];
    const amount = Number(invoice && invoice.amount);
    if (!Number.isFinite(amount) || amount <= 0) flags.push({ code: "missing_amount", severity: "high" });
    if (!cleanText(invoice && invoice.company)) flags.push({ code: "missing_company", severity: "high" });
    if (!invoiceDate(invoice)) flags.push({ code: "missing_date", severity: "medium" });
    if (evidence.confidence < 65) flags.push({ code: "weak_evidence", severity: "medium" });
    if (recurrence.expectedAmount && amount > recurrence.expectedAmount * 1.3) flags.push({ code: "price_jump", severity: "high" });
    const due = asDate(invoice && invoice.dueDate);
    const status = cleanText(invoice && invoice.status).toLowerCase();
    if (due && due.getTime() < Date.now() && status !== "paid") flags.push({ code: "overdue", severity: "high" });
    const score = Math.min(100, flags.reduce(function (sum, flag) { return sum + (flag.severity === "high" ? 30 : 16); }, 0));
    return { flags: flags, score: score };
  }

  function enrichInvoice(invoice, allInvoices) {
    const evidence = buildEvidence(invoice || {});
    const recurrence = recurrenceFor(invoice || {}, allInvoices || []);
    const risk = riskFor(invoice || {}, recurrence, evidence);
    const actions = officialActions(invoice || {});
    const due = asDate(invoice && invoice.dueDate);
    const daysUntilDue = due ? Math.ceil((due.getTime() - Date.now()) / DAY_MS) : null;
    const status = cleanText(invoice && invoice.status || "unpaid").toLowerCase();
    const attention = Math.min(100,
      risk.score +
      (status !== "paid" && daysUntilDue != null && daysUntilDue <= 7 ? 24 : 0) +
      (status !== "paid" && daysUntilDue != null && daysUntilDue < 0 ? 28 : 0)
    );
    return Object.assign({}, invoice, {
      intelligence: { evidence: evidence, recurrence: recurrence, risk: risk, actions: actions, attention: attention, daysUntilDue: daysUntilDue },
    });
  }

  function computePulse(invoices) {
    const enriched = (invoices || []).map(function (invoice) { return enrichInvoice(invoice, invoices); });
    const attention = enriched.filter(function (invoice) { return invoice.intelligence.attention > 0; })
      .sort(function (a, b) { return b.intelligence.attention - a.intelligence.attention; });
    const upcoming = enriched.filter(function (invoice) {
      const days = invoice.intelligence.daysUntilDue;
      return cleanText(invoice.status).toLowerCase() !== "paid" && days != null && days >= 0 && days <= 14;
    });
    const nextRenewals = enriched.filter(function (invoice) { return !!invoice.intelligence.recurrence.nextExpectedAt; })
      .sort(function (a, b) { return a.intelligence.recurrence.nextExpectedAt - b.intelligence.recurrence.nextExpectedAt; });
    return {
      attention: attention,
      upcoming: upcoming,
      renewals: nextRenewals,
      guarded: enriched.filter(function (invoice) { return invoice.intelligence.risk.flags.length > 0; }).length,
      verified: enriched.filter(function (invoice) { return invoice.intelligence.evidence.confidence >= 75; }).length,
    };
  }

  return {
    VERSION: "1.0.0",
    PROVIDERS: PROVIDERS,
    providerCatalog: providerCatalog,
    providerForEmail: providerForEmail,
    normalizeProvider: normalizeProvider,
    buildEvidence: buildEvidence,
    recurrenceFor: recurrenceFor,
    officialActions: officialActions,
    enrichInvoice: enrichInvoice,
    computePulse: computePulse,
    asDate: asDate,
  };
});
