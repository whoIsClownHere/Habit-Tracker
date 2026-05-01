import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { dictionaries } from "../src/app/locales/index.js";

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

const filesWithTranslationKeys = [
  "index.html",
  ...(await listJavaScriptFiles("src/app"))
    .filter(file => !file.includes(`${path.sep}locales${path.sep}`))
    .sort()
];
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

async function listJavaScriptFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(entries.map(async entry => {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return listJavaScriptFiles(fullPath);
    return entry.isFile() && entry.name.endsWith(".js") ? [fullPath] : [];
  }));

  return files.flat();
}

function fail(message) {
  console.error(message);
  process.exit(1);
}
