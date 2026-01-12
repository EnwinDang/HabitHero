import { auth, db } from "@/firebase";
import { AchievementsAPI } from "@/api/achievements.api";
import { doc, setDoc, getDoc, collection, query, where, getDocs } from "firebase/firestore";

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
 * Updates all task achievements from the catalog
 * NOTE: This function is deprecated - backend handles task achievement updates now
 * Keeping for backwards compatibility but it should not be called
 */
export async function onTaskCompleted(totalCompletedTasks: number) {
    const user = auth.currentUser;
    if (!user) {
        console.error("No authenticated user for task achievement update");
        return;
    }

    console.warn(`⚠️ onTaskCompleted called - this should be handled by backend now. Count: ${totalCompletedTasks}`);
    
    // Note: Backend now handles task achievement updates in /tasks/{taskId}/claim and /tasks/{taskId}/complete
    // This function is kept for backwards compatibility but should not be used
    // If you need to update achievements, use the backend endpoints instead
}

/**
 * Check and update focus-related achievements
 * Call this when a focus session is completed
 * Updates all focus/pomodoro achievements from the catalog
 */
export async function onFocusSessionCompleted(totalFocusSessions: number) {
    const user = auth.currentUser;
    if (!user) {
        console.error("No authenticated user for focus achievement update");
        return;
    }

    console.log(`📊 onFocusSessionCompleted called with count: ${totalFocusSessions}`);

    try {
        // Query catalog for all focus/pomodoro achievements
        const achievementsRef = collection(db, "achievements");
        const snapshot = await getDocs(achievementsRef);
        
        const focusAchievements = snapshot.docs
            .map(doc => ({
                achievementId: doc.id,
                ...doc.data()
            }))
            .filter((achievement: any) => {
                const category = (achievement.category || "").toLowerCase();
                const id = (achievement.achievementId || "").toLowerCase();
                return category === "focus" || category === "productivity" || category === "pomodoro" ||
                       id.includes("focus") || id.includes("pomodoro");
            });

        // Update all focus achievements
        await Promise.all(
            focusAchievements.map(async (achievement) => {
                const target = (achievement as any).condition?.value || 1;
                await updateFocusAchievementDirect(user.uid, achievement.achievementId, totalFocusSessions, target);
            })
        );

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
        const currentProgress = existingData?.progress || 0;
        const currentUnlocked = existingData?.isUnlocked || false;
        
        const updateData: any = {
            achievementId,
            progress: Math.max(newProgress, currentProgress), // Never decrease progress
            isUnlocked: currentUnlocked || isUnlocked, // Once unlocked, stay unlocked
            updatedAt: Date.now(),
        };
        
        // Set unlockedAt if just unlocked
        if (isUnlocked && !currentUnlocked) {
            updateData.unlockedAt = Date.now();
        } else if (existingData?.unlockedAt) {
            updateData.unlockedAt = existingData?.unlockedAt; // Preserve existing unlockedAt
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
 * Update streak achievement progress directly in Firestore
 * Similar to updateFocusAchievementDirect and updateMonsterAchievementDirect
 */
async function updateStreakAchievementDirect(
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
        const currentProgress = (existingData?.progress as number) || 0;
        const currentUnlocked = (existingData?.isUnlocked as boolean) || false;
        
        const updateData: any = {
            achievementId,
            progress: Math.max(newProgress, currentProgress), // Never decrease progress
            isUnlocked: currentUnlocked || isUnlocked, // Once unlocked, stay unlocked
            updatedAt: Date.now(),
        };
        
        // Set unlockedAt if just unlocked
        if (isUnlocked && !currentUnlocked) {
            updateData.unlockedAt = Date.now();
        } else if (existingData?.unlockedAt) {
            updateData.unlockedAt = existingData?.unlockedAt; // Preserve existing unlockedAt
        }

        await setDoc(achievementRef, updateData, { merge: true });
        
        if (isUnlocked && !currentUnlocked) {
            console.log(`🏆 Streak achievement unlocked: ${achievementId}!`);
        }
    } catch (error) {
        console.error(`❌ Failed to update streak achievement ${achievementId} for user ${uid}:`, error);
        throw error;
    }
}

/**
 * Check and update streak achievements
 * Call this when streak is updated (from Pomodoro sessions or login)
 * Updates streak achievements from the catalog based on streak type
 * @param currentStreak - Current streak value
 * @param streakType - 'pomodoro' for pomodoro streak, 'login' for login streak
 */
export async function onStreakUpdated(currentStreak: number, streakType?: 'pomodoro' | 'login') {
    const user = auth.currentUser;
    if (!user) {
        console.error("No authenticated user for streak achievement update");
        return;
    }

    const streakTypeToUse = streakType || 'pomodoro'; // Default to pomodoro for backwards compatibility
    console.log(`📊 onStreakUpdated called with streak: ${currentStreak}, type: ${streakTypeToUse}`);

    try {
        // Query catalog for all streak achievements
        const achievementsRef = collection(db, "achievements");
        const snapshot = await getDocs(achievementsRef);
        
        const allStreakAchievements = snapshot.docs
            .map(doc => ({
                achievementId: doc.id,
                ...doc.data()
            }))
            .filter((achievement: any) => {
                const category = (achievement.category || "").toLowerCase();
                const id = (achievement.achievementId || "").toLowerCase();
                const title = (achievement.title || "").toLowerCase();
                return category === "streak" || id.includes("streak");
            });

        // Filter achievements based on streak type
        // Login streak achievements: "consistent hero", "login", or achievement IDs with "login"
        // Pomodoro streak achievements: everything else
        const streakAchievements = allStreakAchievements.filter((achievement: any) => {
            if (streakTypeToUse === 'login') {
                const id = (achievement.achievementId || "").toLowerCase();
                const title = (achievement.title || "").toLowerCase();
                return id.includes("login") || id.includes("consistent") || 
                       title.includes("consistent") || title.includes("hero");
            } else {
                // Pomodoro streak: exclude login-specific achievements
                const id = (achievement.achievementId || "").toLowerCase();
                const title = (achievement.title || "").toLowerCase();
                return !(id.includes("login") || id.includes("consistent") || 
                        title.includes("consistent") || title.includes("hero"));
            }
        });

        // Update filtered streak achievements
        await Promise.all(
            streakAchievements.map(async (achievement) => {
                const target = (achievement as any).condition?.value || 1;
                await updateStreakAchievementDirect(user.uid, achievement.achievementId, currentStreak, target);
            })
        );

        console.log(`✅ ${streakTypeToUse} streak achievements updated successfully in Firestore (${streakAchievements.length} achievements)`);
    } catch (error) {
        console.error("❌ Failed to update streak achievements:", error);
    }
}

/**
 * Check and update level achievements
 * Call this when user levels up
 * Updates all level achievements from the catalog
 */
export async function onLevelUp(currentLevel: number) {
    const user = auth.currentUser;
    if (!user) {
        console.error("No authenticated user for level achievement update");
        return;
    }

    console.log(`📊 onLevelUp called with level: ${currentLevel}`);

    try {
        // Query catalog for all level achievements
        const achievementsRef = collection(db, "achievements");
        const snapshot = await getDocs(achievementsRef);
        
        const levelAchievements = snapshot.docs
            .map(doc => ({
                achievementId: doc.id,
                ...doc.data()
            }))
            .filter((achievement: any) => {
                const category = (achievement.category || "").toLowerCase();
                const id = (achievement.achievementId || "").toLowerCase();
                return category === "level" || id.includes("level");
            });

        // Update all level achievements
        await Promise.all(
            levelAchievements.map(async (achievement) => {
                const target = (achievement as any).condition?.value || 1;
                await updateLevelAchievementDirect(user.uid, achievement.achievementId, currentLevel, target);
            })
        );

        console.log(`✅ Level achievements updated successfully in Firestore`);
    } catch (error) {
        console.error("❌ Failed to update level achievements:", error);
    }
}

/**
 * Update level achievement progress directly in Firestore
 */
async function updateLevelAchievementDirect(
    uid: string,
    achievementId: string,
    newProgress: number,
    target: number
): Promise<void> {
    try {
        const isUnlocked = newProgress >= target;
        const achievementRef = doc(db, "users", uid, "achievements", achievementId);
        
        const existingDoc = await getDoc(achievementRef);
        const existingData = existingDoc.exists() ? existingDoc.data() : {};
        
        const currentProgress = (existingData?.progress as number) || 0;
        const currentUnlocked = (existingData?.isUnlocked as boolean) || false;
        
        const updateData: any = {
            achievementId,
            progress: Math.max(newProgress, currentProgress),
            isUnlocked: currentUnlocked || isUnlocked,
            updatedAt: Date.now(),
        };
        
        if (isUnlocked && !currentUnlocked) {
            updateData.unlockedAt = Date.now();
        } else if (existingData?.unlockedAt) {
            updateData.unlockedAt = existingData?.unlockedAt;
        }

        await setDoc(achievementRef, updateData, { merge: true });
        
        if (isUnlocked && !currentUnlocked) {
            console.log(`🏆 Level achievement unlocked: ${achievementId}!`);
        }
    } catch (error) {
        console.error(`❌ Failed to update level achievement ${achievementId} for user ${uid}:`, error);
        throw error;
    }
}

/**
 * Check and update monster defeat achievements
 * Call this when a monster is defeated
 * Updates all monster/combat achievements from the catalog
 */
export async function onMonsterDefeated(totalMonstersDefeated: number) {
    const user = auth.currentUser;
    if (!user) {
        console.error("No authenticated user for monster achievement update");
        return;
    }

    console.log(`📊 onMonsterDefeated called with count: ${totalMonstersDefeated}`);

    try {
        // Query catalog for all monster/combat achievements
        const achievementsRef = collection(db, "achievements");
        const snapshot = await getDocs(achievementsRef);
        
        const monsterAchievements = snapshot.docs
            .map(doc => ({
                achievementId: doc.id,
                ...doc.data()
            }))
            .filter((achievement: any) => {
                const category = (achievement.category || "").toLowerCase();
                const id = (achievement.achievementId || "").toLowerCase();
                return category === "monster" || category === "combat" ||
                       id.includes("monster") || id.includes("monsters");
            });

        // Update all monster achievements
        await Promise.all(
            monsterAchievements.map(async (achievement) => {
                const target = (achievement as any).condition?.value || 1;
                await updateMonsterAchievementDirect(user.uid, achievement.achievementId, totalMonstersDefeated, target);
            })
        );

        console.log(`✅ Monster achievements updated successfully in Firestore`);
    } catch (error) {
        console.error("❌ Failed to update monster achievements:", error);
    }
}

/**
 * Update monster achievement progress directly in Firestore
 */
async function updateMonsterAchievementDirect(
    uid: string,
    achievementId: string,
    newProgress: number,
    target: number
): Promise<void> {
    try {
        const isUnlocked = newProgress >= target;
        const achievementRef = doc(db, "users", uid, "achievements", achievementId);
        
        const existingDoc = await getDoc(achievementRef);
        const existingData = existingDoc.exists() ? existingDoc.data() : {};
        
        const currentProgress = (existingData?.progress as number) || 0;
        const currentUnlocked = (existingData?.isUnlocked as boolean) || false;
        
        const updateData: any = {
            achievementId,
            progress: Math.max(newProgress, currentProgress),
            isUnlocked: currentUnlocked || isUnlocked,
            updatedAt: Date.now(),
        };
        
        if (isUnlocked && !currentUnlocked) {
            updateData.unlockedAt = Date.now();
        } else if (existingData?.unlockedAt) {
            updateData.unlockedAt = existingData?.unlockedAt;
        }

        await setDoc(achievementRef, updateData, { merge: true });
        
        if (isUnlocked && !currentUnlocked) {
            console.log(`🏆 Monster achievement unlocked: ${achievementId}!`);
        }
    } catch (error) {
        console.error(`❌ Failed to update monster achievement ${achievementId} for user ${uid}:`, error);
        throw error;
    }
}

/**
 * Update task achievement progress directly in Firestore
 */
async function updateTaskAchievementDirect(
    uid: string,
    achievementId: string,
    newProgress: number,
    target: number
): Promise<void> {
    try {
        const isUnlocked = newProgress >= target;
        const achievementRef = doc(db, "users", uid, "achievements", achievementId);
        
        const existingDoc = await getDoc(achievementRef);
        const existingData = existingDoc.exists() ? existingDoc.data() : {};
        
        const currentProgress = (existingData?.progress as number) || 0;
        const currentUnlocked = (existingData?.isUnlocked as boolean) || false;
        
        const updateData: any = {
            achievementId,
            progress: Math.max(newProgress, currentProgress),
            isUnlocked: currentUnlocked || isUnlocked,
            updatedAt: Date.now(),
        };
        
        if (isUnlocked && !currentUnlocked) {
            updateData.unlockedAt = Date.now();
        } else if (existingData?.unlockedAt) {
            updateData.unlockedAt = existingData?.unlockedAt;
        }

        await setDoc(achievementRef, updateData, { merge: true });
        
        if (isUnlocked && !currentUnlocked) {
            console.log(`🏆 Task achievement unlocked: ${achievementId}!`);
        }
    } catch (error) {
        console.error(`❌ Failed to update task achievement ${achievementId} for user ${uid}:`, error);
        throw error;
    }
}
