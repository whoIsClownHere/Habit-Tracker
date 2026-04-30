import { initializeApp } from "https://www.gstatic.com/firebasejs/12.12.1/firebase-app.js";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.12.1/firebase-auth.js";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.12.1/firebase-firestore.js";
import { firebaseConfig } from "./config/firebaseConfig.js";
import {
  dateRange,
  formatFullDate,
  formatShortDate,
  getMonthDays,
  getWeekDaysFromStart,
  getWeekStart,
  lastNDays,
  parseDate,
  parseDateKey,
  toDateInputValue
} from "./utils/dates.js";
import { escapeHtml } from "./utils/html.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();
const db = getFirestore(app);
const TODAY_PAGE_SIZE = 6;
const DAY_REVIEW_LIMIT = 80;
const HABIT_MANAGER_LIMIT = 80;
const PROGRESS_OPTION_LIMIT = 200;
const PROJECTION_LIMIT = 80;
const TODAY_SEARCH_SCAN_LIMIT = 5000;

let currentUser = null;
let isDirty = false;
let saveTimer = null;
let selectedDate = toDateInputValue(new Date());
let reviewDate = toDateInputValue(new Date());
let visibleWeekStart = getWeekStart(new Date());
let visibleMonthDate = new Date();
let todayPageIndex = 0;
let todaySearchQuery = "";

let data = {
  habits: [],
  records: {}
};

const signInBtn = document.getElementById("signInBtn");
const signOutBtn = document.getElementById("signOutBtn");
const themeToggle = document.getElementById("themeToggle");
const activeList = document.getElementById("activeList");
const todayHabitSearch = document.getElementById("todayHabitSearch");
const todayListMeta = document.getElementById("todayListMeta");
const todayOpenCount = document.getElementById("todayOpenCount");
const todayDoneCount = document.getElementById("todayDoneCount");
const todayTotalCount = document.getElementById("todayTotalCount");
const completedTodayBtn = document.getElementById("completedTodayBtn");
const completedTodayBtnCount = document.getElementById("completedTodayBtnCount");
const completedModal = document.getElementById("completedModal");
const completedModalCloseBtn = document.getElementById("completedModalCloseBtn");
const completedSearchInput = document.getElementById("completedSearchInput");
const completedModalMeta = document.getElementById("completedModalMeta");
const completedModalList = document.getElementById("completedModalList");
const todayPager = document.getElementById("todayPager");
const todayPrevPageBtn = document.getElementById("todayPrevPageBtn");
const todayNextPageBtn = document.getElementById("todayNextPageBtn");
const todayPageMeta = document.getElementById("todayPageMeta");
const todayDateLabel = document.getElementById("todayDateLabel");
const heroStreak = document.getElementById("heroStreak");
const dailyRingFill = document.getElementById("dailyRingFill");
const streakMessage = document.getElementById("streakMessage");
const reviewDateInput = document.getElementById("reviewDateInput");
const reviewDayTitle = document.getElementById("reviewDayTitle");
const daySummaryList = document.getElementById("daySummaryList");
const reviewStreakBox = document.getElementById("reviewStreakBox");
const reviewStreak = document.getElementById("reviewStreak");
const reviewStreakText = document.getElementById("reviewStreakText");
const futureProjectionBox = document.getElementById("futureProjectionBox");
const futureProjectionTitle = document.getElementById("futureProjectionTitle");
const futureProjectionText = document.getElementById("futureProjectionText");
const futureProjectionTable = document.getElementById("futureProjectionTable");
const chartMetrics = document.getElementById("chartMetrics");
const totalSinceStreakMetric = document.getElementById("totalSinceStreakMetric");
const chartTotalSinceStreak = document.getElementById("chartTotalSinceStreak");
const chartStreakDays = document.getElementById("chartStreakDays");
const chartLifetimeTotal = document.getElementById("chartLifetimeTotal");
const progressHabit = document.getElementById("progressHabit");
const habitManagerPanel = document.getElementById("habitManagerPanel");
const habitManagerList = document.getElementById("habitManagerList");
const toggleHabitManagerBtn = document.getElementById("toggleHabitManagerBtn");
let isHabitManagerOpen = false;
let isCompletedModalOpen = false;
let completedSearchQuery = "";
const chart = document.getElementById("progressChart");
let progressChartInstance = null;
const statusDot = document.getElementById("statusDot");
const statusText = document.getElementById("statusText");

signOutBtn.style.display = "none";

signInBtn.addEventListener("click", signIn);
signOutBtn.addEventListener("click", () => signOut(auth));
document.getElementById("addHabitBtn").addEventListener("click", addHabit);
toggleHabitManagerBtn.addEventListener("click", toggleHabitManager);
document.getElementById("todayBtn").addEventListener("click", goToToday);
todayHabitSearch.addEventListener("input", (event) => {
  todaySearchQuery = event.target.value.trim().toLowerCase();
  todayPageIndex = 0;
  renderTodayLists();
});
todayPrevPageBtn.addEventListener("click", () => {
  todayPageIndex = Math.max(0, todayPageIndex - 1);
  renderTodayLists();
});
todayNextPageBtn.addEventListener("click", () => {
  todayPageIndex += 1;
  renderTodayLists();
});
completedTodayBtn.addEventListener("click", openCompletedModal);
completedModalCloseBtn.addEventListener("click", closeCompletedModal);
completedSearchInput.addEventListener("input", (event) => {
  completedSearchQuery = event.target.value.trim().toLowerCase();
  renderCompletedModal();
});
completedModal.addEventListener("click", (event) => {
  if (event.target === completedModal) closeCompletedModal();
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && isCompletedModalOpen) closeCompletedModal();
});
document.getElementById("prevWeekCalendar").addEventListener("click", () => changeVisibleWeek(-1));
document.getElementById("nextWeekCalendar").addEventListener("click", () => changeVisibleWeek(1));
document.getElementById("thisWeekCalendar").addEventListener("click", () => {
  visibleWeekStart = getWeekStart(new Date());
  reviewDate = toDateInputValue(new Date());
  renderDayReview();
  renderPeriodProgress();
});
document.getElementById("prevMonthCalendar").addEventListener("click", () => changeVisibleMonth(-1));
document.getElementById("nextMonthCalendar").addEventListener("click", () => changeVisibleMonth(1));
document.getElementById("thisMonthCalendar").addEventListener("click", () => {
  visibleMonthDate = new Date();
  reviewDate = toDateInputValue(new Date());
  renderDayReview();
  renderPeriodProgress();
});
progressHabit.addEventListener("change", renderProgress);
reviewDateInput.value = reviewDate;
reviewDateInput.addEventListener("change", (event) => {
  selectReviewDate(event.target.value, { syncWeek: true });
});
themeToggle.addEventListener("click", toggleTheme);
initTheme();

