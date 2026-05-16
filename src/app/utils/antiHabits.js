import { getWeekStart, parseDateKey, toDateInputValue } from "./dates.js";

export const ANTI_HABIT_TYPE = "anti_habit";
export const ANTI_HABIT_PERIODS = ["week", "month"];

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export function isAntiHabit(habit) {
  return habit?.type === ANTI_HABIT_TYPE;
}

export function getAntiHabitPeriodRange(period, referenceDate = new Date()) {
  const normalizedPeriod = normalizeAntiHabitPeriod(period);
  const date = new Date(referenceDate);
  date.setHours(0, 0, 0, 0);

  const start = normalizedPeriod === "month"
    ? new Date(date.getFullYear(), date.getMonth(), 1)
    : getWeekStart(date);
  const endExclusive = addAntiHabitPeriods(start, 1, normalizedPeriod);

  return {
    start,
    endExclusive,
    startKey: toDateInputValue(start),
    endKey: toDateInputValue(addDays(endExclusive, -1))
  };
}

export function countAntiHabitLogsInRange(logs = [], range) {
  if (!Array.isArray(logs) || !range) return 0;

  return logs.reduce((count, timestamp) => {
    const loggedAt = new Date(timestamp);
    if (Number.isNaN(loggedAt.getTime())) return count;
    return loggedAt >= range.start && loggedAt < range.endExclusive ? count + 1 : count;
  }, 0);
}

export function calculateAntiHabitState(habit, referenceDate = new Date()) {
  const period = normalizeAntiHabitPeriod(habit?.period);
  const startLimit = normalizeNonNegativeInteger(habit?.startLimit, 0);
  const targetLimit = Math.min(startLimit, normalizeNonNegativeInteger(habit?.targetLimit, 0));
  const reduceBy = Math.max(1, normalizeNonNegativeInteger(habit?.reduceBy, 1));
  const reduceEveryPeriods = Math.max(1, normalizeNonNegativeInteger(habit?.reduceEveryPeriods, 1));
  const periodRange = getAntiHabitPeriodRange(period, referenceDate);
  const periodsPassed = countFullAntiHabitPeriodsSince(habit?.startDate || habit?.createdAt, period, referenceDate);
  const reductionsApplied = Math.floor(periodsPassed / reduceEveryPeriods);
  const currentLimit = Math.max(targetLimit, startLimit - reductionsApplied * reduceBy);
  const usage = countAntiHabitLogsInRange(habit?.logs, periodRange);
  const remaining = Math.max(0, currentLimit - usage);
  const nextReduction = getNextAntiHabitReduction({
    period,
    startDate: habit?.startDate || habit?.createdAt,
    startLimit,
    targetLimit,
    reduceBy,
    reduceEveryPeriods,
    reductionsApplied
  });

  return {
    period,
    periodRange,
    periodsPassed,
    reductionsApplied,
    currentLimit,
    usage,
    remaining,
    status: getAntiHabitStatus(usage, currentLimit),
    nextReductionDate: nextReduction.dateKey,
    nextLimit: nextReduction.limit
  };
}

export function getAntiHabitStatus(usage, limit) {
  if (usage > limit) return "over";
  if (usage === limit) return "limit";
  if (usage >= limit * 0.7) return "warning";
  return "safe";
}

export function normalizeAntiHabitPeriod(period) {
  return period === "month" ? "month" : "week";
}

export function normalizeNonNegativeInteger(value, fallback = 0) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(0, Math.floor(number));
}

function countFullAntiHabitPeriodsSince(startDateKey, period, referenceDate) {
  const startDate = getValidDateKey(startDateKey)
    ? parseDateKey(startDateKey)
    : new Date(referenceDate);
  const currentPeriodStart = getAntiHabitPeriodRange(period, referenceDate).start;
  const startPeriodStart = getAntiHabitPeriodRange(period, startDate).start;
  const scheduleBase = isSameLocalDate(startDate, startPeriodStart)
    ? startPeriodStart
    : addAntiHabitPeriods(startPeriodStart, 1, period);

  if (currentPeriodStart <= scheduleBase) return 0;
  return countAntiHabitPeriodsBetween(scheduleBase, currentPeriodStart, period);
}

function getNextAntiHabitReduction(config) {
  const startDateKey = getValidDateKey(config.startDate)
    ? config.startDate
    : toDateInputValue(new Date());
  const startDate = parseDateKey(startDateKey);
  const startPeriodStart = getAntiHabitPeriodRange(config.period, startDate).start;
  const scheduleBase = isSameLocalDate(startDate, startPeriodStart)
    ? startPeriodStart
    : addAntiHabitPeriods(startPeriodStart, 1, config.period);
  const nextReductionNumber = config.reductionsApplied + 1;
  const nextPeriodOffset = nextReductionNumber * config.reduceEveryPeriods;
  const nextDate = addAntiHabitPeriods(scheduleBase, nextPeriodOffset, config.period);
  const nextLimit = Math.max(config.targetLimit, config.startLimit - nextReductionNumber * config.reduceBy);

  return {
    dateKey: toDateInputValue(nextDate),
    limit: nextLimit
  };
}

function countAntiHabitPeriodsBetween(startDate, endDate, period) {
  if (period === "month") {
    return (endDate.getFullYear() - startDate.getFullYear()) * 12 + endDate.getMonth() - startDate.getMonth();
  }

  return Math.floor((endDate - startDate) / WEEK_MS);
}

function addAntiHabitPeriods(date, count, period) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);

  if (period === "month") {
    next.setMonth(next.getMonth() + count);
  } else {
    next.setDate(next.getDate() + count * 7);
  }

  return next;
}

function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function getValidDateKey(dateKey) {
  return typeof dateKey === "string" && /^\d{4}-\d{2}-\d{2}$/.test(dateKey) ? dateKey : "";
}

function isSameLocalDate(left, right) {
  return left.getFullYear() === right.getFullYear()
    && left.getMonth() === right.getMonth()
    && left.getDate() === right.getDate();
}
