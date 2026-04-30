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
let activeView = getInitialView();
let isGoalModalOpen = false;
let editingGoalId = null;
let goalsCalendarMode = "month";
let goalsVisibleDate = new Date();
let selectedGoalDate = "";
let hasManualGoalDateSelection = false;
let goalArchiveMode = "completed";
let isGoalResultModalOpen = false;
let resolvingGoalId = null;
let goalToastTimer = null;
let workspaceGoalId = null;
let workspaceTaskId = null;

let data = {
  habits: [],
  records: {},
  goals: []
};

const signInBtn = document.getElementById("signInBtn");
const signOutBtn = document.getElementById("signOutBtn");
const themeToggle = document.getElementById("themeToggle");
const habitsTabBtn = document.getElementById("habitsTabBtn");
const goalsTabBtn = document.getElementById("goalsTabBtn");
const habitsView = document.getElementById("habitsView");
const goalsView = document.getElementById("goalsView");
const goalWorkspaceView = document.getElementById("goalWorkspaceView");
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
const addGoalOpenBtn = document.getElementById("addGoalOpenBtn");
const goalModal = document.getElementById("goalModal");
const goalModalCloseBtn = document.getElementById("goalModalCloseBtn");
const goalModalTitle = document.getElementById("goalModalTitle");
const goalSaveBtn = document.getElementById("goalSaveBtn");
const goalsList = document.getElementById("goalsList");
const goalsTotalCount = document.getElementById("goalsTotalCount");
const goalsActiveCount = document.getElementById("goalsActiveCount");
const goalsDueCount = document.getElementById("goalsDueCount");
const goalsArchivedCount = document.getElementById("goalsArchivedCount");
const goalsCalendarTitle = document.getElementById("goalsCalendarTitle");
const goalsCalendarGrid = document.getElementById("goalsCalendarGrid");
const goalModeMonthBtn = document.getElementById("goalModeMonthBtn");
const goalModeWeekBtn = document.getElementById("goalModeWeekBtn");
const goalModeDayBtn = document.getElementById("goalModeDayBtn");
const prevGoalPeriodBtn = document.getElementById("prevGoalPeriodBtn");
const nextGoalPeriodBtn = document.getElementById("nextGoalPeriodBtn");
const todayGoalPeriodBtn = document.getElementById("todayGoalPeriodBtn");
const selectedDeadlineTitle = document.getElementById("selectedDeadlineTitle");
const selectedDeadlineList = document.getElementById("selectedDeadlineList");
const deadlineFocusMeta = document.getElementById("deadlineFocusMeta");
const prevDeadlineBtn = document.getElementById("prevDeadlineBtn");
const nextDeadlineBtn = document.getElementById("nextDeadlineBtn");
const goalArchiveCompletedBtn = document.getElementById("goalArchiveCompletedBtn");
const goalArchiveFailedBtn = document.getElementById("goalArchiveFailedBtn");
const goalArchiveCompletedCount = document.getElementById("goalArchiveCompletedCount");
const goalArchiveFailedCount = document.getElementById("goalArchiveFailedCount");
const goalArchiveList = document.getElementById("goalArchiveList");
const goalResultModal = document.getElementById("goalResultModal");
const goalResultCloseBtn = document.getElementById("goalResultCloseBtn");
const goalResultName = document.getElementById("goalResultName");
const goalResultMeta = document.getElementById("goalResultMeta");
const goalResultCompletedBtn = document.getElementById("goalResultCompletedBtn");
const goalResultFailedBtn = document.getElementById("goalResultFailedBtn");
const goalConfettiLayer = document.getElementById("goalConfettiLayer");
const goalToast = document.getElementById("goalToast");
const goalWorkspaceBackBtn = document.getElementById("goalWorkspaceBackBtn");
const goalWorkspaceGoalName = document.getElementById("goalWorkspaceGoalName");
const goalWorkspaceTaskName = document.getElementById("goalWorkspaceTaskName");
const goalWorkspaceNotes = document.getElementById("goalWorkspaceNotes");
const goalMiniGoalInput = document.getElementById("goalMiniGoalInput");
const goalMiniGoalAddBtn = document.getElementById("goalMiniGoalAddBtn");
const goalMiniGoalList = document.getElementById("goalMiniGoalList");
let isHabitManagerOpen = false;
let isCompletedModalOpen = false;
let completedSearchQuery = "";
const chart = document.getElementById("progressChart");
let progressChartInstance = null;
const statusDot = document.getElementById("statusDot");
const statusText = document.getElementById("statusText");

signOutBtn.hidden = true;

habitsTabBtn.addEventListener("click", () => switchView("habits"));
goalsTabBtn.addEventListener("click", () => switchView("goals"));
signInBtn.addEventListener("click", signIn);
signOutBtn.addEventListener("click", () => signOut(auth));
document.getElementById("addHabitBtn").addEventListener("click", addHabit);
addGoalOpenBtn.addEventListener("click", () => openGoalModal());
goalModalCloseBtn.addEventListener("click", closeGoalModal);
goalSaveBtn.addEventListener("click", saveGoalFromModal);
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
goalModal.addEventListener("click", (event) => {
  if (event.target === goalModal) closeGoalModal();
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && isCompletedModalOpen) closeCompletedModal();
  if (event.key === "Escape" && isGoalModalOpen) closeGoalModal();
  if (event.key === "Escape" && isGoalResultModalOpen) closeGoalResultModal();
});
goalModeMonthBtn.addEventListener("click", () => setGoalsCalendarMode("month"));
goalModeWeekBtn.addEventListener("click", () => setGoalsCalendarMode("week"));
goalModeDayBtn.addEventListener("click", () => setGoalsCalendarMode("day"));
prevGoalPeriodBtn.addEventListener("click", () => changeGoalCalendarPeriod(-1));
nextGoalPeriodBtn.addEventListener("click", () => changeGoalCalendarPeriod(1));
todayGoalPeriodBtn.addEventListener("click", goToTodayGoalDate);
prevDeadlineBtn.addEventListener("click", () => stepSelectedDeadline(-1));
nextDeadlineBtn.addEventListener("click", () => stepSelectedDeadline(1));
goalArchiveCompletedBtn.addEventListener("click", () => setGoalArchiveMode("completed"));
goalArchiveFailedBtn.addEventListener("click", () => setGoalArchiveMode("failed"));
goalResultCloseBtn.addEventListener("click", closeGoalResultModal);
goalResultCompletedBtn.addEventListener("click", () => resolveGoalResult("completed"));
goalResultFailedBtn.addEventListener("click", () => resolveGoalResult("failed"));
goalResultModal.addEventListener("click", (event) => {
  if (event.target === goalResultModal) closeGoalResultModal();
});
goalWorkspaceBackBtn.addEventListener("click", () => switchView("goals"));
goalWorkspaceNotes.addEventListener("input", updateWorkspaceNotes);
goalMiniGoalAddBtn.addEventListener("click", addWorkspaceMiniGoal);
goalMiniGoalInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") addWorkspaceMiniGoal();
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
switchView(activeView, { updateHash: false });

