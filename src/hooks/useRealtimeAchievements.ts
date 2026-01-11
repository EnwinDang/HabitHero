import { useEffect, useState, useCallback } from "react";
import { auth, db } from "@/firebase";
import { collection, query, onSnapshot, doc, setDoc, getDoc } from "firebase/firestore";
import { AchievementsAPI } from "@/api/achievements.api";
import type { Achievement } from "@/models/achievement.model";
import type { UserAchievementProgress } from "@/models/achievement.model";

export interface AchievementWithProgress {
    achievementId: string; // Catalog ID (e.g., "ach_extreme_1")
    progressId: string; // Mapped progress ID for backend (e.g., "first_task")
    title: string;
    description?: string | null;
    category?: string | null;
    icon?: string;
    reward?: {
        xp?: number;
        gold?: number;
    };
    progress: number;
    target: number;
    isUnlocked: boolean;
    unlockedAt?: number;
    claimed?: boolean;
    claimedAt?: number;
}

// Helper to map catalog achievement IDs to expected progress IDs
// This handles the mismatch between admin-created IDs (ach_*) and code-expected IDs (monster_10, etc.)
function mapAchievementId(catalogId: string, title?: string, description?: string): string {
    // If it already matches expected format, return as-is
    const expectedIds = [
        'first_task', 'task_master_10', 'task_master_50', 'task_master_100',
        'focus_first', 'focus_10',
        'streak_3', 'streak_7', 'streak_30',
        'level_5', 'level_10', 'level_25',
        'monster_first', 'monster_10', 'monster_50', 'monster_100'
    ];
    
    if (expectedIds.includes(catalogId)) {
        return catalogId;
    }
    
    // Normalize catalog ID for pattern matching
    const catalogIdLower = catalogId.toLowerCase();
    
    // Try to map based on catalog ID patterns FIRST (most reliable)
    // Monster achievements - check catalogId for "monster" or "monsters"
    if (catalogIdLower.includes('monster')) {
        if (catalogIdLower.match(/\b100\b/)) return 'monster_100';
        if (catalogIdLower.match(/\b50\b/)) return 'monster_50';
        if (catalogIdLower.match(/\b10\b/)) return 'monster_10';
        if (catalogIdLower.includes('first')) return 'monster_first';
        return 'monster_10'; // Default
    }
    
    // Focus/Pomodoro achievements - check catalogId
    if (catalogIdLower.includes('pomodoro') || catalogIdLower.includes('focus')) {
        if (catalogIdLower.match(/\b10\b/)) return 'focus_10';
        if (catalogIdLower.includes('first')) return 'focus_first';
        return 'focus_10'; // Default
    }
    
    // Task achievements - check catalogId for difficulty levels
    if (catalogIdLower.includes('easy') || catalogIdLower.includes('medium') || 
        catalogIdLower.includes('hard') || catalogIdLower.includes('extreme')) {
        // Extract number from catalogId (e.g., "ach_easy_10" -> 10, "ach_extreme_1" -> 1)
        // Try multiple patterns to catch different formats
        let numberMatch = catalogIdLower.match(/_(\d+)$/); // Match number at end (ach_easy_10)
        if (!numberMatch) {
            numberMatch = catalogIdLower.match(/_(\d+)_/); // Match number in middle
        }
        if (!numberMatch) {
            numberMatch = catalogIdLower.match(/\b(\d+)\b/); // Match any number
        }
        const number = numberMatch ? parseInt(numberMatch[1], 10) : 0;
        
        // Extract difficulty level
        let difficulty = '';
        if (catalogIdLower.includes('extreme')) difficulty = 'extreme';
        else if (catalogIdLower.includes('hard')) difficulty = 'hard';
        else if (catalogIdLower.includes('medium')) difficulty = 'medium';
        else if (catalogIdLower.includes('easy')) difficulty = 'easy';
        
        // Map based on number thresholds
        // For generic task achievements (no specific difficulty), use standard progress IDs
        if (number === 1 && !difficulty) {
            return 'first_task';
        }
        if (number >= 100 && !difficulty) {
            return 'task_master_100';
        }
        if (number >= 50 && !difficulty) {
            return 'task_master_50';
        }
        if (number >= 10 && !difficulty) {
            return 'task_master_10';
        }
        
        // For difficulty-specific achievements, create specific progress IDs
        // This allows each achievement to track progress independently
        if (difficulty && number > 0) {
            return `task_${difficulty}_${number}`;
        }
        
        // Fallback: if it's a "first" achievement, use first_task
        if (catalogIdLower.includes('first')) {
            return 'first_task';
        }
        
        // Default fallback
        return 'first_task';
    }
    
    // Streak achievements - check catalogId
    if (catalogIdLower.includes('streak')) {
        // Extract number from catalogId (e.g., "ach_streak_7" -> 7)
        // Try multiple patterns to catch different formats
        let numberMatch = catalogIdLower.match(/_(\d+)$/); // Match number at end (ach_streak_7)
        if (!numberMatch) {
            numberMatch = catalogIdLower.match(/_(\d+)_/); // Match number in middle
        }
        if (!numberMatch) {
            numberMatch = catalogIdLower.match(/\b(\d+)\b/); // Match any number
        }
        const number = numberMatch ? parseInt(numberMatch[1], 10) : 0;
        
        // Map based on extracted number
        if (number === 30) return 'streak_30';
        if (number === 7) return 'streak_7';
        if (number === 3) return 'streak_3';
        
        // Fallback: check for numbers in order: 30, 7, 3 (largest first to avoid partial matches)
        if (catalogIdLower.includes('30')) return 'streak_30';
        if (catalogIdLower.includes('7')) return 'streak_7';
        if (catalogIdLower.includes('3')) return 'streak_3';
        return 'streak_3'; // Default
    }
    
    // Level achievements - check catalogId
    if (catalogIdLower.includes('level')) {
        if (catalogIdLower.match(/\b25\b/)) return 'level_25';
        if (catalogIdLower.match(/\b10\b/)) return 'level_10';
        if (catalogIdLower.match(/\b5\b/)) return 'level_5';
        return 'level_5'; // Default
    }
    
    // Fallback: Try to map based on title/description keywords
    const titleLower = (title || '').toLowerCase();
    const descLower = (description || '').toLowerCase();
    const searchText = `${titleLower} ${descLower}`;
    
    // Focus achievements - check FIRST before tasks (since "voltooi" appears in both)
    if (searchText.includes('focus') || searchText.includes('pomodoro') || searchText.includes('sessie')) {
        if (searchText.match(/\b10\b/)) return 'focus_10';
        if (searchText.includes('first') || searchText.includes('eerste')) return 'focus_first';
        return 'focus_10'; // Default
    }
    
    // Monster achievements (fallback)
    if (searchText.includes('monster') || searchText.includes('versla')) {
        if (searchText.match(/\b100\b/)) return 'monster_100';
        if (searchText.match(/\b50\b/)) return 'monster_50';
        if (searchText.match(/\b10\b/)) return 'monster_10';
        if (searchText.includes('first') || searchText.includes('eerste')) return 'monster_first';
        return 'monster_10'; // Default
    }
    
    // Task achievements - check after focus to avoid false matches
    if (searchText.includes('task') || searchText.includes('challenge') || 
        searchText.includes('easy') || searchText.includes('medium') || 
        searchText.includes('hard') || searchText.includes('extreme')) {
        if (searchText.match(/\b100\b/)) return 'task_master_100';
        if (searchText.match(/\b50\b/)) return 'task_master_50';
        if (searchText.match(/\b10\b/)) return 'task_master_10';
        if (searchText.includes('first') || searchText.includes('eerste') || searchText.includes('een ')) return 'first_task';
        return 'task_master_10'; // Default
    }
    
    // Streak achievements (fallback)
    if (searchText.includes('streak') || searchText.includes('dagen')) {
        if (searchText.match(/\b30\b/)) return 'streak_30';
        if (searchText.match(/\b7\b/)) return 'streak_7';
        if (searchText.match(/\b3\b/)) return 'streak_3';
        return 'streak_3'; // Default
    }
    
    // Level achievements (fallback)
    if (searchText.includes('level') || searchText.includes('niveau')) {
        if (searchText.match(/\b25\b/)) return 'level_25';
        if (searchText.match(/\b10\b/)) return 'level_10';
        if (searchText.match(/\b5\b/)) return 'level_5';
        return 'level_5'; // Default
    }
    
    // Return original if no match found (for module/world achievements that don't have progress tracking)
    return catalogId;
}

