import fs from "node:fs/promises";
import path from "node:path";
import vm from "node:vm";
import { createRequire } from "node:module";
import https from "node:https";

const require = createRequire(import.meta.url);

const root = path.resolve(import.meta.dirname, "..");
const desktopPath = path.join(root, "DueFlux_app_desktop", "Windows", "renderer", "app.js");
const mobilePath = path.join(root, "DueFlux_app_mobile", "expo", "App.js");
const websitePath = path.join(root, "DueFlux_website", "assets", "js", "main.js");
const websitePatchPath = path.join(root, "DueFlux_website", "tmp_i18n_patch.json");
const existingLocalesPath = path.join(root, "DueFlux_app_mobile", "expo", "featureLocales.js");

function extractObject(source, name) {
  const declaration = `const ${name} =`;
  const declarationIndex = source.indexOf(declaration);
  if (declarationIndex < 0) throw new Error(`Missing ${name}`);
  const start = source.indexOf("{", declarationIndex + declaration.length);
  let depth = 0;
  let quote = "";
  let escaped = false;
  let lineComment = false;
  let blockComment = false;

  for (let index = start; index < source.length; index += 1) {
    const char = source[index];
    const next = source[index + 1];
    if (lineComment) {
      if (char === "\n") lineComment = false;
      continue;
    }
    if (blockComment) {
      if (char === "*" && next === "/") {
        blockComment = false;
        index += 1;
      }
      continue;
    }
    if (quote) {
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === quote) quote = "";
      continue;
    }
    if (char === "/" && next === "/") {
      lineComment = true;
      index += 1;
      continue;
    }
    if (char === "/" && next === "*") {
      blockComment = true;
      index += 1;
      continue;
    }
    if (char === '"' || char === "'" || char === "`") {
      quote = char;
      continue;
    }
    if (char === "{") depth += 1;
    if (char === "}") {
      depth -= 1;
      if (depth === 0) {
        return vm.runInNewContext(`(${source.slice(start, index + 1)})`);
      }
    }
  }
  throw new Error(`Unclosed object ${name}`);
}

function decodeHtml(value) {
  return String(value)
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&amp;", "&");
}

function requestText(url, options = {}, redirects = 5) {
  return new Promise((resolve, reject) => {
    const { timeoutMs = 12000, ...requestOptions } = options;
    const request = https.request(url, requestOptions, (response) => {
      if (
        redirects > 0 &&
        response.statusCode >= 300 &&
        response.statusCode < 400 &&
        response.headers.location
      ) {
        response.resume();
        const redirectUrl = new URL(response.headers.location, url).toString();
        resolve(requestText(redirectUrl, options, redirects - 1));
        return;
      }
      const chunks = [];
      response.on("data", (chunk) => chunks.push(chunk));
      response.on("end", () => {
        resolve({
          ok: response.statusCode >= 200 && response.statusCode < 300,
          status: response.statusCode || 0,
          text: Buffer.concat(chunks).toString("utf8"),
        });
      });
    });
    request.setTimeout(timeoutMs, () => request.destroy(new Error("Translation request timed out")));
    request.on("error", reject);
    if (options.body) request.write(options.body);
    request.end();
  });
}

