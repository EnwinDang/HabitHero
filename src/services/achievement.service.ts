import { auth, db } from "@/firebase";
import { AchievementsAPI } from "@/api/achievements.api";
import { doc, setDoc, getDoc } from "firebase/firestore";

/**
 * Achievement Progress Service
 * Updates achievement progress via API when user actions occur
 */

// Achievement IDs that can be tracked
export type AchievementId =
    | "first_task" | "task_master_10" | "task_master_50" | "task_master_100"
    | "focus_first" | "focus_10"
    | "streak_3" | "streak_7" | "streak_30"
    | "level_5" | "level_10" | "level_25"
    | "monster_first" | "monster_10" | "monster_50" | "monster_100";

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
    monster_first: 1,
    monster_10: 10,
    monster_50: 50,
    monster_100: 100,
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
 * Writes directly to Firestore (same as monster achievements)
 */
export async function onFocusSessionCompleted(totalFocusSessions: number) {
    const user = auth.currentUser;
    if (!user) {
        console.error("No authenticated user for focus achievement update");
        return;
    }

    console.log(`📊 onFocusSessionCompleted called with count: ${totalFocusSessions}`);

    try {
        // Update both focus achievements directly in Firestore
        await Promise.all([
            updateFocusAchievementDirect(user.uid, "focus_first", totalFocusSessions, 1),
            updateFocusAchievementDirect(user.uid, "focus_10", totalFocusSessions, 10),
        ]);

        console.log(`✅ Focus achievements updated successfully in Firestore`);
    } catch (error) {
        console.error("❌ Failed to update focus achievements:", error);
    }
}

/**
 * Update focus achievement progress directly in Firestore
 */
async function updateFocusAchievementDirect(
    uid: string,
    achievementId: string,
    newProgress: number,
    target: number
): Promise<void> {
    try {
        const isUnlocked = newProgress >= target;
        const achievementRef = doc(db, "users", uid, "achievements", achievementId);
        
        // Check if document exists
        const existingDoc = await getDoc(achievementRef);
        const existingData = existingDoc.exists() ? existingDoc.data() : {};
        
        // Don't decrease progress or lock an already unlocked achievement
        const currentProgress = existingData.progress || 0;
        const currentUnlocked = existingData.isUnlocked || false;
        
        const updateData: any = {
            achievementId,
            progress: Math.max(newProgress, currentProgress), // Never decrease progress
            isUnlocked: currentUnlocked || isUnlocked, // Once unlocked, stay unlocked
            updatedAt: Date.now(),
        };
        
        // Set unlockedAt if just unlocked
        if (isUnlocked && !currentUnlocked) {
            updateData.unlockedAt = Date.now();
        } else if (existingData.unlockedAt) {
            updateData.unlockedAt = existingData.unlockedAt; // Preserve existing unlockedAt
        }

        await setDoc(achievementRef, updateData, { merge: true });
        
        if (isUnlocked && !currentUnlocked) {
            console.log(`🏆 Focus achievement unlocked: ${uid} - ${achievementId}!`);
        }
    } catch (error) {
        console.error(`❌ Failed to update focus achievement ${achievementId} for user ${uid}:`, error);
        throw error;
    }
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
 * Check and update monster defeat achievements
 * Call this when a monster is defeated
 */
export async function onMonsterDefeated(totalMonstersDefeated: number) {
    await updateAchievementProgress("monster_first", totalMonstersDefeated);
    await updateAchievementProgress("monster_10", totalMonstersDefeated);
    await updateAchievementProgress("monster_50", totalMonstersDefeated);
    await updateAchievementProgress("monster_100", totalMonstersDefeated);
}
