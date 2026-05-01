import { dictionaries } from "./locales/index.js";

const DEFAULT_LOCALE = "en";
const STORAGE_KEY = "hendle.locale";
const LEGACY_STORAGE_KEY = "habitline.locale";

export const SUPPORTED_LOCALES = [
  { code: "en", label: "English" },
  { code: "ru", label: "Русский" },
  { code: "de", label: "Deutsch" },
  { code: "es", label: "Español" },
  { code: "fr", label: "Français" }
];

let currentLocale = getInitialLocale();

export function initLocale() {
  document.documentElement.lang = currentLocale;
  document.title = t("document.title");
  return currentLocale;
}

export function getLocale() {
  return currentLocale;
}

export function getDateLocale() {
  return dictionaries[currentLocale]?._dateLocale || dictionaries[DEFAULT_LOCALE]._dateLocale;
}

export function setLocale(locale) {
  currentLocale = normalizeLocale(locale);
  localStorage.setItem(STORAGE_KEY, currentLocale);
  localStorage.removeItem(LEGACY_STORAGE_KEY);
  document.documentElement.lang = currentLocale;
  document.title = t("document.title");
}

export function t(key, params = {}) {
  const value = resolveValue(key, currentLocale) ?? resolveValue(key, DEFAULT_LOCALE);
  if (value === undefined) return key;
  if (typeof value === "object") return interpolate(value.other || value.one || key, params);
  return interpolate(value, params);
}

export function tn(key, count, params = {}) {
  const value = resolveValue(key, currentLocale) ?? resolveValue(key, DEFAULT_LOCALE);
  if (!value || typeof value !== "object") {
    return t(key, { count, ...params });
  }

  const category = new Intl.PluralRules(currentLocale).select(Number(count));
  const template = value[category] || value.other || value.one || "";
  return interpolate(template, { count, ...params });
}

export function applyStaticTranslations(root = document) {
  document.documentElement.lang = currentLocale;
  document.title = t("document.title");

  root.querySelectorAll("[data-i18n]").forEach(element => {
    element.textContent = t(element.dataset.i18n);
  });

  root.querySelectorAll("[data-i18n-placeholder]").forEach(element => {
    element.setAttribute("placeholder", t(element.dataset.i18nPlaceholder));
  });

  root.querySelectorAll("[data-i18n-aria-label]").forEach(element => {
    element.setAttribute("aria-label", t(element.dataset.i18nAriaLabel));
  });

  root.querySelectorAll("[data-i18n-title]").forEach(element => {
    element.setAttribute("title", t(element.dataset.i18nTitle));
  });
}

function getInitialLocale() {
  const storedLocale = localStorage.getItem(STORAGE_KEY);
  if (storedLocale) return normalizeLocale(storedLocale);

  const legacyLocale = localStorage.getItem(LEGACY_STORAGE_KEY);
  if (legacyLocale) {
    const locale = normalizeLocale(legacyLocale);
    localStorage.setItem(STORAGE_KEY, locale);
    localStorage.removeItem(LEGACY_STORAGE_KEY);
    return locale;
  }

  return DEFAULT_LOCALE;
}

function normalizeLocale(locale) {
  return SUPPORTED_LOCALES.some(item => item.code === locale) ? locale : DEFAULT_LOCALE;
}

function resolveValue(key, locale) {
  return dictionaries[locale]?.[key];
}

function interpolate(template, params) {
  return String(template).replace(/\{(\w+)\}/g, (_, name) => {
    return params[name] === undefined || params[name] === null ? "" : String(params[name]);
  });
}