onAuthStateChanged(auth, async (user) => {
  currentUser = user;

  if (!user) {
    signInBtn.style.display = "inline-flex";
    signOutBtn.style.display = "none";
    data = { habits: [], records: {} };
    isDirty = false;
    updateStatus("Вход не выполнен", "off");
    render();
    return;
  }

  signInBtn.style.display = "none";
  signOutBtn.style.display = "inline-block";
  updateStatus(`Аккаунт: ${user.email || user.displayName || "Google"}`, "ready");
  await loadFromFirebase();
  render();
});

render();

function initTheme() {
  const savedTheme = localStorage.getItem("habitTheme") || "light";
  document.body.classList.toggle("dark", savedTheme === "dark");
  themeToggle.textContent = savedTheme === "dark" ? "Светлая тема" : "Тёмная тема";
}

function toggleTheme() {
  const isDark = document.body.classList.toggle("dark");
  localStorage.setItem("habitTheme", isDark ? "dark" : "light");
  themeToggle.textContent = isDark ? "Светлая тема" : "Тёмная тема";
  renderProgress();
}

async function signIn() {
  try {
    await signInWithPopup(auth, provider);
  } catch (error) {
    alert("Не удалось войти: " + error.message);
  }
}

function getUserDocRef() {
  if (!currentUser) return null;
  return doc(db, "users", currentUser.uid, "habitData", "main");
}

async function loadFromFirebase() {
  const ref = getUserDocRef();
  if (!ref) return;

  try {
    const snap = await getDoc(ref);

    if (!snap.exists()) {
      data = {
        habits: [
          { id: crypto.randomUUID(), name: "Отжимания 🏃", unit: "раз", target: 15, createdAt: toDateInputValue(new Date()) },
          { id: crypto.randomUUID(), name: "Чтение 📖", unit: "страниц", target: 20, createdAt: toDateInputValue(new Date()) }
        ],
        records: {}
      };
      await saveToFirebase(false);
      return;
    }

    const saved = snap.data();
    data = normalizeData(saved.data || saved);
    isDirty = false;
    updateStatus("Данные синхронизированы", "ready");
  } catch (error) {
    alert("Не удалось загрузить данные: " + error.message);
  }
}

async function saveToFirebase(showAlert = false) {
  const ref = getUserDocRef();
  if (!currentUser || !ref) {
    alert("Сначала войди через Google.");
    return;
  }

  try {
    await setDoc(ref, {
      data,
      updatedAt: serverTimestamp(),
      ownerUid: currentUser.uid,
      ownerEmail: currentUser.email || null
    });

    isDirty = false;
    updateStatus("Сохранено", "ready");
    if (showAlert) alert("Данные сохранены.");
  } catch (error) {
    alert("Не удалось сохранить данные: " + error.message);
  }
}

function scheduleAutoSave() {
  if (!currentUser) return;
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => saveToFirebase(false), 700);
}

function markDirty() {
  isDirty = true;
  updateStatus("Сохраняю изменения...", "dirty");
  scheduleAutoSave();
}

function updateStatus(text, mode) {
  statusText.textContent = text;
  statusDot.className = "status-dot";
  if (mode === "ready") statusDot.classList.add("ready");
  if (mode === "dirty") statusDot.classList.add("dirty");
}

function normalizeData(input) {
  return {
    habits: Array.isArray(input.habits) ? input.habits : [],
    records: input.records && typeof input.records === "object" ? input.records : {}
  };
}

function render() {
  renderTodayHeader();
  renderTodayLists();
  renderRewardState();
  renderHabitManager();
  renderDayReview();
  renderPeriodProgress();
  renderProgressOptions();
  renderProgress();
  if (isCompletedModalOpen) renderCompletedModal();
}

function renderTodayHeader() {
  const today = new Date();
  todayDateLabel.textContent = today.toLocaleDateString("ru-RU", {
    weekday: "long",
    day: "numeric",
    month: "long"
  });
}

