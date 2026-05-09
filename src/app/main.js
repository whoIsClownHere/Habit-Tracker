import { initializeApp } from "https://www.gstatic.com/firebasejs/12.12.1/firebase-app.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  getRedirectResult,
  GoogleAuthProvider,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  onAuthStateChanged,
  updateProfile
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
  getCalendarMonthDays,
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
import {
  getCachedDailyQuote,
  getDailyQuote,
  getLocalQuoteDate
} from "./services/dailyQuote.js";
import { escapeHtml } from "./utils/html.js";
import {
  applyStaticTranslations,
  getDateLocale,
  getLocale,
  initLocale,
  setLocale,
  t,
  tn
} from "./i18n.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();
provider.setCustomParameters({ prompt: "select_account" });
const db = getFirestore(app);
const TODAY_PAGE_SIZE = 6;
const DAY_REVIEW_LIMIT = 80;
const HABIT_MANAGER_LIMIT = 80;
const PROGRESS_OPTION_LIMIT = 200;
const PROJECTION_LIMIT = 80;
const TODAY_SEARCH_SCAN_LIMIT = 5000;
const DAILY_QUOTE_LANGUAGE = "en";
const WORKOUT_DAY_ID_BY_INDEX = [
  "sun-rest",
  "mon-upper-a",
  "tue-lower-a",
  "wed-recovery",
  "thu-upper-b",
  "fri-lower-b",
  "sat-cardio"
];
const WORKOUT_WEIGHT_UNIT_KEYS = ["kg", "lb"];
const WORKOUT_WEIGHT_CONVERSION = {
  kg: { lb: 2.20462 },
  lb: { kg: 1 / 2.20462 }
};
const WORKOUT_RESULT_UNIT_OPTIONS = [
  "workouts.repsUnit",
  "workouts.metersUnit",
  "workouts.yardsUnit",
  "workouts.lapsUnit",
  "workouts.minutesUnit",
  "workouts.passUnit"
];
const PLANNER_BLOCK_TYPES = [
  "goal",
  "habit",
  "custom",
  "interest",
  "admin",
  "rest",
  "study",
  "deepWork",
  "workout"
];
const PLANNER_BLOCK_STATUSES = ["planned", "done", "skipped", "moved"];
const TEST_ACCOUNT = {
  uid: "local-test-account",
  email: "test@hendle.local",
  displayName: "Hendle QA",
  isTestAccount: true
};
const QA_ACCESS_KEY = "hendle.qaAccess";
const QA_ACCESS_QUERY = "qa";
const TEST_SESSION_KEY = "hendle.testSession";
const TEST_DATA_KEY = "hendle.testData";

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
let plannerSelectedDate = toDateInputValue(new Date());
let isPlannerModalOpen = false;
let plannerModalMode = "block";
let plannerEditingBlockId = null;
let plannerEditingRuleId = null;
let plannerLinkMode = "standalone";
let isGoalModalOpen = false;
let editingGoalId = null;
let goalsCalendarMode = "month";
let goalsVisibleDate = new Date();
let selectedGoalDate = "";
let hasManualGoalDateSelection = false;
let goalArchiveMode = "completed";
let isGoalArchiveModalOpen = false;
let goalArchiveSearchQuery = "";
let isGoalResultModalOpen = false;
let resolvingGoalId = null;
let goalToastTimer = null;
let workspaceGoalId = null;
let workspaceTaskId = null;
let workoutWeekStart = getWeekStart(new Date());
let selectedWorkoutDayId = getDefaultWorkoutDayId();
let isWorkoutPlanEditorOpen = false;
const expandedGoalIds = new Set();
const expandedWorkoutExerciseKeys = new Set();
let activeActionMenu = null;
let authMode = "login";
let isAuthModalOpen = false;
let isAuthBusy = false;
let authStateToken = 0;
const MOTION_FAST_MS = 120;
const MOTION_NORMAL_MS = 190;
const MOTION_SLOW_MS = 280;

let data = {
  habits: [],
  records: {},
  goals: [],
  plannerBlocks: [],
  recurringRules: [],
  workoutSettings: { progressionWeeks: 1, weightUnit: "kg" },
  workoutPlan: [],
  workoutLogs: {},
  workoutTargets: {}
};

const signInBtn = document.getElementById("signInBtn");
const createAccountBtn = document.getElementById("createAccountBtn");
const signOutBtn = document.getElementById("signOutBtn");
const languageSelect = document.getElementById("languageSelect");
const homeBrandBtn = document.getElementById("homeBrandBtn");
const accountMenu = document.getElementById("accountMenu");
const accountMenuBtn = document.getElementById("accountMenuBtn");
const accountMenuPanel = document.getElementById("accountMenuPanel");
const accountMenuLabel = document.getElementById("accountMenuLabel");
const accountButtonDot = document.getElementById("accountButtonDot");
const authModal = document.getElementById("authModal");
const authModalCloseBtn = document.getElementById("authModalCloseBtn");
const authModalTitle = document.getElementById("authModalTitle");
const authLoginTabBtn = document.getElementById("authLoginTabBtn");
const authRegisterTabBtn = document.getElementById("authRegisterTabBtn");
const authForm = document.getElementById("authForm");
const authNameField = document.getElementById("authNameField");
const authNameInput = document.getElementById("authNameInput");
const authEmailInput = document.getElementById("authEmailInput");
const authPasswordInput = document.getElementById("authPasswordInput");
const authPasswordConfirmField = document.getElementById("authPasswordConfirmField");
const authPasswordConfirmInput = document.getElementById("authPasswordConfirmInput");
const authSubmitBtn = document.getElementById("authSubmitBtn");
const authGoogleBtn = document.getElementById("authGoogleBtn");
const authTestBtn = document.getElementById("authTestBtn");
const authResetBtn = document.getElementById("authResetBtn");
const authMessage = document.getElementById("authMessage");
const themeToggle = document.getElementById("themeToggle");
const themeToggleLabel = document.getElementById("themeToggleLabel");
const testingPanel = document.getElementById("testingPanel");
const testingAccountMeta = document.getElementById("testingAccountMeta");
const testingScenarios = document.getElementById("testingScenarios");
const testingSeedBtn = document.getElementById("testingSeedBtn");
const testingResetBtn = document.getElementById("testingResetBtn");
const habitsTabBtn = document.getElementById("habitsTabBtn");
const workoutsTabBtn = document.getElementById("workoutsTabBtn");
const plannerTabBtn = document.getElementById("plannerTabBtn");
const goalsTabBtn = document.getElementById("goalsTabBtn");
const habitsView = document.getElementById("habitsView");
const workoutsView = document.getElementById("workoutsView");
const plannerView = document.getElementById("plannerView");
const goalsView = document.getElementById("goalsView");
const goalWorkspaceView = document.getElementById("goalWorkspaceView");
const plannerDateLabel = document.getElementById("plannerDateLabel");
const plannerPrevDayBtn = document.getElementById("plannerPrevDayBtn");
const plannerTodayBtn = document.getElementById("plannerTodayBtn");
const plannerNextDayBtn = document.getElementById("plannerNextDayBtn");
const plannerAddBlockBtn = document.getElementById("plannerAddBlockBtn");
const plannerAddRecurringBtn = document.getElementById("plannerAddRecurringBtn");
const plannerPlannedCount = document.getElementById("plannerPlannedCount");
const plannerDoneCount = document.getElementById("plannerDoneCount");
const plannerSkippedCount = document.getElementById("plannerSkippedCount");
const plannerGoalCount = document.getElementById("plannerGoalCount");
const plannerTimeline = document.getElementById("plannerTimeline");
const plannerRecurringList = document.getElementById("plannerRecurringList");
const plannerBlockModal = document.getElementById("plannerBlockModal");
const plannerModalCloseBtn = document.getElementById("plannerModalCloseBtn");
const plannerModalTitle = document.getElementById("plannerModalTitle");
const plannerChoiceGoalBtn = document.getElementById("plannerChoiceGoalBtn");
const plannerChoiceStandaloneBtn = document.getElementById("plannerChoiceStandaloneBtn");
const plannerDateField = document.getElementById("plannerDateField");
const plannerDateInput = document.getElementById("plannerDateInput");
const plannerStartInput = document.getElementById("plannerStartInput");
const plannerEndInput = document.getElementById("plannerEndInput");
const plannerTypeSelect = document.getElementById("plannerTypeSelect");
const plannerGoalSelect = document.getElementById("plannerGoalSelect");
const plannerMilestoneSelect = document.getElementById("plannerMilestoneSelect");
const plannerHabitSelect = document.getElementById("plannerHabitSelect");
const plannerTitleInput = document.getElementById("plannerTitleInput");
const plannerWeekdayField = document.getElementById("plannerWeekdayField");
const plannerWeekdayChoices = document.getElementById("plannerWeekdayChoices");
const plannerDoneInput = document.getElementById("plannerDoneInput");
const plannerNotesField = document.getElementById("plannerNotesField");
const plannerNotesInput = document.getElementById("plannerNotesInput");
const plannerDeleteBtn = document.getElementById("plannerDeleteBtn");
const plannerSaveBtn = document.getElementById("plannerSaveBtn");
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
const dailyQuoteSection = document.getElementById("dailyQuoteSection");
const dailyQuoteBlockquote = document.getElementById("dailyQuoteBlockquote");
const dailyQuoteSkeleton = document.getElementById("dailyQuoteSkeleton");
const dailyQuoteText = document.getElementById("dailyQuoteText");
const dailyQuoteCredit = document.getElementById("dailyQuoteCredit");
const dailyQuoteAuthor = document.getElementById("dailyQuoteAuthor");
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
const openGoalArchiveBtn = document.getElementById("openGoalArchiveBtn");
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
const goalArchiveModal = document.getElementById("goalArchiveModal");
const goalArchiveModalCloseBtn = document.getElementById("goalArchiveModalCloseBtn");
const goalArchiveSearchInput = document.getElementById("goalArchiveSearchInput");
const goalArchiveModalMeta = document.getElementById("goalArchiveModalMeta");
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
const workoutWeekTitle = document.getElementById("workoutWeekTitle");
const prevWorkoutWeekBtn = document.getElementById("prevWorkoutWeekBtn");
const thisWorkoutWeekBtn = document.getElementById("thisWorkoutWeekBtn");
const nextWorkoutWeekBtn = document.getElementById("nextWorkoutWeekBtn");
const workoutCadenceSelect = document.getElementById("workoutCadenceSelect");
const workoutWeightUnitSelect = document.getElementById("workoutWeightUnitSelect");
const workoutPlanEditorToggleBtn = document.getElementById("workoutPlanEditorToggleBtn");
const workoutPlanNextBtn = document.getElementById("workoutPlanNextBtn");
const workoutLoggedSets = document.getElementById("workoutLoggedSets");
const workoutTotalSets = document.getElementById("workoutTotalSets");
const workoutLoggedExercises = document.getElementById("workoutLoggedExercises");
const workoutNextBlockDate = document.getElementById("workoutNextBlockDate");
const workoutDayTabs = document.getElementById("workoutDayTabs");
const workoutDayKicker = document.getElementById("workoutDayKicker");
const workoutDayTitle = document.getElementById("workoutDayTitle");
const workoutDayFocus = document.getElementById("workoutDayFocus");
const workoutPlanEditor = document.getElementById("workoutPlanEditor");
const workoutPlanDayTitleInput = document.getElementById("workoutPlanDayTitleInput");
const workoutPlanDayFocusInput = document.getElementById("workoutPlanDayFocusInput");
const workoutPlanDayKindSelect = document.getElementById("workoutPlanDayKindSelect");
const workoutAddExerciseBtn = document.getElementById("workoutAddExerciseBtn");
const workoutExerciseList = document.getElementById("workoutExerciseList");
let isHabitManagerOpen = false;
let isCompletedModalOpen = false;
let completedSearchQuery = "";
const chart = document.getElementById("progressChart");
let progressChartInstance = null;
const statusDot = document.getElementById("statusDot");
const statusText = document.getElementById("statusText");
let currentStatus = { key: "status.signedOut", mode: "off", params: {} };
let dailyQuoteDate = getLocalQuoteDate();
let dailyQuote = getCachedDailyQuote({
  date: dailyQuoteDate,
  language: DAILY_QUOTE_LANGUAGE
});
let isDailyQuoteLoading = false;
let dailyQuoteRequestToken = 0;

initLocale();
languageSelect.value = getLocale();
signOutBtn.hidden = true;

habitsTabBtn.addEventListener("click", () => switchView("habits"));
workoutsTabBtn.addEventListener("click", () => switchView("workouts"));
plannerTabBtn.addEventListener("click", () => switchView("planner"));
goalsTabBtn.addEventListener("click", () => switchView("goals"));
homeBrandBtn.addEventListener("click", handleHomeBrandClick);
accountMenu.addEventListener("click", (event) => event.stopPropagation());
accountMenuBtn.addEventListener("click", (event) => {
  event.preventDefault();
  event.stopPropagation();
  toggleAccountMenu();
});
accountMenuPanel.addEventListener("click", (event) => event.stopPropagation());
signInBtn.addEventListener("click", () => {
  closeAccountMenu();
  openAuthModal("login");
});
createAccountBtn.addEventListener("click", () => {
  closeAccountMenu();
  openAuthModal("register");
});
signOutBtn.addEventListener("click", () => {
  closeAccountMenu();
  handleSignOut();
});
languageSelect.addEventListener("change", () => {
  setLocale(languageSelect.value);
  refreshLocalizedUi();
});
authModalCloseBtn.addEventListener("click", closeAuthModal);
authLoginTabBtn.addEventListener("click", () => setAuthMode("login"));
authRegisterTabBtn.addEventListener("click", () => setAuthMode("register"));
authForm.addEventListener("submit", handleAuthSubmit);
authGoogleBtn.addEventListener("click", handleGoogleSignIn);
authTestBtn.addEventListener("click", () => startTestAccount({ seedIfMissing: true }));
authResetBtn.addEventListener("click", handlePasswordReset);
testingSeedBtn.addEventListener("click", () => reloadTestSeedData());
testingResetBtn.addEventListener("click", () => resetTestData());
document.getElementById("addHabitBtn").addEventListener("click", addHabit);
addGoalOpenBtn.addEventListener("click", () => openGoalModal());
goalModalCloseBtn.addEventListener("click", closeGoalModal);
goalSaveBtn.addEventListener("click", saveGoalFromModal);
plannerPrevDayBtn.addEventListener("click", () => changePlannerDate(-1));
plannerTodayBtn.addEventListener("click", goToTodayPlannerDate);
plannerNextDayBtn.addEventListener("click", () => changePlannerDate(1));
plannerAddBlockBtn.addEventListener("click", () => openPlannerBlockModal({ mode: "block" }));
plannerAddRecurringBtn.addEventListener("click", () => openPlannerBlockModal({ mode: "rule" }));
plannerModalCloseBtn.addEventListener("click", closePlannerModal);
plannerChoiceGoalBtn.addEventListener("click", () => setPlannerLinkMode("goal"));
plannerChoiceStandaloneBtn.addEventListener("click", () => setPlannerLinkMode("standalone"));
plannerGoalSelect.addEventListener("change", () => {
  populatePlannerMilestoneSelect(plannerGoalSelect.value);
  syncPlannerTitleFromSelectedTask();
});
plannerMilestoneSelect.addEventListener("change", syncPlannerTitleFromSelectedTask);
plannerTypeSelect.addEventListener("change", syncPlannerModalVisibility);
plannerSaveBtn.addEventListener("click", savePlannerFromModal);
plannerDeleteBtn.addEventListener("click", deletePlannerFromModal);
openGoalArchiveBtn.addEventListener("click", openGoalArchiveModal);
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
authModal.addEventListener("click", (event) => {
  if (event.target === authModal) closeAuthModal();
});
goalModal.addEventListener("click", (event) => {
  if (event.target === goalModal) closeGoalModal();
});
plannerBlockModal.addEventListener("click", (event) => {
  if (event.target === plannerBlockModal) closePlannerModal();
});
goalArchiveModal.addEventListener("click", (event) => {
  if (event.target === goalArchiveModal) closeGoalArchiveModal();
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeActionMenu();
    closeAccountMenu();
  }
  if (event.key === "Escape" && isAuthModalOpen) closeAuthModal();
  if (event.key === "Escape" && isCompletedModalOpen) closeCompletedModal();
  if (event.key === "Escape" && isPlannerModalOpen) closePlannerModal();
  if (event.key === "Escape" && isGoalModalOpen) closeGoalModal();
  if (event.key === "Escape" && isGoalArchiveModalOpen) closeGoalArchiveModal();
  if (event.key === "Escape" && isGoalResultModalOpen) closeGoalResultModal();
});
document.addEventListener("click", () => {
  closeActionMenu();
  closeAccountMenu();
});
window.addEventListener("resize", () => {
  closeActionMenu();
  closeAccountMenu();
});
window.addEventListener("scroll", () => {
  closeActionMenu();
  closeAccountMenu();
}, true);
goalModeMonthBtn.addEventListener("click", () => setGoalsCalendarMode("month"));
goalModeWeekBtn.addEventListener("click", () => setGoalsCalendarMode("week"));
goalModeDayBtn.addEventListener("click", () => setGoalsCalendarMode("day"));
prevGoalPeriodBtn.addEventListener("click", () => changeGoalCalendarPeriod(-1));
nextGoalPeriodBtn.addEventListener("click", () => changeGoalCalendarPeriod(1));
todayGoalPeriodBtn.addEventListener("click", goToTodayGoalDate);
prevDeadlineBtn.addEventListener("click", () => stepSelectedDeadline(-1));
nextDeadlineBtn.addEventListener("click", () => stepSelectedDeadline(1));
goalArchiveModalCloseBtn.addEventListener("click", closeGoalArchiveModal);
goalArchiveSearchInput.addEventListener("input", (event) => {
  goalArchiveSearchQuery = event.target.value.trim().toLowerCase();
  renderGoalArchive();
});
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
prevWorkoutWeekBtn.addEventListener("click", () => changeWorkoutWeek(-1));
nextWorkoutWeekBtn.addEventListener("click", () => changeWorkoutWeek(1));
thisWorkoutWeekBtn.addEventListener("click", goToCurrentWorkoutWeek);
workoutCadenceSelect.addEventListener("change", updateWorkoutCadence);
workoutWeightUnitSelect.addEventListener("change", updateWorkoutWeightUnit);
workoutPlanEditorToggleBtn.addEventListener("click", toggleWorkoutPlanEditor);
workoutPlanDayTitleInput.addEventListener("change", () => updateWorkoutDayField("title", workoutPlanDayTitleInput.value.trim()));
workoutPlanDayFocusInput.addEventListener("change", () => updateWorkoutDayField("focus", workoutPlanDayFocusInput.value.trim()));
workoutPlanDayKindSelect.addEventListener("change", () => updateWorkoutDayField("kind", workoutPlanDayKindSelect.value));
workoutAddExerciseBtn.addEventListener("click", addWorkoutExercise);
workoutPlanNextBtn.addEventListener("click", planNextWorkoutBlock);
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
applyStaticTranslations();
initTheme();
refreshStatusText();
bootstrapQaAccess();
syncQaAccessControls();
restoreTestAccountSession();
switchView(activeView, { updateHash: false });

window.addEventListener("hashchange", () => {
  switchView(getInitialView(), { updateHash: false });
});

handleRedirectResult();

onAuthStateChanged(auth, async (user) => {
  if (isTestMode()) return;

  const token = ++authStateToken;
  clearPendingSave();
  currentUser = user;

  if (!user) {
    setAuthBusy(false);
    signInBtn.hidden = false;
    createAccountBtn.hidden = false;
    signOutBtn.hidden = true;
    signOutBtn.disabled = false;
    data = createEmptyData();
    isDirty = false;
    updateStatus("status.signedOut", "off");
    render();
    return;
  }

  signInBtn.hidden = true;
  createAccountBtn.hidden = true;
  signOutBtn.hidden = false;
  signOutBtn.disabled = false;
  setAuthBusy(false);
  closeAuthModal();
  updateStatus("status.loadingAccount", "dirty");
  const loaded = await loadFromFirebase(user.uid);
  if (token !== authStateToken || !isCurrentUser(user.uid)) return;
  if (loaded) updateStatus("status.account", "ready", { user: getUserLabel(user) });
  render();
});

render();

function getInitialView() {
  if (getWorkspaceRoute()) return "workspace";
  if (window.location.hash === "#planner") return "planner";
  if (window.location.hash === "#workouts") return "workouts";
  return window.location.hash === "#goals" ? "goals" : "habits";
}

function switchView(view, options = {}) {
  closeActionMenu();
  closeAccountMenu();
  const previousView = [habitsView, workoutsView, plannerView, goalsView, goalWorkspaceView].find(item => !item.hidden);
  activeView = view === "workspace"
    ? "workspace"
    : view === "goals"
      ? "goals"
      : view === "planner"
        ? "planner"
        : view === "workouts"
          ? "workouts"
          : "habits";
  const isGoals = activeView === "goals";
  const isPlanner = activeView === "planner";
  const isWorkouts = activeView === "workouts";
  const isWorkspace = activeView === "workspace";

  habitsView.hidden = isGoals || isPlanner || isWorkouts || isWorkspace;
  workoutsView.hidden = !isWorkouts;
  plannerView.hidden = !isPlanner;
  goalsView.hidden = !isGoals;
  goalWorkspaceView.hidden = !isWorkspace;
  habitsTabBtn.classList.toggle("active", activeView === "habits");
  workoutsTabBtn.classList.toggle("active", isWorkouts);
  plannerTabBtn.classList.toggle("active", isPlanner);
  goalsTabBtn.classList.toggle("active", isGoals);
  habitsTabBtn.setAttribute("aria-selected", String(activeView === "habits"));
  workoutsTabBtn.setAttribute("aria-selected", String(isWorkouts));
  plannerTabBtn.setAttribute("aria-selected", String(isPlanner));
  goalsTabBtn.setAttribute("aria-selected", String(isGoals));

  if (options.updateHash !== false) {
    history.replaceState(null, "", isWorkspace ? window.location.hash : isGoals ? "#goals" : isPlanner ? "#planner" : isWorkouts ? "#workouts" : "#habits");
  }

  if (isWorkspace) renderGoalWorkspacePage();
  if (isWorkouts) renderWorkouts();
  if (isPlanner) renderPlanner();
  const nextView = isWorkspace ? goalWorkspaceView : isGoals ? goalsView : isPlanner ? plannerView : isWorkouts ? workoutsView : habitsView;
  if (previousView !== nextView) animateSectionEnter(nextView);
}

function handleHomeBrandClick(event) {
  event.preventDefault();
  closeActionMenu();
  closeAccountMenu();
  switchView("habits");
  playHomeLogoAnimation();
  smoothScrollHome();
}

function playHomeLogoAnimation() {
  homeBrandBtn.classList.remove("is-returning-home");
  window.requestAnimationFrame(() => {
    homeBrandBtn.classList.add("is-returning-home");
    window.setTimeout(() => homeBrandBtn.classList.remove("is-returning-home"), 900);
  });
}

function smoothScrollHome() {
  const start = window.scrollY || document.documentElement.scrollTop || 0;
  if (start <= 1) return;

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduceMotion) {
    window.scrollTo(0, 0);
    return;
  }

  const duration = Math.min(900, Math.max(420, start * 0.45));
  const startTime = window.performance.now();
  const easeOutQuint = (value) => 1 - Math.pow(1 - value, 5);

  function step(now) {
    const progress = Math.min(1, (now - startTime) / duration);
    window.scrollTo(0, Math.round(start * (1 - easeOutQuint(progress))));
    if (progress < 1) window.requestAnimationFrame(step);
  }

  window.requestAnimationFrame(step);
}

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function afterMotion(callback, duration = MOTION_NORMAL_MS) {
  if (prefersReducedMotion()) {
    callback();
    return;
  }
  window.setTimeout(callback, duration);
}

function revealFloatingElement(element) {
  element.hidden = false;
  if (prefersReducedMotion()) {
    element.classList.add("is-visible");
    return;
  }
  window.requestAnimationFrame(() => element.classList.add("is-visible"));
}

function hideFloatingElement(element, duration = MOTION_NORMAL_MS) {
  element.classList.remove("is-visible");
  afterMotion(() => {
    if (!element.classList.contains("is-visible")) element.hidden = true;
  }, duration);
}

function animateSectionEnter(section) {
  if (!section || prefersReducedMotion()) return;
  section.classList.remove("is-entering");
  void section.offsetWidth;
  section.classList.add("is-entering");
  section.addEventListener("animationend", () => section.classList.remove("is-entering"), { once: true });
}

function animateRenderedChildren(container, selector = ":scope > *") {
  if (!container || prefersReducedMotion()) return;
  const items = [...container.querySelectorAll(selector)];
  items.forEach((item, index) => {
    item.classList.remove("motion-item-enter");
    item.style.setProperty("--motion-delay", `${Math.min(index, 8) * 18}ms`);
    void item.offsetWidth;
    item.classList.add("motion-item-enter");
    item.addEventListener("animationend", () => {
      item.classList.remove("motion-item-enter");
      item.style.removeProperty("--motion-delay");
    }, { once: true });
  });
}

function animateCompletion(source, callback, className = "is-completing") {
  if (!source || prefersReducedMotion()) {
    callback();
    return;
  }

  source.classList.add(className);
  afterMotion(callback, MOTION_SLOW_MS);
}

