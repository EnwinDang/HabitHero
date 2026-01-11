# Stamina System Design Document

## 📋 Table of Contents
1. [Overview](#overview)
2. [How Stamina Works](#how-stamina-works)
3. [Visual Design](#visual-design)
4. [Technical Implementation](#technical-implementation)
5. [User Experience Flow](#user-experience-flow)

---

## 🎯 Overview

The Stamina System is an energy-based gating mechanism that limits how many battles players can engage in over time. It encourages strategic play and prevents excessive grinding while allowing natural progression through passive regeneration.

### Key Concepts
- **Stamina**: Energy currency consumed to enter battles
- **Regeneration**: Passive recovery over time
- **Stage Cost**: Stamina required per battle entry
- **Max Stamina**: Maximum stamina capacity

---

## ⚡ How Stamina Works

### 1. **Stamina Consumption**

#### When Stamina is Consumed
- **Battle Entry**: Stamina is consumed when a player **starts** a battle, not when they complete it
- **One-Time Cost**: Multi-round battles (stages with 2 monsters) only cost stamina once at the start
- **Cost Per Stage**: Each stage has a fixed stamina cost (configurable by admin)

#### Consumption Flow
```
User clicks "Start Battle" 
  → System checks current stamina
  → If stamina >= stageCost: Consume stamina, start battle
  → If stamina < stageCost: Block battle, show error message
```

### 2. **Stamina Regeneration**

#### Passive Regeneration
- Stamina regenerates automatically over time
- **Regeneration Rate**: Configurable minutes per stamina point (e.g., 5 minutes = 1 stamina)
- **Calculation**: Based on time elapsed since last regeneration check
- **Capped**: Cannot exceed `maxStamina`

#### Regeneration Formula
```
Time Passed (minutes) = (Current Time - Last Regen Time) / 60,000
Stamina Points to Add = floor(Time Passed / Regeneration Rate)
New Stamina = min(Max Stamina, Current Stamina + Points to Add)
```

#### Example
- **Current Stamina**: 45
- **Max Stamina**: 100
- **Regeneration Rate**: 5 minutes per point
- **Last Regen**: 30 minutes ago
- **Calculation**: 30 minutes / 5 = 6 points
- **New Stamina**: min(100, 45 + 6) = **51 stamina**

### 3. **Stamina Initialization**

#### New Users
- Start with **full stamina** (equal to `maxStamina`)
- `lastStaminaRegen` timestamp set to account creation time

#### Existing Users (Migration)
- Initialize stamina to `maxStamina` if not set
- Set `lastStaminaRegen` to current time

### 4. **Stamina Calculation Timing**

Stamina is calculated (with regeneration) in these scenarios:
- ✅ **On Battle Start**: Before consuming stamina
- ✅ **On Stamina Read**: When fetching current stamina
- ✅ **On User Login**: Update stamina on `/auth/me`
- ✅ **Periodic UI Updates**: Every 60 seconds in frontend for display

---

## 🎨 Visual Design

### 1. **Stamina Bar Component**

#### Location: Navigation Bar / Header
```
┌─────────────────────────────────────────────────────────┐
│  HabitHero                    ⚡ 85/100  [████████░░]   │
│                                                          │
│  Next stamina in: 2m 30s                                │
└─────────────────────────────────────────────────────────┘
```

#### Visual States

**Full Stamina (Green)**
```
⚡ 100/100  [████████████]  ✅ Ready to battle!
```
- Color: `#10b981` (green-500)
- Icon: ⚡ (lightning bolt)
- Status: "Ready to battle!"

**Medium Stamina (Yellow)**
```
⚡ 45/100  [████░░░░░░░░]  ⏳ Regenerating...
```
- Color: `#f59e0b` (yellow-500)
- Icon: ⚡
- Status: "Regenerating..."

**Low Stamina (Red)**
```
⚡ 8/100  [█░░░░░░░░░░░]  ⚠️ Low stamina!
```
- Color: `#ef4444` (red-500)
- Icon: ⚡
- Status: "Low stamina!"

**Empty Stamina (Gray)**
```
⚡ 0/100  [░░░░░░░░░░░░]  ❌ No stamina
```
- Color: `#6b7280` (gray-500)
- Icon: ⚡
- Status: "No stamina - Wait for regeneration"

#### Countdown Timer
```
Next stamina in: 2m 30s
```
- Updates every second
- Format: `Xm Ys` or `Xs` if less than 1 minute
- Color: Matches stamina bar color

### 2. **World Map Page Integration**

#### Monster Card States

**Unlocked + Has Stamina**
```
┌─────────────────────────────┐
│  🔥 Ember Imp               │
│  Level 1                    │
│  [Fight] ← Green button     │
└─────────────────────────────┘
```

**Unlocked + No Stamina**
```
┌─────────────────────────────┐
│  🔥 Ember Imp               │
│  Level 1                    │
│  ⚡ Need 10 stamina         │
│  [Fight] ← Grayed out       │
└─────────────────────────────┘
```

**Locked**
```
┌─────────────────────────────┐
│  🔒 Lava Mite               │
│  Level 2                    │
│  🔒 Locked                  │
└─────────────────────────────┘
```

#### Tooltip on Hover (No Stamina)
```
┌─────────────────────────────┐
│  ⚠️ Not enough stamina!     │
│                             │
│  Required: 10 stamina       │
│  Current: 5 stamina         │
│                             │
│  Next stamina in: 2m 30s    │
└─────────────────────────────┘
```

### 3. **Battle Entry Screen**

#### Before Battle Starts

**Sufficient Stamina**
```
┌─────────────────────────────────────────┐
│  ⚔️ Battle Arena                        │
│                                         │
│  Enemy: Ember Imp                       │
│  Stage: 1                               │
│                                         │
│  ⚡ Stamina Cost: 10                    │
│  Your Stamina: 85/100                   │
│                                         │
│  [Start Battle] ← Green button          │
└─────────────────────────────────────────┘
```

**Insufficient Stamina**
```
┌─────────────────────────────────────────┐
│  ⚔️ Battle Arena                        │
│                                         │
│  Enemy: Ember Imp                       │
│  Stage: 1                               │
│                                         │
│  ⚡ Stamina Cost: 10                    │
│  Your Stamina: 5/100  ❌                │
│                                         │
│  ⚠️ Not enough stamina!                 │
│  You need 5 more stamina                │
│  Next stamina in: 2m 30s                │
│                                         │
│  [Start Battle] ← Disabled (gray)       │
└─────────────────────────────────────────┘
```

### 4. **Stamina Consumption Animation**

#### When Battle Starts
```
1. User clicks "Start Battle"
2. Stamina bar animates: 85 → 75 (smooth decrease)
3. Lightning bolt icon flashes
4. Battle screen fades in
```

#### Animation Details
- **Duration**: 0.5 seconds
- **Effect**: Smooth number countdown + bar width decrease
- **Sound**: Optional "whoosh" or "energy drain" sound effect
- **Visual**: Lightning bolt pulses during consumption

### 5. **Stamina Regeneration Animation**

#### Passive Regeneration (Every Minute)
```
1. Timer counts down: "2m 30s" → "2m 29s" → ...
2. When stamina point regenerates:
   - Number increases: 45 → 46
   - Bar fills slightly
   - Subtle glow effect
   - Optional: Small "+1" popup
```

#### Visual Feedback
- **Glow Effect**: Subtle green glow around stamina bar
- **Number Animation**: Smooth count-up
- **Bar Fill**: Smooth width increase
- **Duration**: 0.3 seconds

### 6. **Mobile/Responsive Design**

#### Mobile Header (Collapsed)
```
┌─────────────────────────────┐
│  HabitHero    ⚡ 85/100     │
└─────────────────────────────┘
```

#### Mobile Header (Expanded on Tap)
```
┌─────────────────────────────┐
│  HabitHero                  │
│                             │
│  ⚡ Stamina: 85/100         │
│  [████████░░]               │
│                             │
│  Next: 2m 30s               │
└─────────────────────────────┘
```

---

## 🔧 Technical Implementation

### 1. **Data Model**

#### User Model Additions
```typescript
interface UserStats {
  // ... existing fields
  stamina?: number;              // Current stamina (0 to maxStamina)
  maxStamina?: number;           // Maximum stamina (cached from config)
  lastStaminaRegen?: number;     // Timestamp (ms) of last regeneration
}
```

#### Database Structure
```
users/{uid}/
  stats/
    stamina: 85
    maxStamina: 100
    lastStaminaRegen: 1704067200000
```

### 2. **API Endpoints**

#### `GET /users/{uid}/stamina`
**Response:**
```json
{
  "currentStamina": 85,
  "maxStamina": 100,
  "regenerationRate": 5,
  "nextRegenIn": 150000,
  "canBattle": true,
  "timeUntilFull": 450000
}
```

#### `POST /users/{uid}/stamina/consume`
**Request:**
```json
{
  "amount": 10
}
```
**Response:**
```json
{
  "success": true,
  "staminaBefore": 85,
  "staminaAfter": 75,
  "currentStamina": 75
}
```

#### Modified `POST /combat/start`
**New Flow:**
1. Check stamina (with regeneration)
2. Verify `stamina >= stageCost`
3. If insufficient: Return `403 Forbidden`
4. If sufficient: Consume stamina, create combat session

### 3. **Regeneration Calculation**

#### Backend Function
```typescript
function calculateCurrentStamina(
  currentStamina: number,
  maxStamina: number,
  lastRegen: number,
  regenRateMinutes: number
): { stamina: number; lastRegen: number } {
  const now = Date.now();
  const minutesPassed = (now - lastRegen) / 60000;
  const pointsToAdd = Math.floor(minutesPassed / regenRateMinutes);
  
  const newStamina = Math.min(maxStamina, currentStamina + pointsToAdd);
  const newLastRegen = lastRegen + (pointsToAdd * regenRateMinutes * 60000);
  
  return { stamina: newStamina, lastRegen: newLastRegen };
}
```

### 4. **Frontend Components**

#### StaminaBar Component
```typescript
interface StaminaBarProps {
  currentStamina: number;
  maxStamina: number;
  nextRegenIn?: number; // milliseconds
  showTimer?: boolean;
  size?: 'small' | 'medium' | 'large';
}
```

#### Usage Examples
```tsx
// In Navigation Bar
<StaminaBar 
  currentStamina={85} 
  maxStamina={100} 
  nextRegenIn={150000}
  showTimer={true}
  size="medium"
/>

// In Battle Entry Screen
<StaminaBar 
  currentStamina={5} 
  maxStamina={100} 
  stageCost={10}
  showTimer={true}
  size="large"
/>
```

---

## 🎮 User Experience Flow

### Scenario 1: Starting a Battle with Sufficient Stamina

```
1. User navigates to World Map
   → Sees stamina bar: "⚡ 85/100 [████████░░]"

2. User clicks on unlocked monster
   → Battle entry screen appears
   → Shows: "Stamina Cost: 10, Your Stamina: 85/100"

3. User clicks "Start Battle"
   → Stamina bar animates: 85 → 75
   → Battle screen loads
   → Battle begins
```

### Scenario 2: Insufficient Stamina

```
1. User navigates to World Map
   → Sees stamina bar: "⚡ 5/100 [█░░░░░░░░░░]"

2. User clicks on unlocked monster
   → Battle entry screen appears
   → Shows: "Stamina Cost: 10, Your Stamina: 5/100 ❌"
   → "Start Battle" button is disabled (grayed out)
   → Error message: "Not enough stamina! Need 5 more."

3. User hovers over disabled button
   → Tooltip shows: "Next stamina in: 2m 30s"

4. User waits for regeneration
   → Timer counts down: "2m 30s" → "2m 29s" → ...
   → When stamina reaches 10: Button becomes enabled
```

### Scenario 3: Stamina Regeneration

```
1. User has 45/100 stamina
   → Timer shows: "Next stamina in: 3m 15s"

2. User waits (doesn't battle)
   → Timer counts down every second
   → After 5 minutes: Stamina increases to 46
   → Bar animates: 45 → 46
   → Timer resets: "Next stamina in: 5m 0s"

3. User continues waiting
   → Stamina regenerates every 5 minutes
   → Eventually reaches 100/100 (full)
   → Timer shows: "Stamina full! ✅"
```

### Scenario 4: Multi-Round Battle

```
1. User has 50/100 stamina
   → Stage requires 10 stamina (has 2 monsters)

2. User starts battle
   → Stamina consumed: 50 → 40 (one-time cost)
   → Round 1 begins
   → User defeats first monster
   → Round 2 begins (no additional stamina cost)
   → User defeats second monster
   → Battle complete
   → Stamina remains at 40
```

---

## 📊 Configuration (Admin Panel)

### Current Admin Settings
Located in `GlobalSettings.tsx` → "Energy" tab:

```
┌─────────────────────────────────────────┐
│  Stamina System                         │
│                                         │
│  Max Stamina:        [100]              │
│  Regeneration Rate:  [5] minutes/point  │
│  Stage Cost:         [10] stamina       │
│                                         │
│  [Save Changes]                         │
└─────────────────────────────────────────┘
```

### Configuration Impact
- **Max Stamina**: How much stamina players can hold
- **Regeneration Rate**: How fast stamina regenerates (lower = faster)
- **Stage Cost**: How much stamina each battle costs

---

## 🎯 Design Principles

### 1. **Clarity**
- Always show current stamina and max stamina
- Clear visual feedback for all states
- Obvious when stamina is insufficient

### 2. **Transparency**
- Show exact stamina cost before battle
- Display time until next regeneration
- Clear error messages when blocked

### 3. **Non-Intrusive**
- Stamina bar is visible but not distracting
- Doesn't block gameplay unnecessarily
- Smooth animations that don't interrupt flow

### 4. **Fairness**
- Stamina consumed on battle start (not completion)
- Multi-round battles cost once
- Regeneration is passive and automatic

---

## 🚀 Future Enhancements (Optional)

### Potential Features
- **Stamina Potions**: Items that restore stamina instantly
- **Stamina Refill**: Premium currency to refill stamina
- **Stamina Boosters**: Temporary regeneration rate increases
- **Daily Stamina Bonus**: Extra stamina on login
- **Stamina Achievements**: Rewards for efficient stamina usage

---

## 📝 Summary

The Stamina System provides a balanced energy-based gating mechanism that:
- ✅ Limits battle frequency naturally
- ✅ Encourages strategic play
- ✅ Prevents excessive grinding
- ✅ Regenerates passively over time
- ✅ Provides clear visual feedback
- ✅ Integrates seamlessly with existing battle system

The visual design emphasizes clarity and user awareness, ensuring players always know their stamina status and when they can battle next.