function renderTodayLists() {
  activeList.innerHTML = "";
  todayListMeta.textContent = "";
  todayPager.hidden = true;
  const todayKey = toDateInputValue(new Date());

  if (!currentUser) {
    renderTodaySummary(0, 0);
    completedTodayBtn.disabled = true;
    activeList.innerHTML = `<div class="empty">Войди через Google, чтобы увидеть сегодняшние задачи.</div>`;
    return;
  }

  if (data.habits.length === 0) {
    renderTodaySummary(0, 0);
    completedTodayBtn.disabled = true;
    activeList.innerHTML = `<div class="empty">Пока нет привычек. Добавь первую ниже.</div>`;
    return;
  }

  const activeHabits = [];
  const visibleHabits = getVisibleTodayHabits(todayKey);
  const doneCount = countDoneRecordsForDate(todayKey);

  visibleHabits.items.forEach(habit => {
    const record = getRecord(todayKey, habit.id, false) || { done: false, value: "" };
    activeHabits.push({ habit, record });
  });

  renderTodaySummary(data.habits.length, doneCount);
  todayListMeta.textContent = getTodayListMeta(visibleHabits);
  renderTodayPager(visibleHabits);

  if (activeHabits.length === 0) {
    const emptyText = todaySearchQuery
      ? "Ничего не найдено среди активных привычек."
      : "Все привычки на сегодня выполнены.";
    activeList.innerHTML = `<div class="empty">${emptyText}</div>`;
  } else {
    activeHabits.forEach(({ habit, record }) => activeList.appendChild(makeQuestItem(habit, record, todayKey)));
  }
}

function renderTodaySummary(total, done) {
  todayTotalCount.textContent = total;
  todayDoneCount.textContent = done;
  todayOpenCount.textContent = Math.max(0, total - done);
  completedTodayBtnCount.textContent = done;
  completedTodayBtn.disabled = !currentUser || done === 0;
}

function renderTodayPager(result) {
  todayPager.hidden = result.pageCount <= 1;
  todayPrevPageBtn.disabled = result.pageIndex <= 0;
  todayNextPageBtn.disabled = result.pageIndex >= result.pageCount - 1;
  todayPageMeta.textContent = `${result.pageIndex + 1} / ${result.pageCount}`;
}

function getVisibleTodayHabits(todayKey) {
  const matches = [];
  let matchCount = 0;
  const scanCount = Math.min(data.habits.length, TODAY_SEARCH_SCAN_LIMIT);

  for (let i = 0; i < scanCount; i++) {
    const habit = data.habits[i];
    const record = getRecord(todayKey, habit.id, false);
    if (record?.done) continue;
    if (!habitMatchesSearch(habit, todaySearchQuery)) continue;
    matchCount += 1;
    matches.push(habit);
  }

  const pageCount = Math.max(1, Math.ceil(matches.length / TODAY_PAGE_SIZE));
  todayPageIndex = Math.min(todayPageIndex, pageCount - 1);
  const startIndex = todayPageIndex * TODAY_PAGE_SIZE;
  const endIndex = Math.min(startIndex + TODAY_PAGE_SIZE, matches.length);

  return {
    items: matches.slice(startIndex, endIndex),
    matchCount,
    startIndex,
    endIndex,
    pageIndex: todayPageIndex,
    pageCount,
    scannedCount: scanCount,
    isPartialSearch: data.habits.length > scanCount
  };
}

function getTodayListMeta(result) {
  if (result.matchCount === 0) {
    return result.isPartialSearch ? `Проверено ${formatHabitCount(result.scannedCount)}` : "";
  }

  if (result.isPartialSearch) {
    return `Показано ${result.startIndex + 1}-${result.endIndex}, найдено ${result.matchCount}+`;
  }

  return result.matchCount > result.items.length
    ? `Показано ${result.startIndex + 1}-${result.endIndex} из ${result.matchCount}`
    : formatHabitCount(result.matchCount);
}

function pluralizeRu(count, one, few, many) {
  const abs = Math.abs(count);
  const mod10 = abs % 10;
  const mod100 = abs % 100;

  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
  return many;
}

function formatHabitCount(count) {
  return `${count} ${pluralizeRu(count, "привычка", "привычки", "привычек")}`;
}

function formatCompletedHabitCount(count) {
  return `${count} ${pluralizeRu(count, "привычка выполнена", "привычки выполнены", "привычек выполнено")}`;
}

function formatDayCount(count) {
  return `${count} ${pluralizeRu(count, "день", "дня", "дней")}`;
}

function habitMatchesSearch(habit, query) {
  if (!query) return true;
  return `${habit.name || ""} ${habit.unit || ""}`.toLowerCase().includes(query);
}

function openCompletedModal() {
  if (!currentUser) return;
  isCompletedModalOpen = true;
  completedSearchQuery = "";
  completedSearchInput.value = "";
  completedModal.hidden = false;
  document.body.classList.add("modal-open");
  renderCompletedModal();
  completedSearchInput.focus();
}

function closeCompletedModal() {
  isCompletedModalOpen = false;
  completedModal.hidden = true;
  document.body.classList.remove("modal-open");
}

function renderCompletedModal() {
  completedModalList.innerHTML = "";
  const todayKey = toDateInputValue(new Date());

  if (!currentUser) {
    completedModalMeta.textContent = "";
    completedModalList.innerHTML = `<div class="empty">Войди через Google, чтобы посмотреть выполненные привычки.</div>`;
    return;
  }

  const completedItems = getCompletedTodayItems(todayKey);
  const visibleItems = completedItems.filter(({ habit }) => habitMatchesSearch(habit, completedSearchQuery));

  completedModalMeta.textContent = completedSearchQuery
    ? `Найдено: ${visibleItems.length} из ${completedItems.length}`
    : formatCompletedHabitCount(completedItems.length);

  if (completedItems.length === 0) {
    completedModalList.innerHTML = `<div class="empty">Сегодня пока ничего не выполнено.</div>`;
    return;
  }

  if (visibleItems.length === 0) {
    completedModalList.innerHTML = `<div class="empty">Ничего не найдено.</div>`;
    return;
  }

  const fragment = document.createDocumentFragment();
  visibleItems.forEach(({ habit, record }) => {
    fragment.appendChild(makeCompletedQuestItem(habit, record, todayKey));
  });
  completedModalList.appendChild(fragment);
}