window.addEventListener("hashchange", () => {
  switchView(getInitialView(), { updateHash: false });
});

onAuthStateChanged(auth, async (user) => {
  currentUser = user;

  if (!user) {
    signInBtn.hidden = false;
    signOutBtn.hidden = true;
    data = { habits: [], records: {}, goals: [] };
    isDirty = false;
    updateStatus("Вход не выполнен", "off");
    render();
    return;
  }

  signInBtn.hidden = true;
  signOutBtn.hidden = false;
  updateStatus(`Аккаунт: ${user.email || user.displayName || "Google"}`, "ready");
  await loadFromFirebase();
  render();
});

render();

function getInitialView() {
  if (getWorkspaceRoute()) return "workspace";
  return window.location.hash === "#goals" ? "goals" : "habits";
}

function switchView(view, options = {}) {
  activeView = view === "workspace" ? "workspace" : view === "goals" ? "goals" : "habits";
  const isGoals = activeView === "goals";
  const isWorkspace = activeView === "workspace";

  habitsView.hidden = isGoals || isWorkspace;
  goalsView.hidden = !isGoals;
  goalWorkspaceView.hidden = !isWorkspace;
  habitsTabBtn.classList.toggle("active", activeView === "habits");
  goalsTabBtn.classList.toggle("active", isGoals);
  habitsTabBtn.setAttribute("aria-selected", String(activeView === "habits"));
  goalsTabBtn.setAttribute("aria-selected", String(isGoals));

  if (options.updateHash !== false) {
    history.replaceState(null, "", isWorkspace ? window.location.hash : isGoals ? "#goals" : "#habits");
  }

  if (isWorkspace) renderGoalWorkspacePage();
}

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
        records: {},
        goals: []
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
    records: input.records && typeof input.records === "object" ? input.records : {},
    goals: Array.isArray(input.goals) ? input.goals.map(normalizeGoal) : []
  };
}

function normalizeGoal(goal) {
  const unit = goal.unit || "";
  const legacyCurrent = goal.current ?? goal.currentMetric ?? "";
  const legacyTarget = goal.target ?? goal.targetMetric ?? "";
  const currentMetric = normalizeOptionalNumber(legacyCurrent);
  const targetMetric = normalizeOptionalNumber(legacyTarget);
  const fallbackPointA = currentMetric === "" ? "" : formatGoalMetric(currentMetric, unit);
  const fallbackPointB = targetMetric === "" ? "" : formatGoalMetric(targetMetric, unit);
  const rawTasks = Array.isArray(goal.tasks)
    ? goal.tasks
    : Array.isArray(goal.milestones)
      ? goal.milestones
      : [];
  const status = ["completed", "failed"].includes(goal.status) ? goal.status : "active";

  return {
    id: goal.id || crypto.randomUUID(),
    name: goal.name || "Цель",
    type: goal.type || "other",
    pointA: goal.pointA || fallbackPointA,
    pointB: goal.pointB || fallbackPointB,
    createdAt: goal.createdAt || toDateInputValue(new Date()),
    status,
    completedAt: status === "completed" ? goal.completedAt || goal.archivedAt || toDateInputValue(new Date()) : "",
    failedAt: status === "failed" ? goal.failedAt || goal.archivedAt || toDateInputValue(new Date()) : "",
    tasks: rawTasks.map(normalizeGoalTask)
  };
}

function normalizeGoalTask(task) {
  return {
    id: task.id || crypto.randomUUID(),
    title: task.title || task.evidence || "Задача",
    deadline: task.deadline || "",
    done: Boolean(task.done),
    completedAt: task.completedAt || "",
    workspace: normalizeTaskWorkspace(task.workspace)
  };
}

function normalizeTaskWorkspace(workspace = {}) {
  const safeWorkspace = workspace && typeof workspace === "object" ? workspace : {};
  const rawMiniGoals = Array.isArray(safeWorkspace.miniGoals) ? safeWorkspace.miniGoals : [];

  return {
    notes: typeof safeWorkspace.notes === "string" ? safeWorkspace.notes : "",
    miniGoals: rawMiniGoals.map(normalizeMiniGoal)
  };
}

function normalizeMiniGoal(miniGoal = {}) {
  const safeMiniGoal = miniGoal && typeof miniGoal === "object" ? miniGoal : {};

  return {
    id: safeMiniGoal.id || crypto.randomUUID(),
    title: safeMiniGoal.title || "Мини-цель",
    done: Boolean(safeMiniGoal.done),
    completedAt: safeMiniGoal.completedAt || ""
  };
}

function normalizeOptionalNumber(value) {
  if (value === "" || value === null || value === undefined) return "";
  const number = Number(value);
  return Number.isNaN(number) ? "" : number;
}

function render() {
  renderTodayHeader();
  renderTodayLists();
  renderRewardState();
  renderHabitManager();
  renderGoals();
  renderGoalWorkspacePage();
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
  if (!isGoalModalOpen && !isGoalResultModalOpen) document.body.classList.remove("modal-open");
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
  const streakOnDate = isFuture
    ? calculateProjectedGlobalStreakAtDate(reviewDate)
    : isToday
      ? calculateMotivationalGlobalStreak()
      : calculateGlobalStreakAtDate(reviewDate);
  const isTodayOpen = isToday && !isTodayComplete();

  reviewDayTitle.textContent = isToday
    ? "Сегодня"
    : date.toLocaleDateString("ru-RU", { day: "numeric", month: "long", weekday: "long" });

  reviewStreak.textContent = streakOnDate;
  reviewStreakBox.classList.remove("danger", "future");
  if (isFuture) reviewStreakBox.classList.add("future");
  else if (streakOnDate === 0 && !isTodayOpen) reviewStreakBox.classList.add("danger");

  reviewStreakText.textContent = isFuture
    ? "Прогноз серии, если каждый день до этой даты будет закрыт полностью."
    : isToday
      ? isTodayOpen
        ? "Будет в серии, когда закроешь сегодня."
        : "Серия с учётом сегодняшнего дня."
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
    futureProjectionBox.hidden = true;
    futureProjectionTable.innerHTML = "";
    return;
  }

  futureProjectionBox.hidden = false;
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
  const streak = calculateMotivationalGlobalStreak();

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
    streakMessage.textContent = `Будет ${formatDayCount(streak)} подряд. Осталось: ${formatHabitCount(remaining)}. Выполни ${pronoun} сегодня.`;
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
  const streakStart = getMotivationalHabitStreakStartDate(habit.id);
  const totalSinceStreak = streakStart ? calculateMotivationalTotalBetweenDates(habit, streakStart, todayKey) : 0;
  const streakDays = calculateMotivationalHabitStreak(habit.id);
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
  const warningColor = getCssColor("--warning");
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
      borderColor: toRgba(warningColor, 0.7),
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
  gradient.addColorStop(0, toRgba(successColor, 0.16));
  gradient.addColorStop(1, toRgba(successColor, 0));
  return gradient;
}

