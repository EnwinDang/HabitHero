# Firestore Collections & Subcollections

## Collection Hierarchy

```
users/{uid}
├── tasks/{taskId}
├── achievements/{achievementId}
├── notifications/{notifId}
├── inventory/{itemId}
├── lootboxes/{lootboxId}
└── battleHistory/{battleId}

courses/{courseId}
├── students/{studentId}
└── modules/{moduleId}
    └── tasks/{taskId}
        └── submissions/{submissionId}
```

---

## Collections

### `users/{uid}`

**Document ID:** `{uid}` (Firebase Auth UID)

**Fields:**
- `uid` (string) - User ID
- `displayName` (string) - Display name
- `email` (string) - Email address
- `photoURL` (string | null) - Profile photo URL
- `heroType` (string | null) - "male" | "female"
- `role` (string) - "student" | "teacher" | "admin"
- `status` (string) - "active" | "disabled"
- `createdAt` (number) - Timestamp
- `lastLoginAt` (string) - YYYY-MM-DD format
- `stats` (map) - User statistics
  - `level` (number)
  - `xp` (number)
  - `totalXP` (number)
  - `nextLevelXP` (number)
  - `gold` (number)
  - `hp` (number)
  - `streak` (number)
  - `maxStreak` (number)
  - `gems` (number)
  - `stamina` (number)
  - `maxStamina` (number)
  - `battlesWon` (number)
  - `battlesPlayed` (number)
  - `monstersDefeated` (number)
  - `lootboxesOpened` (number)
  - `focusSessionsCompleted` (number)
  - `pomodoroStreak` (number)
  - `loginStreak` (number)
  - `totalStats` (map)
- `settings` (map) - User settings
  - `notificationsEnabled` (boolean)
  - `theme` (string) - "dark" | "light"
  - `language` (string)
- `worldMapProgress` (map) - World map progress
  - `[realmId]` (map)
    - `completedLevels` (array)
- `progression` (map) - Game progression
  - `monstersDefeated` (number)
  - `bossesDefeated` (number)
  - `currentStage` (number)
  - `currentWorldId` (string)
- `inventory` (map) - Inventory data
  - `inventory` (map)
    - `items` (array)
    - `lootboxes` (array)
  - `equiped` (map)
  - `equippedBonuses` (map)
  - `equippedStats` (map)

**Subcollections:**

#### `users/{uid}/tasks/{taskId}`
- Personal tasks copied from course tasks
- **Fields:** taskId, title, description, difficulty, xp, gold, completed, etc.

#### `users/{uid}/achievements/{achievementId}`
- User achievement progress
- **Fields:** achievementId, progress, completed, unlockedAt, etc.

#### `users/{uid}/notifications/{notifId}`
- User notifications
- **Fields:** notifId, type, message, read, createdAt, etc.

#### `users/{uid}/inventory/{itemId}`
- Items owned by user
- **Fields:** itemId, itemType, quantity, obtainedAt, etc.

#### `users/{uid}/lootboxes/{lootboxId}`
- Lootbox opening history
- **Fields:** lootboxId, openedAt, rewards, etc.

#### `users/{uid}/battleHistory/{battleId}`
- Battle history per user
- **Fields:** battleId, monsterId, result, xpGained, goldGained, timestamp, etc.

---

### `courses/{courseId}`

**Document ID:** `{courseId}`

**Fields:**
- `courseId` (string) - Course ID
- `name` (string) - Course name
- `description` (string | null) - Course description
- `courseCode` (string) - Unique enrollment code
- `startDate` (string | null) - Start date
- `endDate` (string | null) - End date
- `isActive` (boolean) - Active status
- `createdBy` (string) - Creator UID → `users.uid`
- `students` (map) - Student enrollment map
  - `[uid]` (boolean) - true if enrolled
- `createdAt` (number) - Timestamp
- `updatedAt` (number) - Timestamp

**Subcollections:**

#### `courses/{courseId}/students/{studentId}`
- Student enrollment records
- **Fields:**
  - `uid` (string) - Student UID → `users.uid`
  - `enrolledAt` (number) - Enrollment timestamp

