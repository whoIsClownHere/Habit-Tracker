const QUOTABLE_RANDOM_URL = "https://api.quotable.io/quotes/random?limit=1&maxLength=130&tags=wisdom|success|inspirational";
const DAILY_QUOTE_STORAGE_PREFIX = "hendle.dailyQuote.v1";
const DEFAULT_TIMEOUT_MS = 2200;

const FALLBACK_QUOTES = [
  "Small days, kept honestly, become a life you can point to.",
  "Do the work that keeps tomorrow open.",
  "Progress is a record before it becomes a result.",
  "The day does not need to be dramatic. It needs to be kept.",
  "A clear line of effort is stronger than a loud promise.",
  "Consistency is a quiet form of courage.",
  "Keep the next promise small enough to finish and serious enough to matter.",
  "The record grows where attention returns."
];

export function getLocalQuoteDate(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getCachedDailyQuote({ date = getLocalQuoteDate(), language = "en" } = {}) {
  return readCachedQuote(date, language);
}

export async function getDailyQuote({ date = getLocalQuoteDate(), language = "en", timeoutMs = DEFAULT_TIMEOUT_MS } = {}) {
  const cachedQuote = readCachedQuote(date, language);
  if (cachedQuote) return cachedQuote;

  const apiQuote = await fetchQuotableQuote({ date, language, timeoutMs });
  const quote = apiQuote || getFallbackDailyQuote({ date, language });

  writeCachedQuote(quote);
  return quote;
}

function getFallbackDailyQuote({ date, language }) {
  const index = Math.abs(hashString(`${language}:${date}`)) % FALLBACK_QUOTES.length;
  return {
    text: FALLBACK_QUOTES[index],
    source: "Hendle",
    language,
    date
  };
}

async function fetchQuotableQuote({ date, language, timeoutMs }) {
  if (typeof fetch !== "function") return null;

  const controller = typeof AbortController === "function" ? new AbortController() : null;
  let timeoutId = null;

  try {
    const timeoutQuote = new Promise(resolve => {
      timeoutId = setTimeout(() => {
        controller?.abort();
        resolve(null);
      }, Math.max(1, timeoutMs));
    });

    const apiQuote = fetch(QUOTABLE_RANDOM_URL, {
      cache: "no-store",
      signal: controller?.signal
    })
      .then(async response => {
        if (!response.ok) return null;

        const payload = await response.json();
        return normalizeQuotableResponse(payload, { date, language });
      })
      .catch(() => null);

    return await Promise.race([apiQuote, timeoutQuote]);
  } catch {
    return null;
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

function normalizeQuotableResponse(payload, { date, language }) {
  const quote = Array.isArray(payload) ? payload[0] : payload;
  if (!quote || typeof quote !== "object") return null;

  const text = normalizeText(quote.content || quote.text);
  if (!text) return null;

  const author = normalizeText(quote.author);
  return {
    text,
    ...(author ? { author } : {}),
    source: "Quotable",
    language,
    date
  };
}

function readCachedQuote(date, language) {
  try {
    const rawQuote = localStorage.getItem(getStorageKey(date, language));
    if (!rawQuote) return null;

    const quote = JSON.parse(rawQuote);
    if (!isValidQuote(quote, date, language)) return null;

    return quote;
  } catch {
    return null;
  }
}

function writeCachedQuote(quote) {
  try {
    localStorage.setItem(getStorageKey(quote.date, quote.language), JSON.stringify(quote));
  } catch {
    // A private or full storage area should never block the dashboard.
  }
}

function isValidQuote(quote, date, language) {
  return Boolean(
    quote
      && typeof quote === "object"
      && quote.date === date
      && quote.language === language
      && typeof quote.text === "string"
      && quote.text.trim()
      && typeof quote.source === "string"
      && (!quote.author || typeof quote.author === "string")
  );
}

function normalizeText(value) {
  return typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "";
}

function getStorageKey(date, language) {
  return `${DAILY_QUOTE_STORAGE_PREFIX}.${language}.${date}`;
}

function hashString(value) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = ((hash << 5) - hash) + value.charCodeAt(index);
    hash |= 0;
  }
  return hash;
}
