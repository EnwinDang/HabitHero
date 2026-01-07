import { db, auth } from "@/firebase";
import { doc, setDoc, getDoc, increment, updateDoc, collection, getDocs } from "firebase/firestore";

/**
 * Achievement Progress Service
 * Updates achievement progress in Firestore when user actions occur
 */

// Achievement IDs that can be tracked
export type AchievementId =
    | "first_task" | "task_master_10" | "task_master_50" | "task_master_100"
    | "focus_first" | "focus_10"
    | "streak_3" | "streak_7" | "streak_30"
    | "level_5" | "level_10" | "level_25";

// Achievement targets
const ACHIEVEMENT_TARGETS: Record<AchievementId, number> = {
    first_task: 1,
    task_master_10: 10,
    task_master_50: 50,
    task_master_100: 100,
    focus_first: 1,
    focus_10: 10,
    streak_3: 3,
    streak_7: 7,
    streak_30: 30,
    level_5: 5,
    level_10: 10,
    level_25: 25,
};

/**
 * Update achievement progress for a specific achievement
 */
export async function updateAchievementProgress(
    achievementId: AchievementId,
    newProgress: number
) {
    const user = auth.currentUser;
    if (!user) {
        console.error("No authenticated user for achievement update");
        return;
    }

    const target = ACHIEVEMENT_TARGETS[achievementId];
    const isUnlocked = newProgress >= target;

    const achievementRef = doc(db, "users", user.uid, "achievements", achievementId);

    console.log(`  📝 Updating achievement: ${achievementId}`);
    console.log(`     User: ${user.uid}`);
    console.log(`     Progress: ${newProgress}/${target}`);
    console.log(`     Unlocked: ${isUnlocked}`);
    console.log(`     Path: users/${user.uid}/achievements/${achievementId}`);

    try {
        await setDoc(achievementRef, {
            achievementId,
            progress: newProgress,
            isUnlocked,
            ...(isUnlocked ? { unlockedAt: Date.now() } : {}),
        }, { merge: true });

        if (isUnlocked) {
            console.log(`🏆 Achievement unlocked: ${achievementId}!`);
        } else {
            console.log(`📈 Achievement progress: ${achievementId} - ${newProgress}/${target}`);
        }
    } catch (error) {
        console.error(`❌ Failed to update achievement ${achievementId}:`, error);
    }
}

/**
 * Increment achievement progress by 1
 */
export async function incrementAchievementProgress(achievementId: AchievementId) {
    const user = auth.currentUser;
    if (!user) return;

    const achievementRef = doc(db, "users", user.uid, "achievements", achievementId);

    try {
        // Get current progress
        const achievementDoc = await getDoc(achievementRef);
        const currentProgress = achievementDoc.exists() ? (achievementDoc.data().progress || 0) : 0;
        const newProgress = currentProgress + 1;

        await updateAchievementProgress(achievementId, newProgress);
    } catch (error) {
        console.error("Failed to increment achievement:", error);
    }
}

/**
 * Check and update task-related achievements
 * Call this when a task is completed
 */
export async function onTaskCompleted(totalCompletedTasks: number) {
    // Update task achievements based on total completed
    if (totalCompletedTasks >= 1) {
        await updateAchievementProgress("first_task", totalCompletedTasks);
    }
    if (totalCompletedTasks >= 1) {
        await updateAchievementProgress("task_master_10", totalCompletedTasks);
    }
    if (totalCompletedTasks >= 1) {
        await updateAchievementProgress("task_master_50", totalCompletedTasks);
    }
    if (totalCompletedTasks >= 1) {
        await updateAchievementProgress("task_master_100", totalCompletedTasks);
    }
}

/**
 * Check and update focus-related achievements
 * Call this when a focus session is completed
 */
