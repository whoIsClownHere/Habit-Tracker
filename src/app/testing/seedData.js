import { parseDateKey, toDateInputValue } from "../utils/dates.js";

export function createTestingData() {
  const today = toDateInputValue(new Date());
  const yesterday = shiftDateKey(today, -1);
  const twoDaysAgo = shiftDateKey(today, -2);
  const threeDaysAgo = shiftDateKey(today, -3);
  const tomorrow = shiftDateKey(today, 1);
  const nextWeek = shiftDateKey(today, 7);
  const lastWeek = shiftDateKey(today, -7);

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
                { id: "qa-mini-auth-2", title: "Enter local QA credentials", done: false, completedAt: "" }
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
    ]
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

function shiftDateKey(dateKey, days) {
  const date = parseDateKey(dateKey);
  date.setDate(date.getDate() + days);
  return toDateInputValue(date);
}