async function translateIndividually(entries, language) {
  const translated = {};
  const concurrency = 2;
  for (let index = 0; index < entries.length; index += concurrency) {
    const chunk = entries.slice(index, index + concurrency);
    const results = await Promise.all(chunk.map((entry) => translateBatch([entry], language)));
    results.forEach((result) => Object.assign(translated, result));
    if (index % (concurrency * 5) === 0 || index + concurrency >= entries.length) {
      process.stdout.write(`  ${language} strings ${Math.min(index + concurrency, entries.length)}/${entries.length}\n`);
    }
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  return translated;
}

async function translateBatch(entries, language) {
  const lingvaLanguage = language === "zh-CN" ? "zh" : language;
  if (entries.length === 1) {
    const [key, source] = entries[0];
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        const lingvaUrl = `https://lingva.ml/api/v1/en/${encodeURIComponent(lingvaLanguage)}/${encodeURIComponent(source)}`;
        const lingvaResponse = await requestText(lingvaUrl, {
          headers: { accept: "application/json" },
          timeoutMs: 10000,
        });
        if (lingvaResponse.ok) {
          const payload = JSON.parse(lingvaResponse.text);
          const value = String(payload.translation || "").trim();
          const isPhrase = /[A-Za-z].*\s+[A-Za-z]/.test(source);
          if (value && (!isPhrase || value !== source)) return { [key]: value };
        }
      } catch (_) {
        // Retry transient provider failures.
      }
      await new Promise((resolve) => setTimeout(resolve, 500 * (attempt + 1)));
    }
    try {
      const target = language === "zh-CN" ? "zh-CN" : language;
      const memoryUrl = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(source)}&langpair=en|${encodeURIComponent(target)}`;
      const memoryResponse = await requestText(memoryUrl, {
        headers: { accept: "application/json" },
        timeoutMs: 10000,
      });
      if (memoryResponse.ok) {
        const payload = JSON.parse(memoryResponse.text);
        const value = decodeHtml(payload?.responseData?.translatedText || "").trim();
        if (value && value.toLowerCase() !== "null") return { [key]: value };
      }
    } catch (_) {
      // Preserve the source only when both translation services are unavailable.
    }
    return { [key]: source };
  }

  const lingvaSeparator = " ||| ";
  const lingvaQuery = ["Translate interface text"]
    .concat(entries.map(([, value]) => String(value).replace(/[\r\n]+/g, " ")))
    .join(lingvaSeparator);
  try {
    const lingvaUrl = `https://lingva.ml/api/v1/en/${encodeURIComponent(lingvaLanguage)}/${encodeURIComponent(lingvaQuery)}`;
    const lingvaResponse = await requestText(lingvaUrl, { headers: { accept: "application/json" } });
    if (lingvaResponse.ok) {
      const lingvaPayload = JSON.parse(lingvaResponse.text);
      let lines = String(lingvaPayload.translation || "")
        .split(/\s*\|\|\|\s*/)
        .map((value) => value.trim());
      if (lines.length === entries.length + 1) lines = lines.slice(1);
      if (lines.length === entries.length) {
        return Object.fromEntries(entries.map(([key], index) => [key, lines[index] || entries[index][1]]));
      }
    }
    if (entries.length > 1) return translateIndividually(entries, language);
  } catch (_) {
    if (entries.length > 1) return translateIndividually(entries, language);
  }

  return {};
}

async function translatePack(source, language) {
  const entries = Object.entries(source);
  return translateIndividually(entries, language);
}

const [desktopSource, mobileSource, websiteSource, websitePatchSource] = await Promise.all([
  fs.readFile(desktopPath, "utf8"),
  fs.readFile(mobilePath, "utf8"),
  fs.readFile(websitePath, "utf8"),
  fs.readFile(websitePatchPath, "utf8"),
]);

function evaluateDesktopPacks(source) {
  const start = source.indexOf("const i18n = {};");
  const end = source.indexOf("// fallback: other languages", start);
  const code = source
    .slice(start, end)
    .replace("const i18n = {};", "var i18n = globalThis.i18n = {};");
  const context = { DueFluxFeatureLocales: {} };
  context.window = context;
  vm.runInNewContext(code, context, { filename: "desktop-locales.js" });
  return context.i18n;
}

function evaluateMobilePacks(source) {
  const start = source.indexOf("const translations = {");
  const end = source.indexOf("const THEMES =", start);
  const code = source
    .slice(start, end)
    .replace("const translations = {", "var translations = globalThis.translations = {");
  const context = { featureLocales: {} };
  vm.runInNewContext(code, context, { filename: "mobile-locales.js" });
  const overlays = ["mailSyncI18n", "mailSyncPlanI18n", "invoiceDeleteI18n"];
  overlays.forEach((name) => {
    const overlay = extractObject(source, name);
    Object.keys(overlay).forEach((language) => {
      context.translations[language] = {
        ...(context.translations[language] || {}),
        ...overlay[language],
      };
    });
  });
  return context.translations;
}

