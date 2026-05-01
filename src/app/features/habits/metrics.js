import { parseDateKey, toDateInputValue } from "../../utils/dates.js";

export function createHabitMetrics({ getData, countDoneRecordsForDate }) {
  function getRecord(dateKey, habitId, create = true) {
    if (!getData().records[dateKey]) {
      if (!create) return null;
      getData().records[dateKey] = {};
    }
  
    if (!getData().records[dateKey][habitId]) {
      if (!create) return null;
      getData().records[dateKey][habitId] = { done: false, value: "" };
    }
  
    return getData().records[dateKey][habitId];
  }
  
  function saveRecord(dateKey, habitId, record) {
    if (!getData().records[dateKey]) getData().records[dateKey] = {};
    getData().records[dateKey][habitId] = record;
  }
  
  function calculateStreak(habitId) {
    let streak = 0;
    const cursor = new Date();
  
    for (let i = 0; i < 3650; i++) {
      const key = toDateInputValue(cursor);
      const rec = getData().records[key]?.[habitId];
      if (rec?.done) {
        streak += 1;
        cursor.setDate(cursor.getDate() - 1);
      } else {
        break;
      }
    }
  
    return streak;
  }
  
  function getPreviousDateKey(dateKey) {
    const date = parseDateKey(dateKey);
    date.setDate(date.getDate() - 1);
    return toDateInputValue(date);
  }
  
  function isHabitDoneToday(habitId) {
    const todayKey = toDateInputValue(new Date());
    return Boolean(getData().records[todayKey]?.[habitId]?.done);
  }
  
  function isTodayComplete() {
    if (getData().habits.length === 0) return false;
    const todayKey = toDateInputValue(new Date());
    return countDoneRecordsForDate(todayKey) === getData().habits.length;
  }
  
  function getHabitStreakStartDate(habitId, endDateKey) {
    const cursor = parseDateKey(endDateKey);
    let start = null;
  
    for (let i = 0; i < 3650; i++) {
      const key = toDateInputValue(cursor);
      const rec = getData().records[key]?.[habitId];
      if (rec?.done) {
        start = key;
        cursor.setDate(cursor.getDate() - 1);
      } else {
        break;
      }
    }
  
    return start;
  }
  
  function calculateTotalUntilDate(habitId, endDateKey) {
    let total = 0;
    Object.keys(getData().records).forEach(dateKey => {
      if (dateKey <= endDateKey) {
        const rec = getData().records[dateKey]?.[habitId];
        if (rec?.done) total += Number(rec.value || 0);
      }
    });
    return total;
  }
  
  function calculateTotalBetweenDates(habitId, startDateKey, endDateKey) {
    let total = 0;
    Object.keys(getData().records).forEach(dateKey => {
      if (dateKey >= startDateKey && dateKey <= endDateKey) {
        const rec = getData().records[dateKey]?.[habitId];
        if (rec?.done) total += Number(rec.value || 0);
      }
    });
    return total;
  }
  
  function calculateLifetimeTotal(habitId) {
    let total = 0;
    Object.keys(getData().records).forEach(dateKey => {
      const rec = getData().records[dateKey]?.[habitId];
      if (rec?.done) total += Number(rec.value || 0);
    });
    return total;
  }
  
  function calculateGlobalStreak() {
    return calculateGlobalStreakAtDate(toDateInputValue(new Date()));
  }
  
  function calculateMotivationalGlobalStreak() {
    if (getData().habits.length === 0) return 0;
    if (isTodayComplete()) return calculateGlobalStreak();
  
    const todayKey = toDateInputValue(new Date());
    const yesterdayKey = getPreviousDateKey(todayKey);
    return calculateGlobalStreakAtDate(yesterdayKey);
  }
  
  function getOldestHabit() {
    if (getData().habits.length === 0) return null;
  
    return [...getData().habits].sort((a, b) => {
      const aCreated = a.createdAt || "9999-12-31";
      const bCreated = b.createdAt || "9999-12-31";
      if (aCreated !== bCreated) return aCreated.localeCompare(bCreated);
      return String(a.id).localeCompare(String(b.id));
    })[0];
  }
  
  function calculateGlobalStreakAtDate(dateKey) {
    const oldestHabit = getOldestHabit();
    if (!oldestHabit) return 0;
  
    return calculateStreakAtDate(oldestHabit.id, dateKey);
  }
  
  function calculateStreakAtDate(habitId, dateKey) {
    let streak = 0;
    const cursor = parseDateKey(dateKey);
  
    for (let i = 0; i < 3650; i++) {
      const key = toDateInputValue(cursor);
      const rec = getData().records[key]?.[habitId];
      if (rec?.done) {
        streak += 1;
        cursor.setDate(cursor.getDate() - 1);
      } else {
        break;
      }
    }
  
    return streak;
  }
  
  function calculateProjectedGlobalStreakAtDate(futureDateKey) {
    const todayKey = toDateInputValue(new Date());
    const todayStreak = calculateMotivationalGlobalStreak();
    const futureDate = parseDateKey(futureDateKey);
    const todayDate = parseDateKey(todayKey);
    const daysAhead = Math.ceil((futureDate - todayDate) / 86400000);
    return todayStreak + Math.max(0, daysAhead);
  }

  return {
    getRecord,
    saveRecord,
    calculateStreak,
    getPreviousDateKey,
    isHabitDoneToday,
    isTodayComplete,
    getHabitStreakStartDate,
    calculateTotalUntilDate,
    calculateTotalBetweenDates,
    calculateLifetimeTotal,
    calculateGlobalStreak,
    calculateMotivationalGlobalStreak,
    getOldestHabit,
    calculateGlobalStreakAtDate,
    calculateStreakAtDate,
    calculateProjectedGlobalStreakAtDate
  };
}