function toRgba(color, alpha) {
  const value = color.trim();
  const hex = value.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (hex) {
    const raw = hex[1].length === 3
      ? hex[1].split("").map(char => char + char).join("")
      : hex[1];
    const number = Number.parseInt(raw, 16);
    const red = (number >> 16) & 255;
    const green = (number >> 8) & 255;
    const blue = number & 255;
    return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
  }

  const rgb = value.match(/^rgba?\(([^)]+)\)$/i);
  if (rgb) {
    const [red, green, blue] = rgb[1].split(",").map(part => part.trim());
    return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
  }

  return value;
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

function openGoalModal(goalId = null) {
  const goal = goalId ? data.goals.find(item => item.id === goalId) : null;
  editingGoalId = goal?.id || null;
  goalModalTitle.textContent = goal ? "Редактировать цель" : "Новая цель";
  goalSaveBtn.textContent = goal ? "Сохранить изменения" : "Сохранить цель";
  document.getElementById("goalName").value = goal?.name || "";
  document.getElementById("goalType").value = goal?.type || "other";
  document.getElementById("goalPointA").value = goal?.pointA || "";
  document.getElementById("goalPointB").value = goal?.pointB || "";
  isGoalModalOpen = true;
  goalModal.hidden = false;
  document.body.classList.add("modal-open");
  document.getElementById("goalName").focus();
}

function closeGoalModal() {
  isGoalModalOpen = false;
  editingGoalId = null;
  goalModal.hidden = true;
  if (!isCompletedModalOpen && !isGoalResultModalOpen) document.body.classList.remove("modal-open");
}

function saveGoalFromModal() {
  if (!currentUser) {
    alert("Сначала войди через Google.");
    return;
  }

  const name = document.getElementById("goalName").value.trim();
  const type = document.getElementById("goalType").value || "other";
  const pointA = document.getElementById("goalPointA").value.trim();
  const pointB = document.getElementById("goalPointB").value.trim();

  if (!name) {
    alert("Введите название цели.");
    return;
  }

  if (!pointA || !pointB) {
    alert("Заполни точку A и точку B.");
    return;
  }

  if (editingGoalId) {
    const goal = data.goals.find(item => item.id === editingGoalId);
    if (!goal) return;
    Object.assign(goal, { name, type, pointA, pointB });
  } else {
    data.goals.push({
      id: crypto.randomUUID(),
      name,
      type,
      pointA,
      pointB,
      createdAt: toDateInputValue(new Date()),
      status: "active",
      completedAt: "",
      failedAt: "",
      tasks: []
    });
  }

  markDirty();
  closeGoalModal();
  renderGoals();
}

function renderGoals() {
  renderGoalOverview();
  ensureSelectedGoalDate();
  renderDeadlineCalendar();
  renderDeadlineFocus();
  renderGoalsList();
  renderGoalArchive();
}

function renderGoalsList() {
  goalsList.innerHTML = "";
  const activeGoals = getActiveGoals();

  if (!currentUser) {
    goalsList.innerHTML = `<div class="empty">Войди через Google, чтобы вести долгосрочные цели.</div>`;
    return;
  }

  if (data.goals.length === 0) {
    goalsList.innerHTML = `<div class="empty">Создай цель через кнопку «Новая цель», а затем добавь задачи с дедлайнами.</div>`;
    return;
  }

  if (activeGoals.length === 0) {
    goalsList.innerHTML = `<div class="empty">Активных целей нет. Завершённые и проваленные цели лежат в архиве ниже.</div>`;
    return;
  }

  activeGoals.forEach(goal => goalsList.appendChild(makeGoalCard(goal)));
}

function renderGoalOverview() {
  const goals = Array.isArray(data.goals) ? data.goals : [];
  const activeGoals = goals.filter(isGoalActive);
  const archivedGoals = goals.filter(isGoalArchived);
  const urgentTasks = getAllDeadlineItems().filter(item => isTaskUrgent(item.task));
  goalsTotalCount.textContent = goals.length;
  goalsActiveCount.textContent = activeGoals.length;
  goalsDueCount.textContent = urgentTasks.length;
  goalsArchivedCount.textContent = archivedGoals.length;
}

function setGoalArchiveMode(mode) {
  goalArchiveMode = mode === "failed" ? "failed" : "completed";
  renderGoalArchive();
}

function renderGoalArchive() {
  const completedGoals = getArchivedGoals("completed");
  const failedGoals = getArchivedGoals("failed");
  const visibleGoals = goalArchiveMode === "failed" ? failedGoals : completedGoals;

  goalArchiveCompletedCount.textContent = completedGoals.length;
  goalArchiveFailedCount.textContent = failedGoals.length;
  goalArchiveCompletedBtn.classList.toggle("active", goalArchiveMode === "completed");
  goalArchiveFailedBtn.classList.toggle("active", goalArchiveMode === "failed");
  goalArchiveCompletedBtn.setAttribute("aria-pressed", String(goalArchiveMode === "completed"));
  goalArchiveFailedBtn.setAttribute("aria-pressed", String(goalArchiveMode === "failed"));
  goalArchiveList.innerHTML = "";

  if (!currentUser) {
    goalArchiveList.innerHTML = `<div class="empty">Войди через Google, чтобы посмотреть архив целей.</div>`;
    return;
  }

  if (visibleGoals.length === 0) {
    const emptyText = goalArchiveMode === "completed"
      ? "Реализованных целей пока нет. Когда закончишь цель, она появится здесь."
      : "Проваленных целей пока нет. Если цель сорвалась, её можно отправить сюда из текущих целей.";
    goalArchiveList.innerHTML = `<div class="empty">${emptyText}</div>`;
    return;
  }

  visibleGoals.forEach(goal => goalArchiveList.appendChild(makeGoalArchiveCard(goal)));
}

function getArchivedGoals(status) {
  return (data.goals || [])
    .filter(goal => goal.status === status)
    .sort((a, b) => {
      const aDate = getGoalArchiveDate(a);
      const bDate = getGoalArchiveDate(b);
      if (aDate !== bDate) return String(bDate).localeCompare(String(aDate));
      return String(a.name || "").localeCompare(String(b.name || ""));
    });
}

