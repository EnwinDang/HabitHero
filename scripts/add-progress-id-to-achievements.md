# Add progressId to Existing Achievements

This script helps you add the `progressId` field to existing achievements in Firebase.

## Manual Update in Firebase Console

1. Go to Firebase Console → Firestore Database
2. Navigate to the `achievements` collection
3. For each achievement document, add a `progressId` field with the appropriate value:

### Mapping Reference:

```
ach_easy_10          → progressId: "task_master_10" (generic: complete 10 tasks)
ach_extreme_1        → progressId: "task_extreme_1" (complete 1 extreme task)
ach_hard_3           → progressId: "task_hard_3" (complete 3 hard tasks)
ach_medium_5         → progressId: "task_medium_5" (complete 5 medium tasks)
ach_monsters_10      → progressId: "monster_10"
ach_pomodoro_10      → progressId: "focus_10"
ach_streak_7         → progressId: "streak_7"
ach_module_1_complete → progressId: "ach_module_1_complete" (or create new progress ID)
ach_module_2_complete → progressId: "ach_module_2_complete" (or create new progress ID)
ach_world_1_complete → progressId: "ach_world_1_complete" (or create new progress ID)
```

**Note:** Difficulty-specific achievements (extreme, hard, medium) now have their own progress IDs to track progress independently. This prevents issues where achievements with different targets (e.g., 1, 3, 5) were incorrectly sharing the same progress document.

## Using Firebase CLI (Alternative)

You can also use the Firebase CLI to update documents:

```bash
# Example: Update ach_extreme_1
firebase firestore:update achievements/ach_extreme_1 --data '{"progressId":"first_task"}'
```

## After Updating

Once you've added the `progressId` field to all achievements:
- The code will automatically use the explicit `progressId` field
- The mapping function will only be used as a fallback for achievements without `progressId`
- This makes the system more maintainable and less error-prone