function getCompletedTodayItems(dateKey) {
  const dayRecords = data.records[dateKey] || {};

  return Object.entries(dayRecords)
    .filter(([, record]) => record?.done)
    .map(([habitId, record]) => ({
      habit: getHabitDetails(habitId, record),
      record
    }));
}

function getHabitDetails(habitId, record) {
  const habit = findHabitById(habitId);

  return {
    id: habitId,
    name: habit?.name || record.habitName || "Привычка",
    unit: habit?.unit ?? record.habitUnit ?? "",
    target: habit?.target ?? record.habitTarget ?? ""
  };
}

function findHabitById(habitId) {
  const scanCount = Math.min(data.habits.length, TODAY_SEARCH_SCAN_LIMIT);
  for (let i = 0; i < scanCount; i++) {
    if (data.habits[i].id === habitId) return data.habits[i];
  }
  return null;
}

function applyHabitSnapshot(record, habit) {
  record.habitName = habit.name || "";
  record.habitUnit = habit.unit || "";
  record.habitTarget = habit.target ?? "";
}

function makeQuestItem(habit, record, dateKey) {
  const el = document.createElement("div");
  el.className = "quest-item";

  const check = document.createElement("div");
  check.className = "quest-check";
  check.textContent = "✓";
  check.onclick = () => {
    record.done = true;
    if (!record.value && habit.target) record.value = Number(habit.target);
    applyHabitSnapshot(record, habit);
    saveRecord(dateKey, habit.id, record);
    markDirty();
    render();
  };

  const info = document.createElement("div");
  const targetText = habit.target
    ? `${escapeHtml(habit.target)}${habit.unit ? " " + escapeHtml(habit.unit) : ""}`
    : "не задана";
  info.innerHTML = `
    <div class="quest-name">${escapeHtml(habit.name)}</div>
    <div class="quest-meta">Цель: ${targetText}</div>
  `;

  const value = document.createElement("input");
  value.className = "quest-value";
  value.type = "number";
  value.min = "0";
  value.placeholder = habit.unit || "значение";
  value.value = record.value ?? "";
  value.oninput = () => {
    record.value = value.value === "" ? "" : Number(value.value);
    applyHabitSnapshot(record, habit);
    saveRecord(dateKey, habit.id, record);
    markDirty();
    renderPeriodProgress();
    renderProgress();
  };

  el.appendChild(check);
  el.appendChild(info);
  el.appendChild(value);
  return el;
}

function makeCompletedQuestItem(habit, record, dateKey) {
  const el = document.createElement("div");
  el.className = "quest-item quest-item-done";

  const check = document.createElement("button");
  check.className = "quest-check quest-check-done";
  check.type = "button";
  check.textContent = "✓";
  check.title = "Вернуть в активные";
  check.onclick = () => {
    record.done = false;
    applyHabitSnapshot(record, habit);
    saveRecord(dateKey, habit.id, record);
    markDirty();
    render();
  };

  const info = document.createElement("div");
  info.innerHTML = `
    <div class="quest-name">${escapeHtml(habit.name)}</div>
    <div class="quest-meta">Выполнено · количество можно изменить</div>
  `;

  const value = document.createElement("input");
  value.className = "quest-value";
  value.type = "number";
  value.min = "0";
  value.placeholder = habit.unit || "значение";
  value.value = record.value ?? "";
  value.oninput = () => {
    record.value = value.value === "" ? "" : Number(value.value);
    applyHabitSnapshot(record, habit);
    saveRecord(dateKey, habit.id, record);
    markDirty();
    renderTodayLists();
    renderDayReview();
    renderPeriodProgress();
    renderProgress();
  };

  el.appendChild(check);
  el.appendChild(info);
  el.appendChild(value);
  return el;
}

function toggleHabitManager() {
  isHabitManagerOpen = !isHabitManagerOpen;
  habitManagerPanel.classList.toggle("open", isHabitManagerOpen);
  toggleHabitManagerBtn.textContent = isHabitManagerOpen ? "Скрыть настройки" : "Изменить привычки";
  if (isHabitManagerOpen) renderHabitManager();
}

function renderHabitManager() {
  habitManagerPanel.classList.toggle("open", isHabitManagerOpen);
  toggleHabitManagerBtn.textContent = isHabitManagerOpen ? "Скрыть настройки" : "Изменить привычки";
  habitManagerList.innerHTML = "";

  if (!isHabitManagerOpen) return;

  if (!currentUser) {
    habitManagerList.innerHTML = `<div class="empty habit-manager-empty">Войди через Google, чтобы изменять привычки.</div>`;
    return;
  }

  if (data.habits.length === 0) {
    habitManagerList.innerHTML = `<div class="empty habit-manager-empty">Пока нет привычек для редактирования.</div>`;
    return;
  }

  if (data.habits.length > HABIT_MANAGER_LIMIT) {
    const note = document.createElement("div");
    note.className = "empty habit-manager-empty";
    note.textContent = `Показаны ${HABIT_MANAGER_LIMIT} из ${data.habits.length} привычек. Для больших списков используй поиск в сегодняшнем блоке.`;
    habitManagerList.appendChild(note);
  }

  data.habits.slice(0, HABIT_MANAGER_LIMIT).forEach(habit => {
    const item = document.createElement("div");
    item.className = "habit-manager-item";

    const nameInput = document.createElement("input");
    nameInput.value = habit.name || "";
    nameInput.placeholder = "Название";
    nameInput.onchange = () => updateHabitField(habit.id, "name", nameInput.value.trim());

    const unitInput = document.createElement("input");
    unitInput.value = habit.unit || "";
    unitInput.placeholder = "Единица";
    unitInput.onchange = () => updateHabitField(habit.id, "unit", unitInput.value.trim());

    const targetInput = document.createElement("input");
    targetInput.type = "number";
    targetInput.min = "0";
    targetInput.value = habit.target ?? "";
    targetInput.placeholder = "Цель";
    targetInput.onchange = () => updateHabitField(habit.id, "target", targetInput.value === "" ? "" : Number(targetInput.value));

    const saveInlineBtn = document.createElement("button");
    saveInlineBtn.className = "success";
    saveInlineBtn.textContent = "Применить";
    saveInlineBtn.onclick = () => {
      updateHabit(habit.id, {
        name: nameInput.value.trim(),
        unit: unitInput.value.trim(),
        target: targetInput.value === "" ? "" : Number(targetInput.value)
      });
    };

    const deleteBtn = document.createElement("button");
    deleteBtn.className = "danger";
    deleteBtn.textContent = "Удалить";
    deleteBtn.onclick = () => deleteHabit(habit);

    item.appendChild(nameInput);
    item.appendChild(unitInput);
    item.appendChild(targetInput);
    item.appendChild(saveInlineBtn);
    item.appendChild(deleteBtn);
    habitManagerList.appendChild(item);
  });
}