function makeGoalArchiveCard(goal) {
  const card = document.createElement("div");
  const progress = getGoalProgress(goal);
  const isCompleted = goal.status === "completed";
  const statusDate = getGoalArchiveDate(goal);
  const statusLabel = isCompleted ? "Реализована" : "Провалена";

  card.className = `goal-archive-card ${isCompleted ? "completed" : "failed"}`;
  card.innerHTML = `
    <div class="goal-archive-head">
      <div>
        <div class="goal-type">${escapeHtml(getGoalTypeLabel(goal.type))}</div>
        <div class="goal-name">${escapeHtml(goal.name)}</div>
      </div>
      <div class="goal-archive-status">
        <span>${statusLabel}</span>
        <strong>${escapeHtml(statusDate ? formatDeadlineLong(statusDate) : "дата не указана")}</strong>
      </div>
    </div>

    <div class="goal-route-grid">
      <div class="goal-route-box">
        <span>Точка A</span>
        <strong>${escapeHtml(goal.pointA || "Не задано")}</strong>
      </div>
      <div class="goal-route-box">
        <span>Точка B</span>
        <strong>${escapeHtml(goal.pointB || "Не задано")}</strong>
      </div>
    </div>

    <div class="goal-stats">
      <div class="goal-stat">
        <span>${Math.round(progress.percent)}%</span>
        <span>закрыто</span>
      </div>
      <div class="goal-stat">
        <span>${progress.doneCount}/${progress.totalCount}</span>
        <span>задач</span>
      </div>
      <div class="goal-stat">
        <span>${escapeHtml(formatDeadlineShort(goal.createdAt))}</span>
        <span>создана</span>
      </div>
    </div>

    <div class="goal-archive-actions">
      <button class="secondary goal-restore" type="button">Вернуть в работу</button>
      <button class="danger goal-delete" type="button">Удалить</button>
    </div>
  `;

  card.querySelector(".goal-restore").onclick = () => restoreGoal(goal);
  card.querySelector(".goal-delete").onclick = () => deleteGoal(goal);
  return card;
}

function getGoalArchiveDate(goal) {
  if (goal.status === "completed") return goal.completedAt || "";
  if (goal.status === "failed") return goal.failedAt || "";
  return "";
}

function makeGoalCard(goal) {
  const card = document.createElement("div");
  card.className = "goal-item";
  const progress = getGoalProgress(goal);
  const sortedTasks = getSortedGoalTasks(goal);
  const nextTask = getNextGoalTask(goal);
  const typeLabel = getGoalTypeLabel(goal.type);
  const canFinish = progress.totalCount > 0 && progress.doneCount === progress.totalCount;

  card.innerHTML = `
    <div class="goal-head">
      <div>
        <div class="goal-type">${escapeHtml(typeLabel)}</div>
        <div class="goal-name">${escapeHtml(goal.name)}</div>
      </div>
      <div class="goal-card-actions">
        <button class="secondary goal-edit" type="button">Изменить</button>
        <button class="primary goal-result" type="button">Завершить цель</button>
        <button class="danger goal-delete" type="button">Удалить</button>
      </div>
    </div>

    <div class="goal-route-grid">
      <div class="goal-route-box">
        <span>Точка A</span>
        <strong>${escapeHtml(goal.pointA || "Не задано")}</strong>
      </div>
      <div class="goal-route-box">
        <span>Точка B</span>
        <strong>${escapeHtml(goal.pointB || "Не задано")}</strong>
      </div>
    </div>

    <div class="goal-progress-line">
      <div class="goal-progress-fill"></div>
    </div>

    <div class="goal-stats">
      <div class="goal-stat">
        <span>${Math.round(progress.percent)}%</span>
        <span>прогресс</span>
      </div>
      <div class="goal-stat">
        <span>${progress.doneCount}/${progress.totalCount}</span>
        <span>задач закрыто</span>
      </div>
      <div class="goal-stat">
        <span>${escapeHtml(nextTask ? formatDeadlineShort(nextTask.deadline) : "—")}</span>
        <span>следующий дедлайн</span>
      </div>
    </div>

    <div class="goal-next">
      ${canFinish ? "Все задачи закрыты. Можно завершить цель и отправить её в реализованные." : nextTask ? makeNextTaskHtml(nextTask) : "Следующая задача пока не задана."}
    </div>

    <div class="goal-task-form">
      <input class="goal-task-title-input" placeholder="Задача: написать параграф, отправить резюме, выпустить статью" />
      <input class="goal-task-deadline-input" type="date" />
      <button class="success add-goal-task-btn" type="button">+ Задача</button>
    </div>

    <div class="goal-task-list"></div>
  `;

  card.querySelector(".goal-edit").onclick = () => openGoalModal(goal.id);
  card.querySelector(".goal-result").onclick = () => openGoalResultModal(goal.id);
  card.querySelector(".goal-delete").onclick = () => deleteGoal(goal);
  card.querySelector(".add-goal-task-btn").onclick = () => addGoalTask(goal.id, card);
  card.querySelector(".goal-progress-fill").style.width = `${progress.percent}%`;

  const taskList = card.querySelector(".goal-task-list");
  if (sortedTasks.length === 0) {
    taskList.innerHTML = `<div class="empty goal-task-empty">Задач с дедлайнами пока нет.</div>`;
  } else {
    sortedTasks.forEach(task => {
      taskList.appendChild(makeGoalTaskItem(goal, task));
    });
  }

  return card;
}

function makeNextTaskHtml(task) {
  return `
    <span>Следующий дедлайн</span>
    <strong>${escapeHtml(task.title || "Задача")}</strong>
    <small>${escapeHtml(formatDeadlineLong(task.deadline))}</small>
  `;
}

function makeGoalTaskItem(goal, task) {
  const item = document.createElement("div");
  item.className = "goal-task-item" + (task.done ? " done" : "");
  const deadlineState = getTaskDeadlineState(task);

  item.innerHTML = `
    <button class="quest-check ${task.done ? "quest-check-done" : ""}" type="button">✓</button>
    <div class="goal-task-main">
      <div class="goal-task-title">${escapeHtml(task.title || "Задача")}</div>
      <div class="goal-task-meta">${escapeHtml(formatDeadlineLong(task.deadline))}</div>
    </div>
    <div class="deadline-pill ${deadlineState.className}">${escapeHtml(deadlineState.text)}</div>
    <button class="primary goal-task-work" type="button">Работать</button>
    <button class="secondary goal-task-edit" type="button">Изменить</button>
    <button class="danger goal-task-delete" type="button">Удалить</button>
  `;

  item.querySelector(".quest-check").onclick = () => toggleGoalTask(goal.id, task.id);
  item.querySelector(".goal-task-work").onclick = () => openGoalWorkspace(goal.id, task.id);
  item.querySelector(".goal-task-edit").onclick = () => editGoalTask(goal.id, task.id);
  item.querySelector(".goal-task-delete").onclick = () => deleteGoalTask(goal.id, task.id);

  return item;
}

