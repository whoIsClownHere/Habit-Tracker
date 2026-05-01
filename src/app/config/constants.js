export const PRODUCT_NAME = "Hendle";

export const TODAY_PAGE_SIZE = 6;
export const DAY_REVIEW_LIMIT = 80;
export const HABIT_MANAGER_LIMIT = 80;
export const PROGRESS_OPTION_LIMIT = 200;
export const PROJECTION_LIMIT = 80;
export const TODAY_SEARCH_SCAN_LIMIT = 5000;

export const TEST_ACCOUNT = {
  uid: "local-test-account",
  email: "test@hendle.local",
  legacyEmail: "test@habitline.local",
  displayName: "Hendle QA",
  isTestAccount: true
};

export const TEST_ACCOUNT_PASSWORD_HASH = "937e8d5fbb48bd4949536cd65b8d35c426b80d2f830c5c308e2cdec422ae2244";
export const TEST_ACCOUNT_ALLOWED_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);

export const TEST_SESSION_KEY = "hendle.testSession";
export const TEST_DATA_KEY = "hendle.testData";
export const LEGACY_TEST_SESSION_KEY = "habitline.testSession";
export const LEGACY_TEST_DATA_KEY = "habitline.testData";

export const THEME_STORAGE_KEY = "hendle.theme";
export const LEGACY_THEME_STORAGE_KEY = "habitTheme";

export const USER_BACKUP_PREFIX = "hendle.userBackup.";
