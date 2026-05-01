import {
  LEGACY_THEME_STORAGE_KEY,
  THEME_STORAGE_KEY
} from "../config/constants.js";

export function applyThemePreference(themeToggle, translate) {
  const savedTheme = getSavedTheme();
  document.body.classList.toggle("dark", savedTheme === "dark");
  themeToggle.textContent = savedTheme === "dark" ? translate("theme.light") : translate("theme.dark");
}

export function toggleThemePreference(themeToggle, translate) {
  const isDark = document.body.classList.toggle("dark");
  localStorage.setItem(THEME_STORAGE_KEY, isDark ? "dark" : "light");
  localStorage.removeItem(LEGACY_THEME_STORAGE_KEY);
  themeToggle.textContent = isDark ? translate("theme.light") : translate("theme.dark");
}

function getSavedTheme() {
  const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
  if (savedTheme) return savedTheme;

  const legacyTheme = localStorage.getItem(LEGACY_THEME_STORAGE_KEY);
  if (legacyTheme) {
    localStorage.setItem(THEME_STORAGE_KEY, legacyTheme);
    localStorage.removeItem(LEGACY_THEME_STORAGE_KEY);
    return legacyTheme;
  }

  return "light";
}
