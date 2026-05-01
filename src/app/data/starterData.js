import { t } from "../i18n.js";
import { toDateInputValue } from "../utils/dates.js";

export function createStarterData() {
  return {
    habits: [
      { id: crypto.randomUUID(), name: t("data.starter.pushups"), unit: t("data.starter.pushupsUnit"), target: 15, createdAt: toDateInputValue(new Date()) },
      { id: crypto.randomUUID(), name: t("data.starter.reading"), unit: t("data.starter.readingUnit"), target: 20, createdAt: toDateInputValue(new Date()) }
    ],
    records: {},
    goals: []
  };
}