function makeActionMenu(actions, label = t("actions.menu")) {
  const menu = document.createElement("div");
  menu.className = "action-menu";

  const trigger = document.createElement("button");
  trigger.className = "action-menu-trigger";
  trigger.type = "button";
  trigger.textContent = "⋯";
  trigger.setAttribute("aria-label", label);
  trigger.setAttribute("aria-haspopup", "menu");
  trigger.setAttribute("aria-expanded", "false");

  const panel = document.createElement("div");
  panel.className = "action-menu-panel";
  panel.setAttribute("role", "menu");
  panel.hidden = true;

  actions.forEach(action => {
    const item = document.createElement("button");
    item.className = "action-menu-item" + (action.danger ? " danger" : "");
    item.type = "button";
    item.textContent = action.label;
    item.setAttribute("role", "menuitem");
    item.addEventListener("click", (event) => {
      event.stopPropagation();
      closeActionMenu(menu);
      action.onSelect();
    });
    panel.appendChild(item);
  });

  trigger.addEventListener("click", (event) => {
    event.stopPropagation();
    toggleActionMenu(menu);
  });

  menu.addEventListener("click", (event) => event.stopPropagation());
  menu.appendChild(trigger);
  menu.appendChild(panel);
  return menu;
}

function toggleActionMenu(menu) {
  const panel = menu.querySelector(".action-menu-panel");
  const trigger = menu.querySelector(".action-menu-trigger");
  const shouldOpen = panel.hidden || !menu.classList.contains("open");

  if (activeActionMenu && activeActionMenu !== menu) closeActionMenu(activeActionMenu);
  if (!shouldOpen) {
    closeActionMenu(menu);
    return;
  }

  panel.hidden = false;
  menu.classList.add("open");
  trigger.setAttribute("aria-expanded", "true");
  activeActionMenu = menu;
  positionActionMenu(menu);
}

function closeActionMenu(menu = activeActionMenu) {
  if (!menu) return;

  const panel = menu.querySelector(".action-menu-panel");
  const trigger = menu.querySelector(".action-menu-trigger");
  if (trigger) trigger.setAttribute("aria-expanded", "false");
  menu.classList.remove("open");
  if (activeActionMenu === menu) activeActionMenu = null;
  if (panel) {
    afterMotion(() => {
      if (!menu.classList.contains("open")) panel.hidden = true;
    }, MOTION_FAST_MS);
  }
}

function syncModalOpenState() {
  document.body.classList.toggle(
    "modal-open",
    isAuthModalOpen || isCompletedModalOpen || isPlannerModalOpen || isGoalModalOpen || isGoalArchiveModalOpen || isGoalResultModalOpen
  );
}

function positionActionMenu(menu) {
  const panel = menu.querySelector(".action-menu-panel");
  const trigger = menu.querySelector(".action-menu-trigger");
  if (!panel || !trigger) return;

  const gap = 6;
  const margin = 12;
  const triggerRect = trigger.getBoundingClientRect();
  const panelRect = panel.getBoundingClientRect();
  const maxLeft = Math.max(margin, window.innerWidth - panelRect.width - margin);
  const left = Math.min(maxLeft, Math.max(margin, triggerRect.right - panelRect.width));
  const belowTop = triggerRect.bottom + gap;
  const aboveTop = triggerRect.top - panelRect.height - gap;
  const top = belowTop + panelRect.height > window.innerHeight - margin
    ? Math.max(margin, aboveTop)
    : belowTop;

  panel.style.left = `${left}px`;
  panel.style.top = `${top}px`;
}

function toggleAccountMenu(forceOpen) {
  const shouldOpen = typeof forceOpen === "boolean" ? forceOpen : !accountMenu.classList.contains("open");
  if (!shouldOpen) {
    closeAccountMenu();
    return;
  }
  accountMenuPanel.hidden = false;
  accountMenuBtn.setAttribute("aria-expanded", String(shouldOpen));
  accountMenu.classList.add("open");
  if (shouldOpen) closeActionMenu();
}

function closeAccountMenu() {
  if (accountMenuPanel.hidden && !accountMenu.classList.contains("open")) return;
  accountMenuBtn.setAttribute("aria-expanded", "false");
  accountMenu.classList.remove("open");
  afterMotion(() => {
    if (!accountMenu.classList.contains("open")) accountMenuPanel.hidden = true;
  }, MOTION_FAST_MS);
}

function initTheme() {
  const savedTheme = localStorage.getItem("habitTheme") || "light";
  const isDark = savedTheme === "dark";
  document.body.classList.toggle("dark", isDark);
  syncThemeToggleText(isDark);
}

function toggleTheme() {
  const isDark = document.body.classList.toggle("dark");
  localStorage.setItem("habitTheme", isDark ? "dark" : "light");
  syncThemeToggleText(isDark);
  renderProgress();
}

function syncThemeToggleText(isDark) {
  const label = isDark ? t("theme.light") : t("theme.dark");
  themeToggle.setAttribute("aria-label", label);
  themeToggle.title = label;
  themeToggleLabel.textContent = label;
}

function refreshLocalizedUi() {
  applyStaticTranslations();
  initTheme();
  refreshStatusText();
  setAuthMode(authMode, { clearMessage: false });
  syncPlannerModalText();
  syncGoalModalText();
  syncGoalResultModalText();
  render();
}

function openAuthModal(mode = authMode) {
  setAuthMode(mode);
  clearAuthMessage();
  isAuthModalOpen = true;
  revealFloatingElement(authModal);
  syncModalOpenState();
  requestAnimationFrame(() => {
    const firstField = authMode === "register" ? authNameInput : authEmailInput;
    firstField.focus();
  });
}

function closeAuthModal() {
  isAuthModalOpen = false;
  hideFloatingElement(authModal);
  syncModalOpenState();
}

function setAuthMode(mode, options = {}) {
  authMode = mode === "register" ? "register" : "login";
  const isRegister = authMode === "register";

  authModalTitle.textContent = isRegister ? t("auth.register") : t("auth.login");
  authSubmitBtn.textContent = isRegister ? t("auth.submitRegister") : t("auth.submitLogin");
  authGoogleBtn.innerHTML = isRegister
    ? `<span>G</span> ${t("auth.googleRegister")}`
    : `<span>G</span> ${t("auth.googleLogin")}`;
  authNameField.hidden = !isRegister;
  authPasswordConfirmField.hidden = !isRegister;
  authResetBtn.hidden = isRegister;
  authPasswordInput.autocomplete = isRegister ? "new-password" : "current-password";
  authPasswordConfirmInput.required = isRegister;
  authLoginTabBtn.classList.toggle("active", !isRegister);
  authRegisterTabBtn.classList.toggle("active", isRegister);
  authLoginTabBtn.setAttribute("aria-selected", String(!isRegister));
  authRegisterTabBtn.setAttribute("aria-selected", String(isRegister));
  syncQaAccessControls();
  if (options.clearMessage !== false) clearAuthMessage();
}

async function handleAuthSubmit(event) {
  event.preventDefault();
  if (isAuthBusy) return;

  const email = authEmailInput.value.trim();
  const password = authPasswordInput.value;
  const displayName = authNameInput.value.trim();
  const passwordConfirm = authPasswordConfirmInput.value;

  if (!email) {
    showAuthMessage(t("auth.emailRequired"), "error");
    authEmailInput.focus();
    return;
  }

  if (password.length < 6) {
    showAuthMessage(t("auth.passwordTooShort"), "error");
    authPasswordInput.focus();
    return;
  }

  if (authMode === "register" && password !== passwordConfirm) {
    showAuthMessage(t("auth.passwordMismatch"), "error");
    authPasswordConfirmInput.focus();
    return;
  }

  setAuthBusy(true, authMode === "register" ? t("auth.busyCreate") : t("auth.busyLogin"));

  try {
    if (authMode === "register") {
      const credential = await createUserWithEmailAndPassword(auth, email, password);
      if (displayName) await updateProfile(credential.user, { displayName });
      showAuthMessage(t("auth.accountCreated"), "success");
    } else {
      await signInWithEmailAndPassword(auth, email, password);
    }
  } catch (error) {
    setAuthBusy(false);
    showAuthError(error);
  }
}

async function handleGoogleSignIn() {
  if (isAuthBusy) return;
  setAuthBusy(true, t("auth.busyGoogle"));

  try {
    await signInWithPopup(auth, provider);
  } catch (error) {
    if (shouldUseRedirectForAuth(error)) {
      showAuthMessage(t("auth.busyRedirect"), "success");
      await signInWithRedirect(auth, provider);
      return;
    }

    setAuthBusy(false);
    showAuthError(error);
  }
}

async function handlePasswordReset() {
  if (isAuthBusy) return;

  const email = authEmailInput.value.trim();
  if (!email) {
    showAuthMessage(t("auth.resetEmailRequired"), "error");
    authEmailInput.focus();
    return;
  }

  setAuthBusy(true, t("auth.busyReset"));

  try {
    await sendPasswordResetEmail(auth, email);
    showAuthMessage(t("auth.resetSent"), "success");
  } catch (error) {
    showAuthError(error);
  } finally {
    setAuthBusy(false);
  }
}

async function handleGoogleRedirectResult() {
  try {
    const result = await getRedirectResult(auth);
    if (result?.user) updateStatus("status.googleComplete", "dirty");
  } catch (error) {
    openAuthModal("login");
    showAuthError(error);
    updateStatus("status.signInError", "error");
  }
}

function handleRedirectResult() {
  if (isTestMode()) return;
  handleGoogleRedirectResult();
}

function isTestMode() {
  return Boolean(currentUser?.isTestAccount);
}

function getTestUser() {
  return { ...TEST_ACCOUNT };
}

function bootstrapQaAccess() {
  if (!isLocalQaHost()) {
    localStorage.removeItem(QA_ACCESS_KEY);
    localStorage.removeItem(TEST_SESSION_KEY);
    return;
  }

  const accessValue = new URLSearchParams(window.location.search).get(QA_ACCESS_QUERY);
  if (["1", "true", "local"].includes(String(accessValue).toLowerCase())) {
    localStorage.setItem(QA_ACCESS_KEY, "active");
  }

  if (["0", "false", "off"].includes(String(accessValue).toLowerCase())) {
    localStorage.removeItem(QA_ACCESS_KEY);
    localStorage.removeItem(TEST_SESSION_KEY);
  }
}

function isLocalQaHost() {
  const host = window.location.hostname;
  return window.location.protocol === "file:" || host === "localhost" || host === "127.0.0.1" || host === "::1";
}

function canUseTestAccount() {
  return isLocalQaHost();
}

function syncQaAccessControls() {
  authTestBtn.hidden = !canUseTestAccount();
}

function restoreTestAccountSession() {
  if (localStorage.getItem(TEST_SESSION_KEY) !== "active") return;
  if (!canUseTestAccount()) {
    localStorage.removeItem(TEST_SESSION_KEY);
    return;
  }

  currentUser = getTestUser();
  data = loadTestData() || createTestingData();
  localStorage.setItem(TEST_DATA_KEY, JSON.stringify(data));
  signInBtn.hidden = true;
  createAccountBtn.hidden = true;
  signOutBtn.hidden = false;
  signOutBtn.disabled = false;
  isDirty = false;
  updateStatus("status.account", "ready", { user: getUserLabel(currentUser) });
}

function startTestAccount({ seedIfMissing = false, forceSeed = false } = {}) {
  if (!canUseTestAccount()) return;

  clearPendingSave();
  currentUser = getTestUser();
  localStorage.setItem(TEST_SESSION_KEY, "active");

  const stored = forceSeed ? null : loadTestData();
  data = stored || createTestingData();
  if (forceSeed || seedIfMissing || !stored) localStorage.setItem(TEST_DATA_KEY, JSON.stringify(data));

  isDirty = false;
  setAuthBusy(false);
  signInBtn.hidden = true;
  createAccountBtn.hidden = true;
  signOutBtn.hidden = false;
  signOutBtn.disabled = false;
  closeAuthModal();
  updateStatus("status.account", "ready", { user: getUserLabel(currentUser) });
  showAuthMessage(t("testing.started"), "success");
  render();
}