// Helper to extract target from achievement condition or use default
function getTarget(achievement: Achievement): number {
    if (achievement.condition?.value) {
        return achievement.condition.value;
    }
    // Fallback: try to extract from achievementId (e.g., "task_master_10" -> 10)
    const match = achievement.achievementId.match(/_(\d+)$/);
    return match ? parseInt(match[1], 10) : 1;
}

// Helper to get icon from achievement
function getIcon(achievement: Achievement): string {
    // Try iconUnlocked first, then icon, then fallback to emoji based on category
    if (achievement.iconUnlocked) return achievement.iconUnlocked;
    if ((achievement as any).icon) return (achievement as any).icon;
    
    // Fallback emojis by category
    const categoryIcons: Record<string, string> = {
        Tasks: "🎯",
        Focus: "⏱️",
        Streak: "🔥",
        Level: "⭐",
        Monster: "⚔️",
        Combat: "⚔️",
    };
    return categoryIcons[achievement.category || ""] || "🏆";
}

// Helper to get category from achievement ID (for orphaned progress)
function getCategoryFromId(achievementId: string): string {
    if (achievementId.includes('task') || achievementId.includes('first_task')) return 'Tasks';
    if (achievementId.includes('focus')) return 'Focus';
    if (achievementId.includes('streak')) return 'Streak';
    if (achievementId.includes('level')) return 'Level';
    if (achievementId.includes('monster')) return 'Combat';
    return 'Other';
}

