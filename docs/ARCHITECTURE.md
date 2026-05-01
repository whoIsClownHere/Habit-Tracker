# Architecture

This project is currently a lightweight vanilla web app served as static files.

## File Layout

- `index.html` contains the document structure and loads the app assets.
- `src/styles/main.css` contains the visual system and responsive layout.
- `src/app/main.js` contains app startup, state management, high-level render flow, and UI event wiring.
- `src/app/config/constants.js` contains product-level constants, render limits, storage keys, and local QA account metadata.
- `src/app/data/normalizers.js` and `src/app/data/starterData.js` contain data-shape migration and starter content.
- `src/app/dom/elements.js` is the central DOM lookup registry.
- `src/app/features/habits/metrics.js` contains habit record helpers, streak calculations, totals, and projections.
- `src/app/i18n.js` contains the locale runtime; `src/app/locales/*.js` contains translation dictionaries.
- `src/app/services/firebase.js` initializes Firebase Auth and Firestore.
- `src/app/services/serviceWorker.js` registers production runtime caching.
- `src/app/services/userBackup.js` keeps a per-user local pending-save backup so unsynced edits can be restored and pushed to Firestore after reload or reconnect.
- `src/app/testing/seedData.js` contains local QA seed data.
- `src/app/ui/actionMenu.js`, `src/app/ui/progressChart.js`, and `src/app/ui/theme.js` contain reusable UI behavior.
- `scripts/qa-check.mjs` verifies that the locale dictionaries and UI key usage stay aligned.
- `src/app/config/firebaseConfig.js` contains the Firebase project configuration.
- `src/app/utils/dates.js` contains reusable date formatting and range helpers.
- `src/app/utils/html.js` contains HTML escaping helpers for safe DOM strings.
- `docs/DESIGN_SYSTEM.md` defines the design language, tokens, layout rules, and component templates for new UI.
- `docs/SCALING.md` defines the current 10K-user deployment baseline.
- `docs/TESTING.md` describes the local QA account, seed data, smoke scenarios, and QA command.
- `README.md` contains the user-facing project summary.
- `package.json` keeps local dev/build commands for future Vite migration.

## Visual System

The app style is intentionally strict and editorial: thin borders, square surfaces, Georgia display type for important objects and metrics, system sans-serif for controls, and restrained semantic color. The source of truth is the token block at the top of `src/styles/main.css`, with practical usage rules in `docs/DESIGN_SYSTEM.md`.

## Internationalization

English is the primary product language. Russian, German, Spanish, and French are supported through the same UI surface.

All user-facing copy belongs in `src/app/locales/*.js`:

- static HTML text uses `data-i18n`, `data-i18n-placeholder`, `data-i18n-aria-label`, or `data-i18n-title`;
- dynamic JavaScript text uses `t("key")`;
- counts and plural-sensitive labels use `tn("key", count)`;
- dates use `getDateLocale()` and the date helpers in `src/app/utils/dates.js`.

When adding a UI change, add translation keys for all supported locales in the same change. Do not hard-code visible English text in render functions unless it is user data, a symbol, or a stable product name.

## Testing Mode

The app has an isolated local-only QA account: `test@hendle.local` / `test1234`. It is hidden from the public UI, blocked outside local development hosts, and is not a Firebase account. The session and seeded data are stored in `localStorage`, so QA can exercise auth-like flows, persistence, habits, goals, workspaces, and localization without touching production user documents.

The QA panel appears only in test mode and provides seed-data reset controls plus smoke-scenario prompts.

## Current Data Model

The app keeps habit data in a single object:

```js
{
  habits: [],
  records: {}
}
```

When the user is signed in, the data is saved in Firestore at:

```text
users/{uid}/habitData/main
```

That document contains the full app state: habits, daily records, goals, goal tasks, task notes, and mini-goals. The client writes `clientUpdatedAt` next to Firebase's `updatedAt`; if a newer local pending-save backup exists after a reload, Hendle restores it and saves it back to Firestore.

## Next Refactor Targets

- Split goal rendering and goal workspace flows into feature modules.
- Move state transitions into an app-state module once goals are split.
- Move hard-coded Firebase config into an environment-based setup before adding private deployment workflows.
- Decide whether the project should stay vanilla or move fully into Vite/React.
