import { auth } from "@/firebase";
import { AchievementsAPI } from "@/api/achievements.api";

/**
 * Achievement Progress Service
 * Updates achievement progress via API when user actions occur
 */

// Achievement IDs that can be tracked
export type AchievementId =
    | "first_task" | "task_master_10" | "task_master_50" | "task_master_100"
    | "focus_first" | "focus_10"
    | "streak_3" | "streak_7" | "streak_30"
    | "level_5" | "level_10" | "level_25";

// Achievement targets (fallback if not available from API)
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
 * Get target for an achievement (use hardcoded targets)
 */
function getAchievementTarget(achievementId: string): number {
    return ACHIEVEMENT_TARGETS[achievementId as AchievementId] || 1;
}

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

    try {
        // Get target from hardcoded list
        const target = getAchievementTarget(achievementId);
        const isUnlocked = newProgress >= target;

        console.log(`  📝 Updating achievement: ${achievementId}`);
        console.log(`     User: ${user.uid}`);
        console.log(`     Progress: ${newProgress}/${target}`);
        console.log(`     Unlocked: ${isUnlocked}`);

        // Update via API
        await AchievementsAPI.updateUserProgress(user.uid, achievementId, {
            progress: newProgress,
            isUnlocked,
            ...(isUnlocked ? { unlockedAt: Date.now() } : {}),
        });

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

    try {
        // Get current progress from API
        const userProgress = await AchievementsAPI.getUserProgress(user.uid);
        const currentProgress = userProgress.find(p => p.achievementId === achievementId)?.progress || 0;
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
