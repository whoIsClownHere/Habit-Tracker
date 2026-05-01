import { readFile } from "node:fs/promises";

const DICTIONARY_RE = /const dictionaries = ([\s\S]*?);\n\nlet currentLocale/;
const filesWithTranslationKeys = ["index.html", "src/app/main.js"];

const i18nSource = await readFile("src/app/i18n.js", "utf8");
const dictionaryMatch = i18nSource.match(DICTIONARY_RE);

if (!dictionaryMatch) {
  fail("Could not find dictionaries in src/app/i18n.js.");
}

const dictionaries = Function(`return ${dictionaryMatch[1]}`)();
const locales = Object.keys(dictionaries);
const baseKeys = Object.keys(dictionaries.en).sort();
let hasFailure = false;

for (const locale of locales) {
  const keys = Object.keys(dictionaries[locale]).sort();
  const missing = baseKeys.filter(key => !keys.includes(key));
  const extra = keys.filter(key => !baseKeys.includes(key));

  if (missing.length || extra.length) {
    hasFailure = true;
    console.error(`[${locale}] dictionary mismatch`);
    if (missing.length) console.error(`  missing: ${missing.join(", ")}`);
    if (extra.length) console.error(`  extra: ${extra.join(", ")}`);
  }
}

const usedKeys = new Set();
const keyPatterns = [
  /\bt\(\s*["']([^"']+)["']/g,
  /\btn\(\s*["']([^"']+)["']/g,
  /data-i18n(?:-[a-z-]+)?="([^"]+)"/g
];

for (const file of filesWithTranslationKeys) {
  const source = await readFile(file, "utf8");
  for (const pattern of keyPatterns) {
    let match;
    while ((match = pattern.exec(source))) {
      usedKeys.add(match[1]);
    }
  }
}

const missingUsedKeys = [...usedKeys]
  .filter(key => !baseKeys.includes(key))
  .sort();

if (missingUsedKeys.length) {
  hasFailure = true;
  console.error("Translation keys used by UI but missing from dictionaries:");
  console.error(missingUsedKeys.join("\n"));
}

if (hasFailure) {
  process.exit(1);
}

console.log(`QA check passed: ${locales.length} locales, ${baseKeys.length} dictionary keys, ${usedKeys.size} UI keys.`);

function fail(message) {
  console.error(message);
  process.exit(1);
}
