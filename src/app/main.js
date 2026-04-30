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
let activeActionMenu = null;
let authMode = "login";
let isAuthModalOpen = false;
let isAuthBusy = false;
let authStateToken = 0;

let data = {
  habits: [],
  records: {},
  goals: []
};

const signInBtn = document.getElementById("signInBtn");
const signOutBtn = document.getElementById("signOutBtn");
const languageSelect = document.getElementById("languageSelect");
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
const authResetBtn = document.getElementById("authResetBtn");
const authMessage = document.getElementById("authMessage");
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
let currentStatus = { key: "status.signedOut", mode: "off", params: {} };

initLocale();
languageSelect.value = getLocale();
signOutBtn.hidden = true;

habitsTabBtn.addEventListener("click", () => switchView("habits"));
goalsTabBtn.addEventListener("click", () => switchView("goals"));
signInBtn.addEventListener("click", () => openAuthModal("login"));
signOutBtn.addEventListener("click", handleSignOut);
languageSelect.addEventListener("change", () => {
  setLocale(languageSelect.value);
  refreshLocalizedUi();
});
authModalCloseBtn.addEventListener("click", closeAuthModal);
authLoginTabBtn.addEventListener("click", () => setAuthMode("login"));
authRegisterTabBtn.addEventListener("click", () => setAuthMode("register"));
authForm.addEventListener("submit", handleAuthSubmit);
authGoogleBtn.addEventListener("click", handleGoogleSignIn);
authResetBtn.addEventListener("click", handlePasswordReset);
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
authModal.addEventListener("click", (event) => {
  if (event.target === authModal) closeAuthModal();
});
goalModal.addEventListener("click", (event) => {
  if (event.target === goalModal) closeGoalModal();
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closeActionMenu();
  if (event.key === "Escape" && isAuthModalOpen) closeAuthModal();
  if (event.key === "Escape" && isCompletedModalOpen) closeCompletedModal();
  if (event.key === "Escape" && isGoalModalOpen) closeGoalModal();
  if (event.key === "Escape" && isGoalResultModalOpen) closeGoalResultModal();
});
document.addEventListener("click", () => closeActionMenu());
window.addEventListener("resize", () => closeActionMenu());
window.addEventListener("scroll", () => closeActionMenu(), true);
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
applyStaticTranslations();
initTheme();
refreshStatusText();
switchView(activeView, { updateHash: false });

window.addEventListener("hashchange", () => {
  switchView(getInitialView(), { updateHash: false });
});

handleRedirectResult();

