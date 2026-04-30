# Habitline Design System

This document keeps new blocks, screens, and states feeling like part of Habitline rather than one-off additions.

## Interface DNA

Habitline is a strict working board for daily discipline:

- thin 1px rules instead of decorative shadows;
- square surfaces with a `2px` radius;
- calm warm page background and white working surfaces;
- large serif typography for meaning, numbers, and object names;
- system sans-serif for controls, statuses, captions, and forms;
- green is a progress signal, not a decorative theme color;
- yellow, red, and blue are reserved for state: warning, danger, projection.

A new element should be useful and scannable first. Decoration is only added when it communicates state or improves structure.

## Source Of Truth

Main style file: `src/styles/main.css`.

The top of that file contains the design tokens. If a repeated color, spacing value, size, or behavior appears, add or reuse a token first, then apply it in components.

Do not add new hex colors in the middle of the CSS except for rare local effects such as chart or confetti rendering. Normal UI should use variables.

Before adding UI or changing the visual direction, read this document. If the design changes, update this file and apply the change across every affected screen and component.

## Internationalization

English is the primary UI language. The app also supports Russian, German, Spanish, and French.

All user-facing strings must live in `src/app/i18n.js`:

- static HTML uses `data-i18n`, `data-i18n-placeholder`, `data-i18n-aria-label`, or `data-i18n-title`;
- dynamic text in JavaScript uses `t("key")`;
- plural-sensitive counts use `tn("key", count)`;
- dates use `getDateLocale()` and helpers from `src/app/utils/dates.js`.

When adding or changing UI copy, add or update the same key in all supported locales in the same change. Avoid placing visible copy directly in `main.js` or `index.html` unless it is a symbol, user-created content, or a stable product name.

Design for longer translated text. Use `minmax(0, 1fr)`, `min-width: 0`, and `overflow-wrap: anywhere` where labels, buttons, or cards can grow.

## Color

Core surfaces:

- `--bg`: page background.
- `--card`: main working surface.
- `--card-2`: secondary surface inside cards.
- `--text`: main text and active controls.
- `--muted`: supporting text.
- `--line`: dividers and borders.
- `--accent-soft`: hover and neutral highlight.

States:

- `--success`: completed, progress, positive action.
- `--success-soft`: soft completed-state background.
- `--warning`: urgent, today, streak at risk.
- `--warning-soft`: soft warning background.
- `--danger`: delete, failed, overdue.
- `--info`: projection or future date.
- `--info-soft`: soft projection background.

Rule: color should not become the screen theme. The app stays black and white with warm surfaces; color appears only as a semantic marker.

## Typography

Fonts:

- UI: `var(--font-ui)` for body, buttons, forms, statuses, labels.
- Display: `var(--font-display)` for `h1`, `h2`, `h3`, habit and goal names, and large metrics.

Hierarchy:

- Brand `h1`: around `50px`, `42px` on mobile.
- Main section headings: `30-44px`.
- Card, task, and object names: `20-30px`.
- Large metrics: `28-46px`, always display type.
- Regular UI text: `13-15px`.
- Kicker and labels: `11-12px`, uppercase, letter-spacing `0.08-0.09em`.

Rule: if text is a working object, such as a habit, task, or goal name, it can use serif type. If text is a control or explanation, it should use sans-serif.

## Spacing

The base scale is already defined in CSS:

```css
--space-1: 4px;
--space-2: 6px;
--space-3: 8px;
--space-4: 10px;
--space-5: 12px;
--space-6: 14px;
--space-7: 16px;
--space-8: 18px;
--space-9: 20px;
--space-10: 22px;
--space-11: 24px;
--space-12: 28px;
--space-13: 30px;
--space-14: 34px;
--space-15: 38px;
```

Practical rules:

- large sections: `22-24px` gaps;
- inside a card: around `20px`;
- section headers separate from content with `16px` and a bottom rule;
- list items: `10-12px` gap and padding;
- compact control groups: `6-8px`;
- forms: `10px` gap, inputs with `10px 11px` padding;
- avoid random values such as `17px`, `23px`, or `31px`.