function addGoalTask(goalId, card) {
  const goal = data.goals.find(item => item.id === goalId);
  if (!goal) return;

  const titleInput = card.querySelector(".goal-task-title-input");
  const deadlineInput = card.querySelector(".goal-task-deadline-input");
  const title = titleInput.value.trim();
  const deadline = deadlineInput.value;

  if (!title) {
    alert("Назови задачу.");
    return;
  }

  if (!deadline) {
    alert("Укажи дедлайн для задачи.");
    return;
  }

  goal.tasks.push({
    id: crypto.randomUUID(),
    title,
    deadline,
    done: false,
    completedAt: "",
    workspace: {
      notes: "",
      miniGoals: []
    }
  });

  hasManualGoalDateSelection = false;
  titleInput.value = "";
  deadlineInput.value = "";
  markDirty();
  renderGoals();
}

function editGoalTask(goalId, taskId) {
  const task = findGoalTask(goalId, taskId);
  if (!task) return;

  const title = prompt("Задача", task.title || "");
  if (!title || !title.trim()) return;

  const deadline = prompt("Дедлайн в формате YYYY-MM-DD", task.deadline || toDateInputValue(new Date()));
  if (!deadline || !/^\d{4}-\d{2}-\d{2}$/.test(deadline)) {
    alert("Дедлайн должен быть в формате YYYY-MM-DD.");
    return;
  }

  task.title = title.trim();
  task.deadline = deadline;
  selectedGoalDate = deadline;
  goalsVisibleDate = parseDateKey(deadline);
  hasManualGoalDateSelection = true;
  markDirty();
  renderGoals();
}

function toggleGoalTask(goalId, taskId) {
  const task = findGoalTask(goalId, taskId);
  if (!task) return;

  task.done = !task.done;
  task.completedAt = task.done ? toDateInputValue(new Date()) : "";
  markDirty();
  renderGoals();
}

function deleteGoalTask(goalId, taskId) {
  const goal = data.goals.find(item => item.id === goalId);
  if (!goal) return;
  const task = goal.tasks.find(item => item.id === taskId);
  if (!task) return;
  if (!confirm(`Удалить задачу «${task.title}»?`)) return;
  goal.tasks = goal.tasks.filter(item => item.id !== taskId);
  hasManualGoalDateSelection = false;
  markDirty();
  renderGoals();
}

function deleteGoal(goal) {
  if (!confirm(`Удалить цель «${goal.name}»?`)) return;
  data.goals = data.goals.filter(item => item.id !== goal.id);
  hasManualGoalDateSelection = false;
  markDirty();
  renderGoals();
}

function openGoalResultModal(goalId) {
  const goal = data.goals.find(item => item.id === goalId);
  if (!goal) return;
  const progress = getGoalProgress(goal);

  resolvingGoalId = goal.id;
  isGoalResultModalOpen = true;
  goalResultName.textContent = goal.name || "Цель";
  goalResultMeta.textContent = `${progress.doneCount}/${progress.totalCount} задач закрыто · выбери итог маршрута`;
  goalResultModal.hidden = false;
  document.body.classList.add("modal-open");
  goalResultCompletedBtn.focus();
}

function closeGoalResultModal() {
  isGoalResultModalOpen = false;
  resolvingGoalId = null;
  goalResultModal.hidden = true;
  if (!isCompletedModalOpen && !isGoalModalOpen) document.body.classList.remove("modal-open");
}

function resolveGoalResult(status) {
  const goal = data.goals.find(item => item.id === resolvingGoalId);
  if (!goal) return;

  const isCompleted = status === "completed";
  const statusText = isCompleted ? "завершенную" : "проваленную";
  const confirmed = confirm(`Ты точно хочешь отметить цель «${goal.name}» как ${statusText}?`);

  if (!confirmed) {
    closeGoalResultModal();
    showGoalToast(isCompleted
      ? "Окей, не торопимся. Цель остаётся в работе, можно довести её спокойно."
      : "Хорошо, продолжаем бороться. Один сложный день ещё не обязан быть финалом.");
    return;
  }

  if (isCompleted) completeGoal(goal);
  else failGoal(goal);

  closeGoalResultModal();
  launchGoalConfetti(status);
  showGoalToast(isCompleted
    ? "Цель завершена и отправлена в реализованные."
    : "Цель перенесена в проваленные. Это тоже данные для следующей попытки.");
}

function completeGoal(goal) {
  goal.status = "completed";
  goal.completedAt = toDateInputValue(new Date());
  goal.failedAt = "";
  hasManualGoalDateSelection = false;
  goalArchiveMode = "completed";
  markDirty();
  renderGoals();
}

function failGoal(goal) {
  goal.status = "failed";
  goal.failedAt = toDateInputValue(new Date());
  goal.completedAt = "";
  hasManualGoalDateSelection = false;
  goalArchiveMode = "failed";
  markDirty();
  renderGoals();
}

function restoreGoal(goal) {
  goal.status = "active";
  goal.completedAt = "";
  goal.failedAt = "";
  hasManualGoalDateSelection = false;
  markDirty();
  renderGoals();
}

function showGoalToast(message) {
  clearTimeout(goalToastTimer);
  goalToast.textContent = message;
  goalToast.hidden = false;
  goalToast.classList.add("show");
  goalToastTimer = setTimeout(() => {
    goalToast.classList.remove("show");
    goalToast.hidden = true;
  }, 4200);
}

function launchGoalConfetti(status) {
  const colors = status === "completed"
    ? [getCssColor("--success"), getCssColor("--warning"), getCssColor("--text"), getCssColor("--card")]
    : [getCssColor("--danger"), getCssColor("--warning"), getCssColor("--text"), getCssColor("--card")];

  goalConfettiLayer.innerHTML = "";
  goalConfettiLayer.classList.add("active");

  for (let i = 0; i < 70; i++) {
    const piece = document.createElement("span");
    const size = 6 + Math.random() * 8;
    piece.style.left = `${Math.random() * 100}%`;
    piece.style.width = `${size}px`;
    piece.style.height = `${size * (0.45 + Math.random() * 0.9)}px`;
    piece.style.background = colors[i % colors.length];
    piece.style.animationDelay = `${Math.random() * 0.25}s`;
    piece.style.animationDuration = `${1.7 + Math.random() * 1.2}s`;
    piece.style.setProperty("--confetti-x", `${-70 + Math.random() * 140}px`);
    piece.style.setProperty("--confetti-rotation", `${180 + Math.random() * 720}deg`);
    goalConfettiLayer.appendChild(piece);
  }

  setTimeout(() => {
    goalConfettiLayer.classList.remove("active");
    goalConfettiLayer.innerHTML = "";
  }, 3200);
}

