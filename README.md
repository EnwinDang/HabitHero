# HabitHero

React + Vite + Firebase application for managing courses, modules, and student progress.

## Setup

1. **Install dependencies**
```bash
npm install
   cd functions && npm install && cd ..
   ```

2. **Create `.env.local` in root**
   ```env
   VITE_FIREBASE_API_KEY=your_api_key
   VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
   VITE_FIREBASE_PROJECT_ID=habithero-73d98
   VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
   VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   VITE_FIREBASE_APP_ID=your_app_id
   ```

3. **Login to Firebase**
   ```bash
   firebase login
   firebase use habithero-73d98
   ```

## Development

```bash
npm run dev
```

Open http://localhost:5173

## Build

```bash
npm run build
```

## Deploy

**Deploy functions:**
```bash
cd functions
## Setup

- Node 20 for Cloud Functions (check with `node -v`)
- Firebase CLI installed and logged in (`npm i -g firebase-tools`)
- Create `.env.local` in root with your Firebase config

1) Install dependencies (root + functions)
```bash
npm install
cd functions && npm install && cd ..
```

2) Env vars (`.env.local` in project root)
```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
VITE_FIREBASE_PROJECT_ID=habithero-73d98
VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

3) Firebase CLI
```bash
firebase login
firebase use habithero-73d98
```

## Run Backend (Cloud Functions) + App

HabitHero uses a Vite proxy to talk to the local Functions emulator under `/api`. Run these in two terminals:

Terminal 1 — Functions (with Firestore emulator):
```bash
cd functions
npm run build
firebase emulators:start --only functions,firestore
```

Terminal 2 — Vite frontend:
```bash
npm run dev
```

- Frontend: http://localhost:5173
- API proxy: `/api/*` → `http://127.0.0.1:5001/habithero-73d98/us-central1`

Notes:
- You can also use `npm run serve` inside `functions/` to start only the Functions emulator.
- Vite proxy is configured in `vite.config.ts` and logs outgoing `/api` requests.
- Stop both with `Ctrl + C` in their terminals.

### Quick Start (Windows)
- Terminal 1:
   - `cd functions`
   - `npm run build`
   - `firebase emulators:start --only functions,firestore`
- Terminal 2:
   - `npm run dev`

### Common Requirements
- Use Node 20 for Functions (the emulator enforces it via `engines.node`).
- Keep `.env.local` values aligned with your Firebase project.

## App Behavior (key flows)

- Registration: if the Firestore user doc doesn’t exist yet, the app calls `/auth/me` to create a default user profile, then redirects students to `/student` and teachers/admins to `/teacher`.
- Courses: clicking an enrolled course opens its tasks at `/student/courses-tasks/:courseId`.
- Enroll by code: adding a course via code writes the student into `courses/{courseId}/students/{uid}` and toggles `students.{uid}: true` on the course doc.

## Deploy

To deploy Functions only:
```bash
cd functions
npm run deploy
```

To deploy everything (requires hosting configuration if used):
```bash
firebase deploy
```