#### `courses/{courseId}/modules/{moduleId}`
- Course modules
- **Fields:**
  - `moduleId` (string) - Module ID
  - `name` (string) - Module name
  - `title` (string) - Module title
  - `order` (number) - Display order
  - `description` (string | null)
  - `isActive` (boolean)

**Subcollections:**

##### `courses/{courseId}/modules/{moduleId}/tasks/{taskId}`
- Tasks within a module
- **Fields:**
  - `taskId` (string) - Task ID
  - `courseId` (string) - Course ID
  - `moduleId` (string) - Module ID
  - `title` (string) - Task title
  - `description` (string | null) - Task description
  - `difficulty` (string) - "easy" | "medium" | "hard" | "extreme"
  - `xp` (number) - XP reward
  - `gold` (number) - Gold reward
  - `date` (string) - Task date
  - `dueAt` (number | null) - Due date timestamp
  - `achievementTag` (string | null) - Achievement tag
  - `isRepeatable` (boolean) - Can be repeated
  - `isActive` (boolean) - Active status
  - `canvasUrl` (string | null) - Canvas URL
  - `createdAt` (number) - Timestamp
  - `completedAt` (number | null) - Completion timestamp
  - `claimedAt` (number | null) - Claim timestamp

**Subcollections:**

###### `courses/{courseId}/modules/{moduleId}/tasks/{taskId}/submissions/{submissionId}`
- Student submissions for tasks
- **Fields:**
  - `submissionId` (string) - Submission ID
  - `studentId` (string) - Student UID → `users.uid`
  - `taskId` (string) - Task ID
  - `courseId` (string) - Course ID
  - `moduleId` (string) - Module ID
  - `status` (string) - "pending" | "approved" | "rejected"
  - `imageUrl` (string | null) - Submission image URL
  - `comment` (string | null) - Student comment
  - `teacherComment` (string | null) - Teacher feedback
  - `createdAt` (number) - Submission timestamp
  - `updatedAt` (number) - Last update timestamp
  - `reviewedAt` (number | null) - Review timestamp
  - `reviewedBy` (string | null) - Reviewer UID → `users.uid`

---

### `taskProgress/{uid}`

**Document ID:** `{uid}` (User UID)

**Fields:**
- `uid` (string) - User UID → `users.uid`
- `taskId` (string) - Task ID
- `completed` (boolean) - Completion status
- `completedAt` (number | null) - Completion timestamp
- `progress` (number) - Progress percentage

---

### `tasks/{taskId}`

**Document ID:** `{taskId}`

**Fields:**
- Same as `courses/{courseId}/modules/{moduleId}/tasks/{taskId}`

---

### `achievements/{achievementId}`

**Document ID:** `{achievementId}`

**Fields:**
- `achievementId` (string) - Achievement ID
- `name` (string) - Achievement name
- `description` (string) - Achievement description
- `xpReward` (number) - XP reward
- `goldReward` (number) - Gold reward
- `icon` (string | null) - Icon URL
- `category` (string) - Achievement category
- `requirements` (map) - Achievement requirements

---

### `achievementProgress/{uid}`

**Document ID:** `{uid}` (User UID)

**Fields:**
- `uid` (string) - User UID → `users.uid`
- `achievementId` (string) - Achievement ID → `achievements.achievementId`
- `progress` (number) - Current progress
- `completed` (boolean) - Completion status
- `unlockedAt` (number | null) - Unlock timestamp

---

### `worlds/{worldId}`

**Document ID:** `{worldId}`

**Fields:**
- `worldId` (string) - World ID
- `id` (string) - World identifier
- `name` (string) - World name
- `description` (string | null) - World description
- `element` (string | null) - Element type
- `elementType` (string | null) - Element type (Fire, Water, Earth, Wind)
- `order` (number) - Display order
- `requiredLevel` (number) - Minimum level to unlock
- `isActive` (boolean) - Active status
- `stages` (array) - World stages

---

### `monsters/{monsterId}`

**Document ID:** `{monsterId}`