function loadTestData() {
  try {
    const raw = localStorage.getItem(TEST_DATA_KEY);
    return raw ? normalizeData(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

function saveTestData() {
  if (!isTestMode()) return false;
  localStorage.setItem(TEST_DATA_KEY, JSON.stringify(data));
  isDirty = false;
  updateStatus("status.account", "ready", { user: getUserLabel(currentUser) });
  return true;
}

function reloadTestSeedData() {
  if (!isTestMode()) return;
  data = createTestingData();
  saveTestData();
  render();
  showGoalToast(t("testing.seeded"));
}

function resetTestData() {
  if (!isTestMode()) return;
  if (!confirm(t("testing.resetConfirm"))) return;
  localStorage.removeItem(TEST_DATA_KEY);
  reloadTestSeedData();
}

async function handleSignOut() {
  closeAuthModal();

  if (isTestMode()) {
    if (isDirty) saveTestData();
    clearPendingSave();
    localStorage.removeItem(TEST_SESSION_KEY);
    currentUser = null;
    data = createEmptyData();
    isDirty = false;
    signInBtn.hidden = false;
    createAccountBtn.hidden = false;
    signOutBtn.hidden = true;
    signOutBtn.disabled = false;
    updateStatus("status.signedOut", "off");
    render();
    return;
  }

  const uid = currentUser?.uid;
  const shouldSaveBeforeExit = Boolean(uid && isDirty);
  clearPendingSave();
  signOutBtn.disabled = true;

  if (shouldSaveBeforeExit) {
    updateStatus("status.savingBeforeSignOut", "dirty");
    const saved = await saveToFirebase(false, uid);
    if (!saved && isCurrentUser(uid)) {
      signOutBtn.disabled = false;
      updateStatus("status.signOutSaveFailed", "error");
      return;
    }
  }

  updateStatus("status.signingOut", "dirty");

  try {
    await signOut(auth);
  } catch (error) {
    signOutBtn.disabled = false;
    updateStatus("status.signOutError", "error");
    alert(t("alerts.signOutFailed", { message: getAuthErrorMessage(error) }));
  }
}

function setAuthBusy(isBusy, message = "") {
  isAuthBusy = isBusy;
  authSubmitBtn.disabled = isBusy;
  authGoogleBtn.disabled = isBusy;
  authTestBtn.disabled = isBusy;
  authResetBtn.disabled = isBusy;
  authLoginTabBtn.disabled = isBusy;
  authRegisterTabBtn.disabled = isBusy;
  signInBtn.disabled = isBusy;
  createAccountBtn.disabled = isBusy;
  if (message) showAuthMessage(message, "info");
}

function showAuthError(error) {
  showAuthMessage(getAuthErrorMessage(error), "error");
}

function showAuthMessage(message, mode = "info") {
  authMessage.textContent = message;
  authMessage.className = `auth-message ${mode}`;
}

function clearAuthMessage() {
  authMessage.textContent = "";
  authMessage.className = "auth-message";
}

function getAuthErrorMessage(error) {
  const code = error?.code || "";
  const messages = {
    "auth/email-already-in-use": "auth.error.emailAlreadyInUse",
    "auth/invalid-email": "auth.error.invalidEmail",
    "auth/invalid-credential": "auth.error.invalidCredential",
    "auth/user-not-found": "auth.error.userNotFound",
    "auth/wrong-password": "auth.error.wrongPassword",
    "auth/weak-password": "auth.error.weakPassword",
    "auth/popup-closed-by-user": "auth.error.popupClosed",
    "auth/popup-blocked": "auth.error.popupBlocked",
    "auth/cancelled-popup-request": "auth.error.cancelledPopup",
    "auth/operation-not-allowed": "auth.error.operationNotAllowed",
    "auth/unauthorized-domain": "auth.error.unauthorizedDomain",
    "auth/network-request-failed": "auth.error.network",
    "auth/too-many-requests": "auth.error.tooManyRequests"
  };

  return messages[code]
    ? t(messages[code])
    : t("auth.error.fallback", { message: error?.message || t("auth.error.unknown") });
}

function shouldUseRedirectForAuth(error) {
  return ["auth/popup-blocked", "auth/operation-not-supported-in-this-environment"].includes(error?.code);
}

function getUserLabel(user) {
  return user.email || user.displayName || t("auth.accountFallback");
}

function isCurrentUser(uid) {
  return Boolean(uid && currentUser?.uid === uid);
}

function getUserDocRef(uid = currentUser?.uid) {
  if (!uid) return null;
  return doc(db, "users", uid, "habitData", "main");
}

function createEmptyData() {
  return {
    habits: [],
    records: {},
    goals: [],
    plannerBlocks: [],
    recurringRules: [],
    workoutSettings: createDefaultWorkoutSettings(),
    workoutPlan: createDefaultWorkoutPlan(),
    workoutLogs: {},
    workoutTargets: {}
  };
}

function createStarterData() {
  return {
    habits: [
      { id: crypto.randomUUID(), name: t("data.starter.pushups"), unit: t("data.starter.pushupsUnit"), target: 15, createdAt: toDateInputValue(new Date()) },
      { id: crypto.randomUUID(), name: t("data.starter.reading"), unit: t("data.starter.readingUnit"), target: 20, createdAt: toDateInputValue(new Date()) }
    ],
    records: {},
    goals: [],
    plannerBlocks: [],
    recurringRules: [],
    workoutSettings: createDefaultWorkoutSettings(),
    workoutPlan: createDefaultWorkoutPlan(),
    workoutLogs: {},
    workoutTargets: {}
  };
}

function createDefaultWorkoutSettings() {
  return { progressionWeeks: 1, weightUnit: "kg" };
}

function createDefaultWorkoutPlan() {
  return [
    {
      id: "mon-upper-a",
      weekdayKey: "calendar.weekday.mon",
      title: "Upper A",
      focus: "Width + shoulders",
      kind: "training",
      exercises: [
        makeWorkoutExercise("pullups-assisted", "Pull-ups / Assisted Pull-ups", 4, 6, 10, 2.5, ["Width + V-shape.", "Use gravitron or an assisted machine if needed."]),
        makeWorkoutExercise("incline-db-press", "Incline Dumbbell Press", 4, 8, 10, 1, ["Upper chest + front delts."]),
        makeWorkoutExercise("chest-supported-row", "Chest Supported Row", 4, 8, 12, 2.5, ["Important for posture."]),
        makeWorkoutExercise("db-lateral-raises", "Dumbbell Lateral Raises", 5, 12, 20, 1, ["Main shoulder movement. Control first, load second."]),
        makeWorkoutExercise("face-pulls", "Face Pulls", 4, 15, 20, 2.5, ["Rear delts, lower traps, posture."]),
        makeWorkoutExercise("cable-rear-delt-fly", "Cable Rear Delt Fly", 4, 12, 15, 1),
        makeWorkoutExercise("db-curl", "Dumbbell Curl", 3, 10, 12, 1),
        makeWorkoutExercise("rope-pushdown", "Rope Pushdown", 3, 10, 12, 2.5)
      ]
    },
    {
      id: "tue-lower-a",
      weekdayKey: "calendar.weekday.tue",
      title: "Lower A",
      focus: "Base + core",
      kind: "training",
      exercises: [
        makeWorkoutExercise("barbell-squat", "Barbell Squat", 4, 6, 8, 2.5),
        makeWorkoutExercise("romanian-deadlift", "Romanian Deadlift", 4, 8, 10, 2.5, ["Posterior chain, posture, glutes."]),
        makeWorkoutExercise("bulgarian-split-squat", "Bulgarian Split Squat", 3, 10, 10, 1),
        makeWorkoutExercise("leg-curl", "Leg Curl", 3, 12, 12, 2.5),
        makeWorkoutExercise("standing-calf-raise", "Standing Calf Raise", 4, 12, 15, 2.5),
        makeWorkoutExercise("hanging-knee-raise", "Hanging Knee Raise", 3, 12, 12, 0),
        makeWorkoutExercise("pallof-press", "Pallof Press", 3, 12, 12, 1, ["TVA and core stabilization."])
      ]
    },
    {
      id: "wed-recovery",
      weekdayKey: "calendar.weekday.wed",
      title: "Swim Technique",
      focus: "Easy aerobic swim + clean form",
      kind: "training",
      exercises: [
        makeWorkoutExercise("swim-warmup-200", "Easy Swim Warm-up", 1, 200, 200, 0, ["Relaxed pace. Breathe calmly."], "workouts.metersUnit"),
        makeWorkoutExercise("swim-drill-50s", "Technique Drills", 6, 50, 50, 0, ["Alternate catch-up, fingertip drag, and side kick."], "workouts.metersUnit"),
        makeWorkoutExercise("swim-steady-100s", "Steady Swim", 4, 100, 100, 0, ["Smooth pace. Leave energy in the tank."], "workouts.metersUnit"),
        makeWorkoutExercise("swim-cooldown-100", "Cooldown", 1, 100, 100, 0, [], "workouts.metersUnit")
      ]
    },
    {
      id: "thu-upper-b",
      weekdayKey: "calendar.weekday.thu",
      title: "Upper B",
      focus: "Thickness + chest + shoulders",
      kind: "training",
      exercises: [
        makeWorkoutExercise("barbell-bench-press", "Barbell Bench Press", 4, 6, 8, 2.5),
        makeWorkoutExercise("seated-cable-row", "Seated Cable Row", 4, 8, 12, 2.5, ["Pause at the end of each rep."]),
        makeWorkoutExercise("overhead-press", "Overhead Press", 4, 6, 8, 1, ["Second key shoulder movement."]),
        makeWorkoutExercise("lat-pulldown", "Lat Pulldown", 4, 10, 12, 2.5),
        makeWorkoutExercise("lateral-raise-machine", "Lateral Raise Machine", 5, 15, 15, 2.5, ["High shoulder volume."]),
        makeWorkoutExercise("reverse-pec-deck", "Reverse Pec Deck", 4, 12, 15, 2.5),
        makeWorkoutExercise("incline-db-curl", "Incline Dumbbell Curl", 3, 10, 12, 1),
        makeWorkoutExercise("overhead-tricep-extension", "Overhead Tricep Extension", 3, 10, 12, 1)
      ]
    },
    {
      id: "fri-lower-b",
      weekdayKey: "calendar.weekday.fri",
      title: "Lower B",
      focus: "Strength + posture",
      kind: "training",
      exercises: [
        makeWorkoutExercise("deadlift", "Deadlift", 3, 5, 5, 2.5, ["Do not take it to failure."]),
        makeWorkoutExercise("leg-press", "Leg Press", 4, 10, 10, 5),
        makeWorkoutExercise("walking-lunges", "Walking Lunges", 3, 12, 12, 1),
        makeWorkoutExercise("hip-thrust", "Hip Thrust", 3, 10, 10, 2.5),
        makeWorkoutExercise("seated-calf-raise", "Seated Calf Raise", 4, 15, 15, 2.5),
        makeWorkoutExercise("back-extension", "Back Extension", 3, 15, 15, 0, ["Important for posture. Add load only when it stays clean."]),
        makeWorkoutExercise("farmer-carry", "Farmer Carry", 4, 1, 1, 2.5, ["Count each pass in the reps column.", "Neck, traps, core, posture."], "workouts.passUnit")
      ]
    },
    {
      id: "sat-cardio",
      weekdayKey: "calendar.weekday.sat",
      title: "Swim Conditioning",
      focus: "Pool cardio without crushing recovery",
      kind: "training",
      exercises: [
        makeWorkoutExercise("swim-easy-200", "Easy Swim", 1, 200, 200, 0, ["Settle into the water before working."], "workouts.metersUnit"),
        makeWorkoutExercise("swim-interval-100s", "Moderate Intervals", 6, 100, 100, 0, ["Conversational-hard pace. Rest as needed."], "workouts.metersUnit"),
        makeWorkoutExercise("swim-kick-50s", "Kick Set", 4, 50, 50, 0, ["Use a board if available."], "workouts.metersUnit"),
        makeWorkoutExercise("swim-cooldown-200", "Long Cooldown", 1, 200, 200, 0, [], "workouts.metersUnit")
      ]
    },
    {
      id: "sun-rest",
      weekdayKey: "calendar.weekday.sun",
      title: "Rest",
      focus: "Full rest",
      kind: "rest",
      notes: ["Sleep, eat, walk if you want."]
    }
  ];
}

function makeWorkoutExercise(id, name, targetSets, repMin, repMax, weightStep, notes = [], repUnitKey = "workouts.repsUnit") {
  return {
    id,
    name,
    targetSets,
    repMin,
    repMax,
    weightStep,
    repUnitKey,
    notes
  };
}

function createTestingData() {
  const today = toDateInputValue(new Date());
  const yesterday = shiftDateKey(today, -1);
  const twoDaysAgo = shiftDateKey(today, -2);
  const threeDaysAgo = shiftDateKey(today, -3);
  const tomorrow = shiftDateKey(today, 1);
  const nextWeek = shiftDateKey(today, 7);
  const lastWeek = shiftDateKey(today, -7);
  const currentWorkoutWeek = toDateInputValue(getWeekStart(new Date()));
  const previousWorkoutWeek = shiftDateKey(currentWorkoutWeek, -7);

  const habits = [
    { id: "qa-water", name: "Hydration", unit: "glasses", target: 8, createdAt: threeDaysAgo },
    { id: "qa-reading", name: "Reading", unit: "pages", target: 25, createdAt: threeDaysAgo },
    { id: "qa-training", name: "Training", unit: "min", target: 45, createdAt: threeDaysAgo },
    { id: "qa-language", name: "Language practice", unit: "min", target: 20, createdAt: twoDaysAgo },
    { id: "qa-journal", name: "Journal", unit: "entry", target: 1, createdAt: twoDaysAgo },
    { id: "qa-meditation", name: "Meditation", unit: "min", target: 10, createdAt: yesterday },
    { id: "qa-walk", name: "Walk", unit: "steps", target: 7000, createdAt: yesterday },
    { id: "qa-planning", name: "Plan tomorrow", unit: "plan", target: 1, createdAt: today }
  ];

  const records = {
    [threeDaysAgo]: {
      "qa-water": makeTestingRecord(true, 8, habits[0]),
      "qa-reading": makeTestingRecord(true, 30, habits[1]),
      "qa-training": makeTestingRecord(true, 45, habits[2])
    },
    [twoDaysAgo]: {
      "qa-water": makeTestingRecord(true, 7, habits[0]),
      "qa-reading": makeTestingRecord(true, 25, habits[1]),
      "qa-training": makeTestingRecord(false, 20, habits[2]),
      "qa-language": makeTestingRecord(true, 25, habits[3]),
      "qa-journal": makeTestingRecord(true, 1, habits[4])
    },
    [yesterday]: {
      "qa-water": makeTestingRecord(true, 8, habits[0]),
      "qa-reading": makeTestingRecord(true, 40, habits[1]),
      "qa-training": makeTestingRecord(true, 50, habits[2]),
      "qa-language": makeTestingRecord(true, 20, habits[3]),
      "qa-journal": makeTestingRecord(true, 1, habits[4]),
      "qa-meditation": makeTestingRecord(true, 12, habits[5]),
      "qa-walk": makeTestingRecord(true, 8100, habits[6])
    },
    [today]: {
      "qa-water": makeTestingRecord(true, 6, habits[0]),
      "qa-reading": makeTestingRecord(true, 25, habits[1]),
      "qa-training": makeTestingRecord(false, "", habits[2]),
      "qa-language": makeTestingRecord(false, "", habits[3])
    }
  };

  return {
    habits,
    records,
    goals: [
      {
        id: "qa-goal-launch",
        name: "Launch the testing workflow",
        type: "project",
        pointA: "Manual checks are scattered across the app",
        pointB: "A reusable QA checklist exists for every release",
        createdAt: lastWeek,
        status: "active",
        completedAt: "",
        failedAt: "",
        tasks: [
          {
            id: "qa-task-auth",
            title: "Verify auth modal and test account session",
            deadline: today,
            done: false,
            completedAt: "",
            workspace: {
              notes: "Check login, sign out, reload, and saved local test data.",
              miniGoals: [
                { id: "qa-mini-auth-1", title: "Open auth modal", done: true, completedAt: yesterday },
                { id: "qa-mini-auth-2", title: "Use test account button", done: false, completedAt: "" }
              ]
            }
          },
          {
            id: "qa-task-locale",
            title: "Switch all supported languages",
            deadline: tomorrow,
            done: false,
            completedAt: "",
            workspace: {
              notes: "Scan header, dashboard cards, modals, goal workspace, and empty states in every locale.",
              miniGoals: []
            }
          },
          {
            id: "qa-task-docs",
            title: "Document the QA route",
            deadline: nextWeek,
            done: true,
            completedAt: yesterday,
            workspace: {
              notes: "Keep docs/TESTING.md updated when scenarios change.",
              miniGoals: [
                { id: "qa-mini-docs-1", title: "List core smoke scenarios", done: true, completedAt: yesterday }
              ]
            }
          }
        ]
      },
      {
        id: "qa-goal-completed",
        name: "Ship multilingual interface",
        type: "project",
        pointA: "Russian-only UI copy",
        pointB: "English primary UI with five supported languages",
        createdAt: lastWeek,
        status: "completed",
        completedAt: yesterday,
        failedAt: "",
        tasks: [
          {
            id: "qa-task-i18n",
            title: "Move UI copy into dictionaries",
            deadline: yesterday,
            done: true,
            completedAt: yesterday,
            workspace: {
              notes: "Dictionary alignment is covered by the QA script.",
              miniGoals: []
            }
          }
        ]
      },
      {
        id: "qa-goal-failed",
        name: "Try unsafe production testing",
        type: "other",
        pointA: "Could test directly against real user data",
        pointB: "Use isolated local test data instead",
        createdAt: lastWeek,
        status: "failed",
        completedAt: "",
        failedAt: twoDaysAgo,
        tasks: []
      }
    ],
    plannerBlocks: [
      {
        id: "qa-planner-statistics",
        date: today,
        startTime: "10:00",
        endTime: "11:30",
        title: "Verify auth smoke scenario",
        type: "goal",
        linkedGoalId: "qa-goal-launch",
        linkedMilestoneId: "qa-task-auth",
        linkedHabitId: null,
        status: "planned",
        definitionOfDone: "Run the auth session checks and note anything broken.",
        notes: "Planner QA seed linked to an active goal.",
        createdAt: Date.now() - 86400000,
        updatedAt: Date.now() - 86400000
      },
      {
        id: "qa-planner-chess",
        date: today,
        startTime: "18:00",
        endTime: "18:45",
        title: "Play chess",
        type: "interest",
        linkedGoalId: null,
        linkedMilestoneId: null,
        linkedHabitId: null,
        status: "planned",
        definitionOfDone: "Play one focused game and review one mistake.",
        notes: "",
        createdAt: Date.now() - 43200000,
        updatedAt: Date.now() - 43200000
      },
      {
        id: "qa-planner-completed",
        date: yesterday,
        startTime: "09:00",
        endTime: "09:45",
        title: "Read QA docs",
        type: "goal",
        linkedGoalId: "qa-goal-launch",
        linkedMilestoneId: "qa-task-docs",
        linkedHabitId: null,
        status: "done",
        definitionOfDone: "Docs reviewed and smoke list checked.",
        notes: "",
        createdAt: Date.now() - 172800000,
        updatedAt: Date.now() - 86400000
      }
    ],
    recurringRules: [
      {
        id: "qa-rule-deep-work",
        title: "Deep Work",
        weekdays: [1, 3, 5],
        startTime: "10:00",
        endTime: "12:00",
        type: "deepWork",
        linkedGoalId: null,
        linkedMilestoneId: null,
        linkedHabitId: null,
        definitionOfDone: "Protect the block and ship one meaningful piece.",
        active: true,
        createdAt: Date.now() - 86400000,
        updatedAt: Date.now() - 86400000
      }
    ],
    workoutSettings: createDefaultWorkoutSettings(),
    workoutPlan: createDefaultWorkoutPlan(),
    workoutLogs: {
      [previousWorkoutWeek]: {
        "mon-upper-a": {
          "pullups-assisted": makeTestingWorkoutEntry([[30, 7], [30, 7], [30, 6], [30, 6]]),
          "incline-db-press": makeTestingWorkoutEntry([[22.5, 9], [22.5, 9], [22.5, 8], [22.5, 8]]),
          "db-lateral-raises": makeTestingWorkoutEntry([[7.5, 15], [7.5, 15], [7.5, 14], [7.5, 13], [7.5, 12]])
        },
        "tue-lower-a": {
          "barbell-squat": makeTestingWorkoutEntry([[70, 7], [70, 7], [70, 6], [70, 6]]),
          "romanian-deadlift": makeTestingWorkoutEntry([[60, 9], [60, 9], [60, 8], [60, 8]])
        }
      },
      [currentWorkoutWeek]: {
        "mon-upper-a": {
          "pullups-assisted": makeTestingWorkoutEntry([[30, 8], [30, 8], [30, 7], [30, 7]]),
          "incline-db-press": makeTestingWorkoutEntry([[22.5, 10], [22.5, 9], [22.5, 9], [22.5, 8]])
        }
      }
    },
    workoutTargets: {}
  };
}

function makeTestingRecord(done, value, habit) {
  return {
    done,
    value,
    habitName: habit.name,
    habitUnit: habit.unit,
    habitTarget: habit.target
  };
}

function makeTestingWorkoutEntry(sets) {
  return {
    sets: sets.map(([weight, reps]) => ({ weight, reps }))
  };
}

function shiftDateKey(dateKey, days) {
  const date = parseDateKey(dateKey);
  date.setDate(date.getDate() + days);
  return toDateInputValue(date);
}

async function loadFromFirebase(expectedUid = currentUser?.uid) {
  const ref = getUserDocRef(expectedUid);
  if (!ref || !isCurrentUser(expectedUid)) return false;

  try {
    const snap = await getDoc(ref);
    if (!isCurrentUser(expectedUid)) return false;

    if (!snap.exists()) {
      data = createStarterData();
      const saved = await saveToFirebase(false, expectedUid);
      return saved && isCurrentUser(expectedUid);
    }

    const saved = snap.data();
    data = normalizeData(saved.data || saved);
    isDirty = false;
    updateStatus("status.dataSynced", "ready");
    return true;
  } catch (error) {
    if (!isCurrentUser(expectedUid)) return false;
    updateStatus("status.syncError", "error");
    alert(t("alerts.loadFailed", { message: error.message }));
    return false;
  }
}

async function saveToFirebase(showAlert = false, expectedUid = currentUser?.uid) {
  const ref = getUserDocRef(expectedUid);
  if (!currentUser || !ref || !isCurrentUser(expectedUid)) {
    if (showAlert) alert(t("alerts.signInBeforeSave"));
    return false;
  }

  try {
    await setDoc(ref, {
      data,
      updatedAt: serverTimestamp(),
      ownerUid: expectedUid,
      ownerEmail: currentUser.email || null
    });

    isDirty = false;
    updateStatus("status.saved", "ready");
    if (showAlert) alert(t("alerts.dataSaved"));
    return true;
  } catch (error) {
    alert(t("alerts.saveFailed", { message: error.message }));
    updateStatus("status.saveError", "error");
    return false;
  }
}

function scheduleAutoSave() {
  if (!currentUser) return;
  clearTimeout(saveTimer);
  const uid = currentUser.uid;
  saveTimer = setTimeout(() => {
    if (isTestMode()) {
      saveTestData();
      return;
    }
    if (isCurrentUser(uid)) saveToFirebase(false, uid);
  }, 700);
}

function clearPendingSave() {
  clearTimeout(saveTimer);
  saveTimer = null;
}

function markDirty() {
  isDirty = true;
  updateStatus("status.savingChanges", "dirty");
  scheduleAutoSave();
}

function updateStatus(key, mode, params = {}) {
  currentStatus = { key, mode, params };
  refreshStatusText();
}

function refreshStatusText() {
  statusText.textContent = t(currentStatus.key, currentStatus.params);
  applyStatusDotClass(statusDot);
  applyStatusDotClass(accountButtonDot);
  const hasAccount = Boolean(currentUser);
  const label = hasAccount ? getUserLabel(currentUser) : t("auth.account");
  accountMenu.classList.toggle("signed-in", hasAccount);
  accountMenuLabel.textContent = label;
  accountMenuBtn.setAttribute("aria-label", hasAccount ? `${t("auth.account")}: ${label}` : t("auth.account"));
}

function applyStatusDotClass(dot) {
  dot.className = "status-dot";
  if (currentStatus.mode === "ready") dot.classList.add("ready");
  if (currentStatus.mode === "dirty") dot.classList.add("dirty");
  if (currentStatus.mode === "error") dot.classList.add("error");
}

function normalizeData(input) {
  const source = input && typeof input === "object" ? input : {};
  const records = source.records && typeof source.records === "object" ? source.records : {};
  return {
    habits: Array.isArray(source.habits) ? source.habits.map(habit => normalizeHabit(habit, records)) : [],
    records,
    goals: Array.isArray(source.goals) ? source.goals.map(normalizeGoal) : [],
    plannerBlocks: Array.isArray(source.plannerBlocks) ? source.plannerBlocks.map(normalizePlannerBlock).filter(Boolean) : [],
    recurringRules: Array.isArray(source.recurringRules) ? source.recurringRules.map(normalizeRecurringRule).filter(Boolean) : [],
    workoutSettings: normalizeWorkoutSettings(source.workoutSettings),
    workoutPlan: normalizeWorkoutPlan(source.workoutPlan),
    workoutLogs: normalizeWorkoutStore(source.workoutLogs),
    workoutTargets: normalizeWorkoutStore(source.workoutTargets)
  };
}

function normalizePlannerBlock(block = {}) {
  const safeBlock = block && typeof block === "object" ? block : {};
  const date = isDateKey(safeBlock.date) ? safeBlock.date : toDateInputValue(new Date());
  const startTime = normalizePlannerTime(safeBlock.startTime, "09:00");
  const endTime = normalizePlannerTime(safeBlock.endTime, getDefaultPlannerEndTime(startTime));
  const linkedGoalId = normalizeNullableId(safeBlock.linkedGoalId);
  const linkedMilestoneId = normalizeNullableId(safeBlock.linkedMilestoneId ?? safeBlock.linkedTaskId);
  const linkedHabitId = normalizeNullableId(safeBlock.linkedHabitId);
  const type = normalizePlannerType(safeBlock.type || (linkedGoalId ? "goal" : linkedHabitId ? "habit" : "custom"));
  const now = Date.now();

  return {
    id: safeBlock.id || crypto.randomUUID(),
    date,
    startTime,
    endTime,
    title: typeof safeBlock.title === "string" && safeBlock.title.trim() ? safeBlock.title.trim() : t("planner.untitledBlock"),
    type,
    linkedGoalId,
    linkedMilestoneId,
    linkedHabitId,
    status: PLANNER_BLOCK_STATUSES.includes(safeBlock.status) ? safeBlock.status : "planned",
    definitionOfDone: typeof safeBlock.definitionOfDone === "string" ? safeBlock.definitionOfDone : "",
    notes: typeof safeBlock.notes === "string" ? safeBlock.notes : "",
    createdAt: normalizePlannerTimestamp(safeBlock.createdAt, now),
    updatedAt: normalizePlannerTimestamp(safeBlock.updatedAt, safeBlock.createdAt || now)
  };
}

function normalizeRecurringRule(rule = {}) {
  const safeRule = rule && typeof rule === "object" ? rule : {};
  const startTime = normalizePlannerTime(safeRule.startTime, "09:00");
  const endTime = normalizePlannerTime(safeRule.endTime, getDefaultPlannerEndTime(startTime));
  const linkedGoalId = normalizeNullableId(safeRule.linkedGoalId);
  const linkedMilestoneId = normalizeNullableId(safeRule.linkedMilestoneId ?? safeRule.linkedTaskId);
  const linkedHabitId = normalizeNullableId(safeRule.linkedHabitId);
  const type = normalizePlannerType(safeRule.type || (linkedGoalId ? "goal" : linkedHabitId ? "habit" : "custom"));
  const weekdays = Array.isArray(safeRule.weekdays)
    ? [...new Set(safeRule.weekdays.map(Number).filter(day => Number.isInteger(day) && day >= 0 && day <= 6))].sort((a, b) => a - b)
    : [];
  const now = Date.now();

  return {
    id: safeRule.id || crypto.randomUUID(),
    title: typeof safeRule.title === "string" && safeRule.title.trim() ? safeRule.title.trim() : t("planner.untitledBlock"),
    weekdays,
    startTime,
    endTime,
    type,
    linkedGoalId,
    linkedMilestoneId,
    linkedHabitId,
    definitionOfDone: typeof safeRule.definitionOfDone === "string" ? safeRule.definitionOfDone : "",
    active: safeRule.active !== false,
    createdAt: normalizePlannerTimestamp(safeRule.createdAt, now),
    updatedAt: normalizePlannerTimestamp(safeRule.updatedAt, safeRule.createdAt || now)
  };
}

function normalizePlannerType(type) {
  return PLANNER_BLOCK_TYPES.includes(type) ? type : "custom";
}

function normalizePlannerTime(value, fallback) {
  return typeof value === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(value) ? value : fallback;
}

function normalizePlannerTimestamp(value, fallback) {
  const timestamp = Number(value);
  return Number.isFinite(timestamp) && timestamp > 0 ? timestamp : Number(fallback) || Date.now();
}

function normalizeNullableId(value) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function getDefaultPlannerEndTime(startTime = "09:00") {
  const [hours, minutes] = startTime.split(":").map(Number);
  const date = new Date(2000, 0, 1, hours || 9, minutes || 0);
  date.setMinutes(date.getMinutes() + 60);
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function normalizeHabit(habit = {}, records) {
  const safeHabit = habit && typeof habit === "object" ? habit : {};
  const id = safeHabit.id || crypto.randomUUID();
  const firstRecordDate = inferHabitCreatedAt(id, records);
  const createdAt = getEarliestDateKey(safeHabit.createdAt, firstRecordDate) || toDateInputValue(new Date());

  return {
    ...safeHabit,
    id,
    name: safeHabit.name || t("habit.fallback"),
    unit: safeHabit.unit || "",
    target: safeHabit.target ?? "",
    createdAt
  };
}

function inferHabitCreatedAt(habitId, records) {
  if (!habitId) return "";

  return Object.keys(records)
    .filter(dateKey => records[dateKey]?.[habitId])
    .sort()[0] || "";
}

function getEarliestDateKey(...dateKeys) {
  return dateKeys
    .filter(dateKey => typeof dateKey === "string" && /^\d{4}-\d{2}-\d{2}$/.test(dateKey))
    .sort()[0] || "";
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
    name: goal.name || t("data.goalFallback"),
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
    title: task.title || task.evidence || t("data.taskFallback"),
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
    title: safeMiniGoal.title || t("data.miniGoalFallback"),
    done: Boolean(safeMiniGoal.done),
    completedAt: safeMiniGoal.completedAt || ""
  };
}

function normalizeOptionalNumber(value) {
  if (value === "" || value === null || value === undefined) return "";
  const number = Number(value);
  return Number.isNaN(number) ? "" : number;
}

function normalizeWorkoutSettings(settings = {}) {
  const progressionWeeks = Number(settings.progressionWeeks);
  const weightUnit = WORKOUT_WEIGHT_UNIT_KEYS.includes(settings.weightUnit) ? settings.weightUnit : "kg";

  return {
    progressionWeeks: progressionWeeks === 2 ? 2 : 1,
    weightUnit
  };
}

function normalizeWorkoutPlan(plan) {
  const defaults = createDefaultWorkoutPlan();
  const source = Array.isArray(plan) && plan.length ? plan : defaults;
  const defaultById = new Map(defaults.map(day => [day.id, day]));

  return source.map((day, index) => normalizeWorkoutDay(day, defaultById.get(day?.id) || defaults[index] || defaults[0]));
}

function normalizeWorkoutDay(day = {}, fallback = {}) {
  const safeDay = day && typeof day === "object" ? day : {};
  const safeFallback = fallback && typeof fallback === "object" ? fallback : {};
  const shouldUpgradeSwim = shouldUpgradeLegacySwimDay(safeDay, safeFallback);
  const kind = shouldUpgradeSwim
    ? safeFallback.kind || "training"
    : ["training", "recovery", "rest"].includes(safeDay.kind)
      ? safeDay.kind
      : safeFallback.kind || "training";
  const fallbackExercises = Array.isArray(safeFallback.exercises) ? safeFallback.exercises : [];
  const exercises = shouldUpgradeSwim
    ? fallbackExercises
    : Array.isArray(safeDay.exercises) && safeDay.exercises.length
      ? safeDay.exercises
      : fallbackExercises;

  return {
    id: safeDay.id || safeFallback.id || crypto.randomUUID(),
    weekdayKey: safeDay.weekdayKey || safeFallback.weekdayKey || "calendar.weekday.mon",
    title: shouldUpgradeSwim ? safeFallback.title : safeDay.title || safeFallback.title || t("workouts.fallbackDay"),
    focus: shouldUpgradeSwim ? safeFallback.focus || "" : safeDay.focus || safeFallback.focus || "",
    kind,
    notes: normalizeWorkoutNotes(shouldUpgradeSwim ? safeFallback.notes : safeDay.notes || safeFallback.notes),
    exercises: kind === "training" ? exercises.map((exercise, exerciseIndex) => normalizeWorkoutExercise(exercise, fallbackExercises[exerciseIndex])) : []
  };
}

function shouldUpgradeLegacySwimDay(day, fallback) {
  if (!fallback || fallback.kind !== "training") return false;
  if (!["wed-recovery", "sat-cardio"].includes(day?.id)) return false;
  if (day.kind === "training" || (Array.isArray(day.exercises) && day.exercises.length)) return false;

  const title = String(day.title || "").toLowerCase();
  return title === "pool / recovery" || title === "light pool / cardio";
}

function normalizeWorkoutExercise(exercise = {}, fallback = {}) {
  const safeExercise = exercise && typeof exercise === "object" ? exercise : {};
  const safeFallback = fallback && typeof fallback === "object" ? fallback : {};
  const repUnitKey = WORKOUT_RESULT_UNIT_OPTIONS.includes(safeExercise.repUnitKey)
    ? safeExercise.repUnitKey
    : WORKOUT_RESULT_UNIT_OPTIONS.includes(safeFallback.repUnitKey)
      ? safeFallback.repUnitKey
      : "workouts.repsUnit";
  const repMin = normalizePositiveInteger(safeExercise.repMin ?? safeFallback.repMin, 1);
  const repMax = normalizePositiveInteger(safeExercise.repMax ?? safeFallback.repMax ?? safeExercise.repMin, repMin);

  return {
    id: safeExercise.id || safeFallback.id || crypto.randomUUID(),
    name: safeExercise.name || safeFallback.name || t("workouts.fallbackExercise"),
    targetSets: normalizePositiveInteger(safeExercise.targetSets ?? safeFallback.targetSets, 1),
    repMin,
    repMax: Math.max(repMin, repMax),
    weightStep: normalizeWorkoutNumber(safeExercise.weightStep ?? safeFallback.weightStep ?? 0),
    repUnitKey,
    notes: normalizeWorkoutNotes(safeExercise.notes || safeFallback.notes)
  };
}

function normalizeWorkoutNotes(notes) {
  return Array.isArray(notes) ? notes.filter(note => typeof note === "string" && note.trim()).map(note => note.trim()) : [];
}

function normalizePositiveInteger(value, fallback) {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : fallback;
}

function normalizeWorkoutStore(store) {
  if (!store || typeof store !== "object") return {};

  return Object.entries(store).reduce((weeks, [weekKey, days]) => {
    if (!isDateKey(weekKey) || !days || typeof days !== "object") return weeks;
    weeks[weekKey] = Object.entries(days).reduce((dayMap, [dayId, exercises]) => {
      if (!exercises || typeof exercises !== "object") return dayMap;
      dayMap[dayId] = Object.entries(exercises).reduce((exerciseMap, [exerciseId, entry]) => {
        exerciseMap[exerciseId] = normalizeWorkoutEntry(entry);
        return exerciseMap;
      }, {});
      return dayMap;
    }, {});
    return weeks;
  }, {});
}

function normalizeWorkoutEntry(entry = {}) {
  const safeEntry = entry && typeof entry === "object" ? entry : {};
  const rawSets = Array.isArray(safeEntry.sets) ? safeEntry.sets : [];

  return {
    done: Boolean(safeEntry.done),
    completedAt: typeof safeEntry.completedAt === "string" ? safeEntry.completedAt : "",
    sets: rawSets.map(normalizeWorkoutSet)
  };
}

function normalizeWorkoutSet(set = {}) {
  const safeSet = set && typeof set === "object" ? set : {};

  return {
    weight: normalizeWorkoutNumber(safeSet.weight),
    reps: normalizeWorkoutNumber(safeSet.reps)
  };
}

function normalizeWorkoutNumber(value) {
  if (value === "" || value === null || value === undefined) return "";
  const number = Number(value);
  return Number.isFinite(number) ? number : "";
}

function isDateKey(value) {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function render() {
  renderTestingPanel();
  renderDailyQuote();
  renderTodayHeader();
  renderTodayLists();
  renderRewardState();
  renderHabitManager();
  renderWorkouts();
  renderPlanner();
  renderGoals();
  renderGoalWorkspacePage();
  renderDayReview();
  renderPeriodProgress();
  renderProgressOptions();
  renderProgress();
  if (isCompletedModalOpen) renderCompletedModal();
}

function renderTestingPanel() {
  testingPanel.hidden = !isTestMode();
  testingScenarios.innerHTML = "";
  if (!isTestMode()) return;

  testingAccountMeta.textContent = t("testing.meta", { email: currentUser.email });

  getTestingScenarios().forEach(scenario => {
    const item = document.createElement("div");
    item.className = "testing-scenario";
    item.innerHTML = `
      <strong>${escapeHtml(t(scenario.titleKey))}</strong>
      <span>${escapeHtml(t(scenario.textKey))}</span>
    `;
    testingScenarios.appendChild(item);
  });
  animateRenderedChildren(testingScenarios);
}

function getTestingScenarios() {
  return [
    { titleKey: "testing.scenario.authTitle", textKey: "testing.scenario.authText" },
    { titleKey: "testing.scenario.habitsTitle", textKey: "testing.scenario.habitsText" },
    { titleKey: "testing.scenario.historyTitle", textKey: "testing.scenario.historyText" },
    { titleKey: "testing.scenario.workoutsTitle", textKey: "testing.scenario.workoutsText" },
    { titleKey: "testing.scenario.goalsTitle", textKey: "testing.scenario.goalsText" },
    { titleKey: "testing.scenario.workspaceTitle", textKey: "testing.scenario.workspaceText" },
    { titleKey: "testing.scenario.localeTitle", textKey: "testing.scenario.localeText" }
  ];
}

function renderDailyQuote() {
  const todayKey = syncDailyQuoteDate();
  dailyQuoteSection.hidden = !currentUser;
  dailyQuoteSection.style.display = currentUser ? "" : "none";
  if (!currentUser) return;

  if (!dailyQuote) {
    setDailyQuoteLoadingState(true);
    requestDailyQuote(todayKey);
    return;
  }

  setDailyQuoteLoadingState(false);
  dailyQuoteText.textContent = dailyQuote.text;

  const credit = getDailyQuoteCredit(dailyQuote);
  dailyQuoteCredit.hidden = !credit;
  dailyQuoteCredit.style.display = credit ? "" : "none";
  dailyQuoteAuthor.textContent = credit;
}

function syncDailyQuoteDate() {
  const todayKey = getLocalQuoteDate();
  if (dailyQuoteDate === todayKey) return todayKey;

  dailyQuoteDate = todayKey;
  dailyQuoteRequestToken += 1;
  isDailyQuoteLoading = false;
  dailyQuote = getCachedDailyQuote({
    date: todayKey,
    language: DAILY_QUOTE_LANGUAGE
  });
  return todayKey;
}

function setDailyQuoteLoadingState(isLoading) {
  dailyQuoteSection.classList.toggle("is-loading", isLoading);
  dailyQuoteBlockquote.setAttribute("aria-busy", String(isLoading));
  dailyQuoteSkeleton.hidden = !isLoading;
  dailyQuoteSkeleton.style.display = isLoading ? "" : "none";
  dailyQuoteText.hidden = isLoading;
  dailyQuoteText.style.display = isLoading ? "none" : "";
  if (isLoading) {
    dailyQuoteText.textContent = "";
    dailyQuoteCredit.hidden = true;
    dailyQuoteCredit.style.display = "none";
    dailyQuoteAuthor.textContent = "";
  }
}

function requestDailyQuote(date) {
  if (isDailyQuoteLoading) return;

  isDailyQuoteLoading = true;
  const token = ++dailyQuoteRequestToken;

  getDailyQuote({ date, language: DAILY_QUOTE_LANGUAGE })
    .then(quote => {
      if (token !== dailyQuoteRequestToken) return;
      dailyQuote = quote;
    })
    .catch(() => {
      // The quote service already falls back; visible errors do not belong here.
    })
    .finally(() => {
      if (token !== dailyQuoteRequestToken) return;
      isDailyQuoteLoading = false;
      renderDailyQuote();
    });
}

function getDailyQuoteCredit(quote) {
  if (quote.author) return quote.author;
  return quote.source && quote.source !== "Quotable" ? quote.source : "";
}

function renderTodayHeader() {
  const today = new Date();
  todayDateLabel.textContent = today.toLocaleDateString(getDateLocale(), {
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
    activeList.innerHTML = `<div class="empty">${t("empty.signInToday")}</div>`;
    animateRenderedChildren(activeList);
    return;
  }

  if (data.habits.length === 0) {
    renderTodaySummary(0, 0);
    completedTodayBtn.disabled = true;
    activeList.innerHTML = `<div class="empty">${t("empty.noHabits")}</div>`;
    animateRenderedChildren(activeList);
    return;
  }

  const activeHabits = [];
  const visibleHabits = getVisibleTodayHabits(todayKey);
  const doneCount = countDoneRecordsForDate(todayKey);
  const totalCount = countActiveHabitsForDate(todayKey);

  visibleHabits.items.forEach(habit => {
    const record = getRecord(todayKey, habit.id, false) || { done: false, value: "" };
    activeHabits.push({ habit, record });
  });

  renderTodaySummary(totalCount, doneCount);
  todayListMeta.textContent = getTodayListMeta(visibleHabits);
  renderTodayPager(visibleHabits);

  if (activeHabits.length === 0) {
    const emptyText = todaySearchQuery
      ? t("empty.noActiveResults")
      : t("empty.allDoneToday");
    activeList.innerHTML = `<div class="empty">${emptyText}</div>`;
  } else {
    activeHabits.forEach(({ habit, record }) => activeList.appendChild(makeQuestItem(habit, record, todayKey)));
  }
  animateRenderedChildren(activeList);
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
    if (!isHabitTrackedOnDate(habit, todayKey)) continue;
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
    return result.isPartialSearch ? t("today.checked", { countText: formatHabitCount(result.scannedCount) }) : "";
  }

  if (result.isPartialSearch) {
    return t("today.showingFound", {
      start: result.startIndex + 1,
      end: result.endIndex,
      count: result.matchCount
    });
  }

  return result.matchCount > result.items.length
    ? t("today.showingOf", {
      start: result.startIndex + 1,
      end: result.endIndex,
      count: result.matchCount
    })
    : formatHabitCount(result.matchCount);
}

function formatHabitCount(count) {
  return tn("counts.habit", count);
}

function formatCompletedHabitCount(count) {
  return tn("counts.completedHabit", count);
}

function formatDayCount(count) {
  return tn("counts.day", count);
}

function formatTaskCount(count) {
  return tn("counts.task", count);
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
  revealFloatingElement(completedModal);
  syncModalOpenState();
  renderCompletedModal();
  completedSearchInput.focus();
}

function closeCompletedModal() {
  isCompletedModalOpen = false;
  hideFloatingElement(completedModal);
  syncModalOpenState();
}

function renderCompletedModal() {
  completedModalList.innerHTML = "";
  const todayKey = toDateInputValue(new Date());

  if (!currentUser) {
    completedModalMeta.textContent = "";
    completedModalList.innerHTML = `<div class="empty">${t("completed.signInEmpty")}</div>`;
    animateRenderedChildren(completedModalList);
    return;
  }

  const completedItems = getCompletedTodayItems(todayKey);
  const visibleItems = completedItems.filter(({ habit }) => habitMatchesSearch(habit, completedSearchQuery));

  completedModalMeta.textContent = completedSearchQuery
    ? t("today.foundOf", { visible: visibleItems.length, total: completedItems.length })
    : formatCompletedHabitCount(completedItems.length);

  if (completedItems.length === 0) {
    completedModalList.innerHTML = `<div class="empty">${t("completed.noneToday")}</div>`;
    animateRenderedChildren(completedModalList);
    return;
  }

  if (visibleItems.length === 0) {
    completedModalList.innerHTML = `<div class="empty">${t("empty.noResults")}</div>`;
    animateRenderedChildren(completedModalList);
    return;
  }

  const fragment = document.createDocumentFragment();
  visibleItems.forEach(({ habit, record }) => {
    fragment.appendChild(makeCompletedQuestItem(habit, record, todayKey));
  });
  completedModalList.appendChild(fragment);
  animateRenderedChildren(completedModalList);
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
    name: habit?.name || record.habitName || t("habit.fallback"),
    unit: habit?.unit ?? record.habitUnit ?? "",
    target: habit?.target ?? record.habitTarget ?? ""
  };
}

function hasHabitSnapshot(record) {
  return Boolean(record && (
    Object.prototype.hasOwnProperty.call(record, "habitName") ||
    Object.prototype.hasOwnProperty.call(record, "habitUnit") ||
    Object.prototype.hasOwnProperty.call(record, "habitTarget")
  ));
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

  const check = document.createElement("button");
  check.className = "quest-check";
  check.type = "button";
  check.textContent = "✓";
  check.setAttribute("aria-label", t("review.done"));
  check.onclick = () => {
    if (check.dataset.busy === "true") return;
    check.dataset.busy = "true";
    check.classList.add("is-checking", "quest-check-done");
    record.done = true;
    if (!record.value && habit.target) record.value = Number(habit.target);
    applyHabitSnapshot(record, habit);
    saveRecord(dateKey, habit.id, record);
    markDirty();
    animateCompletion(el, render);
  };

  const info = document.createElement("div");
  const targetText = habit.target
    ? `${escapeHtml(habit.target)}${habit.unit ? " " + escapeHtml(habit.unit) : ""}`
    : t("habit.targetUnset");
  info.innerHTML = `
    <div class="quest-name">${escapeHtml(habit.name)}</div>
    <div class="quest-meta">${t("habit.targetMeta", { target: targetText })}</div>
  `;

  const value = document.createElement("input");
  value.className = "quest-value";
  value.type = "number";
  value.min = "0";
  value.placeholder = habit.unit || t("habit.valuePlaceholder");
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
  check.title = t("habit.returnToActive");
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
    <div class="quest-meta">${t("habit.completedEditable")}</div>
  `;

  const value = document.createElement("input");
  value.className = "quest-value";
  value.type = "number";
  value.min = "0";
  value.placeholder = habit.unit || t("habit.valuePlaceholder");
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
  toggleHabitManagerBtn.textContent = isHabitManagerOpen ? t("habits.hideSettings") : t("habits.configure");
  if (isHabitManagerOpen) renderHabitManager();
}

function renderHabitManager() {
  habitManagerPanel.classList.toggle("open", isHabitManagerOpen);
  toggleHabitManagerBtn.textContent = isHabitManagerOpen ? t("habits.hideSettings") : t("habits.configure");
  habitManagerList.innerHTML = "";

  if (!isHabitManagerOpen) return;

  if (!currentUser) {
    habitManagerList.innerHTML = `<div class="empty habit-manager-empty">${t("empty.signInHabitManager")}</div>`;
    animateRenderedChildren(habitManagerList);
    return;
  }

  if (data.habits.length === 0) {
    habitManagerList.innerHTML = `<div class="empty habit-manager-empty">${t("empty.noHabitsToEdit")}</div>`;
    animateRenderedChildren(habitManagerList);
    return;
  }

  if (data.habits.length > HABIT_MANAGER_LIMIT) {
    const note = document.createElement("div");
    note.className = "empty habit-manager-empty";
    note.textContent = t("habit.managerLimit", { limit: HABIT_MANAGER_LIMIT, total: data.habits.length });
    habitManagerList.appendChild(note);
  }

  data.habits.slice(0, HABIT_MANAGER_LIMIT).forEach(habit => {
    const item = document.createElement("div");
    item.className = "habit-manager-item";

    const nameInput = document.createElement("input");
    nameInput.value = habit.name || "";
    nameInput.placeholder = t("habit.fieldName");
    nameInput.onchange = () => updateHabitField(habit.id, "name", nameInput.value.trim());

    const unitInput = document.createElement("input");
    unitInput.value = habit.unit || "";
    unitInput.placeholder = t("habit.fieldUnit");
    unitInput.onchange = () => updateHabitField(habit.id, "unit", unitInput.value.trim());

    const targetInput = document.createElement("input");
    targetInput.type = "number";
    targetInput.min = "0";
    targetInput.value = habit.target ?? "";
    targetInput.placeholder = t("habit.fieldTarget");
    targetInput.onchange = () => updateHabitField(habit.id, "target", targetInput.value === "" ? "" : Number(targetInput.value));

    const actionMenu = makeActionMenu([
      {
        label: t("actions.edit"),
        onSelect: () => updateHabit(habit.id, {
          name: nameInput.value.trim(),
          unit: unitInput.value.trim(),
          target: targetInput.value === "" ? "" : Number(targetInput.value)
        })
      },
      {
        label: t("actions.delete"),
        danger: true,
        onSelect: () => deleteHabit(habit)
      }
    ], t("habit.menuLabel", { name: habit.name || t("habit.unnamed") }));

    item.appendChild(nameInput);
    item.appendChild(unitInput);
    item.appendChild(targetInput);
    item.appendChild(actionMenu);
    habitManagerList.appendChild(item);
  });
  animateRenderedChildren(habitManagerList);
}

function updateHabitField(habitId, field, value) {
  updateHabit(habitId, { [field]: value }, false);
}

function updateHabit(habitId, updates, rerender = true) {
  const habit = data.habits.find(h => h.id === habitId);
  if (!habit) return;

  if (Object.prototype.hasOwnProperty.call(updates, "name") && !updates.name) {
    alert(t("habit.nameRequired"));
    renderHabitManager();
    return;
  }

  if (Object.prototype.hasOwnProperty.call(updates, "target") && Number(updates.target) < 0) {
    alert(t("habit.targetNegative"));
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

function renderWorkouts() {
  const settings = getWorkoutSettings();
  const weekDays = getWeekDaysFromStart(workoutWeekStart);

  workoutCadenceSelect.value = String(settings.progressionWeeks);
  workoutWeightUnitSelect.value = settings.weightUnit;
  workoutCadenceSelect.disabled = !currentUser || !isWorkoutPlanEditorOpen;
  workoutWeightUnitSelect.disabled = !currentUser || !isWorkoutPlanEditorOpen;
  workoutPlanEditorToggleBtn.disabled = !currentUser;
  workoutPlanEditorToggleBtn.textContent = isWorkoutPlanEditorOpen ? t("workouts.hidePlanEditor") : t("workouts.editPlan");
  workoutPlanNextBtn.disabled = !currentUser;
  workoutWeekTitle.textContent = `${formatFullDate(weekDays[0], getDateLocale())} - ${formatFullDate(weekDays[6], getDateLocale())}`;

  renderWorkoutSummary();
  renderWorkoutDayTabs();
  renderWorkoutSession();
}

function renderWorkoutSummary() {
  const weekKey = getWorkoutWeekKey();
  const trainingDays = getWorkoutTrainingDays();
  const totalSets = trainingDays.reduce((sum, day) => {
    return sum + day.exercises.reduce((exerciseSum, exercise) => exerciseSum + exercise.targetSets, 0);
  }, 0);
  const loggedSets = trainingDays.reduce((sum, day) => {
    return sum + day.exercises.reduce((exerciseSum, exercise) => {
      return exerciseSum + countLoggedWorkoutSets(weekKey, day.id, exercise);
    }, 0);
  }, 0);
  const completedExercises = trainingDays.reduce((sum, day) => {
    return sum + day.exercises.filter(exercise => isWorkoutExerciseComplete(weekKey, day.id, exercise)).length;
  }, 0);

  workoutLoggedSets.textContent = loggedSets;
  workoutTotalSets.textContent = totalSets;
  workoutLoggedExercises.textContent = completedExercises;
  workoutNextBlockDate.textContent = formatShortDate(getNextWorkoutBlockKey(), getDateLocale());
}

function renderWorkoutDayTabs() {
  const weekKey = getWorkoutWeekKey();
  workoutDayTabs.innerHTML = "";

  getWorkoutPlan().forEach(day => {
    const tab = document.createElement("button");
    const isSelected = day.id === selectedWorkoutDayId;
    const isComplete = day.kind === "training" && isWorkoutDayComplete(day, weekKey);
    const dayType = day.kind === "training" ? getWorkoutDaySetsMeta(day, weekKey) : t(`workouts.kind.${day.kind}`);

    tab.className = "workout-day-tab";
    tab.type = "button";
    tab.classList.toggle("active", isSelected);
    tab.classList.toggle("done", isComplete);
    tab.classList.toggle("soft", day.kind !== "training");
    tab.innerHTML = `
      <span>${escapeHtml(t(day.weekdayKey))}</span>
      <strong>${escapeHtml(day.title)}</strong>
      <small>${escapeHtml(dayType)}</small>
    `;
    tab.addEventListener("click", () => {
      selectedWorkoutDayId = day.id;
      renderWorkoutDayTabs();
      renderWorkoutSession();
    });

    workoutDayTabs.appendChild(tab);
  });
}

function renderWorkoutSession() {
  const day = getSelectedWorkoutDay();
  workoutExerciseList.innerHTML = "";

  workoutDayKicker.textContent = `${t(day.weekdayKey)} / ${t(`workouts.kind.${day.kind}`)}`;
  workoutDayTitle.textContent = day.title;
  workoutDayFocus.textContent = day.focus || "";
  renderWorkoutPlanEditor(day);

  if (!currentUser) {
    workoutExerciseList.innerHTML = `<div class="empty">${t("workouts.signInEmpty")}</div>`;
    animateRenderedChildren(workoutExerciseList);
    return;
  }

  if (day.kind !== "training") {
    workoutExerciseList.appendChild(makeWorkoutRecoveryPanel(day));
    animateRenderedChildren(workoutExerciseList);
    return;
  }

  if (!day.exercises.length) {
    workoutExerciseList.innerHTML = `<div class="empty">${t("workouts.noExercises")}</div>`;
    animateRenderedChildren(workoutExerciseList);
    return;
  }

  day.exercises.forEach(exercise => {
    workoutExerciseList.appendChild(makeWorkoutExerciseCard(day, exercise));
  });
  animateRenderedChildren(workoutExerciseList);
}

function renderWorkoutPlanEditor(day) {
  workoutPlanEditor.hidden = !isWorkoutPlanEditorOpen || !currentUser;
  if (workoutPlanEditor.hidden) return;

  workoutPlanDayTitleInput.value = day.title || "";
  workoutPlanDayFocusInput.value = day.focus || "";
  workoutPlanDayKindSelect.value = day.kind || "training";
  workoutPlanDayTitleInput.disabled = !currentUser;
  workoutPlanDayFocusInput.disabled = !currentUser;
  workoutPlanDayKindSelect.disabled = !currentUser;
  workoutAddExerciseBtn.disabled = !currentUser;
}

function makeWorkoutRecoveryPanel(day) {
  const panel = document.createElement("div");
  panel.className = "workout-recovery-panel";

  const notes = day.notes.length
    ? day.notes.map(note => `<li>${escapeHtml(note)}</li>`).join("")
    : `<li>${escapeHtml(t(day.kind === "rest" ? "workouts.restEmpty" : "workouts.recoveryEmpty"))}</li>`;

  panel.innerHTML = `
    <div class="section-kicker">${escapeHtml(t(`workouts.kind.${day.kind}`))}</div>
    <div class="workout-recovery-title">${escapeHtml(day.focus || day.title)}</div>
    <ul class="workout-notes">${notes}</ul>
  `;

  return panel;
}

function makeWorkoutExerciseCard(day, exercise) {
  const weekKey = getWorkoutWeekKey();
  const sets = getWorkoutDisplayLogSets(weekKey, day.id, exercise);
  const targets = getWorkoutDisplayTargetSets(weekKey, day.id, exercise);
  const explicitTargets = getWorkoutExplicitTargetSets(weekKey, day.id, exercise);
  const loggedCount = sets.filter(isWorkoutSetLogged).length;
  const exerciseKey = getWorkoutExerciseKey(weekKey, day.id, exercise.id);
  const isExpanded = expandedWorkoutExerciseKeys.has(exerciseKey);
  const isComplete = isWorkoutExerciseComplete(weekKey, day.id, exercise);
  const card = document.createElement("article");

  card.className = "workout-exercise-card";
  card.classList.toggle("done", isComplete);
  card.classList.toggle("collapsed", !isExpanded);

  const top = document.createElement("div");
  top.className = "workout-exercise-top";
  top.innerHTML = `
    <button class="quest-check workout-exercise-check ${isComplete ? "quest-check-done" : ""}" type="button" aria-label="${escapeHtml(t("workouts.toggleExerciseDone"))}">✓</button>
    <div class="workout-exercise-main">
      <div class="workout-exercise-name">${escapeHtml(exercise.name)}</div>
      <div class="workout-exercise-meta">
        <span>${escapeHtml(formatWorkoutPrescription(exercise))}</span>
        <span>${escapeHtml(t("workouts.setsLoggedShort", { logged: loggedCount, total: exercise.targetSets }))}</span>
        <span>${escapeHtml(isComplete ? t("workouts.exerciseDone") : t("workouts.exerciseOpen"))}</span>
      </div>
    </div>
    <button class="workout-collapse-toggle" type="button" aria-expanded="${String(isExpanded)}" aria-label="${escapeHtml(isExpanded ? t("workouts.collapseExercise") : t("workouts.expandExercise"))}">
      ${isExpanded ? "⌃" : "⌄"}
    </button>
  `;

  top.querySelector(".workout-exercise-check").addEventListener("click", () => toggleWorkoutExerciseDone(day.id, exercise.id));
  top.querySelector(".workout-collapse-toggle").addEventListener("click", () => toggleWorkoutExerciseExpanded(weekKey, day.id, exercise.id));
  card.appendChild(top);

  if (!isExpanded) return card;

  if (isWorkoutPlanEditorOpen) {
    card.appendChild(makeWorkoutExerciseEditor(day, exercise));
  }

  if (exercise.notes.length) {
    const notes = document.createElement("ul");
    notes.className = "workout-notes";
    notes.innerHTML = exercise.notes.map(note => `<li>${escapeHtml(note)}</li>`).join("");
    card.appendChild(notes);
  }

  const setGrid = document.createElement("div");
  setGrid.className = "workout-set-grid";
  setGrid.innerHTML = `
    <div class="workout-set-head">${escapeHtml(t("workouts.set"))}</div>
    <div class="workout-set-head">${escapeHtml(t("workouts.target"))}</div>
    <div class="workout-set-head">${escapeHtml(t("workouts.weight"))}</div>
    <div class="workout-set-head">${escapeHtml(t("workouts.reps"))}</div>
  `;

  sets.forEach((set, index) => {
    const target = targets[index] || {};
    const explicitTarget = explicitTargets[index] || {};
    const row = document.createElement("div");
    row.className = "workout-set-row";
    row.classList.toggle("logged", isWorkoutSetLogged(set));

    const setNumber = document.createElement("div");
    setNumber.className = "workout-set-number";
    setNumber.textContent = t("workouts.setNumber", { number: index + 1 });

    const targetCell = document.createElement("div");
    targetCell.className = "workout-set-target";
    targetCell.title = formatWorkoutSetTarget(target, exercise);

    if (isWorkoutPlanEditorOpen) {
      const targetInputs = document.createElement("div");
      targetInputs.className = "workout-target-inputs";

      const targetWeightInput = document.createElement("input");
      targetWeightInput.type = "number";
      targetWeightInput.step = getWorkoutWeightInputStep();
      targetWeightInput.inputMode = "decimal";
      targetWeightInput.value = explicitTarget.weight ?? "";
      targetWeightInput.placeholder = target.weight === "" || target.weight === undefined ? getWorkoutWeightUnitLabel() : formatWorkoutNumber(target.weight);
      targetWeightInput.disabled = !currentUser;
      targetWeightInput.setAttribute("aria-label", t("workouts.targetWeight"));
      targetWeightInput.addEventListener("input", () => updateWorkoutTargetSetValue(day.id, exercise.id, index, "weight", targetWeightInput.value));

      const targetRepsInput = document.createElement("input");
      targetRepsInput.type = "number";
      targetRepsInput.step = "1";
      targetRepsInput.min = "0";
      targetRepsInput.inputMode = "numeric";
      targetRepsInput.value = explicitTarget.reps ?? "";
      targetRepsInput.placeholder = target.reps === "" || target.reps === undefined ? t("workouts.repsPlaceholder") : formatWorkoutNumber(target.reps);
      targetRepsInput.disabled = !currentUser;
      targetRepsInput.setAttribute("aria-label", t("workouts.targetResult"));
      targetRepsInput.addEventListener("input", () => updateWorkoutTargetSetValue(day.id, exercise.id, index, "reps", targetRepsInput.value));

      targetInputs.appendChild(targetWeightInput);
      targetInputs.appendChild(targetRepsInput);
      targetCell.appendChild(targetInputs);
    } else {
      targetCell.textContent = formatWorkoutSetTarget(target, exercise);
    }

    const weightInput = document.createElement("input");
    weightInput.type = "number";
    weightInput.step = getWorkoutWeightInputStep();
    weightInput.inputMode = "decimal";
    weightInput.value = set.weight;
    weightInput.placeholder = target.weight === "" || target.weight === undefined ? getWorkoutWeightUnitLabel() : formatWorkoutNumber(target.weight);
    weightInput.disabled = !currentUser;
    weightInput.addEventListener("input", () => {
      updateWorkoutSetValue(day.id, exercise.id, index, "weight", weightInput.value);
      row.classList.toggle("logged", isWorkoutSetLogged(getWorkoutDisplayLogSets(getWorkoutWeekKey(), day.id, exercise)[index]));
      syncWorkoutExerciseCardState(card, weekKey, day.id, exercise);
    });

    const repsInput = document.createElement("input");
    repsInput.type = "number";
    repsInput.step = "1";
    repsInput.min = "0";
    repsInput.inputMode = "numeric";
    repsInput.value = set.reps;
    repsInput.placeholder = target.reps === "" || target.reps === undefined ? t("workouts.repsPlaceholder") : formatWorkoutNumber(target.reps);
    repsInput.disabled = !currentUser;
    repsInput.addEventListener("input", () => {
      updateWorkoutSetValue(day.id, exercise.id, index, "reps", repsInput.value);
      row.classList.toggle("logged", isWorkoutSetLogged(getWorkoutDisplayLogSets(getWorkoutWeekKey(), day.id, exercise)[index]));
      syncWorkoutExerciseCardState(card, weekKey, day.id, exercise);
    });

    row.appendChild(setNumber);
    row.appendChild(targetCell);
    row.appendChild(weightInput);
    row.appendChild(repsInput);
    setGrid.appendChild(row);
  });

  card.appendChild(setGrid);
  return card;
}

function makeWorkoutExerciseEditor(day, exercise) {
  const editor = document.createElement("div");
  editor.className = "workout-exercise-editor";

  const nameInput = makeWorkoutEditorInput("text", exercise.name, t("workouts.exerciseNamePlaceholder"));
  nameInput.addEventListener("change", () => updateWorkoutExerciseField(day.id, exercise.id, "name", nameInput.value.trim()));

  const setsInput = makeWorkoutEditorInput("number", exercise.targetSets, t("workouts.setsPlaceholder"));
  setsInput.min = "1";
  setsInput.step = "1";
  setsInput.addEventListener("change", () => updateWorkoutExerciseField(day.id, exercise.id, "targetSets", setsInput.value));

  const repMinInput = makeWorkoutEditorInput("number", exercise.repMin, t("workouts.repMinPlaceholder"));
  repMinInput.min = "1";
  repMinInput.step = "1";
  repMinInput.addEventListener("change", () => updateWorkoutExerciseField(day.id, exercise.id, "repMin", repMinInput.value));

  const repMaxInput = makeWorkoutEditorInput("number", exercise.repMax, t("workouts.repMaxPlaceholder"));
  repMaxInput.min = "1";
  repMaxInput.step = "1";
  repMaxInput.addEventListener("change", () => updateWorkoutExerciseField(day.id, exercise.id, "repMax", repMaxInput.value));

  const unitSelect = document.createElement("select");
  unitSelect.setAttribute("aria-label", t("workouts.resultUnit"));
  WORKOUT_RESULT_UNIT_OPTIONS.forEach(unitKey => {
    const option = document.createElement("option");
    option.value = unitKey;
    option.textContent = t(unitKey);
    unitSelect.appendChild(option);
  });
  unitSelect.value = exercise.repUnitKey || "workouts.repsUnit";
  unitSelect.addEventListener("change", () => updateWorkoutExerciseField(day.id, exercise.id, "repUnitKey", unitSelect.value));

  const stepInput = makeWorkoutEditorInput("number", exercise.weightStep, t("workouts.stepKg", { unit: getWorkoutWeightUnitLabel() }));
  stepInput.step = getWorkoutWeightInputStep();
  stepInput.addEventListener("input", () => updateWorkoutExerciseStep(day.id, exercise.id, stepInput.value));

  const notesInput = document.createElement("textarea");
  notesInput.rows = 2;
  notesInput.value = exercise.notes.join("\n");
  notesInput.placeholder = t("workouts.notesPlaceholder");
  notesInput.addEventListener("change", () => updateWorkoutExerciseNotes(day.id, exercise.id, notesInput.value));

  const deleteBtn = document.createElement("button");
  deleteBtn.type = "button";
  deleteBtn.className = "danger";
  deleteBtn.textContent = t("actions.delete");
  deleteBtn.addEventListener("click", () => deleteWorkoutExercise(day.id, exercise));

  editor.appendChild(makeWorkoutEditorField(t("workouts.exerciseName"), nameInput));
  editor.appendChild(makeWorkoutEditorField(t("workouts.sets"), setsInput));
  editor.appendChild(makeWorkoutEditorField(t("workouts.repMin"), repMinInput));
  editor.appendChild(makeWorkoutEditorField(t("workouts.repMax"), repMaxInput));
  editor.appendChild(makeWorkoutEditorField(t("workouts.resultUnit"), unitSelect));
  editor.appendChild(makeWorkoutEditorField(t("workouts.stepKg", { unit: getWorkoutWeightUnitLabel() }), stepInput));
  editor.appendChild(makeWorkoutEditorField(t("workouts.notes"), notesInput, "wide"));
  editor.appendChild(deleteBtn);
  return editor;
}

function makeWorkoutEditorInput(type, value, placeholder) {
  const input = document.createElement("input");
  input.type = type;
  input.value = value === "" || value === undefined ? "" : value;
  input.placeholder = placeholder;
  return input;
}

function makeWorkoutEditorField(label, control, extraClass = "") {
  const wrapper = document.createElement("label");
  wrapper.className = `workout-editor-field ${extraClass}`.trim();
  const text = document.createElement("span");
  text.textContent = label;
  wrapper.appendChild(text);
  wrapper.appendChild(control);
  return wrapper;
}

function syncWorkoutExerciseCardState(card, weekKey, dayId, exercise) {
  const isComplete = isWorkoutExerciseComplete(weekKey, dayId, exercise);
  const check = card.querySelector(".workout-exercise-check");
  const metaItems = card.querySelectorAll(".workout-exercise-meta span");
  const status = metaItems[metaItems.length - 1];
  const loggedMeta = metaItems[1];

  card.classList.toggle("done", isComplete);
  check?.classList.toggle("quest-check-done", isComplete);
  if (loggedMeta) {
    loggedMeta.textContent = t("workouts.setsLoggedShort", {
      logged: countLoggedWorkoutSets(weekKey, dayId, exercise),
      total: exercise.targetSets
    });
  }
  if (status) status.textContent = isComplete ? t("workouts.exerciseDone") : t("workouts.exerciseOpen");
}

function updateWorkoutSetValue(dayId, exerciseId, setIndex, field, value) {
  if (!currentUser) {
    alert(t("workouts.signInRequired"));
    return;
  }

  const day = getWorkoutDay(dayId);
  const exercise = day?.exercises.find(item => item.id === exerciseId);
  if (!day || !exercise || !["weight", "reps"].includes(field)) return;

  const entry = ensureWorkoutExerciseLog(getWorkoutWeekKey(), dayId, exercise);
  entry.sets[setIndex][field] = normalizeWorkoutNumber(value);
  markDirty();
  renderWorkoutSummary();
  renderWorkoutDayTabs();
}

function updateWorkoutTargetSetValue(dayId, exerciseId, setIndex, field, value) {
  if (!currentUser) {
    alert(t("workouts.signInRequired"));
    return;
  }

  const day = getWorkoutDay(dayId);
  const exercise = day?.exercises.find(item => item.id === exerciseId);
  if (!day || !exercise || !["weight", "reps"].includes(field)) return;

  const entry = ensureWorkoutExerciseTarget(getWorkoutWeekKey(), dayId, exercise);
  entry.sets[setIndex][field] = normalizeWorkoutNumber(value);
  markDirty();
}

function updateWorkoutExerciseStep(dayId, exerciseId, value) {
  if (!currentUser) return;

  const day = getWorkoutDay(dayId);
  const exercise = day?.exercises.find(item => item.id === exerciseId);
  if (!exercise) return;

  exercise.weightStep = normalizeWorkoutNumber(value);
  markDirty();
}

function updateWorkoutExerciseField(dayId, exerciseId, field, value) {
  if (!currentUser) return;

  const day = getWorkoutDay(dayId);
  const exercise = day?.exercises.find(item => item.id === exerciseId);
  if (!exercise) return;

  if (field === "name") {
    exercise.name = value || t("workouts.fallbackExercise");
  }

  if (field === "targetSets") {
    exercise.targetSets = normalizePositiveInteger(value, exercise.targetSets);
  }

  if (field === "repMin") {
    exercise.repMin = normalizePositiveInteger(value, exercise.repMin);
    if (exercise.repMax < exercise.repMin) exercise.repMax = exercise.repMin;
  }

  if (field === "repMax") {
    exercise.repMax = Math.max(exercise.repMin, normalizePositiveInteger(value, exercise.repMax));
  }

  if (field === "repUnitKey" && WORKOUT_RESULT_UNIT_OPTIONS.includes(value)) {
    exercise.repUnitKey = value;
  }

  markDirty();
  renderWorkouts();
}

function updateWorkoutExerciseNotes(dayId, exerciseId, value) {
  if (!currentUser) return;

  const day = getWorkoutDay(dayId);
  const exercise = day?.exercises.find(item => item.id === exerciseId);
  if (!exercise) return;

  exercise.notes = normalizeWorkoutNotes(value.split("\n"));
  markDirty();
  renderWorkoutSession();
}

function toggleWorkoutExerciseExpanded(weekKey, dayId, exerciseId) {
  const key = getWorkoutExerciseKey(weekKey, dayId, exerciseId);
  if (expandedWorkoutExerciseKeys.has(key)) {
    expandedWorkoutExerciseKeys.delete(key);
  } else {
    expandedWorkoutExerciseKeys.add(key);
  }
  renderWorkoutSession();
}

function toggleWorkoutExerciseDone(dayId, exerciseId) {
  if (!currentUser) {
    alert(t("workouts.signInRequired"));
    return;
  }

  const day = getWorkoutDay(dayId);
  const exercise = day?.exercises.find(item => item.id === exerciseId);
  if (!exercise) return;

  const entry = ensureWorkoutExerciseLog(getWorkoutWeekKey(), dayId, exercise);
  entry.done = !entry.done;
  entry.completedAt = entry.done ? toDateInputValue(new Date()) : "";
  markDirty();
  renderWorkouts();
}

function toggleWorkoutPlanEditor() {
  if (!currentUser) {
    alert(t("workouts.signInRequired"));
    return;
  }

  isWorkoutPlanEditorOpen = !isWorkoutPlanEditorOpen;
  renderWorkouts();
}

function updateWorkoutDayField(field, value) {
  if (!currentUser) return;

  const day = getSelectedWorkoutDay();
  if (!day) return;

  if (field === "title") day.title = value || t("workouts.fallbackDay");
  if (field === "focus") day.focus = value;
  if (field === "kind" && ["training", "recovery", "rest"].includes(value)) day.kind = value;

  markDirty();
  renderWorkouts();
}

function addWorkoutExercise() {
  if (!currentUser) {
    alert(t("workouts.signInRequired"));
    return;
  }

  const day = getSelectedWorkoutDay();
  if (!day) return;

  day.kind = "training";
  day.exercises ||= [];
  const exercise = makeWorkoutExercise(
    `exercise-${crypto.randomUUID()}`,
    t("workouts.newExerciseName"),
    3,
    8,
    12,
    getDefaultWorkoutWeightStep(),
    [],
    "workouts.repsUnit"
  );

  day.exercises.push(exercise);
  expandedWorkoutExerciseKeys.add(getWorkoutExerciseKey(getWorkoutWeekKey(), day.id, exercise.id));
  markDirty();
  renderWorkouts();
}

function deleteWorkoutExercise(dayId, exercise) {
  if (!currentUser) return;
  if (!confirm(t("workouts.confirmDeleteExercise", { name: exercise.name || t("workouts.fallbackExercise") }))) return;

  const day = getWorkoutDay(dayId);
  if (!day) return;

  day.exercises = day.exercises.filter(item => item.id !== exercise.id);
  deleteWorkoutExerciseStoreEntries(dayId, exercise.id);
  expandedWorkoutExerciseKeys.forEach(key => {
    if (key.endsWith(`:${dayId}:${exercise.id}`)) expandedWorkoutExerciseKeys.delete(key);
  });
  markDirty();
  renderWorkouts();
}

function deleteWorkoutExerciseStoreEntries(dayId, exerciseId) {
  [data.workoutLogs, data.workoutTargets].forEach(store => {
    if (!store || typeof store !== "object") return;
    Object.values(store).forEach(days => {
      if (days?.[dayId]) delete days[dayId][exerciseId];
    });
  });
}

function updateWorkoutCadence() {
  if (!currentUser) return;
  ensureWorkoutData();
  data.workoutSettings.progressionWeeks = workoutCadenceSelect.value === "2" ? 2 : 1;
  markDirty();
  renderWorkoutSummary();
}

function updateWorkoutWeightUnit() {
  if (!currentUser) return;

  ensureWorkoutData();
  const previousUnit = getWorkoutSettings().weightUnit;
  const nextUnit = WORKOUT_WEIGHT_UNIT_KEYS.includes(workoutWeightUnitSelect.value) ? workoutWeightUnitSelect.value : "kg";
  if (previousUnit === nextUnit) return;

  convertWorkoutWeightUnit(previousUnit, nextUnit);
  data.workoutSettings.weightUnit = nextUnit;
  markDirty();
  renderWorkouts();
}

function convertWorkoutWeightUnit(fromUnit, toUnit) {
  const ratio = WORKOUT_WEIGHT_CONVERSION[fromUnit]?.[toUnit];
  if (!ratio) return;

  data.workoutPlan.forEach(day => {
    day.exercises.forEach(exercise => {
      exercise.weightStep = convertWorkoutNumberUnit(exercise.weightStep, ratio);
    });
  });

  [data.workoutLogs, data.workoutTargets].forEach(store => {
    if (!store || typeof store !== "object") return;
    Object.values(store).forEach(days => {
      if (!days || typeof days !== "object") return;
      Object.values(days).forEach(exercises => {
        if (!exercises || typeof exercises !== "object") return;
        Object.values(exercises).forEach(entry => {
          if (!Array.isArray(entry?.sets)) return;
          entry.sets.forEach(set => {
            set.weight = convertWorkoutNumberUnit(set.weight, ratio);
          });
        });
      });
    });
  });
}

function convertWorkoutNumberUnit(value, ratio) {
  const number = normalizeWorkoutNumber(value);
  return number === "" ? "" : roundWorkoutNumber(Number(number) * ratio);
}

function planNextWorkoutBlock() {
  if (!currentUser) {
    alert(t("workouts.signInRequired"));
    return;
  }

  ensureWorkoutData();
  const sourceWeekKey = getWorkoutWeekKey();
  const nextWeekKey = getNextWorkoutBlockKey();
  let plannedExercises = 0;

  getWorkoutTrainingDays().forEach(day => {
    day.exercises.forEach(exercise => {
      const sourceSets = getWorkoutCurrentSourceSets(sourceWeekKey, day.id, exercise);
      if (!sourceSets.some(hasAnyWorkoutSetValue)) return;

      writeWorkoutTarget(nextWeekKey, day.id, exercise.id, progressWorkoutSets(sourceSets, exercise));
      plannedExercises += 1;
    });
  });

  if (!plannedExercises) {
    alert(t("workouts.noBaselineAlert"));
    return;
  }

  workoutWeekStart = parseDateKey(nextWeekKey);
  markDirty();
  renderWorkouts();
}

function changeWorkoutWeek(delta) {
  workoutWeekStart = addWeeksToDate(workoutWeekStart, delta);
  renderWorkouts();
}

function goToCurrentWorkoutWeek() {
  workoutWeekStart = getWeekStart(new Date());
  selectedWorkoutDayId = getDefaultWorkoutDayId();
  renderWorkouts();
}

function getDefaultWorkoutDayId() {
  return WORKOUT_DAY_ID_BY_INDEX[new Date().getDay()] || "mon-upper-a";
}

function getWorkoutSettings() {
  return normalizeWorkoutSettings(data.workoutSettings);
}

function getWorkoutWeightUnitLabel() {
  return t(getWorkoutSettings().weightUnit === "lb" ? "workouts.lbUnit" : "workouts.kgUnit");
}

function getWorkoutWeightInputStep() {
  return getWorkoutSettings().weightUnit === "lb" ? "1" : "0.5";
}

function getDefaultWorkoutWeightStep() {
  return getWorkoutSettings().weightUnit === "lb" ? 5 : 2.5;
}

function getWorkoutPlan() {
  return Array.isArray(data.workoutPlan) && data.workoutPlan.length ? data.workoutPlan : createDefaultWorkoutPlan();
}

function getWorkoutTrainingDays() {
  return getWorkoutPlan().filter(day => day.kind === "training");
}

function getWorkoutDay(dayId) {
  return getWorkoutPlan().find(day => day.id === dayId);
}

function getSelectedWorkoutDay() {
  const selected = getWorkoutDay(selectedWorkoutDayId);
  if (selected) return selected;

  const fallback = getWorkoutPlan()[0] || createDefaultWorkoutPlan()[0];
  selectedWorkoutDayId = fallback.id;
  return fallback;
}

function getWorkoutWeekKey() {
  return toDateInputValue(workoutWeekStart);
}

function getWorkoutExerciseKey(weekKey, dayId, exerciseId) {
  return `${weekKey}:${dayId}:${exerciseId}`;
}

function getNextWorkoutBlockKey() {
  return toDateInputValue(addWeeksToDate(workoutWeekStart, getWorkoutSettings().progressionWeeks));
}

function addWeeksToDate(date, weeks) {
  const next = new Date(date);
  next.setDate(next.getDate() + weeks * 7);
  return next;
}

function ensureWorkoutData() {
  data.workoutSettings = normalizeWorkoutSettings(data.workoutSettings);
  data.workoutPlan = normalizeWorkoutPlan(data.workoutPlan);
  data.workoutLogs = normalizeWorkoutStore(data.workoutLogs);
  data.workoutTargets = normalizeWorkoutStore(data.workoutTargets);
}

function ensureWorkoutExerciseLog(weekKey, dayId, exercise) {
  ensureWorkoutData();
  data.workoutLogs[weekKey] ||= {};
  data.workoutLogs[weekKey][dayId] ||= {};
  data.workoutLogs[weekKey][dayId][exercise.id] ||= { done: false, completedAt: "", sets: createEmptyWorkoutSets(exercise.targetSets) };

  const entry = data.workoutLogs[weekKey][dayId][exercise.id];
  entry.done = Boolean(entry.done);
  entry.completedAt = entry.done ? entry.completedAt || toDateInputValue(new Date()) : "";
  while (entry.sets.length < exercise.targetSets) entry.sets.push({ weight: "", reps: "" });
  entry.sets = entry.sets.slice(0, exercise.targetSets).map(normalizeWorkoutSet);
  return entry;
}

function ensureWorkoutExerciseTarget(weekKey, dayId, exercise) {
  ensureWorkoutData();
  data.workoutTargets[weekKey] ||= {};
  data.workoutTargets[weekKey][dayId] ||= {};
  data.workoutTargets[weekKey][dayId][exercise.id] ||= { sets: createEmptyWorkoutSets(exercise.targetSets) };

  const entry = data.workoutTargets[weekKey][dayId][exercise.id];
  while (entry.sets.length < exercise.targetSets) entry.sets.push({ weight: "", reps: "" });
  entry.sets = entry.sets.slice(0, exercise.targetSets).map(normalizeWorkoutSet);
  return entry;
}

function writeWorkoutTarget(weekKey, dayId, exerciseId, sets) {
  data.workoutTargets[weekKey] ||= {};
  data.workoutTargets[weekKey][dayId] ||= {};
  data.workoutTargets[weekKey][dayId][exerciseId] = {
    sets: sets.map(normalizeWorkoutSet)
  };
}

function getWorkoutDaySetsMeta(day, weekKey) {
  const total = day.exercises.reduce((sum, exercise) => sum + exercise.targetSets, 0);
  const logged = day.exercises.reduce((sum, exercise) => sum + countLoggedWorkoutSets(weekKey, day.id, exercise), 0);
  const done = day.exercises.filter(exercise => isWorkoutExerciseComplete(weekKey, day.id, exercise)).length;
  return t("workouts.dayProgress", { done, totalExercises: day.exercises.length, logged, total });
}

function isWorkoutDayBaselineComplete(day, weekKey) {
  return day.exercises.length > 0 && day.exercises.every(exercise => isWorkoutExerciseBaselineComplete(weekKey, day.id, exercise));
}

function isWorkoutDayComplete(day, weekKey) {
  return day.exercises.length > 0 && day.exercises.every(exercise => isWorkoutExerciseComplete(weekKey, day.id, exercise));
}

function isWorkoutExerciseBaselineComplete(weekKey, dayId, exercise) {
  return countLoggedWorkoutSets(weekKey, dayId, exercise) >= exercise.targetSets;
}

function isWorkoutExerciseComplete(weekKey, dayId, exercise) {
  return isWorkoutExerciseExplicitlyDone(weekKey, dayId, exercise.id) || isWorkoutExerciseBaselineComplete(weekKey, dayId, exercise);
}

function isWorkoutExerciseExplicitlyDone(weekKey, dayId, exerciseId) {
  return Boolean(data.workoutLogs?.[weekKey]?.[dayId]?.[exerciseId]?.done);
}

function countLoggedWorkoutSets(weekKey, dayId, exercise) {
  return getWorkoutDisplayLogSets(weekKey, dayId, exercise).filter(isWorkoutSetLogged).length;
}

function getWorkoutDisplayLogSets(weekKey, dayId, exercise) {
  return fillWorkoutSets(getWorkoutEntrySets(data.workoutLogs, weekKey, dayId, exercise.id), exercise.targetSets);
}

function getWorkoutExplicitTargetSets(weekKey, dayId, exercise) {
  return fillWorkoutSets(getWorkoutEntrySets(data.workoutTargets, weekKey, dayId, exercise.id), exercise.targetSets);
}

function getWorkoutDisplayTargetSets(weekKey, dayId, exercise) {
  const explicitTargets = fillWorkoutSets(getWorkoutEntrySets(data.workoutTargets, weekKey, dayId, exercise.id), exercise.targetSets);
  const hasExplicitTargets = explicitTargets.some(hasAnyWorkoutSetValue);
  let fallbackTargets;

  const previousSource = findLatestWorkoutSourceBefore(weekKey, dayId, exercise.id);
  if (previousSource) {
    const weeksBetween = getWorkoutWeekDistance(previousSource.weekKey, weekKey);
    const sourceSets = fillWorkoutSets(previousSource.sets, exercise.targetSets);
    fallbackTargets = weeksBetween >= getWorkoutSettings().progressionWeeks ? progressWorkoutSets(sourceSets, exercise) : sourceSets;
  } else {
    fallbackTargets = createWorkoutPrescriptionTargets(exercise);
  }

  return hasExplicitTargets ? mergeWorkoutTargets(fallbackTargets, explicitTargets) : fallbackTargets;
}

function mergeWorkoutTargets(fallbackTargets, explicitTargets) {
  return fallbackTargets.map((target, index) => {
    const explicit = explicitTargets[index] || {};
    return {
      ...target,
      weight: explicit.weight !== "" && explicit.weight !== undefined ? explicit.weight : target.weight,
      reps: explicit.reps !== "" && explicit.reps !== undefined ? explicit.reps : target.reps
    };
  });
}

function getWorkoutCurrentSourceSets(weekKey, dayId, exercise) {
  const currentLog = fillWorkoutSets(getWorkoutEntrySets(data.workoutLogs, weekKey, dayId, exercise.id), exercise.targetSets);
  if (currentLog.some(hasAnyWorkoutSetValue)) return currentLog;

  const currentTarget = fillWorkoutSets(getWorkoutEntrySets(data.workoutTargets, weekKey, dayId, exercise.id), exercise.targetSets);
  if (currentTarget.some(hasAnyWorkoutSetValue)) return currentTarget;

  const previous = findLatestWorkoutSourceBefore(weekKey, dayId, exercise.id);
  return previous ? fillWorkoutSets(previous.sets, exercise.targetSets) : createEmptyWorkoutSets(exercise.targetSets);
}

function getWorkoutEntrySets(store, weekKey, dayId, exerciseId) {
  const sets = store?.[weekKey]?.[dayId]?.[exerciseId]?.sets;
  return Array.isArray(sets) ? sets.map(normalizeWorkoutSet) : [];
}

function findLatestWorkoutSourceBefore(weekKey, dayId, exerciseId) {
  const sources = [
    ...getWorkoutStoreSourcesBefore(data.workoutLogs, weekKey, dayId, exerciseId, isWorkoutSetLogged),
    ...getWorkoutStoreSourcesBefore(data.workoutTargets, weekKey, dayId, exerciseId, hasAnyWorkoutSetValue)
  ];

  return sources.sort((a, b) => b.weekKey.localeCompare(a.weekKey))[0] || null;
}

function getWorkoutStoreSourcesBefore(store, weekKey, dayId, exerciseId, predicate) {
  if (!store || typeof store !== "object") return [];

  return Object.entries(store)
    .filter(([sourceWeekKey]) => sourceWeekKey < weekKey)
    .map(([sourceWeekKey, days]) => ({
      weekKey: sourceWeekKey,
      sets: days?.[dayId]?.[exerciseId]?.sets || []
    }))
    .filter(source => source.sets.some(set => predicate(normalizeWorkoutSet(set))));
}

function progressWorkoutSets(sets, exercise) {
  return fillWorkoutSets(sets, exercise.targetSets).map(set => progressWorkoutSet(set, exercise));
}

function progressWorkoutSet(set, exercise) {
  const safeSet = normalizeWorkoutSet(set);
  const reps = normalizeWorkoutNumber(safeSet.reps);
  const weight = normalizeWorkoutNumber(safeSet.weight);
  const step = normalizeWorkoutNumber(exercise.weightStep);

  if (reps === "") return safeSet;

  if (reps >= exercise.repMax && weight !== "" && step !== 0 && step !== "") {
    return {
      weight: roundWorkoutNumber(Number(weight) + Number(step)),
      reps: exercise.repMin
    };
  }

  return {
    weight,
    reps: roundWorkoutNumber(Number(reps) + 1)
  };
}

function createWorkoutPrescriptionTargets(exercise) {
  return Array.from({ length: exercise.targetSets }, () => ({
    weight: "",
    reps: exercise.repMin,
    repsMax: exercise.repMax
  }));
}

function createEmptyWorkoutSets(count) {
  return Array.from({ length: count }, () => ({ weight: "", reps: "" }));
}

function fillWorkoutSets(sets, count) {
  return Array.from({ length: count }, (_, index) => normalizeWorkoutSet(sets[index] || {}));
}

function isWorkoutSetLogged(set) {
  return normalizeWorkoutNumber(set?.reps) !== "";
}

function hasAnyWorkoutSetValue(set) {
  const safeSet = normalizeWorkoutSet(set);
  return safeSet.weight !== "" || safeSet.reps !== "";
}

function getWorkoutWeekDistance(fromWeekKey, toWeekKey) {
  const fromDate = parseDateKey(fromWeekKey);
  const toDate = parseDateKey(toWeekKey);
  return Math.max(0, Math.round((toDate - fromDate) / (7 * 86400000)));
}

function formatWorkoutPrescription(exercise) {
  return `${exercise.targetSets}x${formatWorkoutRepRange(exercise)}`;
}

function formatWorkoutRepRange(exercise) {
  const unit = t(exercise.repUnitKey || "workouts.repsUnit");
  if (exercise.repMin === exercise.repMax) return t("workouts.targetSingle", { count: exercise.repMin, unit });
  return t("workouts.targetRange", { min: exercise.repMin, max: exercise.repMax, unit });
}

function formatWorkoutSetTarget(set, exercise) {
  const safeSet = set || {};
  const unit = t(exercise.repUnitKey || "workouts.repsUnit");
  const hasWeight = safeSet.weight !== "" && safeSet.weight !== undefined;
  const hasReps = safeSet.reps !== "" && safeSet.reps !== undefined;
  const hasRepRange = hasReps && safeSet.repsMax && safeSet.repsMax !== safeSet.reps;

  if (hasWeight && hasReps) {
    const repsText = hasRepRange
      ? t("workouts.targetRange", { min: safeSet.reps, max: safeSet.repsMax, unit })
      : t("workouts.targetSingle", { count: safeSet.reps, unit });
    return t("workouts.targetWeightReps", { weight: formatWorkoutNumber(safeSet.weight), unit: getWorkoutWeightUnitLabel(), reps: repsText });
  }

  if (hasReps && hasRepRange) return t("workouts.targetRange", { min: safeSet.reps, max: safeSet.repsMax, unit });
  if (hasReps) return t("workouts.targetSingle", { count: safeSet.reps, unit });
  if (hasWeight) return t("workouts.targetWeightOnly", { weight: formatWorkoutNumber(safeSet.weight), unit: getWorkoutWeightUnitLabel() });
  return t("workouts.noTarget");
}

function formatWorkoutNumber(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return "";
  return Number.isInteger(number) ? String(number) : String(Number(number.toFixed(2)));
}

function roundWorkoutNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? Number(number.toFixed(2)) : "";
}

function renderPlanner() {
  plannerDateLabel.textContent = formatPlannerDateLabel(plannerSelectedDate);
  plannerAddBlockBtn.disabled = !currentUser;
  plannerAddRecurringBtn.disabled = !currentUser;
  renderPlannerSummary();
  renderPlannerTimeline();
  renderPlannerRecurringRules();
}

function renderPlannerSummary() {
  const entries = getPlannerEntriesForDate(plannerSelectedDate);
  plannerPlannedCount.textContent = entries.filter(entry => entry.block.status === "planned").length;
  plannerDoneCount.textContent = entries.filter(entry => entry.block.status === "done").length;
  plannerSkippedCount.textContent = entries.filter(entry => entry.block.status === "skipped").length;
  plannerGoalCount.textContent = entries.filter(entry => entry.block.linkedGoalId).length;
}

function renderPlannerTimeline() {
  plannerTimeline.innerHTML = "";

  if (!currentUser) {
    plannerTimeline.innerHTML = `<div class="empty">${t("planner.signInEmpty")}</div>`;
    animateRenderedChildren(plannerTimeline);
    return;
  }

  const entries = getPlannerEntriesForDate(plannerSelectedDate);

  if (entries.length === 0) {
    plannerTimeline.innerHTML = `<div class="empty">${t("planner.emptyDay")}</div>`;
    animateRenderedChildren(plannerTimeline);
    return;
  }

  entries.forEach(entry => plannerTimeline.appendChild(makePlannerBlockItem(entry)));
  animateRenderedChildren(plannerTimeline);
}

function makePlannerBlockItem(entry) {
  const { block, isVirtual } = entry;
  const item = document.createElement("article");
  const linkedLabel = getPlannerLinkedLabel(block);
  const definition = block.definitionOfDone ? `<div class="planner-block-note">${escapeHtml(block.definitionOfDone)}</div>` : "";
  const notes = block.notes ? `<div class="planner-block-note muted">${escapeHtml(block.notes)}</div>` : "";

  item.className = `planner-block-item ${block.status}`;
  if (isVirtual) item.classList.add("virtual");
  item.innerHTML = `
    <div class="planner-time">
      <strong>${escapeHtml(block.startTime)}</strong>
      <span>${escapeHtml(block.endTime)}</span>
    </div>
    <div class="planner-block-main">
      <div class="planner-block-badges">
        <span class="deadline-pill ${getPlannerStatusClass(block.status)}">${escapeHtml(getPlannerStatusLabel(block.status))}</span>
        <span class="goal-type">${escapeHtml(getPlannerTypeLabel(block.type))}</span>
        ${isVirtual ? `<span class="goal-type">${t("planner.recurringBadge")}</span>` : ""}
      </div>
      <div class="planner-block-title">${escapeHtml(block.title)}</div>
      ${linkedLabel ? `<div class="planner-block-link">${escapeHtml(linkedLabel)}</div>` : ""}
      ${definition}
      ${notes}
    </div>
    <div class="planner-block-actions">
      <button class="success planner-done-btn" type="button">${t("planner.markDone")}</button>
      <button class="secondary planner-skip-btn" type="button">${t("planner.markSkipped")}</button>
      <button class="secondary planner-move-btn" type="button">${t("planner.move")}</button>
    </div>
  `;

  item.querySelector(".planner-done-btn").disabled = block.status === "done";
  item.querySelector(".planner-skip-btn").disabled = block.status === "skipped";
  item.querySelector(".planner-done-btn").addEventListener("click", () => setPlannerEntryStatus(entry, "done", item));
  item.querySelector(".planner-skip-btn").addEventListener("click", () => setPlannerEntryStatus(entry, "skipped", item));
  item.querySelector(".planner-move-btn").addEventListener("click", () => movePlannerEntry(entry));
  const menuActions = [
    {
      label: t("actions.edit"),
      onSelect: () => editPlannerEntry(entry)
    }
  ];
  if (!isVirtual) {
    menuActions.push(
    {
      label: t("actions.delete"),
      danger: true,
      onSelect: () => deletePlannerEntry(entry)
    }
    );
  }
  item.appendChild(makeActionMenu(menuActions, t("planner.menuBlockLabel", { name: block.title || t("planner.untitledBlock") })));

  return item;
}

function renderPlannerRecurringRules() {
  plannerRecurringList.innerHTML = "";

  if (!currentUser) {
    plannerRecurringList.innerHTML = `<div class="empty">${t("planner.signInRecurringEmpty")}</div>`;
    animateRenderedChildren(plannerRecurringList);
    return;
  }

  if (!data.recurringRules.length) {
    plannerRecurringList.innerHTML = `<div class="empty">${t("planner.emptyRules")}</div>`;
    animateRenderedChildren(plannerRecurringList);
    return;
  }

  getSortedPlannerRules().forEach(rule => plannerRecurringList.appendChild(makePlannerRuleItem(rule)));
  animateRenderedChildren(plannerRecurringList);
}

function makePlannerRuleItem(rule) {
  const item = document.createElement("article");
  const linkedLabel = getPlannerLinkedLabel(rule);
  const weekdayText = rule.weekdays.length
    ? rule.weekdays.map(getPlannerWeekdayLabel).join(", ")
    : t("planner.noWeekdays");

  item.className = "planner-rule-item" + (rule.active ? "" : " paused");
  item.innerHTML = `
    <div>
      <div class="planner-rule-title">${escapeHtml(rule.title)}</div>
      <div class="planner-rule-meta">${escapeHtml(`${weekdayText} · ${formatPlannerTimeRange(rule)}`)}</div>
      ${linkedLabel ? `<div class="planner-block-link">${escapeHtml(linkedLabel)}</div>` : ""}
    </div>
    <div class="planner-rule-actions">
      <button class="secondary planner-rule-toggle" type="button">${rule.active ? t("planner.disableRule") : t("planner.enableRule")}</button>
    </div>
  `;

  item.querySelector(".planner-rule-toggle").addEventListener("click", () => togglePlannerRule(rule.id));
  item.appendChild(makeActionMenu([
    {
      label: t("actions.edit"),
      onSelect: () => openPlannerBlockModal({ mode: "rule", ruleId: rule.id })
    },
    {
      label: t("actions.delete"),
      danger: true,
      onSelect: () => deletePlannerRule(rule.id)
    }
  ], t("planner.menuRuleLabel", { name: rule.title || t("planner.untitledBlock") })));

  return item;
}

function openPlannerBlockModal(options = {}) {
  if (!currentUser) {
    alert(t("planner.signInRequired"));
    return;
  }

  plannerModalMode = options.mode === "rule" ? "rule" : "block";
  plannerEditingBlockId = options.blockId || null;
  plannerEditingRuleId = options.ruleId || null;
  const block = plannerEditingBlockId ? findPlannerBlockById(plannerEditingBlockId) : null;
  const rule = plannerEditingRuleId ? data.recurringRules.find(item => item.id === plannerEditingRuleId) : null;
  const source = rule || block || {};
  const preselectedGoalId = options.goalId || source.linkedGoalId || "";
  const preselectedTaskId = options.linkedMilestoneId || source.linkedMilestoneId || "";
  const preselectedHabitId = options.linkedHabitId || source.linkedHabitId || "";
  const startTime = source.startTime || "09:00";

  plannerLinkMode = preselectedGoalId ? "goal" : "standalone";
  populatePlannerTypeSelect(source.type || (preselectedGoalId ? "goal" : "custom"));
  populatePlannerGoalSelect(preselectedGoalId);
  populatePlannerMilestoneSelect(preselectedGoalId, preselectedTaskId);
  populatePlannerHabitSelect(preselectedHabitId);
  renderPlannerWeekdayChoices(rule?.weekdays || [1, 2, 3, 4, 5]);

  plannerDateInput.value = options.date || block?.date || plannerSelectedDate;
  plannerStartInput.value = startTime;
  plannerEndInput.value = source.endTime || getDefaultPlannerEndTime(startTime);
  plannerTitleInput.value = options.title || source.title || getDefaultPlannerTitle(preselectedGoalId, preselectedTaskId, preselectedHabitId);
  plannerDoneInput.value = source.definitionOfDone || "";
  plannerNotesInput.value = block?.notes || "";

  isPlannerModalOpen = true;
  syncPlannerModalText();
  syncPlannerModalVisibility();
  revealFloatingElement(plannerBlockModal);
  syncModalOpenState();
  requestAnimationFrame(() => {
    if (plannerLinkMode === "goal" && plannerGoalSelect.value) plannerTitleInput.focus();
    else plannerTitleInput.focus();
  });
}

function closePlannerModal() {
  isPlannerModalOpen = false;
  plannerEditingBlockId = null;
  plannerEditingRuleId = null;
  hideFloatingElement(plannerBlockModal);
  syncModalOpenState();
}

function syncPlannerModalText() {
  if (!plannerModalTitle || !plannerSaveBtn) return;
  const isRule = plannerModalMode === "rule";
  const isEditing = isRule ? Boolean(plannerEditingRuleId) : Boolean(plannerEditingBlockId);
  plannerModalTitle.textContent = isRule
    ? isEditing ? t("planner.editRuleTitle") : t("planner.newRuleTitle")
    : isEditing ? t("planner.editBlockTitle") : t("planner.newBlockTitle");
  plannerSaveBtn.textContent = isRule
    ? isEditing ? t("planner.updateRule") : t("planner.saveRule")
    : isEditing ? t("planner.updateBlock") : t("planner.saveBlock");
}

function setPlannerLinkMode(mode) {
  plannerLinkMode = mode === "goal" ? "goal" : "standalone";
  if (plannerLinkMode === "goal") {
    plannerTypeSelect.value = "goal";
    if (!plannerGoalSelect.value && data.goals[0]) {
      plannerGoalSelect.value = data.goals[0].id;
      populatePlannerMilestoneSelect(plannerGoalSelect.value);
    }
  }
  syncPlannerModalVisibility();
}

function syncPlannerModalVisibility() {
  const isRule = plannerModalMode === "rule";
  const isGoalLink = plannerLinkMode === "goal";
  const isHabitLink = !isGoalLink && plannerTypeSelect.value === "habit";

  plannerDateField.hidden = isRule;
  plannerWeekdayField.hidden = !isRule;
  plannerNotesField.hidden = isRule;
  plannerChoiceGoalBtn.classList.toggle("active", isGoalLink);
  plannerChoiceStandaloneBtn.classList.toggle("active", !isGoalLink);
  plannerTypeSelect.disabled = isGoalLink;
  if (isGoalLink) plannerTypeSelect.value = "goal";

  plannerGoalSelect.closest(".planner-field").hidden = !isGoalLink;
  plannerMilestoneSelect.closest(".planner-field").hidden = !isGoalLink;
  plannerHabitSelect.closest(".planner-field").hidden = !isHabitLink;
  plannerDeleteBtn.hidden = isRule ? !plannerEditingRuleId : !plannerEditingBlockId;
}

function populatePlannerTypeSelect(selectedType = "custom") {
  plannerTypeSelect.innerHTML = "";
  PLANNER_BLOCK_TYPES.forEach(type => {
    const option = document.createElement("option");
    option.value = type;
    option.textContent = getPlannerTypeLabel(type);
    plannerTypeSelect.appendChild(option);
  });
  plannerTypeSelect.value = normalizePlannerType(selectedType);
}

function populatePlannerGoalSelect(selectedGoalId = "") {
  plannerGoalSelect.innerHTML = "";
  const emptyOption = document.createElement("option");
  emptyOption.value = "";
  emptyOption.textContent = data.goals.length ? t("planner.goalPlaceholder") : t("planner.noGoalOptions");
  plannerGoalSelect.appendChild(emptyOption);

  data.goals.forEach(goal => {
    const option = document.createElement("option");
    option.value = goal.id;
    option.textContent = goal.name || t("data.goalFallback");
    plannerGoalSelect.appendChild(option);
  });

  plannerGoalSelect.value = selectedGoalId && data.goals.some(goal => goal.id === selectedGoalId) ? selectedGoalId : "";
}

function populatePlannerMilestoneSelect(goalId, selectedTaskId = "") {
  plannerMilestoneSelect.innerHTML = "";
  const goal = data.goals.find(item => item.id === goalId);
  const emptyOption = document.createElement("option");
  emptyOption.value = "";
  emptyOption.textContent = goal?.tasks?.length ? t("planner.manualTitle") : t("planner.noMilestones");
  plannerMilestoneSelect.appendChild(emptyOption);

  (goal?.tasks || []).forEach(task => {
    const option = document.createElement("option");
    option.value = task.id;
    option.textContent = task.title || t("data.taskFallback");
    plannerMilestoneSelect.appendChild(option);
  });

  plannerMilestoneSelect.value = selectedTaskId && goal?.tasks?.some(task => task.id === selectedTaskId) ? selectedTaskId : "";
}

function populatePlannerHabitSelect(selectedHabitId = "") {
  plannerHabitSelect.innerHTML = "";
  const emptyOption = document.createElement("option");
  emptyOption.value = "";
  emptyOption.textContent = data.habits.length ? t("planner.habitPlaceholder") : t("planner.noHabitOptions");
  plannerHabitSelect.appendChild(emptyOption);

  data.habits.forEach(habit => {
    const option = document.createElement("option");
    option.value = habit.id;
    option.textContent = habit.name || t("habit.fallback");
    plannerHabitSelect.appendChild(option);
  });

  plannerHabitSelect.value = selectedHabitId && data.habits.some(habit => habit.id === selectedHabitId) ? selectedHabitId : "";
}

function renderPlannerWeekdayChoices(selectedWeekdays = []) {
  const selected = new Set(selectedWeekdays.map(Number));
  plannerWeekdayChoices.innerHTML = "";

  [1, 2, 3, 4, 5, 6, 0].forEach(day => {
    const label = document.createElement("label");
    label.className = "planner-weekday-choice";
    label.innerHTML = `
      <input type="checkbox" value="${day}" ${selected.has(day) ? "checked" : ""} />
      <span>${escapeHtml(getPlannerWeekdayLabel(day))}</span>
    `;
    plannerWeekdayChoices.appendChild(label);
  });
}

function syncPlannerTitleFromSelectedTask() {
  if (plannerTitleInput.value.trim()) return;
  const title = getDefaultPlannerTitle(plannerGoalSelect.value, plannerMilestoneSelect.value, plannerHabitSelect.value);
  if (title) plannerTitleInput.value = title;
}

function savePlannerFromModal() {
  if (!currentUser) {
    alert(t("planner.signInRequired"));
    return;
  }

  const payload = readPlannerFormPayload();
  if (!payload) return;

  if (plannerModalMode === "rule") {
    savePlannerRule(payload);
  } else {
    savePlannerBlock(payload);
  }

  markDirty();
  closePlannerModal();
  renderPlanner();
  renderGoals();
}

function readPlannerFormPayload() {
  const isRule = plannerModalMode === "rule";
  const isGoalLink = plannerLinkMode === "goal";
  const type = isGoalLink ? "goal" : normalizePlannerType(plannerTypeSelect.value);
  const linkedGoalId = isGoalLink ? normalizeNullableId(plannerGoalSelect.value) : null;
  const linkedMilestoneId = isGoalLink ? normalizeNullableId(plannerMilestoneSelect.value) : null;
  const linkedHabitId = type === "habit" ? normalizeNullableId(plannerHabitSelect.value) : null;
  const title = plannerTitleInput.value.trim() || getDefaultPlannerTitle(linkedGoalId, linkedMilestoneId, linkedHabitId);
  const startTime = normalizePlannerTime(plannerStartInput.value, "");
  const endTime = normalizePlannerTime(plannerEndInput.value, "");

  if (!startTime || !endTime) {
    alert(t("planner.timeRequired"));
    return null;
  }

  if (startTime >= endTime) {
    alert(t("planner.timeOrder"));
    return null;
  }

  if (isGoalLink && !linkedGoalId) {
    alert(t("planner.goalRequired"));
    return null;
  }

  if (!title) {
    alert(t("planner.titleRequired"));
    return null;
  }

  if (isRule) {
    const weekdays = getPlannerFormWeekdays();
    if (weekdays.length === 0) {
      alert(t("planner.weekdaysRequired"));
      return null;
    }

    return {
      title,
      weekdays,
      startTime,
      endTime,
      type,
      linkedGoalId,
      linkedMilestoneId,
      linkedHabitId,
      definitionOfDone: plannerDoneInput.value.trim()
    };
  }

  if (!isDateKey(plannerDateInput.value)) {
    alert(t("planner.dateRequired"));
    return null;
  }

  return {
    date: plannerDateInput.value,
    startTime,
    endTime,
    title,
    type,
    linkedGoalId,
    linkedMilestoneId,
    linkedHabitId,
    status: "planned",
    definitionOfDone: plannerDoneInput.value.trim(),
    notes: plannerNotesInput.value.trim()
  };
}

function savePlannerBlock(payload) {
  const now = Date.now();
  const existing = plannerEditingBlockId ? findPlannerBlockById(plannerEditingBlockId) : null;

  if (existing) {
    Object.assign(existing, payload, {
      status: existing.status || "planned",
      updatedAt: now
    });
    plannerSelectedDate = existing.date;
    return;
  }

  data.plannerBlocks.push(normalizePlannerBlock({
    id: crypto.randomUUID(),
    ...payload,
    createdAt: now,
    updatedAt: now
  }));
  plannerSelectedDate = payload.date;
}

function savePlannerRule(payload) {
  const now = Date.now();
  const existing = plannerEditingRuleId ? data.recurringRules.find(rule => rule.id === plannerEditingRuleId) : null;

  if (existing) {
    Object.assign(existing, payload, { updatedAt: now });
    return;
  }

  data.recurringRules.push(normalizeRecurringRule({
    id: crypto.randomUUID(),
    ...payload,
    active: true,
    createdAt: now,
    updatedAt: now
  }));
}

function deletePlannerFromModal() {
  if (plannerModalMode === "rule" && plannerEditingRuleId) {
    deletePlannerRule(plannerEditingRuleId, { closeModal: true });
    return;
  }

  if (plannerEditingBlockId) {
    const block = findPlannerBlockById(plannerEditingBlockId);
    if (!block || !confirm(t("planner.confirmDeleteBlock", { title: block.title }))) return;
    data.plannerBlocks = data.plannerBlocks.filter(item => item.id !== block.id);
    markDirty();
    closePlannerModal();
    renderPlanner();
    renderGoals();
  }
}

function getPlannerFormWeekdays() {
  return [...plannerWeekdayChoices.querySelectorAll("input[type='checkbox']:checked")]
    .map(input => Number(input.value))
    .filter(day => Number.isInteger(day) && day >= 0 && day <= 6)
    .sort((a, b) => a - b);
}

function setPlannerEntryStatus(entry, status, source) {
  const block = ensureRealPlannerBlock(entry, status);
  if (!block) return;

  block.status = status;
  block.updatedAt = Date.now();
  markDirty();
  const rerender = () => {
    renderPlanner();
    renderGoals();
  };

  if (status === "done" && source) {
    source.classList.add("is-completing");
    animateCompletion(source, rerender);
  } else {
    rerender();
  }
}

function movePlannerEntry(entry) {
  const block = ensureRealPlannerBlock(entry, "moved");
  if (!block) return;

  const targetDate = prompt(t("planner.movePrompt"), shiftDateKey(block.date, 1));
  if (!targetDate) return;
  if (!isDateKey(targetDate)) {
    alert(t("planner.moveInvalid"));
    return;
  }

  const now = Date.now();
  block.status = "moved";
  block.updatedAt = now;
  data.plannerBlocks.push(normalizePlannerBlock({
    ...block,
    id: crypto.randomUUID(),
    date: targetDate,
    status: "planned",
    createdAt: now,
    updatedAt: now
  }));
  plannerSelectedDate = targetDate;
  markDirty();
  renderPlanner();
  renderGoals();
}

function editPlannerEntry(entry) {
  const block = ensureRealPlannerBlock(entry, entry.block.status || "planned");
  if (!block) return;
  markDirty();
  openPlannerBlockModal({ mode: "block", blockId: block.id });
}

function deletePlannerEntry(entry) {
  if (entry.isVirtual) return;
  const block = findPlannerBlockById(entry.block.id);
  if (!block || !confirm(t("planner.confirmDeleteBlock", { title: block.title }))) return;
  data.plannerBlocks = data.plannerBlocks.filter(item => item.id !== block.id);
  markDirty();
  renderPlanner();
  renderGoals();
}

function ensureRealPlannerBlock(entry, status = "planned") {
  if (!entry) return null;
  if (!entry.isVirtual) return findPlannerBlockById(entry.block.id);
  return instantiateRecurringRuleForDate(entry.rule, entry.block.date, status);
}

function instantiateRecurringRuleForDate(rule, dateKey, status = "planned") {
  if (!rule) return null;
  const id = getRecurringInstanceId(rule.id, dateKey);
  const existing = findPlannerBlockById(id);
  if (existing) return existing;

  const now = Date.now();
  const block = normalizePlannerBlock({
    id,
    date: dateKey,
    startTime: rule.startTime,
    endTime: rule.endTime,
    title: rule.title,
    type: rule.type,
    linkedGoalId: rule.linkedGoalId,
    linkedMilestoneId: rule.linkedMilestoneId,
    linkedHabitId: rule.linkedHabitId,
    status,
    definitionOfDone: rule.definitionOfDone,
    notes: "",
    createdAt: now,
    updatedAt: now
  });
  data.plannerBlocks.push(block);
  return block;
}

function togglePlannerRule(ruleId) {
  const rule = data.recurringRules.find(item => item.id === ruleId);
  if (!rule) return;
  rule.active = !rule.active;
  rule.updatedAt = Date.now();
  markDirty();
  renderPlanner();
  renderGoals();
}

function deletePlannerRule(ruleId, options = {}) {
  const rule = data.recurringRules.find(item => item.id === ruleId);
  if (!rule || !confirm(t("planner.confirmDeleteRule", { title: rule.title }))) return;
  data.recurringRules = data.recurringRules.filter(item => item.id !== ruleId);
  markDirty();
  if (options.closeModal) closePlannerModal();
  renderPlanner();
  renderGoals();
}

function changePlannerDate(delta) {
  plannerSelectedDate = shiftDateKey(plannerSelectedDate, delta);
  renderPlanner();
}

function goToTodayPlannerDate() {
  plannerSelectedDate = toDateInputValue(new Date());
  renderPlanner();
}

function getPlannerEntriesForDate(dateKey) {
  const realEntries = data.plannerBlocks
    .filter(block => block.date === dateKey)
    .map(block => ({ block, isVirtual: false, rule: null }));
  const virtualEntries = data.recurringRules
    .filter(rule => shouldShowRecurringRuleOnDate(rule, dateKey))
    .map(rule => ({ block: createVirtualPlannerBlock(rule, dateKey), isVirtual: true, rule }));

  return [...realEntries, ...virtualEntries].sort(sortPlannerEntries);
}

function shouldShowRecurringRuleOnDate(rule, dateKey) {
  if (!rule.active) return false;
  if (!rule.weekdays.includes(parseDateKey(dateKey).getDay())) return false;
  return !findPlannerBlockById(getRecurringInstanceId(rule.id, dateKey));
}

function createVirtualPlannerBlock(rule, dateKey) {
  return {
    id: getRecurringInstanceId(rule.id, dateKey),
    date: dateKey,
    startTime: rule.startTime,
    endTime: rule.endTime,
    title: rule.title,
    type: rule.type,
    linkedGoalId: rule.linkedGoalId,
    linkedMilestoneId: rule.linkedMilestoneId,
    linkedHabitId: rule.linkedHabitId,
    status: "planned",
    definitionOfDone: rule.definitionOfDone,
    notes: "",
    createdAt: rule.createdAt,
    updatedAt: rule.updatedAt
  };
}

function getRecurringInstanceId(ruleId, dateKey) {
  return `recurring-${ruleId}-${dateKey}`;
}

function sortPlannerEntries(a, b) {
  if (a.block.startTime !== b.block.startTime) return a.block.startTime.localeCompare(b.block.startTime);
  if (a.block.endTime !== b.block.endTime) return a.block.endTime.localeCompare(b.block.endTime);
  return String(a.block.title || "").localeCompare(String(b.block.title || ""));
}

function getSortedPlannerRules() {
  return [...data.recurringRules].sort((a, b) => {
    if (a.active !== b.active) return Number(b.active) - Number(a.active);
    if (a.startTime !== b.startTime) return a.startTime.localeCompare(b.startTime);
    return String(a.title || "").localeCompare(String(b.title || ""));
  });
}

function findPlannerBlockById(blockId) {
  return data.plannerBlocks.find(block => block.id === blockId) || null;
}

function getDefaultPlannerTitle(goalId, taskId, habitId) {
  const task = goalId && taskId ? findGoalTask(goalId, taskId) : null;
  if (task?.title) return task.title;
  const goal = goalId ? data.goals.find(item => item.id === goalId) : null;
  if (goal?.name) return goal.name;
  const habit = habitId ? findHabitById(habitId) : null;
  if (habit?.name) return habit.name;
  return "";
}

function getPlannerLinkedLabel(block) {
  if (block.linkedGoalId) {
    const goal = data.goals.find(item => item.id === block.linkedGoalId);
    const task = block.linkedMilestoneId ? findGoalTask(block.linkedGoalId, block.linkedMilestoneId) : null;
    const goalName = goal?.name || t("data.goalFallback");
    return task?.title
      ? t("planner.linkedToTask", { goal: goalName, task: task.title })
      : t("planner.linkedTo", { name: goalName });
  }

  if (block.linkedHabitId) {
    const habit = findHabitById(block.linkedHabitId);
    return t("planner.linkedTo", { name: habit?.name || t("habit.fallback") });
  }

  return "";
}

function getPlannerStatusClass(status) {
  if (status === "done") return "done";
  if (status === "skipped" || status === "moved") return "warning";
  return "info";
}

function getPlannerStatusLabel(status) {
  return t(`planner.status.${PLANNER_BLOCK_STATUSES.includes(status) ? status : "planned"}`);
}

function getPlannerTypeLabel(type) {
  return t(`planner.type.${normalizePlannerType(type)}`);
}

function getPlannerWeekdayLabel(day) {
  const keys = ["calendar.weekday.sun", "calendar.weekday.mon", "calendar.weekday.tue", "calendar.weekday.wed", "calendar.weekday.thu", "calendar.weekday.fri", "calendar.weekday.sat"];
  return t(keys[day] || keys[0]);
}

function formatPlannerTimeRange(block) {
  return `${block.startTime}-${block.endTime}`;
}

function formatPlannerDateLabel(dateKey) {
  return parseDateKey(dateKey).toLocaleDateString(getDateLocale(), {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric"
  });
}

function renderDayReview() {
  reviewDateInput.value = reviewDate;
  const date = parseDateKey(reviewDate);
  const todayKey = toDateInputValue(new Date());
  const isToday = reviewDate === todayKey;
  const isFuture = reviewDate > todayKey;
  const isTodayOpen = isToday && !isTodayComplete();
  let streakOnDate;
  if (isFuture) {
    streakOnDate = calculateProjectedGlobalStreakAtDate(reviewDate);
  } else if (isTodayOpen) {
    streakOnDate = calculatePotentialGlobalStreakAtDate(reviewDate);
  } else {
    streakOnDate = calculateLatestGlobalStreak(reviewDate);
  }

  reviewDayTitle.textContent = isToday
    ? t("review.today")
    : date.toLocaleDateString(getDateLocale(), { day: "numeric", month: "long", weekday: "long" });

  reviewStreak.textContent = streakOnDate;
  reviewStreakBox.classList.remove("danger", "future");
  if (isFuture) reviewStreakBox.classList.add("future");
  else if (streakOnDate === 0 && !isTodayOpen) reviewStreakBox.classList.add("danger");

  reviewStreakText.textContent = isFuture
    ? t("review.futureStreak")
    : isToday
      ? isTodayOpen
        ? t("review.todayOpen")
        : t("review.todayClosed")
      : streakOnDate > 0
        ? t("review.pastPositive")
        : t("review.pastZero");

  renderFutureProjection(reviewDate);

  daySummaryList.innerHTML = "";

  if (isFuture) {
    daySummaryList.innerHTML = `<div class="empty">${t("review.futureEmpty")}</div>`;
    animateRenderedChildren(daySummaryList);
    return;
  }

  if (!currentUser) {
    daySummaryList.innerHTML = `<div class="empty">${t("review.signInEmpty")}</div>`;
    animateRenderedChildren(daySummaryList);
    return;
  }

  const activeHabitsForDate = getActiveHabitsForDate(reviewDate);

  if (data.habits.length === 0 && activeHabitsForDate.length === 0) {
    daySummaryList.innerHTML = `<div class="empty">${t("review.noHabitsEmpty")}</div>`;
    animateRenderedChildren(daySummaryList);
    return;
  }

  const completedCount = countDoneRecordsForDate(reviewDate);
  const visibleHabits = activeHabitsForDate.slice(0, DAY_REVIEW_LIMIT);

  visibleHabits.forEach(habit => {
    const isActive = isHabitTrackedOnDate(habit, reviewDate);
    const record = getRecord(reviewDate, habit.id, false);
    const done = Boolean(record?.done);

    const item = document.createElement("div");
    item.className = "day-summary-item" + (done ? " done" : "") + (!isActive ? " inactive" : "");

    const valueText = record?.value
      ? `${record.value}${habit.unit ? " " + habit.unit : ""}`
      : done
        ? "✓"
        : "—";
    const statusText = !isActive
      ? t("review.inactive")
      : done
        ? t("review.done")
        : t("review.notDone");

    item.innerHTML = `
      <div>
        <div class="day-summary-name">${escapeHtml(habit.name)}</div>
        <div class="day-summary-meta">${statusText}${isActive && habit.target ? ` · ${t("review.target", { target: habit.target, unit: escapeHtml(habit.unit || "") })}` : ""}</div>
      </div>
      <div class="day-summary-value">${escapeHtml(valueText)}</div>
    `;

    daySummaryList.appendChild(item);
  });

  const summary = document.createElement("div");
  summary.className = "empty";
  summary.textContent = activeHabitsForDate.length > visibleHabits.length
    ? t("review.totalShown", { done: completedCount, total: activeHabitsForDate.length, shown: visibleHabits.length })
    : t("review.total", { done: completedCount, total: activeHabitsForDate.length });
  daySummaryList.prepend(summary);
  animateRenderedChildren(daySummaryList);
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
  futureProjectionTitle.textContent = t("projection.titleDays", { daysText: formatDayCount(daysAhead) });
  futureProjectionText.textContent = t("projection.text");

  futureProjectionTable.innerHTML = `
    <div class="projection-row projection-head">
      <div class="projection-cell">${t("projection.habit")}</div>
      <div class="projection-cell">${t("projection.now")}</div>
      <div class="projection-cell">${t("projection.targetAdd")}</div>
      <div class="projection-cell">${t("projection.total")}</div>
    </div>
  `;

  if (data.habits.length > PROJECTION_LIMIT) {
    const row = document.createElement("div");
    row.className = "projection-row";
    row.innerHTML = `
      <div class="projection-cell projection-total">${t("projection.shown", { limit: PROJECTION_LIMIT })}</div>
      <div class="projection-cell"></div>
      <div class="projection-cell"></div>
      <div class="projection-cell">${t("projection.ofTotal", { total: data.habits.length })}</div>
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
  const total = countActiveHabitsForDate(todayKey);
  const done = countDoneRecordsForDate(todayKey);
  const percent = total === 0 ? 0 : Math.round((done / total) * 100);
  const streak = calculateLatestGlobalStreak(todayKey);

  heroStreak.textContent = streak;
  dailyRingFill.style.width = `${percent}%`;
  streakMessage.className = "streak-warning";

  if (!currentUser) {
    streakMessage.classList.add("neutral");
    streakMessage.textContent = t("streak.signIn");
  } else if (data.habits.length === 0) {
    streakMessage.classList.add("neutral");
    streakMessage.textContent = t("streak.addHabit");
  } else if (done === total) {
    streakMessage.classList.add("saved");
    streakMessage.textContent = t("streak.saved");
  } else {
    const remaining = total - done;
    streakMessage.textContent = t("streak.inProgress", {
      streakText: formatDayCount(streak),
      habitText: formatHabitCount(remaining)
    });
  }
}

function renderPeriodProgress() {
  const weekDays = getWeekDaysFromStart(visibleWeekStart);
  const monthDays = getCalendarMonthDays(visibleMonthDate);
  const monthStatDays = getMonthDays(visibleMonthDate);
  document.getElementById("weekCalendarTitle").textContent = `${formatFullDate(weekDays[0], getDateLocale())} — ${formatFullDate(weekDays[6], getDateLocale())}`;
  document.getElementById("monthCalendarTitle").textContent = visibleMonthDate.toLocaleDateString(getDateLocale(), {
    month: "long",
    year: "numeric"
  });
  renderPeriod("week", weekDays, "weekCompleted", "weekRate", "weekPerfect", "weekMiniDays");
  renderPeriod("month", monthDays, "monthCompleted", "monthRate", "monthPerfect", "monthMiniDays", {
    statsDays: monthStatDays,
    visibleMonth: visibleMonthDate.getMonth()
  });
}

function renderPeriod(periodName, days, completedId, rateId, perfectId, miniId, options = {}) {
  let possible = 0;
  let completed = 0;
  let perfectDays = 0;
  const dayStats = new Map();
  const statsDays = options.statsDays || days;

  statsDays.forEach(day => {
    const dateKey = toDateInputValue(day);
    const totalHabits = countActiveHabitsForDate(dateKey);
    const dayDone = countDoneRecordsForDate(dateKey);
    dayStats.set(dateKey, { done: dayDone, total: totalHabits });
    possible += totalHabits;
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
    const dayStat = dayStats.get(dateKey) || getDayCompletionStats(dateKey);
    const el = document.createElement("div");
    const isClosed = dayStat.total > 0 && dayStat.done === dayStat.total;
    el.className = "mini-day";
    if (isClosed) el.classList.add("done");
    if (periodName === "month" && options.visibleMonth !== undefined && day.getMonth() !== options.visibleMonth) {
      el.classList.add("outside");
    }
    if (dateKey === todayKey) el.classList.add("today");
    if (dateKey === reviewDate) el.classList.add("selected");
    el.innerHTML = `<span>${day.getDate()}</span>`;
    el.setAttribute("aria-label", isClosed ? `${dateKey}: ${dayStat.done}/${dayStat.total} ${t("review.done")}` : `${dateKey}: ${dayStat.done}/${dayStat.total}`);
    el.title = `${dayStat.done}/${dayStat.total}`;
    el.onclick = () => {
      selectReviewDate(dateKey, { syncWeek: periodName === "month" });
    };
    mini.appendChild(el);
  });
}

function countDoneRecordsForDate(dateKey) {
  const dayRecords = data.records[dateKey];
  if (!dayRecords) return 0;
  const activeHabitIds = new Set(getActiveHabitsForDate(dateKey).map(habit => habit.id));

  return Object.entries(dayRecords).reduce((count, [habitId, record]) => {
    if (!activeHabitIds.has(habitId)) return count;
    return count + (record?.done ? 1 : 0);
  }, 0);
}

function getActiveHabitsForDate(dateKey) {
  const activeHabits = data.habits.filter(habit => isHabitTrackedOnDate(habit, dateKey));
  const activeHabitIds = new Set(activeHabits.map(habit => habit.id));
  const dayRecords = data.records[dateKey] || {};

  Object.entries(dayRecords).forEach(([habitId, record]) => {
    if (activeHabitIds.has(habitId) || !hasHabitSnapshot(record)) return;
    activeHabits.push(getHabitDetails(habitId, record));
    activeHabitIds.add(habitId);
  });

  return activeHabits;
}

function countActiveHabitsForDate(dateKey) {
  return getActiveHabitsForDate(dateKey).length;
}

function getDayCompletionStats(dateKey) {
  return {
    done: countDoneRecordsForDate(dateKey),
    total: countActiveHabitsForDate(dateKey)
  };
}

function isHabitActiveOnDate(habit, dateKey) {
  return !habit.createdAt || habit.createdAt <= dateKey;
}

function isHabitTrackedOnDate(habit, dateKey) {
  return isHabitActiveOnDate(habit, dateKey) || Boolean(data.records[dateKey]?.[habit.id]);
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
    option.textContent = t("progress.optionsShown", { shown: optionHabits.length, total: data.habits.length });
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
  const labels = chartData.map(d => formatShortDate(d.dateKey, getDateLocale()));
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
      label: t("chart.target", { target }),
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
              if (context.datasetIndex === 1) return t("chart.target", { target });
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
    alert(t("habit.signInRequired"));
    return;
  }

  const name = document.getElementById("habitName").value.trim();
  const unit = document.getElementById("habitUnit").value.trim();
  const targetRaw = document.getElementById("habitTarget").value;

  if (!name) {
    alert(t("habit.enterName"));
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
  syncGoalModalText();
  document.getElementById("goalName").value = goal?.name || "";
  document.getElementById("goalType").value = goal?.type || "other";
  document.getElementById("goalPointA").value = goal?.pointA || "";
  document.getElementById("goalPointB").value = goal?.pointB || "";
  isGoalModalOpen = true;
  revealFloatingElement(goalModal);
  syncModalOpenState();
  document.getElementById("goalName").focus();
}

function syncGoalModalText() {
  const isEditing = Boolean(editingGoalId);
  goalModalTitle.textContent = isEditing ? t("goals.editGoalTitle") : t("goals.newGoalTitle");
  goalSaveBtn.textContent = isEditing ? t("goals.saveChanges") : t("goals.saveGoal");
}

function closeGoalModal() {
  isGoalModalOpen = false;
  editingGoalId = null;
  hideFloatingElement(goalModal);
  syncModalOpenState();
}

function openGoalArchiveModal() {
  isGoalArchiveModalOpen = true;
  revealFloatingElement(goalArchiveModal);
  goalArchiveSearchInput.value = goalArchiveSearchQuery;
  renderGoalArchive();
  syncModalOpenState();
  goalArchiveSearchInput.focus();
}

function closeGoalArchiveModal() {
  isGoalArchiveModalOpen = false;
  hideFloatingElement(goalArchiveModal);
  syncModalOpenState();
}

function saveGoalFromModal() {
  if (!currentUser) {
    alert(t("goals.signInRequired"));
    return;
  }

  const name = document.getElementById("goalName").value.trim();
  const type = document.getElementById("goalType").value || "other";
  const pointA = document.getElementById("goalPointA").value.trim();
  const pointB = document.getElementById("goalPointB").value.trim();

  if (!name) {
    alert(t("goals.enterName"));
    return;
  }

  if (!pointA || !pointB) {
    alert(t("goals.fillPoints"));
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
    goalsList.innerHTML = `<div class="empty">${t("goals.signInEmpty")}</div>`;
    animateRenderedChildren(goalsList);
    return;
  }

  if (data.goals.length === 0) {
    goalsList.innerHTML = `<div class="empty">${t("goals.noneEmpty")}</div>`;
    animateRenderedChildren(goalsList);
    return;
  }

  if (activeGoals.length === 0) {
    goalsList.innerHTML = `<div class="empty">${t("goals.noActiveEmpty")}</div>`;
    animateRenderedChildren(goalsList);
    return;
  }

  activeGoals.forEach(goal => goalsList.appendChild(makeGoalCard(goal)));
  animateRenderedChildren(goalsList);
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
  const searchedGoals = filterArchivedGoals(visibleGoals, goalArchiveSearchQuery);

  goalArchiveCompletedCount.textContent = completedGoals.length;
  goalArchiveFailedCount.textContent = failedGoals.length;
  goalArchiveCompletedBtn.classList.toggle("active", goalArchiveMode === "completed");
  goalArchiveFailedBtn.classList.toggle("active", goalArchiveMode === "failed");
  goalArchiveCompletedBtn.setAttribute("aria-pressed", String(goalArchiveMode === "completed"));
  goalArchiveFailedBtn.setAttribute("aria-pressed", String(goalArchiveMode === "failed"));
  goalArchiveModalMeta.textContent = goalArchiveSearchQuery
    ? `${searchedGoals.length}/${visibleGoals.length} ${t("goals.archived")}`
    : `${visibleGoals.length} ${t("goals.archived")}`;
  goalArchiveList.innerHTML = "";

  if (!currentUser) {
    goalArchiveList.innerHTML = `<div class="empty">${t("goals.archiveSignInEmpty")}</div>`;
    animateRenderedChildren(goalArchiveList);
    return;
  }

  if (visibleGoals.length === 0) {
    const emptyText = goalArchiveMode === "completed"
      ? t("goals.archiveCompletedEmpty")
      : t("goals.archiveFailedEmpty");
    goalArchiveList.innerHTML = `<div class="empty">${emptyText}</div>`;
    animateRenderedChildren(goalArchiveList);
    return;
  }

  if (searchedGoals.length === 0) {
    goalArchiveList.innerHTML = `<div class="empty">${t("goals.archiveSearchEmpty")}</div>`;
    animateRenderedChildren(goalArchiveList);
    return;
  }

  searchedGoals.forEach(goal => goalArchiveList.appendChild(makeGoalArchiveCard(goal)));
  animateRenderedChildren(goalArchiveList);
}

function filterArchivedGoals(goals, query) {
  if (!query) return goals;

  return goals.filter(goal => {
    const fields = [
      goal.name,
      getGoalTypeLabel(goal.type),
      goal.pointA,
      goal.pointB,
      ...getSortedGoalTasks(goal).flatMap(task => [
        task.title,
        task.deadline,
        task.completedAt,
        task.workspace?.notes,
        ...(Array.isArray(task.workspace?.miniGoals) ? task.workspace.miniGoals.map(item => item.title) : [])
      ])
    ];
    return fields.some(value => String(value || "").toLowerCase().includes(query));
  });
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
  const statusLabel = isCompleted ? t("goals.statusCompleted") : t("goals.statusFailed");

  card.className = `goal-archive-card ${isCompleted ? "completed" : "failed"}`;
  card.innerHTML = `
    <div class="goal-archive-head">
      <div>
        <div class="goal-type">${escapeHtml(getGoalTypeLabel(goal.type))}</div>
        <div class="goal-name">${escapeHtml(goal.name)}</div>
      </div>
      <div class="goal-archive-status">
        <span>${statusLabel}</span>
        <strong>${escapeHtml(statusDate ? formatDeadlineLong(statusDate) : t("goals.noDate"))}</strong>
      </div>
    </div>

    <div class="goal-route-grid">
      <div class="goal-route-box">
        <span>${t("goals.pointA")}</span>
        <strong>${escapeHtml(goal.pointA || t("goals.notSet"))}</strong>
      </div>
      <div class="goal-route-box">
        <span>${t("goals.pointB")}</span>
        <strong>${escapeHtml(goal.pointB || t("goals.notSet"))}</strong>
      </div>
    </div>

    <div class="goal-stats">
      <div class="goal-stat">
        <span>${Math.round(progress.percent)}%</span>
        <span>${t("goals.closed")}</span>
      </div>
      <div class="goal-stat">
        <span>${progress.doneCount}/${progress.totalCount}</span>
        <span>${t("goals.tasks")}</span>
      </div>
      <div class="goal-stat">
        <span>${escapeHtml(formatDeadlineShort(goal.createdAt))}</span>
        <span>${t("goals.created")}</span>
      </div>
    </div>

    <div class="goal-archive-actions"></div>

    <div class="goal-task-archive compact">
      <div class="goal-task-archive-head">
        <div>
          <div class="section-kicker">${t("goals.taskArchive")}</div>
          <h3>${t("workspace.label")}</h3>
        </div>
        <span>${(goal.tasks || []).length}</span>
      </div>
      <div class="goal-task-archive-list"></div>
    </div>
  `;

  card.querySelector(".goal-archive-actions").appendChild(makeActionMenu([
    {
      label: t("actions.edit"),
      onSelect: () => openGoalModal(goal.id)
    },
    {
      label: t("actions.returnToWork"),
      onSelect: () => restoreGoal(goal)
    },
    {
      label: t("actions.delete"),
      danger: true,
      onSelect: () => deleteGoal(goal)
    }
  ], t("goals.menuArchiveLabel", { name: goal.name || t("habit.unnamed") })));
  renderGoalTaskArchive(goal, card.querySelector(".goal-task-archive-list"), {
    includeOpen: true,
    emptyText: t("goals.noTasksInGoal")
  });
  return card;
}

function getGoalArchiveDate(goal) {
  if (goal.status === "completed") return goal.completedAt || "";
  if (goal.status === "failed") return goal.failedAt || "";
  return "";
}

function makeGoalCard(goal) {
  const card = document.createElement("div");
  const isExpanded = expandedGoalIds.has(goal.id);
  card.className = "goal-item" + (isExpanded ? "" : " collapsed");
  const progress = getGoalProgress(goal);
  const sortedTasks = getSortedGoalTasks(goal);
  const activeTasks = sortedTasks.filter(task => !task.done);
  const archivedTasks = getArchivedGoalTasks(goal);
  const nextTask = getNextGoalTask(goal);
  const typeLabel = getGoalTypeLabel(goal.type);
  const canFinish = progress.totalCount > 0 && progress.doneCount === progress.totalCount;

  card.innerHTML = `
    <div class="goal-head">
      <button class="goal-collapse-trigger" type="button" aria-expanded="${String(isExpanded)}">
        <div class="goal-name">${escapeHtml(goal.name)}</div>
        <span class="goal-collapse-icon" aria-hidden="true">⌄</span>
      </button>
    </div>

    <div class="goal-card-body">
      <div class="goal-card-toolbar">
        <div class="goal-type">${escapeHtml(typeLabel)}</div>
        <div class="goal-card-actions">
          <button class="secondary goal-plan-session" type="button">${t("goals.planWorkSession")}</button>
          <button class="primary goal-result" type="button">${t("goals.finishGoal")}</button>
        </div>
      </div>

      <div class="goal-route-grid">
        <div class="goal-route-box">
          <span>${t("goals.pointA")}</span>
          <strong>${escapeHtml(goal.pointA || t("goals.notSet"))}</strong>
        </div>
        <div class="goal-route-box">
          <span>${t("goals.pointB")}</span>
          <strong>${escapeHtml(goal.pointB || t("goals.notSet"))}</strong>
        </div>
      </div>

      <div class="goal-progress-line">
        <div class="goal-progress-fill"></div>
      </div>

      <div class="goal-stats">
        <div class="goal-stat">
          <span>${Math.round(progress.percent)}%</span>
          <span>${t("goals.progress")}</span>
        </div>
        <div class="goal-stat">
          <span>${progress.doneCount}/${progress.totalCount}</span>
          <span>${t("goals.tasksClosed")}</span>
        </div>
        <div class="goal-stat">
          <span>${escapeHtml(nextTask ? formatDeadlineShort(nextTask.deadline) : "—")}</span>
          <span>${t("goals.nextDeadline")}</span>
        </div>
      </div>

      <section class="goal-execution-section"></section>

      <section class="goal-work-section">
        <div class="goal-work-section-head">
          <div>
            <div class="section-kicker">${t("goals.deadlinePlanKicker")}</div>
            <h3>${t("goals.deadlinePlanTitle")}</h3>
          </div>
        </div>

        <div class="goal-task-command-row">
          <div class="goal-next">
            ${canFinish ? t("goals.allTasksClosed") : nextTask ? makeNextTaskHtml(nextTask) : t("goals.noNextTask")}
          </div>
          <button class="primary add-goal-task-btn" type="button">${t("goals.addTask")}</button>
        </div>

        <div class="goal-task-form">
          <input class="goal-task-title-input" placeholder="${t("goals.taskPlaceholder")}" />
          <input class="goal-task-deadline-input" type="date" />
        </div>

        <div class="goal-task-list"></div>

        <div class="goal-task-archive">
          <div class="goal-task-archive-head">
            <div>
              <div class="section-kicker">${t("goals.taskArchive")}</div>
              <h3>${t("goals.completedTasks")}</h3>
            </div>
            <span>${archivedTasks.length}</span>
          </div>
          <div class="goal-task-archive-list"></div>
        </div>
      </section>
    </div>
  `;

  card.querySelector(".goal-collapse-trigger").onclick = () => toggleGoalCard(goal.id);
  card.querySelector(".goal-plan-session").onclick = () => openPlannerBlockModal({
    mode: "block",
    goalId: goal.id,
    linkedMilestoneId: nextTask?.id || "",
    title: nextTask?.title || goal.name
  });
  card.querySelector(".goal-result").onclick = () => openGoalResultModal(goal.id);
  card.querySelector(".goal-card-actions").appendChild(makeActionMenu([
    {
      label: t("actions.edit"),
      onSelect: () => openGoalModal(goal.id)
    },
    {
      label: t("actions.delete"),
      danger: true,
      onSelect: () => deleteGoal(goal)
    }
  ], t("goals.menuGoalLabel", { name: goal.name || t("habit.unnamed") })));
  card.querySelector(".add-goal-task-btn").onclick = () => addGoalTask(goal.id, card);
  card.querySelector(".goal-progress-fill").style.width = `${progress.percent}%`;

  const taskList = card.querySelector(".goal-task-list");
  if (activeTasks.length === 0) {
    taskList.innerHTML = `<div class="empty goal-task-empty">${sortedTasks.length === 0 ? t("goals.noDeadlineTasks") : t("goals.allTasksClosedEmpty")}</div>`;
  } else {
    activeTasks.forEach(task => {
      taskList.appendChild(makeGoalTaskItem(goal, task));
    });
  }
  animateRenderedChildren(taskList);
  renderGoalTaskArchive(goal, card.querySelector(".goal-task-archive-list"));
  renderGoalExecutionSummary(goal, card.querySelector(".goal-execution-section"));

  return card;
}

function renderGoalExecutionSummary(goal, container) {
  const blocks = getGoalPlannerBlocks(goal.id);
  const nextSession = getNextGoalPlannerSession(goal.id);
  const doneBlocks = blocks.filter(block => block.status === "done");
  const skippedBlocks = blocks.filter(block => block.status === "skipped");
  const recentBlocks = blocks
    .filter(block => block.status === "done" || block.status === "skipped" || block.status === "moved")
    .slice(0, 4);

  container.innerHTML = `
    <div class="goal-execution-head">
      <div>
        <div class="section-kicker">${t("goals.executionKicker")}</div>
        <h3>${t("goals.executionTitle")}</h3>
      </div>
      <div class="goal-execution-metrics">
        <span>${doneBlocks.length} ${t("planner.summaryDone")}</span>
        <span>${skippedBlocks.length} ${t("planner.summarySkipped")}</span>
      </div>
    </div>
    <div class="goal-execution-grid">
      <div class="goal-execution-next">
        <span>${t("goals.nextPlannedSession")}</span>
        <strong>${nextSession ? escapeHtml(nextSession.title) : t("goals.noPlannedSessions")}</strong>
        <small>${nextSession ? escapeHtml(formatGoalPlannerSessionMeta(nextSession)) : ""}</small>
      </div>
      <div class="goal-execution-list"></div>
    </div>
  `;

  const list = container.querySelector(".goal-execution-list");
  if (recentBlocks.length === 0) {
    list.innerHTML = `<div class="empty goal-task-empty">${t("goals.noExecutionYet")}</div>`;
    return;
  }

  recentBlocks.forEach(block => {
    const row = document.createElement("div");
    row.className = `goal-execution-row ${block.status}`;
    row.innerHTML = `
      <div>
        <strong>${escapeHtml(block.title)}</strong>
        <span>${escapeHtml(formatGoalPlannerSessionMeta(block))}</span>
      </div>
      <div class="deadline-pill ${getPlannerStatusClass(block.status)}">${escapeHtml(getPlannerStatusLabel(block.status))}</div>
    `;
    list.appendChild(row);
  });
}

function getGoalPlannerBlocks(goalId) {
  return [...(data.plannerBlocks || [])]
    .filter(block => block.linkedGoalId === goalId)
    .sort((a, b) => {
      if (a.date !== b.date) return String(b.date).localeCompare(String(a.date));
      if (a.startTime !== b.startTime) return String(b.startTime).localeCompare(String(a.startTime));
      return String(a.title || "").localeCompare(String(b.title || ""));
    });
}

function getNextGoalPlannerSession(goalId) {
  const todayKey = toDateInputValue(new Date());
  const plannedBlocks = (data.plannerBlocks || [])
    .filter(block => block.linkedGoalId === goalId && block.status === "planned" && block.date >= todayKey);
  const recurringSessions = getUpcomingGoalRecurringSessions(goalId, todayKey, 60);

  return [...plannedBlocks, ...recurringSessions]
    .sort((a, b) => {
      if (a.date !== b.date) return String(a.date).localeCompare(String(b.date));
      if (a.startTime !== b.startTime) return String(a.startTime).localeCompare(String(b.startTime));
      return String(a.title || "").localeCompare(String(b.title || ""));
    })[0] || null;
}

function getUpcomingGoalRecurringSessions(goalId, startDateKey, daysAhead) {
  const sessions = [];
  for (let offset = 0; offset <= daysAhead; offset++) {
    const dateKey = shiftDateKey(startDateKey, offset);
    data.recurringRules.forEach(rule => {
      if (rule.linkedGoalId !== goalId) return;
      if (!shouldShowRecurringRuleOnDate(rule, dateKey)) return;
      sessions.push(createVirtualPlannerBlock(rule, dateKey));
    });
  }
  return sessions;
}

function formatGoalPlannerSessionMeta(block) {
  return `${formatDeadlineShort(block.date)} · ${formatPlannerTimeRange(block)}`;
}

function toggleGoalCard(goalId) {
  if (expandedGoalIds.has(goalId)) expandedGoalIds.delete(goalId);
  else expandedGoalIds.add(goalId);
  renderGoalsList();
}

function makeNextTaskHtml(task) {
  return `
    <span>${t("goals.nextTaskLabel")}</span>
    <strong>${escapeHtml(task.title || t("data.taskFallback"))}</strong>
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
      <div class="goal-task-title">${escapeHtml(task.title || t("data.taskFallback"))}</div>
      <div class="goal-task-meta">${escapeHtml(formatDeadlineLong(task.deadline))}</div>
    </div>
    <div class="deadline-pill ${deadlineState.className}">${escapeHtml(deadlineState.text)}</div>
    <button class="primary goal-task-work" type="button">${t("goals.work")}</button>
  `;

  item.querySelector(".quest-check").onclick = () => toggleGoalTask(goal.id, task.id, { source: item });
  item.querySelector(".goal-task-work").onclick = () => openGoalWorkspace(goal.id, task.id);
  item.appendChild(makeActionMenu([
    {
      label: t("actions.edit"),
      onSelect: () => editGoalTask(goal.id, task.id)
    },
    {
      label: t("actions.delete"),
      danger: true,
      onSelect: () => deleteGoalTask(goal.id, task.id)
    }
  ], t("goals.menuTaskLabel", { name: task.title || t("habit.unnamed") })));

  return item;
}

function renderGoalTaskArchive(goal, list, options = {}) {
  const tasks = options.includeOpen ? getGoalArchiveWorkspaceTasks(goal) : getArchivedGoalTasks(goal);
  list.innerHTML = "";

  if (tasks.length === 0) {
    list.innerHTML = `<div class="empty goal-task-empty">${escapeHtml(options.emptyText || t("goals.completedTasksEmpty"))}</div>`;
    animateRenderedChildren(list);
    return;
  }

  tasks.forEach(task => {
    list.appendChild(makeGoalArchiveTaskItem(goal, task, options));
  });
  animateRenderedChildren(list);
}

function makeGoalArchiveTaskItem(goal, task, options = {}) {
  const item = document.createElement("div");
  const workspaceMeta = getTaskWorkspaceMeta(task);
  const statusText = task.done
    ? t("goals.taskClosedAt", { date: task.completedAt ? formatDeadlineLong(task.completedAt) : t("goals.noDate") })
    : t("goals.taskNotClosed");
  const statusClass = task.done ? "done" : "";

  item.className = "goal-archive-task-item" + (task.done ? " done" : "");
  item.innerHTML = `
    <button class="quest-check ${task.done ? "quest-check-done" : ""}" type="button">✓</button>
    <div class="goal-task-main">
      <div class="goal-task-title">${escapeHtml(task.title || t("data.taskFallback"))}</div>
      <div class="goal-task-meta">${escapeHtml(statusText)} · ${escapeHtml(t("goals.deadlineMeta", { date: formatDeadlineLong(task.deadline) }))}</div>
    </div>
    <div class="deadline-pill ${statusClass}">${task.done ? t("goals.taskInArchive") : t("goals.taskOpen")}</div>
    <div class="goal-task-workspace-meta">${escapeHtml(workspaceMeta)}</div>
    <button class="primary goal-task-work" type="button">${t("workspace.label")}</button>
  `;

  item.querySelector(".quest-check").onclick = () => toggleGoalTask(goal.id, task.id, { source: item });
  item.querySelector(".goal-task-work").onclick = () => openGoalWorkspace(goal.id, task.id);
  item.appendChild(makeActionMenu([
    {
      label: t("actions.edit"),
      onSelect: () => editGoalTask(goal.id, task.id)
    },
    {
      label: task.done ? t("actions.returnToWork") : t("actions.closeTask"),
      onSelect: () => toggleGoalTask(goal.id, task.id)
    },
    {
      label: t("actions.delete"),
      danger: true,
      onSelect: () => deleteGoalTask(goal.id, task.id)
    }
  ], t("goals.menuArchiveTaskLabel", { name: task.title || t("habit.unnamed") })));

  if (options.includeOpen && !task.done) {
    item.querySelector(".quest-check").setAttribute("aria-label", t("actions.closeTask"));
  }

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
    alert(t("goals.nameTaskRequired"));
    return;
  }

  if (!deadline) {
    alert(t("goals.deadlineRequired"));
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

  const title = prompt(t("goals.promptTask"), task.title || "");
  if (!title || !title.trim()) return;

  const deadline = prompt(t("goals.promptDeadline"), task.deadline || toDateInputValue(new Date()));
  if (!deadline || !/^\d{4}-\d{2}-\d{2}$/.test(deadline)) {
    alert(t("goals.deadlineInvalid"));
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

function toggleGoalTask(goalId, taskId, options = {}) {
  const task = findGoalTask(goalId, taskId);
  if (!task) return;

  const willComplete = !task.done;
  task.done = willComplete;
  task.completedAt = task.done ? toDateInputValue(new Date()) : "";
  markDirty();
  if (willComplete && options.source) {
    const check = options.source.querySelector(".quest-check");
    check?.classList.add("is-checking", "quest-check-done");
    animateCompletion(options.source, renderGoals);
  } else {
    renderGoals();
  }
}

function deleteGoalTask(goalId, taskId) {
  const goal = data.goals.find(item => item.id === goalId);
  if (!goal) return;
  const task = goal.tasks.find(item => item.id === taskId);
  if (!task) return;
  if (!confirm(t("goals.confirmDeleteTask", { title: task.title }))) return;
  goal.tasks = goal.tasks.filter(item => item.id !== taskId);
  hasManualGoalDateSelection = false;
  markDirty();
  renderGoals();
}

function deleteGoal(goal) {
  if (!confirm(t("goals.confirmDeleteGoal", { name: goal.name }))) return;
  data.goals = data.goals.filter(item => item.id !== goal.id);
  hasManualGoalDateSelection = false;
  markDirty();
  renderGoals();
}

function openGoalResultModal(goalId) {
  const goal = data.goals.find(item => item.id === goalId);
  if (!goal) return;

  resolvingGoalId = goal.id;
  isGoalResultModalOpen = true;
  syncGoalResultModalText();
  revealFloatingElement(goalResultModal);
  syncModalOpenState();
  goalResultCompletedBtn.focus();
}

function syncGoalResultModalText() {
  if (!isGoalResultModalOpen || !resolvingGoalId) return;

  const goal = data.goals.find(item => item.id === resolvingGoalId);
  if (!goal) return;

  const progress = getGoalProgress(goal);
  goalResultName.textContent = goal.name || t("data.goalFallback");
  goalResultMeta.textContent = t("goals.resultMeta", { done: progress.doneCount, total: progress.totalCount });
}

function closeGoalResultModal() {
  isGoalResultModalOpen = false;
  resolvingGoalId = null;
  hideFloatingElement(goalResultModal);
  syncModalOpenState();
}

function resolveGoalResult(status) {
  const goal = data.goals.find(item => item.id === resolvingGoalId);
  if (!goal) return;

  const isCompleted = status === "completed";
  const confirmed = confirm(t(isCompleted ? "goals.confirmResultCompleted" : "goals.confirmResultFailed", { name: goal.name }));

  if (!confirmed) {
    closeGoalResultModal();
    showGoalToast(t(isCompleted ? "goals.resultCancelledCompleted" : "goals.resultCancelledFailed"));
    return;
  }

  if (isCompleted) completeGoal(goal);
  else failGoal(goal);

  closeGoalResultModal();
  launchGoalConfetti(status);
  showGoalToast(t(isCompleted ? "goals.toastCompleted" : "goals.toastFailed"));
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
  if (prefersReducedMotion()) return;

  const colors = status === "completed"
    ? [getCssColor("--success"), getCssColor("--warning"), getCssColor("--text"), getCssColor("--card")]
    : [getCssColor("--danger"), getCssColor("--warning"), getCssColor("--text"), getCssColor("--card")];

  goalConfettiLayer.innerHTML = "";
  goalConfettiLayer.classList.add("active");

  for (let i = 0; i < 24; i++) {
    const piece = document.createElement("span");
    const size = 4 + Math.random() * 5;
    piece.style.left = `${Math.random() * 100}%`;
    piece.style.width = `${size}px`;
    piece.style.height = `${size * (0.45 + Math.random() * 0.9)}px`;
    piece.style.background = colors[i % colors.length];
    piece.style.animationDelay = `${Math.random() * 0.12}s`;
    piece.style.animationDuration = `${1.2 + Math.random() * 0.55}s`;
    piece.style.setProperty("--confetti-x", `${-38 + Math.random() * 76}px`);
    piece.style.setProperty("--confetti-rotation", `${120 + Math.random() * 360}deg`);
    goalConfettiLayer.appendChild(piece);
  }

  setTimeout(() => {
    goalConfettiLayer.classList.remove("active");
    goalConfettiLayer.innerHTML = "";
  }, 2100);
}

function openGoalWorkspace(goalId, taskId) {
  window.location.hash = `workspace=${encodeURIComponent(goalId)}:${encodeURIComponent(taskId)}`;
}

function renderGoalWorkspacePage() {
  if (activeView !== "workspace") return;
  const route = getWorkspaceRoute();

  if (!currentUser) {
    renderWorkspaceEmpty(t("workspace.signInEmpty"));
    return;
  }

  if (!route) {
    renderWorkspaceEmpty(t("workspace.noTaskSelected"));
    return;
  }

  workspaceGoalId = route.goalId;
  workspaceTaskId = route.taskId;
  const context = findGoalTaskContext(workspaceGoalId, workspaceTaskId);

  if (!context) {
    renderWorkspaceEmpty(t("workspace.taskMissing"));
    return;
  }

  const { goal, task } = context;
  const workspace = ensureTaskWorkspace(task);

  goalWorkspaceNotes.disabled = false;
  goalMiniGoalInput.disabled = false;
  goalMiniGoalAddBtn.disabled = false;
  goalWorkspaceGoalName.textContent = goal.name || t("data.goalFallback");
  goalWorkspaceTaskName.textContent = task.title || t("data.taskFallback");
  if (document.activeElement !== goalWorkspaceNotes) {
    goalWorkspaceNotes.value = workspace.notes || "";
    resizeWorkspaceNotesEditor();
  }
  renderWorkspaceMiniGoals(workspace);
}

function renderWorkspaceEmpty(message) {
  goalWorkspaceGoalName.textContent = t("workspace.label");
  goalWorkspaceTaskName.textContent = message;
  goalWorkspaceNotes.value = "";
  resizeWorkspaceNotesEditor();
  goalWorkspaceNotes.disabled = true;
  goalMiniGoalInput.disabled = true;
  goalMiniGoalAddBtn.disabled = true;
  goalMiniGoalList.innerHTML = `<div class="empty goal-mini-empty">${escapeHtml(message)}</div>`;
  animateRenderedChildren(goalMiniGoalList);
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
    goalMiniGoalList.innerHTML = `<div class="empty goal-mini-empty">${t("workspace.emptyMiniGoals")}</div>`;
    animateRenderedChildren(goalMiniGoalList);
    return;
  }

  workspace.miniGoals.forEach(miniGoal => {
    const item = document.createElement("div");
    item.className = "goal-mini-item" + (miniGoal.done ? " done" : "");
    item.innerHTML = `
      <button class="quest-check ${miniGoal.done ? "quest-check-done" : ""}" type="button">✓</button>
      <div class="goal-mini-title">${escapeHtml(miniGoal.title)}</div>
    `;

    item.querySelector(".quest-check").onclick = () => toggleWorkspaceMiniGoal(miniGoal.id, { source: item });
    item.appendChild(makeActionMenu([
      {
        label: t("actions.edit"),
        onSelect: () => editWorkspaceMiniGoal(miniGoal.id)
      },
      {
        label: t("actions.delete"),
        danger: true,
        onSelect: () => deleteWorkspaceMiniGoal(miniGoal.id)
      }
    ], t("workspace.menuMiniGoalLabel", { name: miniGoal.title || t("habit.unnamed") })));
    goalMiniGoalList.appendChild(item);
  });
  animateRenderedChildren(goalMiniGoalList);
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

function toggleWorkspaceMiniGoal(miniGoalId, options = {}) {
  const context = findGoalTaskContext(workspaceGoalId, workspaceTaskId);
  if (!context) return;

  const workspace = ensureTaskWorkspace(context.task);
  const miniGoal = workspace.miniGoals.find(item => item.id === miniGoalId);
  if (!miniGoal) return;

  const willComplete = !miniGoal.done;
  miniGoal.done = willComplete;
  miniGoal.completedAt = miniGoal.done ? toDateInputValue(new Date()) : "";
  markDirty();
  const rerender = () => {
    renderWorkspaceMiniGoals(workspace);
    renderGoals();
  };
  if (willComplete && options.source) {
    const check = options.source.querySelector(".quest-check");
    check?.classList.add("is-checking", "quest-check-done");
    animateCompletion(options.source, rerender);
  } else {
    rerender();
  }
}

function editWorkspaceMiniGoal(miniGoalId) {
  const context = findGoalTaskContext(workspaceGoalId, workspaceTaskId);
  if (!context) return;

  const workspace = ensureTaskWorkspace(context.task);
  const miniGoal = workspace.miniGoals.find(item => item.id === miniGoalId);
  if (!miniGoal) return;

  const title = prompt(t("workspace.promptMiniGoal"), miniGoal.title || "");
  if (!title || !title.trim()) return;

  miniGoal.title = title.trim();
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

function getArchivedGoalTasks(goal) {
  return [...(goal.tasks || [])]
    .filter(task => task.done)
    .sort(sortArchivedGoalTasks);
}

function getGoalArchiveWorkspaceTasks(goal) {
  return [...(goal.tasks || [])].sort((a, b) => {
    if (a.done !== b.done) return Number(b.done) - Number(a.done);
    return sortArchivedGoalTasks(a, b);
  });
}

function sortArchivedGoalTasks(a, b) {
  const aCompleted = a.completedAt || "";
  const bCompleted = b.completedAt || "";
  if (aCompleted !== bCompleted) return String(bCompleted).localeCompare(String(aCompleted));
  if (a.deadline !== b.deadline) return String(b.deadline || "").localeCompare(String(a.deadline || ""));
  return String(a.title || "").localeCompare(String(b.title || ""));
}

function getTaskWorkspaceMeta(task) {
  return t("workspace.label");
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
    strength: t("goals.typeStrength"),
    skill: t("goals.typeSkill"),
    project: t("goals.typeProject"),
    career: t("goals.typeCareer"),
    health: t("goals.typeHealth"),
    other: t("goals.typeOther")
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
    getWeekdayLabels().forEach(label => {
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
        <small>${day.toLocaleDateString(getDateLocale(), { weekday: "short" })}</small>
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
  animateRenderedChildren(goalsCalendarGrid, ".deadline-day");
}

function renderDeadlineFocus() {
  const items = getDeadlineItemsForDate(selectedGoalDate);
  selectedDeadlineTitle.textContent = selectedGoalDate
    ? formatDeadlineFocusTitle(selectedGoalDate)
    : t("goals.deadline");
  deadlineFocusMeta.textContent = items.length > 0
    ? t("deadlines.metaTasks", { countText: formatTaskCount(items.length) })
    : t("deadlines.noneMeta");

  const deadlineDates = getDeadlineDates();
  prevDeadlineBtn.disabled = deadlineDates.length === 0 || selectedGoalDate <= deadlineDates[0];
  nextDeadlineBtn.disabled = deadlineDates.length === 0 || selectedGoalDate >= deadlineDates[deadlineDates.length - 1];

  selectedDeadlineList.innerHTML = "";

  if (!currentUser) {
    selectedDeadlineList.innerHTML = `<div class="empty">${t("deadlines.signInEmpty")}</div>`;
    animateRenderedChildren(selectedDeadlineList);
    return;
  }

  if (items.length === 0) {
    selectedDeadlineList.innerHTML = `<div class="empty">${t("deadlines.noneForDay")}</div>`;
    animateRenderedChildren(selectedDeadlineList);
    return;
  }

  items.forEach(item => selectedDeadlineList.appendChild(makeDeadlineFocusItem(item)));
  animateRenderedChildren(selectedDeadlineList);
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

  el.querySelector(".quest-check").onclick = () => toggleGoalTask(item.goal.id, item.task.id, { source: el });
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
    return goalsVisibleDate.toLocaleDateString(getDateLocale(), {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric"
    });
  }

  if (goalsCalendarMode === "week") {
    const week = getWeekDaysFromStart(getWeekStart(goalsVisibleDate));
    return `${formatFullDate(week[0], getDateLocale())} — ${formatFullDate(week[6], getDateLocale())}`;
  }

  return goalsVisibleDate.toLocaleDateString(getDateLocale(), {
    month: "long",
    year: "numeric"
  });
}

function getTaskDeadlineState(task) {
  if (task.done) return { text: t("deadlines.done"), className: "done" };
  if (!task.deadline) return { text: t("deadlines.noDueDate"), className: "" };

  const todayKey = toDateInputValue(new Date());
  if (task.deadline < todayKey) return { text: t("deadlines.overdue"), className: "danger" };
  if (task.deadline === todayKey) return { text: t("deadlines.today"), className: "warning" };

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
  return formatShortDate(deadline, getDateLocale());
}

function formatDeadlineLong(deadline) {
  if (!deadline) return t("deadlines.noDeadline");
  return parseDateKey(deadline).toLocaleDateString(getDateLocale(), {
    day: "numeric",
    month: "long",
    year: "numeric"
  });
}

function formatDeadlineFocusTitle(deadline) {
  return parseDateKey(deadline).toLocaleDateString(getDateLocale(), {
    weekday: "long",
    day: "numeric",
    month: "long"
  });
}

function getWeekdayLabels() {
  return ["mon", "tue", "wed", "thu", "fri", "sat", "sun"].map(day => t(`calendar.weekday.${day}`));
}

function formatGoalMetric(value, unit = "") {
  if (value === "" || value === null || value === undefined) return "";
  const suffix = unit ? ` ${unit}` : "";
  return `${Number(value)}${suffix}`;
}

function renameHabit(habit) {
  const newName = prompt(t("habit.promptName"), habit.name);
  if (!newName || !newName.trim()) return;

  const newTarget = prompt(t("habit.promptTarget"), habit.target || "");
  const newUnit = prompt(t("habit.promptUnit"), habit.unit || "");

  habit.name = newName.trim();
  habit.target = newTarget === "" ? "" : Number(newTarget);
  habit.unit = newUnit || "";
  markDirty();
  render();
}

function deleteHabit(habit) {
  if (!confirm(t("habit.confirmDelete", { name: habit.name }))) return;
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
  const todayKey = toDateInputValue(new Date());
  return isDayCompleteForStreak(todayKey);
}

function calculateMotivationalHabitStreak(habitId) {
  return calculateLatestHabitStreak(habitId, toDateInputValue(new Date()));
}

function getMotivationalHabitStreakStartDate(habitId) {
  return getLatestHabitStreakStartDate(habitId, toDateInputValue(new Date()));
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
  return calculateLatestGlobalStreak(toDateInputValue(new Date()));
}

function calculateGlobalStreakAtDate(dateKey) {
  let streak = 0;
  const cursor = parseDateKey(dateKey);

  for (let i = 0; i < 3650; i++) {
    const key = toDateInputValue(cursor);
    if (isDayCompleteForStreak(key)) {
      streak += 1;
      cursor.setDate(cursor.getDate() - 1);
    } else {
      break;
    }
  }

  return streak;
}

function isDayCompleteForStreak(dateKey) {
  const totalHabits = countActiveHabitsForDate(dateKey);
  if (totalHabits === 0) return false;
  return countDoneRecordsForDate(dateKey) === totalHabits;
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

function calculateLatestHabitStreak(habitId, maxDateKey) {
  const endDateKey = getLatestHabitStreakEndDate(habitId, maxDateKey);
  return endDateKey ? calculateStreakAtDate(habitId, endDateKey) : 0;
}

function getLatestHabitStreakStartDate(habitId, maxDateKey) {
  const endDateKey = getLatestHabitStreakEndDate(habitId, maxDateKey);
  return endDateKey ? getHabitStreakStartDate(habitId, endDateKey) : "";
}

function getLatestHabitStreakEndDate(habitId, maxDateKey) {
  const dates = Object.keys(data.records)
    .filter(dateKey => dateKey <= maxDateKey && data.records[dateKey]?.[habitId]?.done)
    .sort();
  return dates[dates.length - 1] || "";
}

function calculateLatestGlobalStreak(maxDateKey) {
  const endDateKey = getLatestGlobalStreakEndDate(maxDateKey);
  return endDateKey ? calculateGlobalStreakAtDate(endDateKey) : 0;
}

function calculatePotentialGlobalStreakAtDate(dateKey) {
  if (countActiveHabitsForDate(dateKey) === 0) return 0;
  return calculateGlobalStreakAtDate(getPreviousDateKey(dateKey)) + 1;
}

function getLatestGlobalStreakRange(maxDateKey) {
  const end = getLatestGlobalStreakEndDate(maxDateKey);
  if (!end) return null;

  const start = getGlobalStreakStartDate(end);
  return start ? { start, end } : null;
}

function getLatestGlobalStreakEndDate(maxDateKey) {
  return Object.keys(data.records)
    .filter(dateKey => dateKey <= maxDateKey)
    .sort()
    .reverse()
    .find(dateKey => isDayCompleteForStreak(dateKey)) || "";
}

function getGlobalStreakStartDate(endDateKey) {
  const cursor = parseDateKey(endDateKey);
  let start = null;

  for (let i = 0; i < 3650; i++) {
    const key = toDateInputValue(cursor);
    if (isDayCompleteForStreak(key)) {
      start = key;
      cursor.setDate(cursor.getDate() - 1);
    } else {
      break;
    }
  }

  return start;
}

function isDateInStreakRange(dateKey, streakRange) {
  return Boolean(streakRange && dateKey >= streakRange.start && dateKey <= streakRange.end);
}

function calculateProjectedGlobalStreakAtDate(futureDateKey) {
  const todayKey = toDateInputValue(new Date());
  const todayStreak = calculateLatestGlobalStreak(todayKey);
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