export async function onFocusSessionCompleted(totalFocusSessions: number) {
    console.log(`📊 onFocusSessionCompleted called with count: ${totalFocusSessions}`);

    if (totalFocusSessions >= 1) {
        console.log(`  → Updating focus_first with progress: ${totalFocusSessions}`);
        await updateAchievementProgress("focus_first", totalFocusSessions);
    }
    if (totalFocusSessions >= 1) {
        console.log(`  → Updating focus_10 with progress: ${totalFocusSessions}`);
        await updateAchievementProgress("focus_10", totalFocusSessions);
    }

    console.log(`✅ Focus achievements updated successfully`);
}

/**
 * Check and update streak achievements
 * Call this when streak is updated
 */
export async function onStreakUpdated(currentStreak: number) {
    await updateAchievementProgress("streak_3", currentStreak);
    await updateAchievementProgress("streak_7", currentStreak);
    await updateAchievementProgress("streak_30", currentStreak);
}

/**
 * Check and update level achievements
 * Call this when user levels up
 */
export async function onLevelUp(currentLevel: number) {
    await updateAchievementProgress("level_5", currentLevel);
    await updateAchievementProgress("level_10", currentLevel);
    await updateAchievementProgress("level_25", currentLevel);
}

/**
 * Sync all achievements from database with current user stats
 * This reads achievement conditions from Firestore and updates progress accordingly
 */
export async function syncAllAchievements(userStats: {
    streak?: number;
    xp?: number;
    focusSessionsCompleted?: number;
    tasksCompleted?: number;
    monstersDefeated?: number;
    [key: string]: any;
}, currentLevel: number) {
    const user = auth.currentUser;
    if (!user) return;

    try {
        // Get all achievement definitions from database
        const achievementsRef = collection(db, "achievements");
        const achievementsSnapshot = await getDocs(achievementsRef);

        console.log(`🔄 Syncing ${achievementsSnapshot.docs.length} achievements with user stats...`);

        // Process each achievement
        for (const achDoc of achievementsSnapshot.docs) {
            const achId = achDoc.id;
            const achData = achDoc.data();
            const condition = achData.condition;

            if (!condition) continue;

            let currentValue = 0;
            const targetValue = condition.value || condition.days || 1;

            // Special handling for streak achievements
            if (condition.type === "streak") {
                currentValue = userStats.streak || 0;
            }
            // Determine current value based on condition key
            else if (condition.key) {
                switch (condition.key) {
                    case "easy_tasks_completed":
                    case "medium_tasks_completed":
                    case "hard_tasks_completed":
                    case "extreme_tasks_completed":
                        // For now, use total tasks completed
                        // TODO: Track difficulty-specific task counts
                        currentValue = userStats.tasksCompleted || 0;
                        break;

                    case "pomodoro_completed":
                        currentValue = userStats.focusSessionsCompleted || 0;
                        break;

                    case "monsters_defeated":
                        currentValue = userStats.monstersDefeated || 0;
                        break;

                    case "days":
                        // Streak achievements
                        currentValue = userStats.streak || 0;
                        break;

                    default:
                        // Check if it's a direct stat key
                        if (condition.key in userStats) {
                            currentValue = userStats[condition.key] || 0;
                        }
                        break;
                }
            }

            // Special handling for module/world completion
            if (condition.type === "module_complete" || condition.type === "world_complete") {
                // These need special tracking - skip for now
                continue;
            }

            // Update achievement progress
            const isUnlocked = currentValue >= targetValue;
            const achievementRef = doc(db, "users", user.uid, "achievements", achId);

            await setDoc(achievementRef, {
                achievementId: achId,
                progress: currentValue,
                isUnlocked,
                ...(isUnlocked ? { unlockedAt: Date.now() } : {}),
            }, { merge: true });

            if (isUnlocked) {
                console.log(`  ✅ ${achId}: ${currentValue}/${targetValue} - UNLOCKED`);
            } else {
                console.log(`  📊 ${achId}: ${currentValue}/${targetValue}`);
            }
        }

        console.log(`✅ All achievements synced successfully`);
    } catch (error) {
        console.error("❌ Failed to sync achievements:", error);
    }
}

