# Stats Page Implementation Analysis

## Overview

This document provides a comprehensive analysis of the Stats Page (`StatsPage.tsx`) implementation, identifying issues, verifying correct implementations, and documenting questions that need clarification.

---

## Issues Found

### 1. Battles Won / Battles Played — Not Being Tracked

**Status:** ❌ **CRITICAL** - Fields exist in `UserStats` interface and are displayed, but are never updated in the backend.

**Location:** 
- Frontend: `src/pages/student/StatsPage.tsx` (Lines 204-207)
- Backend: Missing implementation in battle endpoints

**Problem:**
- `battlesWon` and `battlesPlayed` are defined in the `UserStats` interface
- These fields are displayed in the Stats Page UI
- However, they are **never incremented** in any backend endpoint:
  - `POST /users/:uid/battle-rewards` - Does not increment `battlesWon`
  - `POST /combat/start` - Does not increment `battlesPlayed`
  - `POST /combat/results` - Does not track battles
  - `POST /combat/:combatId/resolve` - Does not track battles

**Current Implementation:**
```typescript
// StatsPage.tsx
const battlesWon = user.stats?.battlesWon || 0;
const battlesPlayed = user.stats?.battlesPlayed || 0;
const winRate = battlesPlayed > 0 ? Math.round((battlesWon / battlesPlayed) * 100) : 0;
```

**Questions:**
- Should these be tracked?
- If yes:
  - Should `battlesPlayed` increment when a battle starts (`POST /combat/start`)?
  - Should `battlesWon` increment only on victory (when rewards are given)?
  - Should defeats be tracked separately?

**Impact:**
- Win Rate calculation will always show `0%` or `NaN`
- Battles Won will always show `0`
- Battles Played will always show `0`

---

### 2. XP Display Calculation Errors

**Status:** ❌ **BUG** - Multiple calculation errors in XP display logic.

#### Issue 2a: XP Progress Card (Line 264)

**Location:** `src/pages/student/StatsPage.tsx` (Line 264)

**Problem:**
```typescript
<p className="text-orange-200 text-sm">
  {xp % maxXP} / {maxXP}  // ❌ INCORRECT
</p>
```

**Issue:** Using modulo operator (`%`) incorrectly. The `xp` variable already represents the current XP within the level, so `xp % maxXP` will give incorrect values.

**Should be:**
```typescript
<p className="text-orange-200 text-sm">
  {xp} / {maxXP}  // ✅ CORRECT
</p>
// OR
<p className="text-orange-200 text-sm">
  {currentXP} / {maxXP}  // ✅ CORRECT (more explicit)
</p>
```

#### Issue 2b: Total XP Earned (Line 827)

**Location:** `src/pages/student/StatsPage.tsx` (Line 827)

**Problem:**
```typescript
<span className={theme.textMuted}>Total XP Earned</span>
<span className={`font-bold ${theme.text}`}>{xp} XP</span>  // ❌ Shows current level XP
```

**Issue:** Label says "Total XP Earned" but displays `xp` which is the current level's XP, not lifetime total XP.

**Should be:**
```typescript
<span className={theme.textMuted}>Total XP Earned</span>
<span className={`font-bold ${theme.text}`}>{totalXP} XP</span>  // ✅ Shows lifetime total
```

**Note:** `totalXP` is already calculated on line 161:
```typescript
const totalXP = user.stats?.totalXP || user.stats?.xp || 0;
```

#### Issue 2c: XP Until Next Level (Line 843)

**Location:** `src/pages/student/StatsPage.tsx` (Line 843)

**Problem:**
```typescript
<p className={`${theme.textSubtle} text-sm mt-2`}>
  {maxXP - (xp % maxXP)} XP until Level {level + 1}  // ❌ INCORRECT
</p>
```

**Issue:** Same modulo error as Issue 2a. The calculation is incorrect.

**Should be:**
```typescript
<p className={`${theme.textSubtle} text-sm mt-2`}>
  {maxXP - xp} XP until Level {level + 1}  // ✅ CORRECT
</p>
// OR (more explicit)
<p className={`${theme.textSubtle} text-sm mt-2`}>
  {nextLevelXP - currentXP} XP until Level {level + 1}  // ✅ CORRECT
</p>
```

**Impact:**
- Users see incorrect XP values in multiple places
- Progress indicators may show wrong percentages
- "XP until next level" calculation is incorrect

---

### 3. Achievements — Using Old API

**Status:** ⚠️ **INCONSISTENCY** - Uses polling API instead of real-time hook.

**Location:** `src/pages/student/StatsPage.tsx` (Lines 70-105)

**Current Implementation:**
```typescript
useEffect(() => {
  const loadAchievements = async () => {
    const currentUser = auth.currentUser;
    if (!currentUser) return;

    try {
      const [catalogResponse, userProgress] = await Promise.all([
        AchievementsAPI.list(),  // ❌ Old API
        AchievementsAPI.getUserProgress(currentUser.uid),  // ❌ Old API
      ]);
      // ... merge logic
      setAchievements(merged);
    } catch (error) {
      console.error("Failed to load achievements:", error);
      setAchievements([]);
    }
  };

  loadAchievements();
}, []);
```