**Fields:**
- `monsterId` (string) - Monster ID
- `name` (string) - Monster name
- `worldId` (string) - World ID → `worlds.worldId`
- `hp` (number) - Hit points
- `attack` (number) - Attack power
- `defense` (number) - Defense
- `element` (string) - Element type
- `rarity` (string) - Rarity level
- `imageUrl` (string | null) - Monster image

---

### `pets/{petId}`

**Document ID:** `{petId}`

**Fields:**
- `petId` (string) - Pet ID
- `name` (string) - Pet name
- `description` (string | null)
- `stats` (map) - Pet statistics
- `rarity` (string) - Rarity level

---

### `lootboxes/{lootboxId}`

**Document ID:** `{lootboxId}`

**Fields:**
- `lootboxId` (string) - Lootbox ID
- `name` (string) - Lootbox name
- `rarity` (string) - Rarity level
- `rewards` (array) - Possible rewards
- `cost` (number) - Cost in gold/gems

---

### `inventories/{uid}`

**Document ID:** `{uid}` (User UID)

**Fields:**
- `uid` (string) - User UID → `users.uid`
- `items` (array) - Array of items
- `equipped` (map) - Equipped items
- `equippedBonuses` (map) - Equipped bonuses
- `equippedStats` (map) - Equipped stats

---

### Items Collections

#### `items/{itemId}`
- General items collection
- **Fields:** itemId, name, type, description, stats, rarity

#### `items_weapons/{itemId}`
- Weapon items
- **Fields:** itemId, name, attack, rarity, element, description

#### `items_armor/{itemId}`
- Armor items
- **Fields:** itemId, name, defense, rarity, element, description

#### `items_pets/{itemId}`
- Pet items
- **Fields:** itemId, name, stats, rarity, description

#### `items_accessories/{itemId}`
- Accessory items
- **Fields:** itemId, name, bonuses, rarity, description

#### `items_arcane/{itemId}`
- Arcane items
- **Fields:** itemId, name, effects, rarity, description

#### `items_misc/{itemId}`
- Miscellaneous items
- **Fields:** itemId, name, type, description

---

### Configuration Collections

#### `gameConfig/{docId}`
- General game configuration
- **Fields:**
  - `maxStamina` (number) - Maximum stamina
  - `staminaRegenRate` (number) - Stamina regeneration rate
  - `xpCurve` (map) - XP curve configuration
  - `goldMultiplier` (number) - Gold multiplier

#### `worldConfig/{docId}`
- World-specific configuration
- **Fields:** World-specific settings and rules

#### `levels/{levelId}`
- Level definitions
- **Fields:**
  - `level` (number) - Level number
  - `requiredXP` (number) - XP required for this level

#### `gameRules/{ruleId}`
- Game rules and mechanics
- **Fields:** Rule definitions and configurations

#### `rerollRules/{ruleId}`
- Item reroll rules
- **Fields:** Reroll mechanics and costs

#### `templates/{templateId}`
- Default player templates
- **Fields:** Template configurations

---

### Other Collections

#### `calendars/{uid}`
- User calendar events
- **Document ID:** `{uid}` (User UID)
- **Fields:** Events, tasks, deadlines

#### `leaderboards/{document=**}`
- Leaderboard data
- **Fields:** Rankings, scores, user data
- **Note:** Read-only, written by Cloud Functions

#### `logs`
- System logs
- **Fields:** Log entries, timestamps, actions

#### `__ids/{docId}`
- Internal ID generation
- **Note:** No direct access (read/write: false)

---

## Security Rules Summary

| Collection Type | Read | Write |
|----------------|------|-------|
| **User Data** | self/admin | self/admin |
| **Course Data** | auth | teacher/admin |
| **Game Data** | auth | admin |
| **Progress Data** | self | self |
| **Leaderboards** | auth | functions only |

**Legend:**
- `self` = own data only
- `auth` = all authenticated users
- `teacher/admin` = teachers and admins only
- `admin` = admins only
- `functions` = Cloud Functions only

---

**Project:** HabitHero - Erasmushogeschool Brussel
