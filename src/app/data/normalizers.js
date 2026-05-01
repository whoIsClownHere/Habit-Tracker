import { t } from "../i18n.js";
import { toDateInputValue } from "../utils/dates.js";

export function normalizeData(input) {
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

export function normalizeTaskWorkspace(workspace = {}) {
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

function formatGoalMetric(value, unit = "") {
  if (value === "" || value === null || value === undefined) return "";
  const suffix = unit ? ` ${unit}` : "";
  return `${Number(value)}${suffix}`;
}
