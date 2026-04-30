# Habitline

Habitline is a clean, responsive habit and goal tracker for daily consistency work. The app helps you plan today's habits, record numeric progress, review weekly and monthly completion, and break long-term goals into measurable milestones.

Live demo: https://whoisclownhere.github.io/Habit-Tracker/

## What It Does

- Tracks daily habits with completion status and optional numeric values.
- Shows today's open and completed habits in separate, searchable lists.
- Calculates current streaks and daily completion progress.
- Provides weekly and monthly summaries with completion rate and perfect days.
- Lets you inspect any past day in a read-only daily review.
- Projects future progress based on habit targets.
- Draws a progress chart for each habit with Chart.js.
- Supports long-term goals from point A to point B.
- Splits goals into milestones with evidence, metric values, deadlines, and completion status.
- Saves user data in Firebase Firestore after Google sign-in.
- Supports light and dark themes.

## Tech Stack

- HTML, CSS, and vanilla JavaScript
- Firebase Authentication with Google provider
- Firebase Firestore for per-user cloud storage
- Chart.js for progress visualization
- Vite scripts for local development and production builds
- GitHub Pages for static hosting

The current app is intentionally lightweight and does not require a frontend framework at runtime. `package.json` contains Vite-based scripts for local development and future migration work.

## Project Structure

```text
.
├── index.html
├── package.json
├── README.md
├── docs
│   └── ARCHITECTURE.md
└── src
    ├── app
    │   ├── config
    │   │   └── firebaseConfig.js
    │   ├── utils
    │   │   ├── dates.js
    │   │   └── html.js
    │   └── main.js
    └── styles
        └── main.css
```

## Getting Started

### Prerequisites

- Node.js 18 or newer
- npm
- A Firebase project with Authentication and Firestore enabled

### Install Dependencies

```bash
npm install
```

### Run Locally

```bash
npm run dev
```

Vite will print a local URL, usually:

```text
http://localhost:5173/
```

### Build for Production

```bash
npm run build
```

### Preview Production Build

```bash
npm run preview
```

## Firebase Setup

The app expects Firebase configuration in:

```text
src/app/config/firebaseConfig.js
```

The exported object is used by `src/app/main.js` to initialize Firebase Auth and Firestore.

Required Firebase services:

- Authentication: enable Google as a sign-in provider.
- Firestore Database: create a database for user data.
- Authorized domains: add the local development domain and the production GitHub Pages domain in Firebase Authentication settings.

User data is stored at:

```text
users/{uid}/habitData/main
```

The document contains:

```js
{
  data: {
    habits: [],
    records: {},
    goals: []
  },
  updatedAt,
  ownerUid,
  ownerEmail
}
```

## Firestore Rules Example

Use rules that restrict each document to its authenticated owner. Adapt this example to your Firebase project before production use:

```js
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/habitData/{documentId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

## Main Screens

### Habits

The habits view is focused on daily execution:

- today's tasks
- completed-today modal
- habit creation and inline editing
- streak status
- week and month summaries
- day review
- progress chart

### Goals

The goals view is for longer routes:

- goal type
- current point A
- desired point B
- optional numeric metric
- milestone list
- milestone deadlines
- active, urgent, and completed goal state

## Data Model

Habit records are grouped by date key:

```js
records: {
  "2026-04-30": {
    "habit-id": {
      done: true,
      value: "20",
      habitName: "Reading",
      habitUnit: "pages",
      habitTarget: 20
    }
  }
}
```

Goals contain their own milestone list:

```js
{
  id: "goal-id",
  name: "Write a research paper",
  type: "project",
  pointA: "Outline exists",
  pointB: "Submitted paper",
  metricName: "Pages",
  unit: "pages",
  currentMetric: 3,
  targetMetric: 30,
  milestones: []
}
```

## Development Notes

- `src/app/main.js` currently contains app startup, state management, rendering, event handling, Firebase calls, streak calculations, and chart rendering.
- `src/app/utils/dates.js` contains reusable date helpers for local date keys, weeks, months, and ranges.
- `src/app/utils/html.js` contains escaping helpers for safe HTML string rendering.
- `docs/ARCHITECTURE.md` describes the current architecture and likely refactor targets.

## Roadmap Ideas

- Split `main.js` into smaller modules for state, rendering, charts, goals, and Firebase persistence.
- Move Firebase config to an environment-based setup for safer deployment workflows.
- Add tests for streak, projection, and progress calculations.
- Add import/export for local backups.
- Decide whether to keep the app vanilla or migrate fully to a framework-based Vite app.

## License

No license has been added yet. Add one before distributing or accepting external contributions.
