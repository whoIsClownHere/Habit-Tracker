# Hendle Five Layers Design System

This file is the source of truth for Hendle UI decisions. It translates the
`Five Layers Palette.html` reference into app rules, tokens, and component
patterns that future work should reuse.

## Interface DNA

Hendle is a strict habit and goal workspace built from five warm tonal layers.
The product should feel editorial, precise, and useful:

- five warm neutral layers form the visual spine;
- page background is paper, cards are true white, inset panels are warm paper;
- 1px hairline rules define structure instead of decorative shadows;
- surfaces stay square, with `3px` as the default radius;
- display text uses Fraunces, working UI uses DM Sans, technical counters can use JetBrains Mono;
- amber is the single bright brand moment;
- green is progress only: completed habits, finished goals, growing streaks;
- warning, danger, and info are semantic states, not decorative themes;
- no grey palettes, broad gradients, purple/blue decorative washes, or card-inside-card layouts.

## Source Files

- Main styles: `src/styles/main.css`
- App structure: `index.html`
- User-facing copy: `src/app/i18n.js`
- This design contract: `docs/DESIGN_SYSTEM.md`

When changing visual direction, update this document and apply the change across
the full app. Do not add local one-off colors in the middle of CSS.

## Light Tokens

Use these variables through the existing aliases. Normal UI should use the
aliases (`--bg`, `--card`, `--text`, `--success`, etc.) unless a component needs
a specific ramp step.

```css
--paper: #faf6ee;
--paper-warm: #f5ede0;
--surface: #ffffff;
--line: #eee5d6;

--layer-1: #d4c9b8; /* sand: borders, disabled, faint dividers */
--layer-2: #a89b85; /* stone: tertiary text, subtle marks */
--layer-3: #7c6f59; /* bark: muted/body support text */
--layer-4: #3f3a32; /* cocoa: strong text, dark fills */
--layer-5: #1c1712; /* ink: primary text, brand mark, primary CTA */
--subtle-tan: #b5a48e;

--bg: var(--paper);
--card: var(--surface);
--card-2: var(--paper-warm);
--text: var(--layer-5);
--muted: var(--layer-3);
--accent: var(--layer-5);
--accent-soft: var(--paper-warm);
```

## Accent And States

Amber is rare. Use it for the logo dot, today/focus highlights, and small pins.
Do not use amber as a page-wide theme.

```css
--amber-50: #fef9ec;
--amber-100: #fdecc4;
--amber-300: #fcd163;
--amber-500: #f59e0b;
--amber-600: #c97f08;
--amber-700: #8a560b;
```

Green is progress only.

```css
--green-50: #eef3e6;
--green-100: #d8e5c5;
--green-300: #8fae6e;
--green-500: #5a8042;
--green-600: #3f5e2c;
--green-700: #28411b;
--success: var(--green-500);
--success-soft: #e6efd8;
```

Semantic states:

```css
--warning: #b86e10;
--warning-soft: #fbe9c8;
--danger: #9f2a2a;
--danger-soft: #f4dcd6;
--info: #2956a8;
--info-soft: #dde6f4;
```

## Dark Tokens

Dark mode keeps the Five Layers structure, but intentionally sits closer to the
older Hendle dark palette: near-black page, charcoal cards, neutral warm lines,
cream text, and brighter legacy success/warning/danger states.

```css
--paper: #111111;
--surface: #171717;
--paper-warm: #202020;
--line: #383838;

--layer-1: #5f5748;
--layer-2: #8b806d;
--layer-3: #aaa39a;
--layer-4: #cfc2aa;
--layer-5: #f5f1e8;

--amber-500: #f59b12;
--success: #7ccf8a;
--success-soft: rgba(124, 207, 138, 0.12);
--warning: #ffc46b;
--warning-soft: rgba(255, 196, 107, 0.11);
--danger: #ff8a8a;
--danger-soft: rgba(255, 138, 138, 0.12);
--info: #aaa39a;
--info-soft: rgba(170, 163, 154, 0.12);
```

