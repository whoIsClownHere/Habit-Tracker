# Architecture

This project is currently a lightweight vanilla web app served as static files.

## File Layout

- `index.html` contains the document structure and loads the app assets.
- `src/styles/main.css` contains the visual system and responsive layout.
- `src/app/main.js` contains app startup, state management, rendering, and UI events.
- `src/app/i18n.js` contains the supported locale list, translation dictionaries, pluralization helpers, and static DOM translation helper.
- `scripts/qa-check.mjs` verifies that the locale dictionaries and UI key usage stay aligned.
- `src/app/config/firebaseConfig.js` contains the Firebase project configuration.
- `src/app/utils/dates.js` contains reusable date formatting and range helpers.
- `src/app/utils/html.js` contains HTML escaping helpers for safe DOM strings.
- `docs/DESIGN_SYSTEM.md` defines the design language, tokens, layout rules, and component templates for new UI.
- `docs/TESTING.md` describes the local QA account, seed data, smoke scenarios, and QA command.
- `README.md` contains the user-facing project summary.
- `package.json` keeps local dev/build commands for future Vite migration.

## Visual System

The app style is intentionally strict and editorial: thin borders, square surfaces, Georgia display type for important objects and metrics, system sans-serif for controls, and restrained semantic color. The source of truth is the token block at the top of `src/styles/main.css`, with practical usage rules in `docs/DESIGN_SYSTEM.md`.

## Internationalization

English is the primary product language. Russian, German, Spanish, and French are supported through the same UI surface.

All user-facing copy belongs in `src/app/i18n.js`:

- static HTML text uses `data-i18n`, `data-i18n-placeholder`, `data-i18n-aria-label`, or `data-i18n-title`;
- dynamic JavaScript text uses `t("key")`;
- counts and plural-sensitive labels use `tn("key", count)`;
- dates use `getDateLocale()` and the date helpers in `src/app/utils/dates.js`.

When adding a UI change, add translation keys for all supported locales in the same change. Do not hard-code visible English text in render functions unless it is user data, a symbol, or a stable product name.

## Testing Mode

The app has an isolated local-only QA account. It is not a Firebase account, and it is available only on local development hosts after QA access is enabled with `?qa=1`. The session and seeded data are stored in `localStorage`, so QA can exercise auth-like flows, persistence, habits, goals, workspaces, and localization without touching production user documents.

The QA panel appears only in test mode and provides seed-data reset controls plus smoke-scenario prompts.

## Current Data Model

The app keeps habit data in a single object:

```js
{
  habits: [],
  records: {},
  goals: [],
  plannerBlocks: [],
  recurringRules: []
}
```

`plannerBlocks` are dated one-off schedule blocks. `recurringRules` generate virtual planner blocks for matching weekdays; when a generated block is completed, skipped, or moved, the app creates a real `plannerBlocks` instance for that date and leaves the rule unchanged.

When the user is signed in, the data is saved in Firestore at:

```text
users/{uid}/habitData/main
```

## Next Refactor Targets

- Split `src/app/main.js` further into modules for state, streaks, charts, and rendering.
- Move hard-coded Firebase config into an environment-based setup before adding private deployment workflows.
- Add a small testable core for streak and progress calculations.
- Decide whether the project should stay vanilla or move fully into Vite/React.