onAuthStateChanged(auth, async (user) => {
  const token = ++authStateToken;
  clearPendingSave();
  currentUser = user;

  if (!user) {
    setAuthBusy(false);
    signInBtn.hidden = false;
    signOutBtn.hidden = true;
    signOutBtn.disabled = false;
    data = { habits: [], records: {}, goals: [] };
    isDirty = false;
    updateStatus("status.signedOut", "off");
    render();
    return;
  }

  signInBtn.hidden = true;
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
  return window.location.hash === "#goals" ? "goals" : "habits";
}

function switchView(view, options = {}) {
  closeActionMenu();
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
  const shouldOpen = panel.hidden;

  if (activeActionMenu && activeActionMenu !== menu) closeActionMenu(activeActionMenu);

  panel.hidden = !shouldOpen;
  menu.classList.toggle("open", shouldOpen);
  trigger.setAttribute("aria-expanded", String(shouldOpen));
  activeActionMenu = shouldOpen ? menu : null;
  if (shouldOpen) positionActionMenu(menu);
}

function closeActionMenu(menu = activeActionMenu) {
  if (!menu) return;

  const panel = menu.querySelector(".action-menu-panel");
  const trigger = menu.querySelector(".action-menu-trigger");
  if (panel) panel.hidden = true;
  if (trigger) trigger.setAttribute("aria-expanded", "false");
  menu.classList.remove("open");
  if (activeActionMenu === menu) activeActionMenu = null;
}

function syncModalOpenState() {
  document.body.classList.toggle(
    "modal-open",
    isAuthModalOpen || isCompletedModalOpen || isGoalModalOpen || isGoalResultModalOpen
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

function initTheme() {
  const savedTheme = localStorage.getItem("habitTheme") || "light";
  document.body.classList.toggle("dark", savedTheme === "dark");
  themeToggle.textContent = savedTheme === "dark" ? t("theme.light") : t("theme.dark");
}

function toggleTheme() {
  const isDark = document.body.classList.toggle("dark");
  localStorage.setItem("habitTheme", isDark ? "dark" : "light");
  themeToggle.textContent = isDark ? t("theme.light") : t("theme.dark");
  renderProgress();
}

function refreshLocalizedUi() {
  applyStaticTranslations();
  initTheme();
  refreshStatusText();
  setAuthMode(authMode, { clearMessage: false });
  syncGoalModalText();
  syncGoalResultModalText();
  render();
}

function openAuthModal(mode = authMode) {
  setAuthMode(mode);
  clearAuthMessage();
  isAuthModalOpen = true;
  authModal.hidden = false;
  syncModalOpenState();
  requestAnimationFrame(() => {
    const firstField = authMode === "register" ? authNameInput : authEmailInput;
    firstField.focus();
  });
}

function closeAuthModal() {
  isAuthModalOpen = false;
  authModal.hidden = true;
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
  handleGoogleRedirectResult();
}

async function handleSignOut() {
  closeAuthModal();
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
  authResetBtn.disabled = isBusy;
  authLoginTabBtn.disabled = isBusy;
  authRegisterTabBtn.disabled = isBusy;
  signInBtn.disabled = isBusy;
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

function createStarterData() {
  return {
    habits: [
      { id: crypto.randomUUID(), name: t("data.starter.pushups"), unit: t("data.starter.pushupsUnit"), target: 15, createdAt: toDateInputValue(new Date()) },
      { id: crypto.randomUUID(), name: t("data.starter.reading"), unit: t("data.starter.readingUnit"), target: 20, createdAt: toDateInputValue(new Date()) }
    ],
    records: {},
    goals: []
  };
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
  statusDot.className = "status-dot";
  if (currentStatus.mode === "ready") statusDot.classList.add("ready");
  if (currentStatus.mode === "dirty") statusDot.classList.add("dirty");
  if (currentStatus.mode === "error") statusDot.classList.add("error");
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
    return;
  }

  if (data.habits.length === 0) {
    renderTodaySummary(0, 0);
    completedTodayBtn.disabled = true;
    activeList.innerHTML = `<div class="empty">${t("empty.noHabits")}</div>`;
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
      ? t("empty.noActiveResults")
      : t("empty.allDoneToday");
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
  completedModal.hidden = false;
  syncModalOpenState();
  renderCompletedModal();
  completedSearchInput.focus();
}

function closeCompletedModal() {
  isCompletedModalOpen = false;
  completedModal.hidden = true;
  syncModalOpenState();
}

function renderCompletedModal() {
  completedModalList.innerHTML = "";
  const todayKey = toDateInputValue(new Date());

  if (!currentUser) {
    completedModalMeta.textContent = "";
    completedModalList.innerHTML = `<div class="empty">${t("completed.signInEmpty")}</div>`;
    return;
  }

  const completedItems = getCompletedTodayItems(todayKey);
  const visibleItems = completedItems.filter(({ habit }) => habitMatchesSearch(habit, completedSearchQuery));

  completedModalMeta.textContent = completedSearchQuery
    ? t("today.foundOf", { visible: visibleItems.length, total: completedItems.length })
    : formatCompletedHabitCount(completedItems.length);

  if (completedItems.length === 0) {
    completedModalList.innerHTML = `<div class="empty">${t("completed.noneToday")}</div>`;
    return;
  }

  if (visibleItems.length === 0) {
    completedModalList.innerHTML = `<div class="empty">${t("empty.noResults")}</div>`;
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
    name: habit?.name || record.habitName || t("habit.fallback"),
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
    return;
  }

  if (data.habits.length === 0) {
    habitManagerList.innerHTML = `<div class="empty habit-manager-empty">${t("empty.noHabitsToEdit")}</div>`;
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
    return;
  }

  if (!currentUser) {
    daySummaryList.innerHTML = `<div class="empty">${t("review.signInEmpty")}</div>`;
    return;
  }

  if (data.habits.length === 0) {
    daySummaryList.innerHTML = `<div class="empty">${t("review.noHabitsEmpty")}</div>`;
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
        <div class="day-summary-meta">${done ? t("review.done") : t("review.notDone")}${habit.target ? ` · ${t("review.target", { target: habit.target, unit: escapeHtml(habit.unit || "") })}` : ""}</div>
      </div>
      <div class="day-summary-value">${escapeHtml(valueText)}</div>
    `;

    daySummaryList.appendChild(item);
  });

  const summary = document.createElement("div");
  summary.className = "empty";
  summary.textContent = data.habits.length > visibleHabits.length
    ? t("review.totalShown", { done: completedCount, total: data.habits.length, shown: visibleHabits.length })
    : t("review.total", { done: completedCount, total: data.habits.length });
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
  const total = data.habits.length;
  const done = countDoneRecordsForDate(todayKey);
  const percent = total === 0 ? 0 : Math.round((done / total) * 100);
  const streak = calculateMotivationalGlobalStreak();

  heroStreak.textContent = streak;
  dailyRingFill.style.width = `${percent}%`;

  if (!currentUser) {
    streakMessage.textContent = t("streak.signIn");
  } else if (total === 0) {
    streakMessage.textContent = t("streak.addHabit");
  } else if (done === total) {
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
  const monthDays = getMonthDays(visibleMonthDate);
  document.getElementById("weekCalendarTitle").textContent = `${formatFullDate(weekDays[0], getDateLocale())} — ${formatFullDate(weekDays[6], getDateLocale())}`;
  document.getElementById("monthCalendarTitle").textContent = visibleMonthDate.toLocaleDateString(getDateLocale(), {
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
  goalModal.hidden = false;
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
  goalModal.hidden = true;
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
    return;
  }

  if (data.goals.length === 0) {
    goalsList.innerHTML = `<div class="empty">${t("goals.noneEmpty")}</div>`;
    return;
  }

  if (activeGoals.length === 0) {
    goalsList.innerHTML = `<div class="empty">${t("goals.noActiveEmpty")}</div>`;
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
    goalArchiveList.innerHTML = `<div class="empty">${t("goals.archiveSignInEmpty")}</div>`;
    return;
  }

  if (visibleGoals.length === 0) {
    const emptyText = goalArchiveMode === "completed"
      ? t("goals.archiveCompletedEmpty")
      : t("goals.archiveFailedEmpty");
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
  card.className = "goal-item";
  const progress = getGoalProgress(goal);
  const sortedTasks = getSortedGoalTasks(goal);
  const activeTasks = sortedTasks.filter(task => !task.done);
  const archivedTasks = getArchivedGoalTasks(goal);
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

    <div class="goal-next">
      ${canFinish ? t("goals.allTasksClosed") : nextTask ? makeNextTaskHtml(nextTask) : t("goals.noNextTask")}
    </div>

    <div class="goal-task-form">
      <input class="goal-task-title-input" placeholder="${t("goals.taskPlaceholder")}" />
      <input class="goal-task-deadline-input" type="date" />
      <button class="success add-goal-task-btn" type="button">${t("goals.addTask")}</button>
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
  `;

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
  renderGoalTaskArchive(goal, card.querySelector(".goal-task-archive-list"));

  return card;
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

  item.querySelector(".quest-check").onclick = () => toggleGoalTask(goal.id, task.id);
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
    return;
  }

  tasks.forEach(task => {
    list.appendChild(makeGoalArchiveTaskItem(goal, task, options));
  });
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

  item.querySelector(".quest-check").onclick = () => toggleGoalTask(goal.id, task.id);
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
  goalResultModal.hidden = false;
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
  goalResultModal.hidden = true;
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
    return;
  }

  workspace.miniGoals.forEach(miniGoal => {
    const item = document.createElement("div");
    item.className = "goal-mini-item" + (miniGoal.done ? " done" : "");
    item.innerHTML = `
      <button class="quest-check ${miniGoal.done ? "quest-check-done" : ""}" type="button">✓</button>
      <div class="goal-mini-title">${escapeHtml(miniGoal.title)}</div>
    `;

    item.querySelector(".quest-check").onclick = () => toggleWorkspaceMiniGoal(miniGoal.id);
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
  const workspace = task.workspace && typeof task.workspace === "object" ? task.workspace : {};
  const notes = typeof workspace.notes === "string" ? workspace.notes.trim() : "";
  const miniGoals = Array.isArray(workspace.miniGoals) ? workspace.miniGoals : [];
  const miniDone = miniGoals.filter(item => item.done).length;
  const parts = [];

  if (notes) parts.push(t("workspace.hasNotes"));
  if (miniGoals.length) parts.push(`${miniDone}/${miniGoals.length} ${tn("counts.miniGoal", miniGoals.length).replace(String(miniGoals.length), "").trim()}`);
  return parts.length ? parts.join(" · ") : t("workspace.emptyWorkspace");
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
    return;
  }

  if (items.length === 0) {
    selectedDeadlineList.innerHTML = `<div class="empty">${t("deadlines.noneForDay")}</div>`;
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