function updateHabitField(habitId, field, value) {
  updateHabit(habitId, { [field]: value }, false);
}

function updateHabit(habitId, updates, rerender = true) {
  const habit = data.habits.find(h => h.id === habitId);
  if (!habit) return;

  if (Object.prototype.hasOwnProperty.call(updates, "name") && !updates.name) {
    alert("Название привычки не может быть пустым.");
    renderHabitManager();
    return;
  }

  if (Object.prototype.hasOwnProperty.call(updates, "target") && Number(updates.target) < 0) {
    alert("Цель не может быть отрицательной.");
    renderHabitManager();
    return;
  }

  Object.assign(habit, updates);
  markDirty();
  if (rerender) render();
  else {
    renderTodayLists();
    renderRewardState();
    renderDayReview();
    renderPeriodProgress();
    renderProgressOptions();
    renderProgress();
  }
}

function renderDayReview() {
  reviewDateInput.value = reviewDate;
  const date = parseDateKey(reviewDate);
  const todayKey = toDateInputValue(new Date());
  const isToday = reviewDate === todayKey;
  const isFuture = reviewDate > todayKey;
  const streakOnDate = isFuture ? calculateProjectedGlobalStreakAtDate(reviewDate) : calculateGlobalStreakAtDate(reviewDate);

  reviewDayTitle.textContent = isToday
    ? "Сегодня"
    : date.toLocaleDateString("ru-RU", { day: "numeric", month: "long", weekday: "long" });

  reviewStreak.textContent = streakOnDate;
  reviewStreakBox.classList.remove("danger", "future");
  if (isFuture) reviewStreakBox.classList.add("future");
  else if (streakOnDate === 0) reviewStreakBox.classList.add("danger");

  reviewStreakText.textContent = isFuture
    ? "Прогноз серии, если каждый день до этой даты будет закрыт полностью."
    : isToday
      ? "Серия с учётом сегодняшнего дня."
      : streakOnDate > 0
        ? "Серия к концу этого дня."
        : "В этот день серия была прервана или ещё не началась.";

  renderFutureProjection(reviewDate);

  daySummaryList.innerHTML = "";

  if (isFuture) {
    daySummaryList.innerHTML = `<div class="empty">Будущий день пока нельзя отметить. Ниже показан только прогноз.</div>`;
    return;
  }

  if (!currentUser) {
    daySummaryList.innerHTML = `<div class="empty">Войди через Google, чтобы посмотреть историю по дням.</div>`;
    return;
  }

  if (data.habits.length === 0) {
    daySummaryList.innerHTML = `<div class="empty">Пока нет привычек для отображения.</div>`;
    return;
  }

  const completedCount = countDoneRecordsForDate(reviewDate);
  const visibleHabits = data.habits.slice(0, DAY_REVIEW_LIMIT);

  visibleHabits.forEach(habit => {
    const record = getRecord(reviewDate, habit.id, false);
    const done = Boolean(record?.done);

    const item = document.createElement("div");
    item.className = "day-summary-item" + (done ? " done" : "");

    const valueText = record?.value
      ? `${record.value}${habit.unit ? " " + habit.unit : ""}`
      : done
        ? "✓"
        : "—";

    item.innerHTML = `
      <div>
        <div class="day-summary-name">${escapeHtml(habit.name)}</div>
        <div class="day-summary-meta">${done ? "Выполнено" : "Не выполнено"}${habit.target ? ` · цель ${habit.target} ${escapeHtml(habit.unit || "")}` : ""}</div>
      </div>
      <div class="day-summary-value">${escapeHtml(valueText)}</div>
    `;

    daySummaryList.appendChild(item);
  });

  const summary = document.createElement("div");
  summary.className = "empty";
  summary.textContent = data.habits.length > visibleHabits.length
    ? `Итого: ${completedCount}/${data.habits.length} привычек выполнено. В обзоре показаны первые ${visibleHabits.length}.`
    : `Итого: ${completedCount}/${data.habits.length} привычек выполнено.`;
  daySummaryList.prepend(summary);
}