function openGoalWorkspace(goalId, taskId) {
  window.location.hash = `workspace=${encodeURIComponent(goalId)}:${encodeURIComponent(taskId)}`;
}

function renderGoalWorkspacePage() {
  if (activeView !== "workspace") return;
  const route = getWorkspaceRoute();

  if (!currentUser) {
    renderWorkspaceEmpty("Войди через Google в этой вкладке, чтобы открыть рабочее пространство.");
    return;
  }

  if (!route) {
    renderWorkspaceEmpty("Задача для работы не выбрана.");
    return;
  }

  workspaceGoalId = route.goalId;
  workspaceTaskId = route.taskId;
  const context = findGoalTaskContext(workspaceGoalId, workspaceTaskId);

  if (!context) {
    renderWorkspaceEmpty("Эта задача больше не найдена. Возможно, её удалили или цель ушла в архив.");
    return;
  }

  const { goal, task } = context;
  const workspace = ensureTaskWorkspace(task);

  goalWorkspaceNotes.disabled = false;
  goalMiniGoalInput.disabled = false;
  goalMiniGoalAddBtn.disabled = false;
  goalWorkspaceGoalName.textContent = goal.name || "Цель";
  goalWorkspaceTaskName.textContent = task.title || "Задача";
  if (document.activeElement !== goalWorkspaceNotes) {
    goalWorkspaceNotes.value = workspace.notes || "";
    resizeWorkspaceNotesEditor();
  }
  renderWorkspaceMiniGoals(workspace);
}

function renderWorkspaceEmpty(message) {
  goalWorkspaceGoalName.textContent = "Workspace";
  goalWorkspaceTaskName.textContent = message;
  goalWorkspaceNotes.value = "";
  resizeWorkspaceNotesEditor();
  goalWorkspaceNotes.disabled = true;
  goalMiniGoalInput.disabled = true;
  goalMiniGoalAddBtn.disabled = true;
  goalMiniGoalList.innerHTML = `<div class="empty goal-mini-empty">${escapeHtml(message)}</div>`;
}

function getWorkspaceRoute() {
  const match = window.location.hash.match(/^#workspace=([^:]+):(.+)$/);
  if (!match) return null;

  return {
    goalId: decodeURIComponent(match[1]),
    taskId: decodeURIComponent(match[2])
  };
}

function renderWorkspaceMiniGoals(workspace) {
  goalMiniGoalList.innerHTML = "";

  if (workspace.miniGoals.length === 0) {
    goalMiniGoalList.innerHTML = `<div class="empty goal-mini-empty">Мини-целей пока нет.</div>`;
    return;
  }

  workspace.miniGoals.forEach(miniGoal => {
    const item = document.createElement("div");
    item.className = "goal-mini-item" + (miniGoal.done ? " done" : "");
    item.innerHTML = `
      <button class="quest-check ${miniGoal.done ? "quest-check-done" : ""}" type="button">✓</button>
      <div class="goal-mini-title">${escapeHtml(miniGoal.title)}</div>
      <button class="danger goal-mini-delete" type="button">Удалить</button>
    `;

    item.querySelector(".quest-check").onclick = () => toggleWorkspaceMiniGoal(miniGoal.id);
    item.querySelector(".goal-mini-delete").onclick = () => deleteWorkspaceMiniGoal(miniGoal.id);
    goalMiniGoalList.appendChild(item);
  });
}

function updateWorkspaceNotes() {
  const context = findGoalTaskContext(workspaceGoalId, workspaceTaskId);
  if (!context) return;

  const workspace = ensureTaskWorkspace(context.task);
  workspace.notes = goalWorkspaceNotes.value;
  resizeWorkspaceNotesEditor();
  markDirty();
}

function resizeWorkspaceNotesEditor() {
  goalWorkspaceNotes.style.height = "auto";
  goalWorkspaceNotes.style.height = `${goalWorkspaceNotes.scrollHeight}px`;
}

function addWorkspaceMiniGoal() {
  const context = findGoalTaskContext(workspaceGoalId, workspaceTaskId);
  if (!context) return;

  const title = goalMiniGoalInput.value.trim();
  if (!title) return;

  const workspace = ensureTaskWorkspace(context.task);
  workspace.miniGoals.push({
    id: crypto.randomUUID(),
    title,
    done: false,
    completedAt: ""
  });

  goalMiniGoalInput.value = "";
  markDirty();
  renderWorkspaceMiniGoals(workspace);
  renderGoals();
}

function toggleWorkspaceMiniGoal(miniGoalId) {
  const context = findGoalTaskContext(workspaceGoalId, workspaceTaskId);
  if (!context) return;

  const workspace = ensureTaskWorkspace(context.task);
  const miniGoal = workspace.miniGoals.find(item => item.id === miniGoalId);
  if (!miniGoal) return;

  miniGoal.done = !miniGoal.done;
  miniGoal.completedAt = miniGoal.done ? toDateInputValue(new Date()) : "";
  markDirty();
  renderWorkspaceMiniGoals(workspace);
  renderGoals();
}

function deleteWorkspaceMiniGoal(miniGoalId) {
  const context = findGoalTaskContext(workspaceGoalId, workspaceTaskId);
  if (!context) return;

  const workspace = ensureTaskWorkspace(context.task);
  workspace.miniGoals = workspace.miniGoals.filter(item => item.id !== miniGoalId);
  markDirty();
  renderWorkspaceMiniGoals(workspace);
  renderGoals();
}

function ensureTaskWorkspace(task) {
  if (!task.workspace) task.workspace = normalizeTaskWorkspace();
  if (!Array.isArray(task.workspace.miniGoals)) task.workspace.miniGoals = [];
  if (typeof task.workspace.notes !== "string") task.workspace.notes = "";
  return task.workspace;
}

function findGoalTaskContext(goalId, taskId) {
  const goal = data.goals.find(item => item.id === goalId);
  if (!goal) return null;

  const task = goal.tasks.find(item => item.id === taskId);
  if (!task) return null;

  return { goal, task };
}

function findGoalTask(goalId, taskId) {
  const goal = data.goals.find(item => item.id === goalId);
  return goal?.tasks.find(task => task.id === taskId) || null;
}

function getSortedGoalTasks(goal) {
  return [...(goal.tasks || [])].sort((a, b) => {
    if (a.done !== b.done) return Number(a.done) - Number(b.done);
    if (a.deadline !== b.deadline) return String(a.deadline).localeCompare(String(b.deadline));
    return String(a.title || "").localeCompare(String(b.title || ""));
  });
}

function getNextGoalTask(goal) {
  return getSortedGoalTasks(goal).find(task => !task.done) || null;
}

function getGoalProgress(goal) {
  const tasks = goal.tasks || [];
  const totalCount = tasks.length;
  const doneCount = tasks.filter(task => task.done).length;

  return {
    percent: totalCount === 0 ? 0 : (doneCount / totalCount) * 100,
    doneCount,
    totalCount
  };
}

function isGoalComplete(goal) {
  return goal?.status === "completed";
}

function isGoalFailed(goal) {
  return goal?.status === "failed";
}

function isGoalArchived(goal) {
  return isGoalComplete(goal) || isGoalFailed(goal);
}

function isGoalActive(goal) {
  return !isGoalArchived(goal);
}

function getActiveGoals() {
  return (data.goals || []).filter(isGoalActive);
}

function getGoalTypeLabel(type) {
  const labels = {
    strength: "Сила",
    skill: "Навык",
    project: "Проект",
    career: "Карьера",
    health: "Здоровье",
    other: "Другое"
  };
  return labels[type] || labels.other;
}

function renderDeadlineCalendar() {
  goalsCalendarGrid.innerHTML = "";
  goalsCalendarGrid.className = `deadline-calendar-grid ${goalsCalendarMode}`;
  goalModeMonthBtn.classList.toggle("active", goalsCalendarMode === "month");
  goalModeWeekBtn.classList.toggle("active", goalsCalendarMode === "week");
  goalModeDayBtn.classList.toggle("active", goalsCalendarMode === "day");
  goalsCalendarTitle.textContent = getGoalCalendarTitle();

  if (goalsCalendarMode !== "day") {
    ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"].forEach(label => {
      const item = document.createElement("div");
      item.className = "deadline-weekday";
      item.textContent = label;
      goalsCalendarGrid.appendChild(item);
    });
  }

  getGoalCalendarDays().forEach(day => {
    const dateKey = toDateInputValue(day);
    const items = getDeadlineItemsForDate(dateKey);
    const dayButton = document.createElement("button");
    dayButton.className = "deadline-day";
    dayButton.type = "button";
    if (dateKey === selectedGoalDate) dayButton.classList.add("selected");
    if (dateKey === toDateInputValue(new Date())) dayButton.classList.add("today");
    if (goalsCalendarMode === "month" && day.getMonth() !== goalsVisibleDate.getMonth()) {
      dayButton.classList.add("outside");
    }

    dayButton.innerHTML = `
      <div class="deadline-day-top">
        <span>${day.getDate()}</span>
        <small>${day.toLocaleDateString("ru-RU", { weekday: "short" })}</small>
      </div>
      <div class="deadline-day-items">
        ${items.slice(0, goalsCalendarMode === "day" ? 12 : 3).map(item => `
          <div class="deadline-chip ${item.task.done ? "done" : ""}">${escapeHtml(item.task.title)}</div>
        `).join("")}
        ${items.length > (goalsCalendarMode === "day" ? 12 : 3) ? `<div class="deadline-more">+${items.length - (goalsCalendarMode === "day" ? 12 : 3)}</div>` : ""}
      </div>
    `;

    dayButton.onclick = () => {
      selectedGoalDate = dateKey;
      goalsVisibleDate = parseDateKey(dateKey);
      hasManualGoalDateSelection = true;
      renderGoals();
    };

    goalsCalendarGrid.appendChild(dayButton);
  });
}