const desktopPacks = evaluateDesktopPacks(desktopSource);
const mobilePacks = evaluateMobilePacks(mobileSource);
const websitePacks = extractObject(websiteSource, "translations");
for (const patchName of ["i18nCompletenessPatchByLang", "i18nLandingPatchByLang"]) {
  const patch = extractObject(websiteSource, patchName);
  Object.keys(patch).forEach((language) => {
    websitePacks[language] = { ...(websitePacks[language] || {}), ...patch[language] };
  });
}
const websitePatch = JSON.parse(websitePatchSource);
Object.keys(websitePatch).forEach((language) => {
  websitePacks[language] = { ...(websitePacks[language] || {}), ...websitePatch[language] };
});
let existingLocales = {};
try {
  existingLocales = require(existingLocalesPath);
} catch (_) {
  existingLocales = {};
}
const english = { ...desktopPacks.en, ...mobilePacks.en };
const romanian = { ...english, ...desktopPacks.ro, ...mobilePacks.ro };
const targets = {
  zh: "zh-CN",
  ja: "ja",
  ru: "ru",
  es: "es",
  ar: "ar",
  tr: "tr",
  hu: "hu",
  de: "de",
  fr: "fr",
  it: "it",
};
const packs = { en: english, ro: romanian };
const onlyLanguage = String(process.env.DF_ONLY_LANG || "").trim();
for (const [code, target] of Object.entries(targets)) {
  if (onlyLanguage && code !== onlyLanguage) {
    packs[code] = { ...english, ...(existingLocales[code] || {}) };
    continue;
  }
  const prefilled = {};
  const websiteByEnglish = new Map();
  Object.keys(websitePacks.en || {}).forEach((key) => {
    const englishValue = websitePacks.en[key];
    const translatedValue = websitePacks[code]?.[key];
    if (englishValue && translatedValue && translatedValue !== englishValue) {
      websiteByEnglish.set(String(englishValue).trim(), translatedValue);
    }
  });
  Object.entries(english).forEach(([key, englishValue]) => {
    const candidates = [
      desktopPacks[code]?.[key],
      mobilePacks[code]?.[key],
      existingLocales[code]?.[key],
      websiteByEnglish.get(String(englishValue).trim()),
    ];
    const translated = candidates.find((value) => {
      if (!value || value === englishValue) return false;
      return !/[|\u200B\u200C\u200D\uFEFF]/u.test(String(value));
    });
    if (translated) prefilled[key] = translated;
  });
  const pending = Object.fromEntries(Object.entries(english).filter(([key]) => !prefilled[key]));
  process.stdout.write(`${code}: ${Object.keys(prefilled).length} reused, ${Object.keys(pending).length} to translate\n`);
  if (process.env.DF_DUMP_PENDING === code) {
    await fs.writeFile(path.join(root, `.pending-${code}.json`), JSON.stringify(pending, null, 2), "utf8");
    process.stdout.write(`Pending ${code} strings dumped.\n`);
    process.exit(0);
  }
  const translated = process.env.DF_TRANSLATE_OFFLINE === "1"
    ? pending
    : await translatePack(pending, target);
  packs[code] = { ...prefilled, ...translated };
  process.stdout.write(`Completed ${code}: ${Object.keys(packs[code]).length} keys\n`);
}