function renderFutureProjection(dateKey) {
  const todayKey = toDateInputValue(new Date());
  const selectedDateObj = parseDateKey(dateKey);
  const todayObj = parseDateKey(todayKey);
  const daysAhead = Math.ceil((selectedDateObj - todayObj) / 86400000);

  if (daysAhead <= 0 || data.habits.length === 0) {
    futureProjectionBox.style.display = "none";
    futureProjectionTable.innerHTML = "";
    return;
  }

  futureProjectionBox.style.display = "block";
  futureProjectionTitle.textContent = `Прогноз на ${formatDayCount(daysAhead)}`;
  futureProjectionText.textContent = "Расчёт показывает итог к выбранной дате, если каждый день выполнять дневную цель.";

  futureProjectionTable.innerHTML = `
    <div class="projection-row projection-head">
      <div class="projection-cell">Привычка</div>
      <div class="projection-cell">Сейчас</div>
      <div class="projection-cell">+ цель</div>
      <div class="projection-cell">Итого</div>
    </div>
  `;

  if (data.habits.length > PROJECTION_LIMIT) {
    const row = document.createElement("div");
    row.className = "projection-row";
    row.innerHTML = `
      <div class="projection-cell projection-total">Показаны ${PROJECTION_LIMIT}</div>
      <div class="projection-cell"></div>
      <div class="projection-cell"></div>
      <div class="projection-cell">из ${data.habits.length}</div>
    `;
    futureProjectionTable.appendChild(row);
  }

  data.habits.slice(0, PROJECTION_LIMIT).forEach(habit => {
    const currentTotal = calculateTotalUntilDate(habit.id, todayKey);
    const target = Number(habit.target || 0);
    const projectedAdd = target * daysAhead;
    const projectedTotal = currentTotal + projectedAdd;
    const unit = habit.unit ? ` ${habit.unit}` : "";

    const row = document.createElement("div");
    row.className = "projection-row";
    row.innerHTML = `
      <div class="projection-cell">${escapeHtml(habit.name)}</div>
      <div class="projection-cell">${currentTotal}${escapeHtml(unit)}</div>
      <div class="projection-cell">${projectedAdd}${escapeHtml(unit)}</div>
      <div class="projection-cell projection-total">${projectedTotal}${escapeHtml(unit)}</div>
    `;
    futureProjectionTable.appendChild(row);
  });
}

function renderRewardState() {
  const todayKey = toDateInputValue(new Date());
  const total = data.habits.length;
  const done = countDoneRecordsForDate(todayKey);
  const percent = total === 0 ? 0 : Math.round((done / total) * 100);
  const streak = calculateGlobalStreak();

  heroStreak.textContent = streak;
  dailyRingFill.style.width = `${percent}%`;

  if (!currentUser) {
    streakMessage.textContent = "Войди, чтобы вести серию.";
  } else if (total === 0) {
    streakMessage.textContent = "Добавь привычки, чтобы начать серию.";
  } else if (done === total) {
    streakMessage.textContent = "День закрыт. Серия сохранена.";
  } else {
    const remaining = total - done;
    const pronoun = remaining === 1 ? "её" : "их";
    streakMessage.textContent = `Осталось: ${formatHabitCount(remaining)}. Выполни ${pronoun} сегодня, чтобы сохранить серию.`;
  }
}

function renderPeriodProgress() {
  const weekDays = getWeekDaysFromStart(visibleWeekStart);
  const monthDays = getMonthDays(visibleMonthDate);
  document.getElementById("weekCalendarTitle").textContent = `${formatFullDate(weekDays[0])} — ${formatFullDate(weekDays[6])}`;
  document.getElementById("monthCalendarTitle").textContent = visibleMonthDate.toLocaleDateString("ru-RU", {
    month: "long",
    year: "numeric"
  });
  renderPeriod("week", weekDays, "weekCompleted", "weekRate", "weekPerfect", "weekMiniDays");
  renderPeriod("month", monthDays, "monthCompleted", "monthRate", "monthPerfect", "monthMiniDays");
}

function renderPeriod(periodName, days, completedId, rateId, perfectId, miniId) {
  const totalHabits = data.habits.length;
  const possible = totalHabits * days.length;
  let completed = 0;
  let perfectDays = 0;
  const dayStats = new Map();

  days.forEach(day => {
    const dateKey = toDateInputValue(day);
    const dayDone = countDoneRecordsForDate(dateKey);
    dayStats.set(dateKey, dayDone);
    completed += dayDone;
    if (totalHabits > 0 && dayDone === totalHabits) perfectDays += 1;
  });

  const rate = possible === 0 ? 0 : Math.round((completed / possible) * 100);
  document.getElementById(completedId).textContent = completed;
  document.getElementById(rateId).textContent = `${rate}%`;
  document.getElementById(perfectId).textContent = perfectDays;

  const mini = document.getElementById(miniId);
  mini.innerHTML = "";
  const todayKey = toDateInputValue(new Date());

  days.forEach(day => {
    const dateKey = toDateInputValue(day);
    const dayDone = dayStats.get(dateKey) || 0;
    const el = document.createElement("div");
    el.className = "mini-day";
    if (totalHabits > 0 && dayDone === totalHabits) el.classList.add("done");
    if (dateKey === todayKey) el.classList.add("today");
    if (dateKey === reviewDate) el.classList.add("selected");
    el.textContent = day.getDate();
    el.title = `${dayDone}/${totalHabits}`;
    el.onclick = () => {
      selectReviewDate(dateKey, { syncWeek: periodName === "month" });
    };
    mini.appendChild(el);
  });
}

function countDoneRecordsForDate(dateKey) {
  const dayRecords = data.records[dateKey];
  if (!dayRecords) return 0;

  return Object.values(dayRecords).reduce((count, record) => {
    return count + (record?.done ? 1 : 0);
  }, 0);
}

function selectReviewDate(dateKey, options = {}) {
  reviewDate = dateKey;

  if (options.syncWeek) {
    visibleWeekStart = getWeekStart(parseDateKey(dateKey));
  }

  renderDayReview();
  renderPeriodProgress();
}

