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
npm run deploy
```

**Deploy everything:**
```bash
firebase deploy
```

## Project Structure

- `src/` - Frontend React app
- `functions/` - Firebase Cloud Functions (Backend API)
- API endpoints: `/api/courses`, `/api/tasks`, `/api/users`, etc.