function renderDeadlineFocus() {
  const items = getDeadlineItemsForDate(selectedGoalDate);
  selectedDeadlineTitle.textContent = selectedGoalDate
    ? formatDeadlineFocusTitle(selectedGoalDate)
    : "Дедлайн";
  deadlineFocusMeta.textContent = items.length > 0
    ? `${items.length} ${pluralizeRu(items.length, "задача", "задачи", "задач")} на дату`
    : "Нет дедлайнов на дату";

  const deadlineDates = getDeadlineDates();
  prevDeadlineBtn.disabled = deadlineDates.length === 0 || selectedGoalDate <= deadlineDates[0];
  nextDeadlineBtn.disabled = deadlineDates.length === 0 || selectedGoalDate >= deadlineDates[deadlineDates.length - 1];

  selectedDeadlineList.innerHTML = "";

  if (!currentUser) {
    selectedDeadlineList.innerHTML = `<div class="empty">Войди через Google, чтобы видеть дедлайны.</div>`;
    return;
  }

  if (items.length === 0) {
    selectedDeadlineList.innerHTML = `<div class="empty">На этот день задач нет.</div>`;
    return;
  }

  items.forEach(item => selectedDeadlineList.appendChild(makeDeadlineFocusItem(item)));
}

function makeDeadlineFocusItem(item) {
  const el = document.createElement("div");
  el.className = "deadline-focus-item" + (item.task.done ? " done" : "");
  const state = getTaskDeadlineState(item.task);

  el.innerHTML = `
    <button class="quest-check ${item.task.done ? "quest-check-done" : ""}" type="button">✓</button>
    <div>
      <div class="deadline-focus-task">${escapeHtml(item.task.title)}</div>
      <div class="deadline-focus-goal">${escapeHtml(item.goal.name)}</div>
    </div>
    <div class="deadline-pill ${state.className}">${escapeHtml(state.text)}</div>
  `;

  el.querySelector(".quest-check").onclick = () => toggleGoalTask(item.goal.id, item.task.id);
  return el;
}

function ensureSelectedGoalDate() {
  const deadlines = getAllDeadlineItems();

  if (deadlines.length === 0) {
    if (!selectedGoalDate) selectedGoalDate = toDateInputValue(new Date());
    return;
  }

  if (!selectedGoalDate || !hasManualGoalDateSelection) {
    selectedGoalDate = findNearestDeadlineDate(deadlines);
    goalsVisibleDate = parseDateKey(selectedGoalDate);
  }
}

function getAllDeadlineItems() {
  return getActiveGoals().flatMap(goal => {
    return (goal.tasks || [])
      .filter(task => task.deadline)
      .map(task => ({ goal, task }));
  }).sort((a, b) => {
    if (a.task.deadline !== b.task.deadline) return a.task.deadline.localeCompare(b.task.deadline);
    if (a.task.done !== b.task.done) return Number(a.task.done) - Number(b.task.done);
    return a.task.title.localeCompare(b.task.title);
  });
}

function getDeadlineItemsForDate(dateKey) {
  return getAllDeadlineItems().filter(item => item.task.deadline === dateKey);
}

function getDeadlineDates() {
  return [...new Set(getAllDeadlineItems().map(item => item.task.deadline))].sort();
}

function findNearestDeadlineDate(deadlines) {
  const todayKey = toDateInputValue(new Date());
  const future = deadlines.find(item => item.task.deadline >= todayKey);
  return future?.task.deadline || deadlines[deadlines.length - 1].task.deadline;
}

function setGoalsCalendarMode(mode) {
  goalsCalendarMode = mode;
  renderDeadlineCalendar();
  renderDeadlineFocus();
}