function renderProgressOptions() {
  const current = progressHabit.value;
  progressHabit.innerHTML = "";

  const optionHabits = data.habits.slice(0, PROGRESS_OPTION_LIMIT);
  const selectedHabit = data.habits.find(habit => habit.id === current);
  if (selectedHabit && !optionHabits.some(habit => habit.id === selectedHabit.id)) {
    optionHabits.unshift(selectedHabit);
  }

  optionHabits.forEach(habit => {
    const option = document.createElement("option");
    option.value = habit.id;
    option.textContent = habit.name;
    progressHabit.appendChild(option);
  });

  if (data.habits.length > optionHabits.length) {
    const option = document.createElement("option");
    option.disabled = true;
    option.textContent = `Показаны ${optionHabits.length} из ${data.habits.length}`;
    progressHabit.appendChild(option);
  }

  if (optionHabits.some(h => h.id === current)) progressHabit.value = current;
}

function renderProgress() {
  const habitId = progressHabit.value || data.habits[0]?.id;
  const habit = data.habits.find(h => h.id === habitId);
  const todayKey = toDateInputValue(new Date());
  clearChart();
  if (!habit) {
    chartTotalSinceStreak.textContent = "0";
    chartStreakDays.textContent = "0";
    chartLifetimeTotal.textContent = "0";
    return;
  }

  renderChartMetrics(habit);

  const allDates = Object.keys(data.records)
    .filter(dateKey => data.records[dateKey]?.[habit.id])
    .filter(dateKey => dateKey <= todayKey)
    .sort();

  const datesWithValues = allDates.filter(dateKey => {
    const rec = data.records[dateKey]?.[habit.id];
    return getChartPointValue(rec, habit) !== null;
  });

  let chartDates;

  if (datesWithValues.length === 0) {
    chartDates = lastNDays(7);
  } else {
    const first = parseDate(datesWithValues[0]);
    const today = parseDate(todayKey);
    first.setDate(first.getDate() - 2);
    chartDates = dateRange(first, today).slice(-45);
  }

  const chartData = chartDates.map(dateKey => {
    const rec = getRecord(dateKey, habit.id, false);
    const value = getChartPointValue(rec, habit);
    return { dateKey, value, done: Boolean(rec?.done) };
  });

  drawChart(chartData, habit);
}

function getChartPointValue(record, habit) {
  if (!record) return null;

  if (record.value !== "" && record.value !== null && record.value !== undefined) {
    const value = Number(record.value);
    if (!Number.isNaN(value) && (value > 0 || record.done)) return value;
  }

  if (record.done) {
    const target = Number(habit.target || 0);
    return target > 0 ? target : 1;
  }

  return null;
}

function renderChartMetrics(habit) {
  const todayKey = toDateInputValue(new Date());
  const streakStart = getHabitStreakStartDate(habit.id, todayKey);
  const totalSinceStreak = streakStart ? calculateTotalBetweenDates(habit.id, streakStart, todayKey) : 0;
  const streakDays = calculateStreak(habit.id);
  const lifetimeTotal = calculateLifetimeTotal(habit.id);
  const unit = habit.unit ? ` ${habit.unit}` : "";

  if (totalSinceStreak === lifetimeTotal) {
    totalSinceStreakMetric.classList.add("hidden");
    chartMetrics.classList.remove("three-cols");
    chartMetrics.classList.add("two-cols");
  } else {
    totalSinceStreakMetric.classList.remove("hidden");
    chartMetrics.classList.remove("two-cols");
    chartMetrics.classList.add("three-cols");
  }

  chartTotalSinceStreak.textContent = `${totalSinceStreak}${unit}`;
  chartStreakDays.textContent = streakDays;
  chartLifetimeTotal.textContent = `${lifetimeTotal}${unit}`;
}

function drawChart(chartData, habit) {
  const labels = chartData.map(d => formatShortDate(d.dateKey));
  const values = chartData.map(d => d.value);
  const target = habit.target ? Number(habit.target) : null;
  const visibleValues = values.filter(v => v !== null && !Number.isNaN(v));
  const maxValue = Math.max(1, ...visibleValues, target || 0);
  const suggestedMax = Math.ceil(maxValue * 1.2);

  const textColor = getCssColor("--text");
  const mutedColor = getCssColor("--muted");
  const lineColor = getCssColor("--line");
  const successColor = getCssColor("--success");
  const cardColor = getCssColor("--card");

  const datasets = [
    {
      label: habit.name,
      data: values,
      borderColor: successColor,
      backgroundColor: createChartGradient(successColor),
      pointBackgroundColor: cardColor,
      pointBorderColor: successColor,
      pointRadius: 0,
      pointHoverRadius: 5,
      pointHitRadius: 14,
      pointBorderWidth: 2,
      borderWidth: 2.5,
      tension: 0.34,
      fill: true,
      spanGaps: true
    }
  ];

  if (target) {
    datasets.push({
      label: `Цель: ${target}`,
      data: values.map(() => target),
      borderColor: "rgba(184, 135, 34, 0.7)",
      borderDash: [7, 7],
      pointRadius: 0,
      borderWidth: 1.5,
      fill: false
    });
  }

  if (progressChartInstance) {
    progressChartInstance.destroy();
  }

  progressChartInstance = new window.Chart(chart, {
    type: "line",
    data: { labels, datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      interaction: {
        mode: "index",
        intersect: false
      },
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          backgroundColor: cardColor,
          titleColor: textColor,
          bodyColor: textColor,
          borderColor: lineColor,
          borderWidth: 1,
          padding: 10,
          displayColors: false,
          callbacks: {
            label: (context) => {
              if (context.datasetIndex === 1) return `Цель: ${target}`;
              const unit = habit.unit ? ` ${habit.unit}` : "";
              return `${habit.name}: ${context.parsed.y}${unit}`;
            }
          }
        }
      },
      scales: {
        x: {
          grid: { display: false },
          border: { color: lineColor },
          ticks: {
            color: mutedColor,
            autoSkip: true,
            maxTicksLimit: 7,
            font: { size: 12 }
          }
        },
        y: {
          beginAtZero: true,
          suggestedMax,
          grace: "8%",
          border: { color: lineColor },
          grid: { color: lineColor },
          ticks: {
            color: mutedColor,
            precision: 0,
            font: { size: 12 },
            callback: (value) => habit.unit ? `${value} ${habit.unit}` : value
          }
        }
      }
    }
  });
}

