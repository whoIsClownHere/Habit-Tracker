# Habit Tracker (Weekly)

A minimalist habit tracking web app with a clean editorial UI and Firebase backend.

Track habits on a **weekly grid**, mark completion with checkboxes, and log numeric progress (e.g., reps, pages, minutes). Data is stored securely per user via Google Authentication.

---

## Features

- Weekly habit tracking (7-day grid)
- Checkbox + numeric value per day
- Google Authentication (Firebase Auth)
- Cloud storage (Firestore)
- Automatic save
- Progress chart (Chart.js)
- Streak tracking
- Light / Dark mode
- JSON export backup

---

## Tech Stack

- Vanilla HTML / CSS / JS
- Firebase (Auth + Firestore)
- Chart.js
- GitHub Pages (hosting)

---

## Project Structure

```text
.
├── index.html
├── src
│   ├── app
│   │   ├── config
│   │   │   └── firebaseConfig.js
│   │   ├── utils
│   │   │   ├── dates.js
│   │   │   └── html.js
│   │   └── main.js
│   └── styles
│       └── main.css
├── docs
│   └── ARCHITECTURE.md
├── package.json
└── README.md
```

See `docs/ARCHITECTURE.md` for the current app layout and next refactor targets.

---

## Live Demo

https://whoisclownhere.github.io/Habit-Tracker/
