# Focus Timer (Pomodoro) System Documentation

## Table of Contents
1. [Overview](#overview)
2. [Architecture](#architecture)
3. [State Management](#state-management)
4. [Timer Mechanics](#timer-mechanics)
5. [XP and Rewards System](#xp-and-rewards-system)
6. [Streak System](#streak-system)
7. [Achievement System](#achievement-system)
8. [Data Persistence](#data-persistence)
9. [Backend Integration](#backend-integration)
10. [UI Components](#ui-components)
11. [Complete Flow Diagrams](#complete-flow-diagrams)
12. [Edge Cases and Error Handling](#edge-cases-and-error-handling)

---

## Overview

The Focus Timer system implements the Pomodoro Technique, a time management method that uses a timer to break work into intervals (typically 25 minutes) separated by short breaks. The system tracks user progress, awards XP, maintains streaks, and updates achievements in real-time.

### Key Features
- **Customizable Timer**: Focus duration (1-180 minutes) and break duration (1-60 minutes)
- **Real-time XP Rewards**: +5 XP per minute of focused time
- **Streak Tracking**: Daily focus streaks with automatic reset logic
- **Achievement Integration**: Automatic progress updates for focus-related achievements
- **Persistence**: Timer state survives page refreshes and browser restarts
- **Daily Reset**: Automatic reset of daily statistics at midnight

---

## Architecture

### Component Hierarchy

```
App
└── PomodoroProvider (Context Provider)
    ├── FocusModePage (UI)
    └── Other pages that use Pomodoro context
```

### Key Files

- **`src/context/PomodoroProvider.tsx`**: Main timer logic and state management
- **`src/context/pomodoro.ts`**: Context definition and settings management
- **`src/pages/student/FocusModePage.tsx`**: UI component for the timer
- **`src/components/XPToast.tsx`**: XP gain notification component
- **`src/components/LevelUpAnimation.tsx`**: Level-up celebration animation
- **`src/services/achievement.service.ts`**: Achievement update logic
- **`functions/src/index.ts`**: Backend API endpoint for session completion

---

## State Management

### Local State (React)

The `PomodoroProvider` manages the following state variables:

```typescript
// Timer Settings
settings: {
  focusDuration: number;    // 1-180 minutes (default: 25)
  breakDuration: number;    // 1-60 minutes (default: 5)
}

// Timer State
status: "idle" | "running" | "paused";
timeLeftSeconds: number;    // Remaining time in seconds
phase: "focus" | "break";   // Current phase

// Statistics
sessionsCompleted: number;  // Sessions completed today (local)
totalFocusSeconds: number;  // Total seconds focused in current session

// UI Feedback
xpGained: number | null;    // XP gained in last minute (for toast)
levelUpReward: {            // Level-up notification data
  oldLevel: number;
  newLevel: number;
  reward?: any;
} | null;

// Internal Refs
currentSessionIdRef: string | null;        // Prevents duplicate session counts
focusCompletedInSessionRef: boolean;       // Prevents duplicate completion handlers
```

### Database State (Firestore)

The following fields are stored in `users/{uid}`:

```typescript
{
  stats: {
    streak: number;                    // Current daily focus streak
    maxStreak: number;                 // Best streak ever achieved
    focusSessionsCompleted: number;    // Total lifetime focus sessions
    lastFocusDate: string;             // "YYYY-MM-DD" format
    todaysSessions: number;            // Sessions completed today
    todaysFocusSeconds: number;        // Total seconds focused today
    lastPomodoroDayKey: string;        // "YYYY-MM-DD" for daily reset
    xp: number;                        // Current XP (incremented per minute)
    level: number;                     // Current level
    gold: number;                      // Gold (from level-up rewards)
    gems: number;                      // Gems (from level-up rewards)
  },
  streaks: {
    daily: {
      current: number;                 // Current streak
      best: number;                    // Best streak
    }
  },
  pomodoro: {
    daily: {
      current: number;                 // Sessions today
      best: number;                    // Best daily session count
    }
  }
}
```

### LocalStorage State

Two keys are used for persistence:

1. **`habithero:pomodoroSettings:v1`**: Timer settings
   ```json
   {
     "focusDuration": 25,
     "breakDuration": 5
   }
   ```

2. **`habithero:pomodoroTimer:v1`**: Timer runtime state
   ```json
   {
     "status": "running",
     "timeLeftSeconds": 1200,
     "sessionsCompleted": 2,
     "totalFocusSeconds": 1500,
     "lastUpdatedMs": 1234567890123,
     "dayKey": "2026-01-10",
     "phase": "focus"
   }
   ```

---

## Timer Mechanics

### Timer Loop

The timer runs a `setInterval` that executes every 1000ms (1 second) when `status === "running"`:

```typescript
useEffect(() => {
  if (status !== "running") return;

  const interval = setInterval(() => {
    setTimeLeftSeconds((prev) => {
      const next = prev - 1;
      
      // XP and focus time tracking (only during focus phase)
      if (phase === "focus" && prev > 0) {
        setTotalFocusSeconds((t) => {
          const nt = t + 1;
          // Award XP every full minute (60 seconds)
          if (nt % 60 === 0 && t % 60 !== 0) {
            // Award +5 XP and check for level-up
            // ... (see XP System section)
          }
          return nt;
        });
      }

      // Handle timer completion
      if (next <= 0) {
        if (phase === "focus") {
          // Focus session completed
          handleSessionCompleted();
          setPhase("break");
          return settings.breakDuration * 60;
        } else {
          // Break completed
          setPhase("focus");
          setStatus("idle");
          return settings.focusDuration * 60;
        }
      }

      return next;
    });
  }, 1000);

  return () => clearInterval(interval);
}, [status, phase, settings, handleSessionCompleted]);
```

### Timer Controls

#### Start
- If `status === "idle"`: Reset timer to full focus duration, generate new session ID, reset completion flag
- Set `status` to `"running"`
- Set `phase` to `"focus"` if idle

#### Pause
- Set `status` to `"paused"`
- Timer loop stops, but state is preserved

#### Resume
- Set `status` to `"running"`
- Timer loop resumes from where it left off

#### Reset
- Set `status` to `"idle"`
- Set `phase` to `"focus"`
- Reset `timeLeftSeconds` to full focus duration
- Does NOT reset `sessionsCompleted` or `totalFocusSeconds` (daily stats)

### State Persistence on Page Refresh

When the page loads, `readStoredTimerState()` is called:

1. **Reads from localStorage**: Retrieves the last saved timer state
2. **Checks day key**: If `storedDayKey !== todayKey`, resets daily stats
3. **Handles running timers**: If timer was running when page closed, calculates elapsed time and adjusts `timeLeftSeconds`
4. **Handles expired timers**: If timer expired while app was closed, resets to idle state

```typescript
function readStoredTimerState(defaultFocusSeconds: number) {
  const raw = localStorage.getItem(TIMER_STORAGE_KEY);
  const parsed = JSON.parse(raw);
  const todayKey = getDayKey();
  const storedDayKey = parsed.dayKey || getDayKey(parsed.lastUpdatedMs);

  // New day: reset daily stats
  if (storedDayKey !== todayKey) {
    return {
      status: "idle",
      timeLeftSeconds: defaultFocusSeconds,
      sessionsCompleted: 0,
      totalFocusSeconds: 0,
      phase: "focus",
    };
  }

  // If timer was running, calculate elapsed time
  if (status === "running") {
    const elapsedSeconds = Math.floor((Date.now() - parsed.lastUpdatedMs) / 1000);
    const nextTimeLeft = Math.max(0, safeTimeLeft - elapsedSeconds);
    
    if (nextTimeLeft <= 0) {
      // Timer expired while app was closed
      return { status: "idle", ... };
    }
    
    return { status: "running", timeLeftSeconds: nextTimeLeft, ... };
  }

  return { status, timeLeftSeconds, ... };
}
```

---

## XP and Rewards System

### XP Award Mechanism

XP is awarded **during the focus phase only**, at a rate of **+5 XP per full minute** of focused time.

#### Detection Logic

The system tracks `totalFocusSeconds` and detects when a full minute (60 seconds) is completed:

```typescript
if (phase === "focus" && prev > 0) {
  setTotalFocusSeconds((t) => {
    const nt = t + 1;
    // Only award XP when transitioning from 59→60, 119→120, etc.
    if (nt % 60 === 0 && t % 60 !== 0) {
      setXpGained(5);  // Show toast notification
      
      // Update Firestore
      updateDoc(userRef, { "stats.xp": increment(5) })
        .then(async () => {
          // Check for level-up
          const snap = await getDoc(userRef);
          const newTotalXP = snap.data().stats.xp;
          const oldTotalXP = newTotalXP - 5;
          const oldLevel = getLevelFromXP(oldTotalXP);
          const newLevel = getLevelFromXP(newTotalXP);
          
          if (newLevel > oldLevel) {
            // Handle level-up rewards
            // ... (see Level-Up section)
          }
        });
    }
    return nt;
  });
}
```

**Important Notes:**
- XP is only awarded during the **focus phase**, not during breaks
- XP is awarded **per minute**, not per second
- The check `nt % 60 === 0 && t % 60 !== 0` ensures XP is only awarded once per minute transition
- XP is persisted immediately to Firestore using `increment(5)`

### Level-Up Detection

After each XP increment, the system checks if the user leveled up:

1. **Fetch updated user data** from Firestore
2. **Calculate old and new levels** using `getLevelFromXP()`
3. **If `newLevel > oldLevel`**:
   - Fetch level rewards from `levels/definitions` collection
   - Apply rewards (gold, gems) to user stats
   - Update user level in Firestore
   - Trigger level-up animation via `setLevelUpReward()`

```typescript
if (newLevel > oldLevel) {
  // Fetch level rewards
  const levelsSnap = await getDoc(doc(db, "levels", "definitions"));
  const levelDef = levelsSnap.data().levels.find(l => l.level === newLevel);
  const reward = levelDef?.rewards || {};

  // Update user stats
  const updates: any = { "stats.level": newLevel };
  if (reward.gold) updates["stats.gold"] = increment(reward.gold);
  if (reward.gems) updates["stats.gems"] = increment(reward.gems);
  await updateDoc(userRef, updates);

  // Show level-up animation
  setLevelUpReward({ oldLevel, newLevel, reward });
  setTimeout(() => setLevelUpReward(null), 3500);
}
```

### XP Toast Notification

The `XPToast` component displays:
- **XP gained**: `+5 XP` (shown for 2 seconds)
- **Level-up notification**: If level increased, shows `Level Up! X → Y` and level-up animation
- **Progress bar**: Visual representation of XP progress within current level

The toast auto-dismisses after 2 seconds (or 3.5 seconds if level-up occurred).

---

## Streak System

### Streak Calculation Logic

The streak is calculated when a focus session is completed:

```typescript
const todayKey = getDayKey();           // "2026-01-10"
const yesterdayKey = getDayKey(Date.now() - MS_IN_DAY);  // "2026-01-09"
const lastFocusDate = stats.lastFocusDate;  // "YYYY-MM-DD" or undefined

let newStreak = 1;

if (lastFocusDate === todayKey) {
  // Already focused today: maintain current streak
  newStreak = currentStreak || 1;
} else if (lastFocusDate === yesterdayKey) {
  // Focused yesterday: increment streak
  newStreak = currentStreak + 1;
} else {
  // Gap in focus: reset to 1
  newStreak = 1;
}
```

### Streak Rules

1. **Same Day**: If user already focused today, streak remains unchanged
2. **Consecutive Days**: If last focus was yesterday, streak increments by 1
3. **Gap**: If last focus was 2+ days ago, streak resets to 1
4. **Max Streak**: `maxStreak` is updated to the highest streak ever achieved

### Streak Storage

Streaks are stored in multiple places for different purposes:

```typescript
// Primary streak (used for achievements)
stats.streak: number
stats.maxStreak: number

// Daily streak tracking
streaks.daily.current: number
streaks.daily.best: number

// Pomodoro-specific daily stats
pomodoro.daily.current: number  // Sessions today
pomodoro.daily.best: number     // Best daily session count
```

---

## Achievement System

### Focus Achievement Updates

When a focus session is completed, the system updates all focus-related achievements:

```typescript
// In handleSessionCompleted()
const newFocusSessions = currentFocusSessions + 1;
await updateDoc(userRef, {
  "stats.focusSessionsCompleted": newFocusSessions
});

// Update achievements
onFocusSessionCompleted(newFocusSessions);
```

### Achievement Query Logic

The `onFocusSessionCompleted()` function:

1. **Queries the global achievements catalog**:
   ```typescript
   const achievementsRef = collection(db, "achievements");
   const snapshot = await getDocs(achievementsRef);
   ```

2. **Filters for focus achievements**:
   ```typescript
   const focusAchievements = snapshot.docs
     .filter((achievement) => {
       const category = achievement.category?.toLowerCase();
       const id = achievement.achievementId?.toLowerCase();
       return category === "focus" || 
              category === "productivity" || 
              category === "pomodoro" ||
              id.includes("focus") || 
              id.includes("pomodoro");
     });
   ```

3. **Updates each achievement's progress**:
   ```typescript
   await Promise.all(
     focusAchievements.map(async (achievement) => {
       const target = achievement.condition?.value || 1;
       await updateFocusAchievementDirect(
         user.uid, 
         achievement.achievementId, 
         totalFocusSessions, 
         target
       );
     })
   );
   ```

### Direct Firestore Update

The `updateFocusAchievementDirect()` function:

1. **Gets or creates progress document**: `users/{uid}/achievements/{achievementId}`
2. **Updates progress**: Sets `progress` to `totalFocusSessions`
3. **Checks unlock status**: `isUnlocked = progress >= target`
4. **Writes to Firestore**: Uses `setDoc` with `merge: true`

```typescript
async function updateFocusAchievementDirect(
  uid: string,
  achievementId: string,
  newProgress: number,
  target: number
) {
  const progressRef = doc(db, "users", uid, "achievements", achievementId);
  
  await setDoc(progressRef, {
    progress: newProgress,
    isUnlocked: newProgress >= target,
    updatedAt: Date.now(),
  }, { merge: true });
}
```

### Streak Achievement Updates

Streak achievements are updated separately:

```typescript
onStreakUpdated(newStreak);
```

This function queries for streak achievements and updates them similarly to focus achievements.

---

## Data Persistence

### LocalStorage Persistence

#### Settings Persistence
Settings are saved to localStorage whenever they change:

```typescript
useEffect(() => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}, [settings]);
```

#### Timer State Persistence
Timer state is saved to localStorage whenever it changes:

```typescript
useEffect(() => {
  const payload: StoredTimerState = {
    status,
    timeLeftSeconds,
    sessionsCompleted,
    totalFocusSeconds,
    lastUpdatedMs: Date.now(),
    dayKey: getDayKey(),
    phase,
  };
  localStorage.setItem(TIMER_STORAGE_KEY, JSON.stringify(payload));
}, [status, timeLeftSeconds, sessionsCompleted, totalFocusSeconds, phase]);
```

### Firestore Persistence

#### Session Completion
When a focus session completes, data is synced to Firestore:

1. **Frontend → Backend API**: `POST /api/pomodoro/session-completed`
   ```typescript
   await fetch("/api/pomodoro/session-completed", {
     method: "POST",
     headers: {
       "Authorization": `Bearer ${token}`,
       "Content-Type": "application/json",
     },
     body: JSON.stringify({
       sessionsCount: 1,
       focusSeconds: totalFocusSeconds,
     }),
   });
   ```

2. **Backend Updates Daily Stats**:
   ```typescript
   // Check if new day
   const needsReset = lastPomodoroDayKey !== todayDateString;
   
   // Calculate new totals
   if (needsReset) {
     todaysSessions = sessionsCount;
     todaysFocusSeconds = focusSeconds;
   } else {
     todaysSessions = (stats.todaysSessions || 0) + sessionsCount;
     todaysFocusSeconds = (stats.todaysFocusSeconds || 0) + focusSeconds;
   }
   
   // Update Firestore
   await userRef.update({
     "stats.todaysSessions": todaysSessions,
     "stats.todaysFocusSeconds": todaysFocusSeconds,
     "stats.lastPomodoroDayKey": todayDateString,
   });
   ```

3. **Frontend Updates Lifetime Stats**:
   ```typescript
   await updateDoc(userRef, {
     "stats.lastFocusDate": todayKey,
     "stats.streak": newStreak,
     "stats.maxStreak": newMaxStreak,
     "stats.focusSessionsCompleted": newFocusSessions,
     "streaks.daily.current": newStreak,
     "streaks.daily.best": streakDailyBest,
     "pomodoro.daily.current": newPomodoroDaily,
     "pomodoro.daily.best": newPomodoroDailyBest,
   });
   ```

### Daily Reset Logic

Daily stats are reset automatically:

1. **LocalStorage Reset**: When `readStoredTimerState()` detects a new day (`storedDayKey !== todayKey`), it resets:
   - `sessionsCompleted` → 0
   - `totalFocusSeconds` → 0
   - `status` → "idle"

2. **Backend Reset**: When `POST /pomodoro/session-completed` detects a new day (`needsReset === true`), it resets:
   - `todaysSessions` → `sessionsCount` (fresh start)
   - `todaysFocusSeconds` → `focusSeconds` (fresh start)

---

## Backend Integration

### API Endpoint: `POST /pomodoro/session-completed`

**Location**: `functions/src/index.ts`

**Authentication**: Required (`requireAuth` middleware)

**Request Body**:
```json
{
  "sessionsCount": 1,
  "focusSeconds": 1500
}
```

**Response**:
```json
{
  "success": true,
  "userId": "uid",
  "today": {
    "sessions": 3,
    "focusSeconds": 4500,
    "date": "2026-01-10"
  },
  "wasReset": false
}
```

**Logic**:
1. Validates request body
2. Gets user document from Firestore
3. Calculates today's date string (`YYYY-MM-DD`)
4. Checks if daily reset is needed
5. Updates `todaysSessions` and `todaysFocusSeconds`
6. Updates `lastPomodoroDayKey`
7. Returns updated stats

**Error Handling**:
- `400`: Invalid session data (sessionsCount < 1 or focusSeconds < 0)
- `404`: User not found
- `500`: Server error

---

## UI Components

### FocusModePage

The main UI component that displays the timer:

**Features**:
- **Timer Circle**: Visual countdown with progress ring
- **Controls**: Start, Pause, Reset buttons
- **Stats Display**: 
  - Focus streak
  - Today's sessions
  - Today's focus time
- **Settings**: Adjustable focus and break durations
- **Stamina Bar**: Shows current stamina (if applicable)

**Timer Display**:
```typescript
// Progress calculation
const totalSeconds = (phase === "focus" ? focusDuration : breakDuration) * 60;
const safeTimeLeft = Math.min(Math.max(timeLeftSeconds, 0), totalSeconds);
const progress = ((totalSeconds - safeTimeLeft) / totalSeconds) * 100;

// SVG circle with progress
<circle
  strokeDasharray={2 * Math.PI * 110}
  strokeDashoffset={2 * Math.PI * 110 * (1 - progress / 100)}
/>
```

### XPToast Component

Displays XP gain notifications:

**Props**:
- `totalXP`: Current total XP
- `xpGained`: XP gained in this increment (typically 5)
- `accentColor`: Theme accent color
- `levelUpReward`: Optional level-up data

**Behavior**:
- Auto-dismisses after 2 seconds (or 3.5 seconds if level-up)
- Shows progress bar animation
- Triggers `LevelUpAnimation` component if level-up occurred

### LevelUpAnimation Component

Celebrates level-ups with animation:

**Props**:
- `oldLevel`: Previous level
- `newLevel`: New level
- `reward`: Level-up rewards (gold, gems)
- `accentColor`: Theme accent color

**Behavior**:
- Full-screen animation
- Displays level-up message and rewards
- Auto-dismisses after animation completes

---

## Complete Flow Diagrams

### Focus Session Completion Flow

```
[Timer Reaches 0]
    ↓
[Phase === "focus"?]
    ↓ YES
[focusCompletedInSessionRef.current === false?]
    ↓ YES
[Set focusCompletedInSessionRef.current = true]
    ↓
[Increment sessionsCompleted]
    ↓
[Call handleSessionCompleted()]
    ↓
[Sync to Backend API]
    POST /api/pomodoro/session-completed
    { sessionsCount: 1, focusSeconds: totalFocusSeconds }
    ↓
[Backend Updates Daily Stats]
    - Check if new day
    - Update todaysSessions
    - Update todaysFocusSeconds
    ↓
[Frontend Updates Lifetime Stats]
    - Read current streak from Firestore
    - Calculate new streak
    - Update stats.streak
    - Update stats.focusSessionsCompleted
    - Update streaks.daily
    - Update pomodoro.daily
    ↓
[Update Achievements]
    - onStreakUpdated(newStreak)
    - onFocusSessionCompleted(newFocusSessions)
    ↓
[Switch to Break Phase]
    - Set phase = "break"
    - Set timeLeftSeconds = breakDuration * 60
    - Continue timer
```

### XP Award Flow

```
[Timer Loop: Every 1 second]
    ↓
[Phase === "focus" && timeLeftSeconds > 0?]
    ↓ YES
[Increment totalFocusSeconds]
    ↓
[totalFocusSeconds % 60 === 0?]
    (Just completed a full minute)
    ↓ YES
[Set xpGained = 5]
    (Triggers XPToast)
    ↓
[Update Firestore: stats.xp += 5]
    updateDoc(userRef, { "stats.xp": increment(5) })
    ↓
[Fetch Updated User Data]
    getDoc(userRef)
    ↓
[Calculate Old and New Levels]
    oldLevel = getLevelFromXP(oldTotalXP)
    newLevel = getLevelFromXP(newTotalXP)
    ↓
[newLevel > oldLevel?]
    ↓ YES
[Fetch Level Rewards]
    levels/definitions collection
    ↓
[Apply Rewards to User]
    - Update stats.level
    - Increment stats.gold (if reward.gold)
    - Increment stats.gems (if reward.gems)
    ↓
[Show Level-Up Animation]
    setLevelUpReward({ oldLevel, newLevel, reward })
    ↓
[Auto-dismiss after 3.5 seconds]
```

### Daily Reset Flow

```
[Page Load / Timer State Read]
    ↓
[Read localStorage Timer State]
    readStoredTimerState()
    ↓
[Get Today's Day Key]
    todayKey = getDayKey()  // "2026-01-10"
    ↓
[Get Stored Day Key]
    storedDayKey = parsed.dayKey || getDayKey(parsed.lastUpdatedMs)
    ↓
[storedDayKey !== todayKey?]
    ↓ YES (New Day)
[Reset Daily Stats]
    - sessionsCompleted = 0
    - totalFocusSeconds = 0
    - status = "idle"
    - timeLeftSeconds = defaultFocusDuration * 60
    ↓
[Return Reset State]
```

### Streak Calculation Flow

```
[Session Completed]
    ↓
[Get Today's and Yesterday's Day Keys]
    todayKey = "2026-01-10"
    yesterdayKey = "2026-01-09"
    ↓
[Read lastFocusDate from Firestore]
    lastFocusDate = stats.lastFocusDate  // "2026-01-09" or undefined
    ↓
[lastFocusDate === todayKey?]
    ↓ YES
    [newStreak = currentStreak]  // Already focused today
    ↓ NO
    [lastFocusDate === yesterdayKey?]
        ↓ YES
        [newStreak = currentStreak + 1]  // Consecutive day
        ↓ NO
        [newStreak = 1]  // Gap in focus, reset streak
    ↓
[Update maxStreak]
    newMaxStreak = Math.max(currentMaxStreak, newStreak)
    ↓
[Update Firestore]
    - stats.streak = newStreak
    - stats.maxStreak = newMaxStreak
    - stats.lastFocusDate = todayKey
    - streaks.daily.current = newStreak
    - streaks.daily.best = Math.max(prevBest, newStreak)
```

---

## Edge Cases and Error Handling

### Timer State Recovery

**Scenario**: User closes browser while timer is running, reopens next day.

**Handling**:
1. `readStoredTimerState()` detects new day via `dayKey` comparison
2. Resets daily stats (`sessionsCompleted`, `totalFocusSeconds`)
3. Resets timer to idle state
4. User can start fresh timer

### Timer Expired While App Closed

**Scenario**: Timer was running when app closed, timer expired while closed.

**Handling**:
1. `readStoredTimerState()` calculates elapsed time
2. If `nextTimeLeft <= 0`, resets to idle state
3. Does NOT trigger session completion (prevents duplicate rewards)
4. User must manually start new session

### Duplicate Session Completion Prevention

**Scenario**: Multiple rapid calls to `handleSessionCompleted()`.

**Handling**:
1. `focusCompletedInSessionRef.current` flag prevents duplicate processing
2. Flag is set to `true` when focus completes
3. Flag is reset to `false` when break completes
4. If flag is already `true`, session completion is skipped

### Network Failure During Session Completion

**Scenario**: Backend API call fails when syncing session completion.

**Handling**:
1. Frontend continues with local Firestore update
2. Error is logged: `console.warn("⚠️ [Pomodoro] Failed to sync to server")`
3. Next session completion will retry backend sync
4. Daily stats may be slightly out of sync, but lifetime stats remain accurate

### XP Award During Break Phase

**Scenario**: User somehow triggers XP award during break.

**Handling**:
1. XP is only awarded when `phase === "focus"`
2. Break phase does not increment `totalFocusSeconds`
3. No XP is awarded during breaks

### Level-Up During Multiple XP Awards

**Scenario**: User levels up while multiple XP awards are processing.

**Handling**:
1. Each XP award checks for level-up independently
2. Firestore `increment()` operations are atomic
3. Level-up detection uses the most recent XP value
4. Multiple level-ups in quick succession are handled correctly

### Achievement Update Failures

**Scenario**: Achievement update fails (network error, permission error).

**Handling**:
1. Error is caught and logged: `console.error("Failed to update focus achievements")`
2. User stats are still updated (primary data)
3. Achievements can be manually synced later
4. Does not block session completion

### Invalid Timer Settings

**Scenario**: User enters invalid focus/break duration (e.g., 0, negative, > max).

**Handling**:
1. `clampInt()` function enforces bounds:
   - Focus: 1-180 minutes
   - Break: 1-60 minutes
2. Invalid values are clamped to nearest valid value
3. Settings are validated on every change

### localStorage Quota Exceeded

**Scenario**: Browser localStorage is full.

**Handling**:
1. `try-catch` blocks around all localStorage writes
2. Errors are silently ignored (prevents app crash)
3. Timer continues to function, but state may not persist
4. User can still use timer, but refresh will reset state

---

## Summary

The Focus Timer system is a comprehensive implementation of the Pomodoro Technique with:

- **Real-time timer** with pause/resume/reset controls
- **XP rewards** at 5 XP per minute of focused time
- **Level-up detection** with automatic reward application
- **Streak tracking** with automatic reset logic
- **Achievement integration** with automatic progress updates
- **Data persistence** across page refreshes and browser restarts
- **Daily reset** of statistics at midnight
- **Robust error handling** for network failures and edge cases

The system uses a combination of React state, localStorage, and Firestore to maintain consistency and provide a seamless user experience.
