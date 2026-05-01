# Hendle Scaling Notes

Hendle is a static frontend backed by Firebase Auth and per-user Firestore documents. That shape can serve 10K users if the static assets are CDN-cached and Firestore traffic remains per-user instead of funneled through shared hot documents.

## Current 10K-User Baseline

- Static app shell served from CDN hosting.
- Runtime service worker caches same-origin JS/CSS/images plus Firebase CDN modules and Chart.js after first load.
- Firebase Hosting headers cache immutable build assets for one year and keep `index.html` plus `sw.js` fresh.
- Each user reads and writes only `users/{uid}/habitData/main`, avoiding shared write contention.
- Autosave is debounced in the client, so rapid UI changes collapse into fewer Firestore writes.
- Dirty signed-in data is also mirrored to a per-user local pending-save backup and flushed on `pagehide`/hidden-tab transitions; if the browser closes before Firestore confirms, the backup is restored and pushed to Firebase on the next load.
- Large per-user lists are capped in UI render paths for today, day review, habit manager, projection, and progress selectors.

## Production Requirements

- Deploy built assets from `dist` behind Firebase Hosting or another CDN.
- Keep Firestore rules owner-scoped:

```js
match /users/{userId}/habitData/{documentId} {
  allow read, write: if request.auth != null && request.auth.uid == userId;
}
```

- Monitor Firestore document size; a single user document must stay below Firestore's document limit. If power users approach that, split records by month under a subcollection.
- Enable billing and set Firebase budget alerts before launch.
- Load test the production hosting URL with realistic static-asset cache behavior, not only a cold-cache local dev server.
