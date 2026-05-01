import { t } from "../i18n.js";

let activeActionMenu = null;
let onMenuStateChange = () => {};

export function configureActionMenus({ onStateChange } = {}) {
  onMenuStateChange = typeof onStateChange === "function" ? onStateChange : () => {};
}

export function makeActionMenu(actions, label = t("actions.menu")) {
  const menu = document.createElement("div");
  menu.className = "action-menu";

  const trigger = document.createElement("button");
  trigger.className = "action-menu-trigger";
  trigger.type = "button";
  trigger.textContent = "...";
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

export function closeActionMenu(menu = activeActionMenu) {
  if (!menu) return;

  const panel = menu.querySelector(".action-menu-panel");
  const trigger = menu.querySelector(".action-menu-trigger");
  if (panel) panel.hidden = true;
  if (trigger) trigger.setAttribute("aria-expanded", "false");
  menu.classList.remove("open");
  if (activeActionMenu === menu) activeActionMenu = null;
  onMenuStateChange();
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
  onMenuStateChange();
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
