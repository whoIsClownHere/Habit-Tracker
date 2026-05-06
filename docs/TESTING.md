# Habitline Testing

Habitline includes an isolated local QA account for repeatable manual testing without touching Firebase user data.

## Test Account

On a local development host, click `Sign in / register`, then `Use test account`.

The account is local to the browser. Its session is stored under `habitline.testSession`; its data is stored under `habitline.testData`.

## Seed Data

The QA account loads a realistic dataset:

- eight daily habits, enough to exercise pagination and completed/open states;
- past, current, and incomplete records for streak, day review, chart, and projection checks;
- active, completed, and failed goals;
- deadline calendar items for today, tomorrow, and next week;
- task workspace notes and mini-goals.

Use the QA panel at the top of the app to reload seed data or reset the local test data.

## Manual Smoke Scenarios

1. Auth and session
   Open the auth modal, use the test account, reload the page, sign out, and sign back in.

2. Daily habits
   Complete a habit, edit its numeric value, search active habits, open `Completed today`, and return a completed habit to active.

3. History and charts
   Select past and future dates in the day review, confirm streak messaging, inspect projections, and switch the selected progress habit.

4. Goals and deadlines
   Switch month/week/day calendar modes, add a task with a deadline, complete a task, and inspect completed/failed archives.

5. Workspace
   Open a task workspace, add a mini-goal, edit notes, mark a mini-goal done, then return to goals.

6. Localization
   Switch English, Russian, German, Spanish, and French. Verify the same screens remain usable and labels fit.

## Automated QA Check

Run:

```bash
npm run qa
```

This checks that all locale dictionaries have matching keys and that every `data-i18n`, `t()`, and `tn()` key used by the UI exists.
