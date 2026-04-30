# Architecture

This project is currently a lightweight vanilla web app served as static files.

## File Layout

- `index.html` contains the document structure and loads the app assets.
- `src/styles/main.css` contains the visual system and responsive layout.
- `src/app/main.js` contains app startup, state management, rendering, and UI events.
- `src/app/config/firebaseConfig.js` contains the Firebase project configuration.
- `src/app/utils/dates.js` contains reusable date formatting and range helpers.
- `src/app/utils/html.js` contains HTML escaping helpers for safe DOM strings.
- `README.md` contains the user-facing project summary.
- `package.json` keeps local dev/build commands for future Vite migration.

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

## Next Refactor Targets

- Split `src/app/main.js` further into modules for state, streaks, charts, and rendering.
- Move hard-coded Firebase config into an environment-based setup before adding private deployment workflows.
- Add a small testable core for streak and progress calculations.
- Decide whether the project should stay vanilla or move fully into Vite/React.