function changeGoalCalendarPeriod(delta) {
  const nextDate = new Date(goalsVisibleDate);
  if (goalsCalendarMode === "month") {
    nextDate.setMonth(nextDate.getMonth() + delta);
  } else if (goalsCalendarMode === "week") {
    nextDate.setDate(nextDate.getDate() + delta * 7);
  } else {
    nextDate.setDate(nextDate.getDate() + delta);
  }

  goalsVisibleDate = nextDate;
  selectedGoalDate = toDateInputValue(nextDate);
  hasManualGoalDateSelection = true;
  renderGoals();
}

function goToTodayGoalDate() {
  goalsVisibleDate = new Date();
  selectedGoalDate = toDateInputValue(new Date());
  hasManualGoalDateSelection = true;
  renderGoals();
}

function stepSelectedDeadline(delta) {
  const dates = getDeadlineDates();
  if (dates.length === 0) return;

  let index = dates.indexOf(selectedGoalDate);
  if (index === -1) {
    index = delta > 0
      ? dates.findIndex(dateKey => dateKey > selectedGoalDate)
      : [...dates].reverse().findIndex(dateKey => dateKey < selectedGoalDate);
    if (delta < 0 && index !== -1) index = dates.length - 1 - index;
  } else {
    index += delta;
  }

  index = Math.max(0, Math.min(dates.length - 1, index));
  selectedGoalDate = dates[index];
  goalsVisibleDate = parseDateKey(selectedGoalDate);
  hasManualGoalDateSelection = true;
  renderGoals();
}

function getGoalCalendarDays() {
  if (goalsCalendarMode === "day") {
    return [parseDateKey(toDateInputValue(goalsVisibleDate))];
  }

  if (goalsCalendarMode === "week") {
    return getWeekDaysFromStart(getWeekStart(goalsVisibleDate));
  }

  const firstOfMonth = new Date(goalsVisibleDate.getFullYear(), goalsVisibleDate.getMonth(), 1);
  const start = getWeekStart(firstOfMonth);
  const days = [];

  for (let i = 0; i < 42; i++) {
    const day = new Date(start);
    day.setDate(start.getDate() + i);
    days.push(day);
  }

  return days;
}

function getGoalCalendarTitle() {
  if (goalsCalendarMode === "day") {
    return goalsVisibleDate.toLocaleDateString("ru-RU", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric"
    });
  }

  if (goalsCalendarMode === "week") {
    const week = getWeekDaysFromStart(getWeekStart(goalsVisibleDate));
    return `${formatFullDate(week[0])} — ${formatFullDate(week[6])}`;
  }

  return goalsVisibleDate.toLocaleDateString("ru-RU", {
    month: "long",
    year: "numeric"
  });
}

function getTaskDeadlineState(task) {
  if (task.done) return { text: "готово", className: "done" };
  if (!task.deadline) return { text: "без срока", className: "" };

  const todayKey = toDateInputValue(new Date());
  if (task.deadline < todayKey) return { text: "просрочено", className: "danger" };
  if (task.deadline === todayKey) return { text: "сегодня", className: "warning" };

  const daysLeft = Math.ceil((parseDateKey(task.deadline) - parseDateKey(todayKey)) / 86400000);
  if (daysLeft <= 7) return { text: `${formatDayCount(daysLeft)}`, className: "warning" };
  return { text: `${formatDayCount(daysLeft)}`, className: "" };
}

function isTaskUrgent(task) {
  if (!task || task.done || !task.deadline) return false;
  const todayKey = toDateInputValue(new Date());
  const daysLeft = Math.ceil((parseDateKey(task.deadline) - parseDateKey(todayKey)) / 86400000);
  return daysLeft <= 7;
}

function formatDeadlineShort(deadline) {
  if (!deadline) return "—";
  return formatShortDate(deadline);
}

function formatDeadlineLong(deadline) {
  if (!deadline) return "без дедлайна";
  return parseDateKey(deadline).toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric"
  });
}

function formatDeadlineFocusTitle(deadline) {
  return parseDateKey(deadline).toLocaleDateString("ru-RU", {
    weekday: "long",
    day: "numeric",
    month: "long"
  });
}

function formatGoalMetric(value, unit = "") {
  if (value === "" || value === null || value === undefined) return "";
  const suffix = unit ? ` ${unit}` : "";
  return `${Number(value)}${suffix}`;
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

function getPreviousDateKey(dateKey) {
  const date = parseDateKey(dateKey);
  date.setDate(date.getDate() - 1);
  return toDateInputValue(date);
}

function isHabitDoneToday(habitId) {
  const todayKey = toDateInputValue(new Date());
  return Boolean(data.records[todayKey]?.[habitId]?.done);
}

function isTodayComplete() {
  if (data.habits.length === 0) return false;
  const todayKey = toDateInputValue(new Date());
  return countDoneRecordsForDate(todayKey) === data.habits.length;
}

function calculateMotivationalHabitStreak(habitId) {
  if (isHabitDoneToday(habitId)) return calculateStreak(habitId);

  const todayKey = toDateInputValue(new Date());
  const yesterdayKey = getPreviousDateKey(todayKey);
  return calculateStreakAtDate(habitId, yesterdayKey) + 1;
}

function getMotivationalHabitStreakStartDate(habitId) {
  const todayKey = toDateInputValue(new Date());

  if (isHabitDoneToday(habitId)) {
    return getHabitStreakStartDate(habitId, todayKey);
  }

  const yesterdayKey = getPreviousDateKey(todayKey);
  return getHabitStreakStartDate(habitId, yesterdayKey) || todayKey;
}

function getProjectedTodayValue(habit) {
  const todayKey = toDateInputValue(new Date());
  const record = data.records[todayKey]?.[habit.id];
  const existingValue = Number(record?.value || 0);
  const target = Number(habit.target || 0);

  return existingValue > 0 ? existingValue : target;
}

function calculateMotivationalTotalBetweenDates(habit, startDateKey, endDateKey) {
  const todayKey = toDateInputValue(new Date());
  let total = calculateTotalBetweenDates(habit.id, startDateKey, endDateKey);

  if (startDateKey <= todayKey && endDateKey >= todayKey && !isHabitDoneToday(habit.id)) {
    total += getProjectedTodayValue(habit);
  }

  return total;
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

function calculateMotivationalGlobalStreak() {
  if (data.habits.length === 0) return 0;
  if (isTodayComplete()) return calculateGlobalStreak();

  const todayKey = toDateInputValue(new Date());
  const yesterdayKey = getPreviousDateKey(todayKey);
  return calculateGlobalStreakAtDate(yesterdayKey) + 1;
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
  const todayStreak = calculateMotivationalGlobalStreak();
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