function createChartGradient(successColor) {
  const ctx = chart.getContext("2d");
  const gradient = ctx.createLinearGradient(0, 0, 0, 320);
  gradient.addColorStop(0, "rgba(47, 111, 62, 0.16)");
  gradient.addColorStop(1, "rgba(47, 111, 62, 0.00)");
  return gradient;
}

function clearChart() {
  if (progressChartInstance) {
    progressChartInstance.destroy();
    progressChartInstance = null;
  }
}

function getCssColor(variableName) {
  return getComputedStyle(document.body).getPropertyValue(variableName).trim();
}

function addHabit() {
  if (!currentUser) {
    alert("Сначала войди через Google.");
    return;
  }

  const name = document.getElementById("habitName").value.trim();
  const unit = document.getElementById("habitUnit").value.trim();
  const targetRaw = document.getElementById("habitTarget").value;

  if (!name) {
    alert("Введите название привычки.");
    return;
  }

  data.habits.push({
    id: crypto.randomUUID(),
    name,
    unit,
    target: targetRaw === "" ? "" : Number(targetRaw),
    createdAt: toDateInputValue(new Date())
  });

  document.getElementById("habitName").value = "";
  document.getElementById("habitUnit").value = "";
  document.getElementById("habitTarget").value = "";

  markDirty();
  render();
}

function renameHabit(habit) {
  const newName = prompt("Название привычки", habit.name);
  if (!newName || !newName.trim()) return;

  const newTarget = prompt("Цель в день", habit.target || "");
  const newUnit = prompt("Единица", habit.unit || "");

  habit.name = newName.trim();
  habit.target = newTarget === "" ? "" : Number(newTarget);
  habit.unit = newUnit || "";
  markDirty();
  render();
}

function deleteHabit(habit) {
  if (!confirm(`Удалить привычку «${habit.name}»?`)) return;
  data.habits = data.habits.filter(h => h.id !== habit.id);
  Object.values(data.records).forEach(day => delete day[habit.id]);
  markDirty();
  render();
}

function getRecord(dateKey, habitId, create = true) {
  if (!data.records[dateKey]) {
    if (!create) return null;
    data.records[dateKey] = {};
  }

  if (!data.records[dateKey][habitId]) {
    if (!create) return null;
    data.records[dateKey][habitId] = { done: false, value: "" };
  }

  return data.records[dateKey][habitId];
}

function saveRecord(dateKey, habitId, record) {
  if (!data.records[dateKey]) data.records[dateKey] = {};
  data.records[dateKey][habitId] = record;
}

function calculateStreak(habitId) {
  let streak = 0;
  const cursor = new Date();

  for (let i = 0; i < 3650; i++) {
    const key = toDateInputValue(cursor);
    const rec = data.records[key]?.[habitId];
    if (rec?.done) {
      streak += 1;
      cursor.setDate(cursor.getDate() - 1);
    } else {
      break;
    }
  }

  return streak;
}

function getHabitStreakStartDate(habitId, endDateKey) {
  const cursor = parseDateKey(endDateKey);
  let start = null;

  for (let i = 0; i < 3650; i++) {
    const key = toDateInputValue(cursor);
    const rec = data.records[key]?.[habitId];
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
  Object.keys(data.records).forEach(dateKey => {
    if (dateKey <= endDateKey) {
      const rec = data.records[dateKey]?.[habitId];
      if (rec?.done) total += Number(rec.value || 0);
    }
  });
  return total;
}

function calculateTotalBetweenDates(habitId, startDateKey, endDateKey) {
  let total = 0;
  Object.keys(data.records).forEach(dateKey => {
    if (dateKey >= startDateKey && dateKey <= endDateKey) {
      const rec = data.records[dateKey]?.[habitId];
      if (rec?.done) total += Number(rec.value || 0);
    }
  });
  return total;
}

function calculateLifetimeTotal(habitId) {
  let total = 0;
  Object.keys(data.records).forEach(dateKey => {
    const rec = data.records[dateKey]?.[habitId];
    if (rec?.done) total += Number(rec.value || 0);
  });
  return total;
}

function calculateGlobalStreak() {
  return calculateGlobalStreakAtDate(toDateInputValue(new Date()));
}

function getOldestHabit() {
  if (data.habits.length === 0) return null;

  return [...data.habits].sort((a, b) => {
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
    const rec = data.records[key]?.[habitId];
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
  const todayStreak = calculateGlobalStreakAtDate(todayKey);
  const futureDate = parseDateKey(futureDateKey);
  const todayDate = parseDateKey(todayKey);
  const daysAhead = Math.ceil((futureDate - todayDate) / 86400000);
  return todayStreak + Math.max(0, daysAhead);
}

function goToToday() {
  selectedDate = toDateInputValue(new Date());
  reviewDate = selectedDate;
  visibleWeekStart = getWeekStart(new Date());
  visibleMonthDate = new Date();
  render();
}

function changeVisibleWeek(delta) {
  visibleWeekStart.setDate(visibleWeekStart.getDate() + delta * 7);
  renderPeriodProgress();
}

function changeVisibleMonth(delta) {
  visibleMonthDate = new Date(visibleMonthDate.getFullYear(), visibleMonthDate.getMonth() + delta, 1);
  renderPeriodProgress();
}

window.addEventListener("beforeunload", (event) => {
  if (!isDirty) return;
  event.preventDefault();
  event.returnValue = "";
});
