# Stats Page: Firestore Direct Reading Migration

## Overview
Converted all stats viewing from API calls to **direct Firestore reads** for real-time updates. All **creation/updates** still go through API endpoints for validation and business logic.

---

## 1. ⚡ Stamina Data

### **Before (API-based):**
- Called `UsersAPI.getStamina(user.uid)` every 60 seconds
- Polling-based, not real-time
- Backend calculated regeneration and returned values

### **After (Firestore Direct):**
- **Reads from:** `user.stats.stamina`, `user.stats.maxStamina`, `user.stats.lastStaminaRegen`
- **Config from:** `gameConfig/main.stamina` (max, regenPerHour)
- **Calculation:** Frontend calculates regeneration using same logic as backend
- **Real-time:** Updates automatically when `user.stats` changes via `useRealtimeUser()` hook

### **How It Works:**
```typescript
// 1. Fetch gameConfig once on mount
const configDoc = await getDoc(doc(db, "gameConfig", "main"));
const regenRateMinutes = 60 / (config.stamina.regenPerHour || 10);

// 2. Calculate stamina with regeneration (frontend)
const now = Date.now();
const minutesPassed = (now - lastRegen) / 60000;
const pointsToAdd = Math.floor(minutesPassed / regenRateMinutes);
const newStamina = Math.min(maxStamina, currentStamina + pointsToAdd);

// 3. Calculate next regeneration time
const minutesUntilNext = regenRateMinutes - ((now - newLastRegen) / 60000) % regenRateMinutes;
const nextRegenIn = Math.ceil(minutesUntilNext * 60000);
```

### **Updates (Still via API):**
- **Consumption:** `POST /users/:uid/stamina/consume` (called by `POST /combat/start`)
- **Regeneration:** Backend updates `stats.stamina` and `stats.lastStaminaRegen` on login (`GET /auth/me`)

### **Benefits:**
- ✅ Real-time updates (no 60-second delay)
- ✅ Consistent with other stats (all via Firestore)
- ✅ Reduced API calls
- ✅ Same calculation logic as backend

---

## 2. 📊 Total Stats (Equipped Stats)

### **Before (API-based):**
- Called `GET /users/:uid/stats` on mount
- Also synced from `user.stats.totalStats` (redundant)

### **After (Firestore Direct):**
- **Reads from:** `user.stats.totalStats` directly
- **Real-time:** Updates automatically when items are equipped/unequipped
- **No API call needed** for viewing

### **How It Works:**
```typescript
// Read directly from user.stats.totalStats
useEffect(() => {
  const totals = user?.stats?.totalStats;
  if (totals && Object.keys(totals).length > 0) {
    setEquippedStats(totals);
  }
}, [user?.stats?.totalStats]);
```

### **Updates (Still via API):**
- **Equip/Unequip:** `POST /users/:uid/inventory/equip` or `/unequip`
- Backend calculates `totalStats = baseStats + equippedItemStats` and updates `user.stats.totalStats`

### **Benefits:**
- ✅ Real-time updates when items are equipped/unequipped
- ✅ No redundant API calls
- ✅ Consistent with other user data

---

## 3. 📦 Total Available Items

### **Before (API-based):**
- Called `ItemsAPI.list()` 5 times (once per collection)
- Polling-based, fetched once on mount

### **After (Firestore Direct):**
- **Reads from:** Firestore collections directly:
  - `items_weapons`
  - `items_armor`
  - `items_arcane`
  - `items_pets`
  - `items_accessories`
- **Query:** `where("active", "==", true)` to get only active items
- **Counts:** Unique items by `itemId` across all collections

### **How It Works:**
```typescript
// Read directly from Firestore collections
for (const collectionName of collections) {
  const itemsRef = collection(db, collectionName);
  const q = query(itemsRef, where("active", "==", true));
  const snapshot = await getDocs(q);
  
  snapshot.docs.forEach((doc) => {
    const itemId = item.itemId || doc.id;
    if (!allItemIds.has(itemId)) {
      allItemIds.add(itemId);
      totalCount++;
    }
  });
}
```

### **Updates (Still via API):**
- **Item Creation:** `POST /items` (admin only)
- **Item Updates:** `PUT /items/:itemId` (admin only)
- **Item Activation:** Updates `active` field in Firestore

### **Benefits:**
- ✅ Direct Firestore access (no API overhead)
- ✅ Can be made real-time with `onSnapshot` if needed
- ✅ Consistent with other catalog data

---

## Summary

| Stat | Viewing (Firestore) | Updates (API) |
|------|---------------------|---------------|
| **Stamina** | `user.stats.stamina`, `user.stats.maxStamina`, `user.stats.lastStaminaRegen` + `gameConfig/main` | `POST /users/:uid/stamina/consume` |
| **Total Stats** | `user.stats.totalStats` | `POST /users/:uid/inventory/equip`, `/unequip` |
| **Total Items** | `items_*` collections (direct Firestore) | `POST /items`, `PUT /items/:itemId` |

---

## Architecture Pattern

### **Viewing = Firestore Direct**
- Real-time updates via `onSnapshot` listeners
- No polling delays
- Consistent data source

### **Creating/Updating = API Endpoints**
- Validation and business logic
- Security rules enforcement
- Side effects (achievements, notifications, etc.)

---

## Files Modified

- `src/pages/student/StatsPage.tsx`
  - Removed: `UsersAPI.getStamina()`, `apiFetch('/users/:uid/stats')`, `ItemsAPI.list()`
  - Added: Direct Firestore reads using `getDoc()`, `getDocs()`, `collection()`, `query()`, `where()`
  - Added: Frontend stamina regeneration calculation

---

## Testing Checklist

- [ ] Stamina bar updates in real-time when stamina changes
- [ ] Stamina regeneration timer counts down correctly
- [ ] Total stats update when items are equipped/unequipped
- [ ] Total available items count is accurate
- [ ] Collection progress percentage is correct
- [ ] No console errors or warnings