const editorialOverrides = {
  ar: {
    phone_panel_desc: "وصّل هاتفك للتحقق من الملكية، ثم أعد توجيه رسائل فواتير SMS/WhatsApp إلى صندوق وارد DueFlux.",
    phone_panel_inbox_hint: "استخدم هذا الرقم لإعادة توجيه رسائل فواتير SMS/WhatsApp للمزامنة.",
    profile_phone_hint: "يُستخدم للتحقق عبر SMS والتنبيهات والتقاط الفواتير على الهاتف مستقبلاً (SMS/WhatsApp).",
    settings_auto_status_hint: "يكتشف تلقائيًا الفواتير المدفوعة أو المتأخرة من تواريخ الاستحقاق وتأكيدات الدفع.",
    settings_phone_code_placeholder: "رمز مكوّن من 6 أرقام",
    settings_phone_inbox_hint: "أعد توجيه رسائل فواتير SMS/WhatsApp إلى هذا الرقم.",
    settings_phone_subtitle: "وصّل رقم هاتف للتحقق عبر SMS والتنبيهات والتقاط فواتير SMS/WhatsApp.",
  },
  ru: {
    phone_panel_desc: "Подключите телефон для подтверждения владения, затем пересылайте SMS/WhatsApp со счетами во входящие DueFlux.",
    phone_panel_inbox_hint: "Используйте этот номер для пересылки SMS/WhatsApp со счетами для синхронизации.",
    profile_phone_hint: "Используется для проверки по SMS, уведомлений и будущего импорта счетов с телефона (SMS/WhatsApp).",
    settings_auto_status_hint: "Автоматически определяет оплату или просрочку по срокам счетов и подтверждениям платежей.",
    settings_exchange_rate_updated: "Курсы валют обновлены: {{time}}",
    settings_phone_inbox_hint: "Пересылайте SMS/WhatsApp со счетами на этот номер.",
    settings_phone_subtitle: "Подключите номер телефона для проверки по SMS, уведомлений и импорта счетов из SMS/WhatsApp.",
    settings_phone_title: "Входящие с телефона",
    security_status: "Статус проверки",
  },
  es: {
    phone_panel_desc: "Conecta tu teléfono para verificar que te pertenece y reenvía los mensajes de facturas por SMS/WhatsApp al buzón de DueFlux.",
    phone_panel_inbox_hint: "Usa este número para reenviar mensajes de facturas por SMS/WhatsApp y sincronizarlos.",
    profile_phone_hint: "Se usa para verificación por SMS, alertas y futura captura móvil de facturas (SMS/WhatsApp).",
    settings_auto_status_hint: "Detecta automáticamente pagos y retrasos a partir de las fechas de vencimiento y las confirmaciones de pago.",
    settings_legal_title: "Información legal",
    settings_phone_inbox_hint: "Reenvía los mensajes de facturas por SMS/WhatsApp a este número.",
    settings_phone_subtitle: "Conecta un número para verificación por SMS, alertas y captura de facturas por SMS/WhatsApp.",
    settings_phone_title: "Buzón del teléfono",
  },
  ja: {
    phone_panel_desc: "電話番号の所有権を確認し、請求書のSMS/WhatsAppメッセージをDueFlux受信箱へ転送します。",
    phone_panel_inbox_hint: "同期する請求書のSMS/WhatsAppメッセージをこの番号へ転送してください。",
    phone_panel_inbox_number_missing: "未設定",
    profile_phone_hint: "SMS認証、通知、今後のモバイル請求書取り込み（SMS/WhatsApp）に使用します。",
    settings_auto_status_hint: "請求書の支払期限と支払い確認から、支払い済みまたは延滞を自動判定します。",
    settings_phone_inbox_hint: "請求書のSMS/WhatsAppメッセージをこの番号へ転送してください。",
    settings_phone_subtitle: "SMS認証、通知、SMS/WhatsApp請求書取り込み用の電話番号を接続します。",
  },
  zh: {
    phone_panel_desc: "连接手机以验证所有权，然后将发票短信或WhatsApp消息转发到DueFlux收件箱。",
    phone_panel_inbox_hint: "使用此号码转发发票短信或WhatsApp消息以进行同步。",
    profile_phone_hint: "用于短信验证、提醒以及后续的移动端发票采集（短信/WhatsApp）。",
    settings_auto_status_hint: "根据发票到期日和付款确认自动识别已付款或逾期状态。",
    settings_phone_inbox_hint: "将发票短信或WhatsApp消息转发到此号码。",
    settings_phone_subtitle: "连接电话号码，用于短信验证、提醒以及短信/WhatsApp发票采集。",
  },
};
Object.entries(editorialOverrides).forEach(([language, values]) => {
  packs[language] = { ...(packs[language] || english), ...values };
});

if (process.env.DF_TRANSLATE_DRY === "1") {
  process.stdout.write("Dry run complete; locale bundles were not changed.\n");
  process.exit(0);
}

Object.keys(packs).forEach((language) => {
  Object.keys(english).forEach((key) => {
    const expectedTokens = String(english[key] || "").match(/\{\{[^}]+\}\}/g) || [];
    if (!expectedTokens.length) return;
    let index = 0;
    packs[language][key] = String(packs[language][key] || english[key]).replace(
      /\{\{[^}]+\}\}/g,
      () => expectedTokens[index++] || expectedTokens[expectedTokens.length - 1]
    );
  });
});

const output = `// Generated static complete UI translations. Regenerate with scripts/generate-feature-locales.mjs.\n` +
  `(function (root, factory) {\n` +
  `  const value = factory();\n` +
  `  if (typeof module === "object" && module.exports) module.exports = value;\n` +
  `  else root.DueFluxFeatureLocales = value;\n` +
  `})(typeof globalThis !== "undefined" ? globalThis : this, function () {\n` +
  `  return ${JSON.stringify(packs, null, 2)};\n` +
  `});\n`;

const destinations = [
  path.join(root, "DueFlux_app_desktop", "Windows", "renderer", "feature-locales.js"),
  path.join(root, "DueFlux_app_desktop", "Linux", "renderer", "feature-locales.js"),
  path.join(root, "DueFlux_app_mobile", "expo", "featureLocales.js"),
];
await Promise.all(destinations.map((destination) => fs.writeFile(destination, output, "utf8")));
process.stdout.write(`Wrote ${destinations.length} locale bundles with ${Object.keys(english).length} keys each.\n`);