// Helper to get icon from achievement ID (for orphaned progress)
function getIconFromId(achievementId: string): string {
    if (achievementId.includes('task') || achievementId.includes('first_task')) return '🎯';
    if (achievementId.includes('focus')) return '⏱️';
    if (achievementId.includes('streak')) return '🔥';
    if (achievementId.includes('level')) return '⭐';
    if (achievementId.includes('monster')) return '⚔️';
    return '🏆';
}

// Helper to get target from achievement ID (for orphaned progress)
function getTargetFromId(achievementId: string): number {
    // Extract number from ID (e.g., "monster_10" -> 10, "streak_7" -> 7)
    const match = achievementId.match(/_(\d+)$/);
    if (match) {
        return parseInt(match[1], 10);
    }
    // Default targets for known achievements
    if (achievementId.includes('first')) return 1;
    if (achievementId.includes('_3')) return 3;
    if (achievementId.includes('_5')) return 5;
    if (achievementId.includes('_7')) return 7;
    if (achievementId.includes('_10')) return 10;
    if (achievementId.includes('_25')) return 25;
    if (achievementId.includes('_30')) return 30;
    if (achievementId.includes('_50')) return 50;
    if (achievementId.includes('_100')) return 100;
    return 1;
}

export function useRealtimeAchievements() {
    const [achievements, setAchievements] = useState<AchievementWithProgress[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const user = auth.currentUser;
        if (!user) {
            setAchievements([]);
            setLoading(false);
            return;
        }

        let catalog: Achievement[] = [];
        let userProgress: UserAchievementProgress[] = [];
        let catalogLoaded = false;
        let progressLoaded = false;
        let initializationChecked = false; // Track if we've already initialized missing progress documents

        // Helper to initialize missing progress documents for all catalog achievements
        const initializeMissingProgress = async () => {
            if (initializationChecked) return; // Only run once
            initializationChecked = true;

            const progressMap = new Map<string, UserAchievementProgress>();
            userProgress.forEach((progress) => {
                progressMap.set(progress.achievementId, progress);
            });

               // Find catalog achievements that don't have progress documents
               const missingProgress: Array<{ catalogAchievement: Achievement; progressId: string }> = [];
               
               catalog.forEach((achievement) => {
                   // Use the catalog ID directly as the progress ID (same name in both collections)
                   const progressId = achievement.achievementId;
                   if (!progressMap.has(progressId)) {
                       missingProgress.push({ catalogAchievement: achievement, progressId });
                   }
               });

            if (missingProgress.length === 0) {
                console.log("✅ All catalog achievements have progress documents");
                return;
            }

            console.log(`🔧 Initializing ${missingProgress.length} missing progress documents...`);

            // Create progress documents for missing achievements
            const initPromises = missingProgress.map(async ({ catalogAchievement, progressId }) => {
                const target = getTarget(catalogAchievement);
                const progressRef = doc(db, "users", user.uid, "achievements", progressId);
                
                // Double-check it doesn't exist (race condition protection)
                const existingDoc = await getDoc(progressRef);
                if (existingDoc.exists()) {
                    console.log(`⏭️ Progress document already exists: ${progressId}`);
                    return;
                }

                const initialProgress: UserAchievementProgress = {
                    achievementId: progressId,
                    progress: 0,
                    isUnlocked: false,
                    claimed: false,
                };

                await setDoc(progressRef, initialProgress);
                console.log(`✅ Created progress document: ${progressId} (target: ${target})`);
            });

            try {
                await Promise.all(initPromises);
                console.log(`✅ Successfully initialized ${missingProgress.length} progress documents`);
            } catch (error) {
                console.error("❌ Error initializing progress documents:", error);
            }
        };

        // Helper to merge and update achievements
        const mergeAndUpdate = async () => {
            if (!catalogLoaded || !progressLoaded) return;

            // Initialize missing progress documents first (only once)
            await initializeMissingProgress();

            const progressMap = new Map<string, UserAchievementProgress>();
            userProgress.forEach((progress) => {
                progressMap.set(progress.achievementId, progress);
            });

            // Log all catalog achievements for debugging
            console.log("📋 All achievements in catalog:", catalog.map(a => ({
                id: a.achievementId,
                title: a.title,
                category: a.category
            })));
            console.log("📋 Catalog count:", catalog.length);
            
            // Log all user progress documents for debugging
            const progressKeys = Array.from(progressMap.keys());
            console.log("📊 All user progress documents:", progressKeys);
            console.log("📊 Progress count:", progressKeys.length);
            
            // Check for progress documents without catalog entries
            const catalogIds = new Set(catalog.map(a => a.achievementId));
            const orphanedProgress = progressKeys.filter(key => !catalogIds.has(key));
            if (orphanedProgress.length > 0) {
                console.warn("⚠️ Progress documents without catalog entries:", orphanedProgress);
            }
            
            // Check for catalog entries without progress
            const catalogWithoutProgress = catalog.filter(a => !progressMap.has(a.achievementId));
            if (catalogWithoutProgress.length > 0) {
                console.log("ℹ️ Catalog entries without progress documents:", catalogWithoutProgress.map(a => a.achievementId));
            }
            
            // Step 1: Merge catalog achievements with user progress
            const catalogAchievementsMap = new Map<string, AchievementWithProgress>();
            const catalogMappedIds = new Set<string>();
            
            catalog.forEach((achievement) => {
                // Use the catalog ID directly as the progress ID (no mapping needed)
                // Both collections use the same document IDs
                const progressId = achievement.achievementId;
                const progress = progressMap.get(progressId);
                const target = getTarget(achievement);
                const progressValue = progress?.progress || 0;
                // Calculate isUnlocked based on THIS achievement's target
                const isUnlocked = progressValue >= target;
                
                // Track which progress IDs are from catalog
                catalogMappedIds.add(progressId);
                
                // Check if this achievement is claimed
                const isClaimed = progress?.claimed || false;

                catalogAchievementsMap.set(achievement.achievementId, {
                    achievementId: achievement.achievementId, // Catalog ID (same as progress ID)
                    progressId: progressId, // Same as achievementId
                    title: achievement.title,
                    description: achievement.description,
                    category: achievement.category || "Other",
                    icon: getIcon(achievement),
                    reward: achievement.reward,
                    target,
                    progress: progressValue,
                    isUnlocked,
                    unlockedAt: progress?.unlockedAt,
                    claimed: isClaimed,
                    claimedAt: progress?.claimedAt,
                });
            });

            // Only show achievements from the catalog (matching the database exactly)
            const mergedAchievements = Array.from(catalogAchievementsMap.values());
            setAchievements(mergedAchievements);
            setLoading(false);
            console.log("🏆 Achievements updated from Firestore:", mergedAchievements.length);
            console.log("📋 Final merged achievements list:", mergedAchievements.map(a => ({
                id: a.achievementId,
                title: a.title,
                category: a.category,
                progress: a.progress,
                target: a.target
            })));
        };

        // Listen to achievements catalog
        const catalogRef = collection(db, "achievements");
        const catalogQuery = query(catalogRef);
        const unsubscribeCatalog = onSnapshot(
            catalogQuery,
            async (snapshot) => {
                catalog = snapshot.docs.map((doc) => ({
                    achievementId: doc.id,
                    ...doc.data(),
                })) as Achievement[];
                catalogLoaded = true;
                console.log("📚 Achievements catalog updated:", catalog.length);
                await mergeAndUpdate();
            },
            (err) => {
                console.error("❌ Firestore catalog listener error:", err);
                setError("Could not load achievements catalog");
                setLoading(false);
            }
        );

        // Listen to user's achievement progress
        const progressRef = collection(db, "users", user.uid, "achievements");
        const progressQuery = query(progressRef);
        const unsubscribeProgress = onSnapshot(
            progressQuery,
            async (snapshot) => {
                userProgress = snapshot.docs.map((doc) => ({
                    achievementId: doc.id,
                    ...doc.data(),
                })) as UserAchievementProgress[];
                progressLoaded = true;
                console.log("📊 User progress updated:", userProgress.length);
                await mergeAndUpdate();
            },
            (err) => {
                console.error("❌ Firestore progress listener error:", err);
                setError("Could not load user progress");
                setLoading(false);
            }
        );

        // Cleanup listeners
        return () => {
            console.log("🔌 Disconnecting achievement listeners");
            unsubscribeCatalog();
            unsubscribeProgress();
        };
    }, []);

    // Refetch is no longer needed with realtime listeners, but kept for compatibility
    const refetch = useCallback(() => {
        // Realtime listeners automatically update, so this is a no-op
        console.log("🔄 Refetch called, but using realtime listeners (no-op)");
    }, []);

    return { achievements, loading, error, refetch };
}