**Problem:**
- Uses `AchievementsAPI.list()` and `AchievementsAPI.getUserProgress()` which are polling-based
- Other pages (e.g., `AchievementsPage.tsx`) use `useRealtimeAchievements()` hook for real-time updates
- This creates inconsistency and may show stale data

**Should be:**
```typescript
// Use the real-time hook like other pages
const { achievements, loading: achievementsLoading } = useRealtimeAchievements();
```

**Impact:**
- Achievements may not update in real-time
- Inconsistent with other pages
- Requires manual refresh to see updates

---

### 4. Collection Progress Visual — Wrong Data

**Status:** ⚠️ **LOGIC ERROR** - Uses achievement progress instead of collection progress.

**Location:** `src/pages/student/StatsPage.tsx` (Line 581)

**Problem:**
```typescript
<div
  className="inline-flex items-center justify-center w-24 h-24 rounded-full"
  style={{
    background: `conic-gradient(${accentColor} ${achievementProgress}%, ...)`,  // ❌ Wrong data
  }}
>
```

**Issue:** The circular progress indicator in the "Collection Progress" section uses `achievementProgress` (which is calculated from achievements) instead of collection-specific progress.

**Current Data Available:**
- `uniqueItems`: `user.inventory?.inventory?.items?.length || 0`
- `lootboxesOpened`: `user.stats?.lootboxesOpened || 0`

**Questions:**
- What should the circular progress represent?
  - Items collected vs. total available items?
  - A different collection metric?
  - Should it be removed if not applicable?

**Impact:**
- Visual indicator shows achievement progress instead of collection progress
- Misleading to users

---

## Working Correctly ✅

The following stats are implemented correctly and pulling from the right data sources:

### Top Statistics Cards

1. **Level** ✅
   - Source: `user.stats?.level || 1`
   - Correctly uses database value (updated by backend)

2. **Gold** ✅
   - Source: `user.stats?.gold || 0`
   - Correctly displays total gold

3. **Task Streak** ✅
   - Source: `user.stats?.streak || 0`
   - Correctly displays daily task streak

4. **Login Streak** ✅
   - Source: `user.stats?.loginStreak || 0` / `user.stats?.maxLoginStreak || 0`
   - Correctly displays current and max login streak

### Task Statistics

5. **Task Overview** ✅
   - Source: `useRealtimeTasks()` hook
   - Correctly calculates:
     - Total tasks: `tasks.length`
     - Completed tasks: `tasks.filter((t) => !t.isActive).length`
     - Active tasks: `tasks.filter((t) => t.isActive).length`
   - Completion rate calculation is correct

6. **Tasks by Difficulty** ✅
   - Source: `useRealtimeTasks()` hook
   - Correctly filters and counts tasks by difficulty (easy, medium, hard, extreme)
   - Correctly calculates completed tasks per difficulty

### Combat Statistics

7. **Monsters Defeated** ✅
   - Source: `user.progression?.monstersDefeated || user.stats?.monstersDefeated || 0`
   - Correctly uses progression (primary) with fallback to stats (backward compatibility)

### Collection Statistics

8. **Unique Items** ✅
   - Source: `user.inventory?.inventory?.items?.length || 0`
   - Correctly counts unique items in inventory

9. **Lootboxes Opened** ✅
   - Source: `user.stats?.lootboxesOpened || 0`
   - Correctly displays lootboxes opened count

### Other Statistics

10. **Total Stats (Equipped Stats)** ✅
    - Source: Fetched from `/users/:uid/stats` endpoint
    - Correctly displays combined stats (base + equipped items)
    - Includes: HP, ATK, MAG ATK, DEF, MAG RES, SPD, CRIT CH, CRIT DMG, GOLD, XP

11. **Stamina Bar** ✅
    - Source: `UsersAPI.getStamina(user.uid)`
    - Correctly displays current stamina, max stamina, and regeneration timer
    - Updates every 60 seconds

---

## Questions Requiring Clarification

### Q1: Battles Won/Played Tracking

**Question:** Should battles be tracked? If yes, what's the intended behavior?

**Options:**
1. **Track both:**
   - `battlesPlayed` increments when a battle starts (`POST /combat/start`)
   - `battlesWon` increments only on victory (when rewards are given in `POST /users/:uid/battle-rewards`)
   - Defeats are tracked implicitly (battlesPlayed - battlesWon)

2. **Track only victories:**
   - Only track `battlesWon`
   - Don't track `battlesPlayed`

3. **Don't track:**
   - Remove these stats from the UI

**Recommendation:** Option 1 (track both) for accurate win rate calculation.

---

### Q2: Win Rate Display

**Question:** If battles aren't tracked, should the Win Rate stat be hidden or calculated differently?