## Typography

- UI font: `var(--font-ui)` / DM Sans for body, forms, buttons, labels, statuses.
- Display font: `var(--font-display)` / Fraunces for `h1`, `h2`, `h3`, habit names, goal names, and large metrics.
- Mono font: `var(--font-mono)` / JetBrains Mono only for compact technical counters or token/code displays.
- Use `letter-spacing: 0` for display text in this app.
- Labels and kickers use uppercase with positive tracking: `0.08em` for normal labels, `0.22em` for section kickers.
- Design for translated strings with `minmax(0, 1fr)`, `min-width: 0`, and `overflow-wrap: anywhere`.

## Layout

- `.app` max width: `1120px`.
- Desktop padding: `38px 34px`; mobile padding: `22px 16px`.
- Main layout gap: `24px`.
- Main two-column areas use approximately `1.2fr 0.8fr`.
- Analytics pairs use `1fr 1fr`.
- Metrics use table-like grids with top/left borders and 1px internal rules.
- At `960px`, primary grids collapse to one column.
- At `760px`, controls, stats, calendars, and form grids stack.

## Components

### Header

The primary app sections live in the header navigation, not in a separate tab
bar below it. The header uses a framed logo mark and brand wordmark on the left,
plain text navigation in the center, and square authentication/settings controls
on the right. The theme toggle is a standalone square control immediately after
the section links; the account dropdown is reserved for language selection.

### Cards

Use `.card` for standalone work surfaces. It always has `--card`, a 1px
`--line` border, `3px` radius, and no shadow. Header rows use `.section-top`
with a bottom rule.

### Buttons

- Neutral/secondary buttons stay on `--card` with `--line`.
- Primary buttons use `--text` on `--bg`.
- Success buttons are filled green and only mean completion/progress.
- Danger buttons use `--danger-soft` by default and fill red on hover.
- Today/focus actions use amber, not green.

### Logo

The mark has five bars, not six. From top to bottom in light mode:

1. `--layer-5`
2. `--layer-4`
3. `--layer-3`
4. `--layer-2`
5. `--layer-1`

The dot is `--amber-500`. In dark mode, the same CSS variables invert through
the dark token set.

### Working Rows

Rows for habits, workouts, goals, and mini-goals should follow:

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

- check controls are fixed-size square buttons;
- the content column uses `minmax(0, 1fr)`;
- completed state uses `--success-soft`;
- open rows stay neutral;
- right-side values/actions move to a new row on mobile.

### Calendars And Dates

- Completed days use green.
- Today uses amber.
- Future/projection uses info blue.
- Overdue/missed uses danger.
- Generic active deadline chips use warning, not green.

### Pills And Status

Use a 1px border, small type, and semantic state. Keep text short.

```html
<div class="deadline-pill warning">today</div>
<div class="deadline-pill danger">overdue</div>
<div class="deadline-pill done">done</div>
<div class="deadline-pill info">projected</div>
```

## Internationalization

English is the primary UI language. The app also supports Russian, German,
Spanish, and French.

All user-facing strings must live in `src/app/i18n.js`:

- static HTML uses `data-i18n`, `data-i18n-placeholder`,
  `data-i18n-aria-label`, or `data-i18n-title`;
- dynamic text in JavaScript uses `t("key")`;
- plural-sensitive counts use `tn("key", count)`;
- dates use `getDateLocale()` and helpers from `src/app/utils/dates.js`.

When adding or changing UI copy, update all supported locales in the same
change.

## Implementation Checklist

Before shipping a visual change:

- reuse existing tokens before adding any variable;
- search for new hex colors and keep them in the token block only;
- verify light and dark themes;
- check desktop and mobile widths;
- check that long translated labels wrap cleanly;
- run the project QA/build command when available.
