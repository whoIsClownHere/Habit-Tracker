export function parseDate(dateKey) {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function dateRange(startDate, endDate) {
  const dates = [];
  const cursor = new Date(startDate);
  cursor.setHours(0, 0, 0, 0);
  const end = new Date(endDate);
  end.setHours(0, 0, 0, 0);

  while (cursor <= end) {
    dates.push(toDateInputValue(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }

  return dates;
}

export function parseDateKey(dateKey) {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function toDateInputValue(date) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

export function formatShortDate(dateKey, locale = "en-US") {
  const [year, month, day] = dateKey.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString(locale, { day: "2-digit", month: "2-digit" });
}

export function formatFullDate(date, locale = "en-US") {
  return date.toLocaleDateString(locale, { day: "numeric", month: "long" });
}

export function getWeekDays(date) {
  return getWeekDaysFromStart(getWeekStart(date));
}

export function getWeekDaysFromStart(startDate) {
  const start = new Date(startDate);
  const days = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    days.push(d);
  }
  return days;
}

export function getMonthDays(date) {
  const year = date.getFullYear();
  const month = date.getMonth();
  const days = [];
  const cursor = new Date(year, month, 1);
  while (cursor.getMonth() === month) {
    days.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return days;
}

export function getWeekStart(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d;
}

export function lastNDays(n) {
  const days = [];
  const start = new Date();
  start.setDate(start.getDate() - n + 1);

  for (let i = 0; i < n; i++) {
    const day = new Date(start);
    day.setDate(start.getDate() + i);
    days.push(toDateInputValue(day));
  }

  return days;
}
