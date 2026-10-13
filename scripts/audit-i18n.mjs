import fs from "node:fs/promises";
import path from "node:path";
import vm from "node:vm";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const root = path.resolve(import.meta.dirname, "..");
const featureLocales = require(path.join(root, "DueFlux_app_mobile", "expo", "featureLocales.js"));
const desktopPath = path.join(root, "DueFlux_app_desktop", "Windows", "renderer", "app.js");
const mobilePath = path.join(root, "DueFlux_app_mobile", "expo", "App.js");
const expectedLanguages = ["ro", "hu", "de", "fr", "en", "it", "tr", "zh", "ar", "ru", "es", "ja"];

function collectStaticKeys(source) {
  const keys = new Set();
  for (const match of source.matchAll(/\b(?:t|translate|field|select|button)\(\s*["']([^"']+)["']\s*[,)]/g)) keys.add(match[1]);
  for (const match of source.matchAll(/labelKey=\{?['"]([^'"]+)['"]/g)) keys.add(match[1]);
  for (const key of ['sync_center', 'action_reminder', 'collaboration', 'review_document', 'invoice_search_label',
    ...['owner', 'admin', 'operator', 'accountant', 'viewer', 'member'].map(role => 'role_' + role),
    ...['scheduled', 'processing', 'sent', 'delivered', 'failed', 'cancelled', 'ready'].map(status => 'delivery_' + status)]) keys.add(key);
  return [...keys].sort();
}

function extractObject(source, name) {
  const declarationIndex = source.indexOf(`const ${name} =`);
  if (declarationIndex < 0) throw new Error(`Missing ${name}`);
  const start = source.indexOf("{", declarationIndex);
  let depth = 0;
  let quote = "";
  let escaped = false;
  for (let index = start; index < source.length; index += 1) {
    const char = source[index];
    if (quote) {
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === quote) quote = "";
      continue;
    }
    if (char === '"' || char === "'" || char === "`") {
      quote = char;
      continue;
    }
    if (char === "{") depth += 1;
    if (char === "}" && --depth === 0) {
      return vm.runInNewContext(`(${source.slice(start, index + 1)})`);
    }
  }
  throw new Error(`Unclosed ${name}`);
}

function evaluateDesktop(source) {
  const start = source.indexOf("const i18n = {};");
  const end = source.indexOf("// fallback: other languages", start);
  const code = source
    .slice(start, end)
    .replace("const i18n = {};", "var i18n = globalThis.i18n = {};");
  const context = { DueFluxFeatureLocales: featureLocales };
  context.window = context;
  vm.runInNewContext(code, context, { filename: "desktop-i18n.js" });
  return context.i18n;
}

function evaluateMobile(source) {
  const start = source.indexOf("const translations = {");
  const end = source.indexOf("const THEMES =", start);
  const code = source
    .slice(start, end)
    .replace("const translations = {", "var translations = globalThis.translations = {");
  const context = { featureLocales };
  vm.runInNewContext(code, context, { filename: "mobile-i18n.js" });
  ["mailSyncI18n", "mailSyncPlanI18n", "invoiceDeleteI18n"].forEach((name) => {
    const overlay = extractObject(source, name);
    Object.keys(overlay).forEach((language) => {
      context.translations[language] = {
        ...(context.translations[language] || {}),
        ...overlay[language],
      };
    });
  });
  Object.keys(context.translations).forEach((language) => {
    const current = context.translations[language];
    const english = context.translations.en;
    Object.keys(featureLocales[language] || {}).forEach((key) => {
      if (!current[key] || current[key] === english[key]) current[key] = featureLocales[language][key];
    });
    context.translations[language] = current;
  });
  return context.translations;
}

function auditSurface(name, source, packs) {
  const usedKeys = collectStaticKeys(source);
  const missingLanguages = expectedLanguages.filter((code) => !packs[code]);
  const missingByLanguage = {};
  const english = packs.en || {};
  const unchangedByLanguage = {};
  const tokenMismatchesByLanguage = {};

  expectedLanguages.forEach((code) => {
    const pack = packs[code] || {};
    missingByLanguage[code] = usedKeys.filter((key) => !pack[key]);
    unchangedByLanguage[code] = usedKeys.filter((key) => {
      if (code === "en" || !pack[key] || !english[key]) return false;
      return pack[key] === english[key] && !/^(DueFlux|CSV|JSON|HTML|TXT|PDF|OAuth|Gmail|Outlook|Fast Reports)/i.test(pack[key]);
    });
    tokenMismatchesByLanguage[code] = usedKeys.filter((key) => {
      const expected = String(english[key] || "").match(/\{\{[^}]+\}\}/g) || [];
      const actual = String(pack[key] || "").match(/\{\{[^}]+\}\}/g) || [];
      return expected.sort().join("|") !== actual.sort().join("|");
    });
  });

  return {
    name,
    languages: Object.keys(packs).length,
    usedKeys: usedKeys.length,
    missingLanguages,
    missingByLanguage,
    unchangedByLanguage,
    tokenMismatchesByLanguage,
  };
}

const [desktopSource, mobileSource] = await Promise.all([
  fs.readFile(desktopPath, "utf8"),
  fs.readFile(mobilePath, "utf8"),
]);
const reports = [
  auditSurface("desktop", desktopSource + await fs.readFile(path.join(root, 'DueFlux_app_desktop/Windows/renderer/trust-controls.js'), 'utf8'), evaluateDesktop(desktopSource)),
  auditSurface("mobile", mobileSource + await fs.readFile(path.join(root, 'DueFlux_app_mobile/expo/TrustPanel.js'), 'utf8'), evaluateMobile(mobileSource)),
];

let failed = false;
reports.forEach((report) => {
  const missingCount = Object.values(report.missingByLanguage).reduce((sum, keys) => sum + keys.length, 0);
  const tokenMismatchCount = Object.values(report.tokenMismatchesByLanguage).reduce((sum, keys) => sum + keys.length, 0);
  if (report.missingLanguages.length || missingCount || tokenMismatchCount) failed = true;
  console.log(`${report.name}: ${report.languages} languages, ${report.usedKeys} static UI keys, ${missingCount} missing`);
  expectedLanguages.forEach((code) => {
    const unchanged = report.unchangedByLanguage[code].length;
    const missing = report.missingByLanguage[code].length;
    const tokenMismatch = report.tokenMismatchesByLanguage[code].length;
    console.log(`  ${code}: missing=${missing}, token-mismatch=${tokenMismatch}, review-identical=${unchanged}`);
    if (tokenMismatch) console.log(`    token keys: ${report.tokenMismatchesByLanguage[code].join(", ")}`);
    if (process.env.DF_AUDIT_DETAILS === code && unchanged) {
      console.log(`    review keys: ${report.unchangedByLanguage[code].join(", ")}`);
    }
  });
});

const persistenceChecks = {
  desktopLanguageLocal: /localStorage\.setItem\("df_lang"/.test(desktopSource),
  desktopLanguageCloud: /persistUserPreference\(\{\s*lang:/.test(desktopSource),
  mobileLanguageLocal: /AsyncStorage\.setItem\(MOBILE_LANGUAGE_KEY/.test(mobileSource),
  mobileLanguageCloud: /\{\s*lang:\s*nextLang/.test(mobileSource),
};
console.log("Language persistence:", persistenceChecks);
if (Object.values(persistenceChecks).some((value) => !value)) failed = true;

if (failed) process.exitCode = 1;