**Current Behavior:**
- Shows `0%` if `battlesPlayed === 0`
- Calculates as `(battlesWon / battlesPlayed) * 100`

**Options:**
1. Hide Win Rate if battles aren't tracked
2. Show "N/A" or "—" if no battles played
3. Calculate differently (e.g., based on monsters defeated)

**Recommendation:** Hide or show "N/A" if `battlesPlayed === 0`.

---

### Q3: Collection Progress Visual

**Question:** What should the circular progress indicator in the "Collection Progress" section represent?

**Options:**
1. **Items collected vs. total available:**
   - Need to know total available items in the game
   - Progress = `uniqueItems / totalAvailableItems * 100`

2. **Lootboxes opened vs. some target:**
   - Progress = `lootboxesOpened / targetLootboxes * 100`

3. **Combined metric:**
   - Some combination of items and lootboxes

4. **Remove the visual:**
   - Just show the numbers without a progress circle

**Recommendation:** Option 4 (remove visual) or Option 1 if total available items can be determined.

---

### Q4: Total XP Display

**Question:** Should "Total XP Earned" show lifetime total XP or current level XP?

**Current Implementation:**
- Label says "Total XP Earned"
- Shows `xp` (current level XP) ❌

**Options:**
1. **Show lifetime total XP:**
   - Use `totalXP` (XP accumulated across all levels)
   - More accurate for "Total XP Earned"

2. **Show current level XP:**
   - Use `currentXP` or `xp`
   - Change label to "Current Level XP"

**Recommendation:** Option 1 (show `totalXP`) - matches the label "Total XP Earned".

---

### Q5: Achievements Hook

**Question:** Should the Stats Page use `useRealtimeAchievements()` hook for consistency?

**Current Implementation:**
- Uses `AchievementsAPI.list()` and `AchievementsAPI.getUserProgress()` (polling)

**Options:**
1. **Switch to real-time hook:**
   - Use `useRealtimeAchievements()` like `AchievementsPage.tsx`
   - Ensures real-time updates and consistency

2. **Keep current implementation:**
   - If there's a specific reason for using the API

**Recommendation:** Option 1 (switch to real-time hook) for consistency and real-time updates.

---

## Implementation Status Summary

| Stat | Status | Notes |
|------|--------|-------|
| Level | ✅ Working | Correctly uses `user.stats?.level` |
| XP Progress | ❌ Bug | Modulo calculation error (Line 264) |
| Total XP Earned | ❌ Bug | Shows current XP instead of total (Line 827) |
| XP Until Next Level | ❌ Bug | Incorrect calculation (Line 843) |
| Gold | ✅ Working | Correctly uses `user.stats?.gold` |
| Task Streak | ✅ Working | Correctly uses `user.stats?.streak` |
| Login Streak | ✅ Working | Correctly uses `user.stats?.loginStreak` |
| Total Tasks | ✅ Working | From `useRealtimeTasks()` hook |
| Completed Tasks | ✅ Working | From `useRealtimeTasks()` hook |
| Tasks by Difficulty | ✅ Working | From `useRealtimeTasks()` hook |
| Battles Won | ❌ Not Tracked | Never incremented in backend |
| Battles Played | ❌ Not Tracked | Never incremented in backend |
| Win Rate | ❌ Broken | Always 0% because battles aren't tracked |
| Monsters Defeated | ✅ Working | Uses `user.progression?.monstersDefeated` |
| Unique Items | ✅ Working | Uses `user.inventory?.inventory?.items?.length` |
| Lootboxes Opened | ✅ Working | Uses `user.stats?.lootboxesOpened` |
| Collection Progress Visual | ❌ Wrong Data | Uses achievement progress instead |
| Achievements | ⚠️ Inconsistent | Uses old API instead of real-time hook |
| Total Stats | ✅ Working | Fetched from `/users/:uid/stats` endpoint |
| Stamina Bar | ✅ Working | Correctly implemented |

---

## Recommended Fix Priority

1. **HIGH PRIORITY:**
   - Fix XP display calculation errors (Issues 2a, 2b, 2c)
   - Implement battles tracking (Issue 1)

2. **MEDIUM PRIORITY:**
   - Switch to `useRealtimeAchievements()` hook (Issue 3)
   - Fix Collection Progress visual (Issue 4)

3. **LOW PRIORITY:**
   - Address questions for future enhancements

---

## Next Steps

1. **Clarify Questions:** Answer Q1-Q5 to determine exact requirements
2. **Fix Critical Bugs:** Address XP calculation errors
3. **Implement Missing Features:** Add battles tracking
4. **Improve Consistency:** Switch to real-time hooks
5. **Test:** Verify all stats display correctly after fixes

---

## Notes

- All fixes should maintain backward compatibility with existing user data
- Consider adding default values for missing fields during initialization
- Ensure all calculations handle edge cases (division by zero, null/undefined values)
- Test with users who have no data vs. users with existing data