## Layout

Page:

- `.app`: max width `1120px`;
- desktop padding: `38px 34px`;
- mobile padding: `22px 16px`;
- `.layout`: column flex with `24px` gap.

Grids:

- main two-column areas: `1.2fr 0.8fr` or close;
- paired analytics cards: `1fr 1fr`;
- metrics: `repeat(3, 1fr)`;
- month and week calendars: `repeat(7, minmax(0, 1fr))`.

Breakpoints:

- up to `1040px`: goal workspace becomes one column;
- up to `960px`: main two-column grids become one column;
- up to `760px`: buttons, stats, calendars, and forms stack vertically.

## Components

### Section Card

Use for most standalone blocks.

```html
<section class="card">
  <div class="section-top">
    <div>
      <div class="section-kicker" data-i18n="example.context">Context</div>
      <h2 data-i18n="example.title">Title</h2>
    </div>
    <button class="secondary" type="button" data-i18n="example.action">Action</button>
  </div>

  <!-- content -->
</section>
```

Rules:

- `.card` always has border, background, padding, and radius;
- `.section-top` always separates the header with a rule;
- the action button sits on the right and drops under the heading on mobile.

### Buttons

The base button is neutral. Modifier classes carry meaning:

```html
<button type="button">Neutral</button>
<button class="primary" type="button">Primary</button>
<button class="success" type="button">Done</button>
<button class="danger" type="button">Delete</button>
```

Rules:

- `primary`: one main action in the local context;
- `success`: confirmation, completion, or today's progress;
- `danger`: deletion, failure, or irreversible action;
- buttons trigger actions and are not decorative chips.

### Action Menu

Use `.action-menu` for secondary actions on a working entity. The visible ellipsis button opens verbs such as edit and delete.

Rules:

- keep the most important primary action visible next to the menu;
- mark delete as a danger action;
- close the menu on outside click and `Escape`;
- repeated cards and rows should not bring back separate edit and delete buttons.

### Metrics

Metrics look like a table made of thin rules.

```html
<div class="goal-stats">
  <div class="goal-stat">
    <span>12</span>
    <span data-i18n="example.done">done</span>
  </div>
</div>
```

You may reuse `goal-stats/goal-stat`, `period-stats/period-stat`, and `today-summary/today-summary-item`, but do not mix visual languages inside one block.

### List Item

Working entities are rows with a check, content, and an action or value.

```html
<div class="quest-item">
  <button class="quest-check" type="button">✓</button>
  <div>
    <div class="quest-name">Name</div>
    <div class="quest-meta">Supporting line</div>
  </div>
  <input class="quest-value" type="number" min="0" />
</div>
```

Rules:

- the check on the left has fixed size;
- middle content uses `minmax(0, 1fr)`;
- value or action on the right is fixed and moves to a new row on mobile;
- completed state uses `--success-soft`.

### Pills And Statuses

Use a border, small type, and semantic state:

```html
<div class="deadline-pill warning">today</div>
<div class="deadline-pill danger">overdue</div>
<div class="deadline-pill done">done</div>
```

Rules:

- keep text short;
- choose color by meaning;
- do not use pills as large buttons.

### Forms

Forms should be dense but readable.

```html
<div class="habit-form">
  <input data-i18n-placeholder="habit.fieldName" placeholder="Name" />
  <input data-i18n-placeholder="habit.fieldUnit" placeholder="Unit" />
  <input type="number" min="0" data-i18n-placeholder="habit.fieldTarget" placeholder="Target" />
  <button class="primary" type="button" data-i18n="actions.add">Add</button>
</div>
```

Rules:

- desktop: grid with `minmax`;
- mobile: one column;
- placeholders describe example data, not instructions;
- validation and helper messages must be localized through `src/app/i18n.js`.
