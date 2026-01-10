import { useEffect, useState, useCallback } from "react";
import { auth, db } from "@/firebase";
import { collection, query, onSnapshot } from "firebase/firestore";
import { AchievementsAPI } from "@/api/achievements.api";
import type { Achievement } from "@/models/achievement.model";
import type { UserAchievementProgress } from "@/models/achievement.model";

export interface AchievementWithProgress {
    achievementId: string;
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
    
    // Try to map based on title/description keywords
    const titleLower = (title || '').toLowerCase();
    const descLower = (description || '').toLowerCase();
    const searchText = `${titleLower} ${descLower}`;
    
    // Focus achievements - check FIRST before tasks (since "voltooi" appears in both)
    if (searchText.includes('focus') || searchText.includes('pomodoro') || searchText.includes('sessie') || catalogId.includes('pomodoro')) {
        if (searchText.match(/\b10\b/) || catalogId.includes('10')) return 'focus_10';
        if (searchText.includes('first') || searchText.includes('eerste') || catalogId.includes('first')) return 'focus_first';
        return 'focus_10'; // Default
    }
    
    // Monster achievements
    if (searchText.includes('monster') || searchText.includes('versla')) {
        if (searchText.match(/\b10\b/)) return 'monster_10';
        if (searchText.match(/\b50\b/)) return 'monster_50';
        if (searchText.match(/\b100\b/)) return 'monster_100';
        if (searchText.includes('first') || searchText.includes('eerste')) return 'monster_first';
        return 'monster_10'; // Default
    }
    
    // Task achievements - check after focus to avoid false matches
    if (searchText.includes('task') || searchText.includes('challenge') || searchText.includes('easy') || searchText.includes('medium') || searchText.includes('hard') || searchText.includes('extreme')) {
        if (searchText.match(/\b10\b/)) return 'task_master_10';
        if (searchText.match(/\b50\b/)) return 'task_master_50';
        if (searchText.match(/\b100\b/)) return 'task_master_100';
        if (searchText.includes('first') || searchText.includes('eerste') || searchText.includes('een ')) return 'first_task';
        return 'task_master_10'; // Default
    }
    
    // Streak achievements
    if (searchText.includes('streak') || searchText.includes('dagen')) {
        if (searchText.match(/\b3\b/)) return 'streak_3';
        if (searchText.match(/\b7\b/)) return 'streak_7';
        if (searchText.match(/\b30\b/)) return 'streak_30';
        return 'streak_3'; // Default
    }
    
    // Level achievements
    if (searchText.includes('level') || searchText.includes('niveau')) {
        if (searchText.match(/\b5\b/)) return 'level_5';
        if (searchText.match(/\b10\b/)) return 'level_10';
        if (searchText.match(/\b25\b/)) return 'level_25';
        return 'level_5'; // Default
    }
    
    // Return original if no match found
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

        // Helper to merge and update achievements
        const mergeAndUpdate = () => {
            if (!catalogLoaded || !progressLoaded) return;

            const progressMap = new Map<string, UserAchievementProgress>();
            userProgress.forEach((progress) => {
                progressMap.set(progress.achievementId, progress);
            });

            // Merge catalog with user progress
            const mergedAchievements: AchievementWithProgress[] = catalog.map((achievement) => {
                // Map catalog ID to expected progress ID
                const mappedId = mapAchievementId(achievement.achievementId, achievement.title, achievement.description || undefined);
                const progress = progressMap.get(mappedId);
                const target = getTarget(achievement);
                const progressValue = progress?.progress || 0;
                const isUnlocked = progress?.isUnlocked || false;
                
                // Debug logging for focus achievements
                if (achievement.category === "Focus" || achievement.title?.toLowerCase().includes("focus") || achievement.title?.toLowerCase().includes("pomodoro")) {
                    console.log(`🔍 Focus Achievement Debug:`, {
                        catalogId: achievement.achievementId,
                        mappedId,
                        title: achievement.title,
                        description: achievement.description,
                        category: achievement.category,
                        progressValue,
                        isUnlocked,
                        hasProgressDoc: !!progress,
                        progressDoc: progress,
                        progressMapKeys: Array.from(progressMap.keys()),
                        target
                    });
                }

                return {
                    achievementId: achievement.achievementId,
                    title: achievement.title,
                    description: achievement.description,
                    category: achievement.category || "Other",
                    icon: getIcon(achievement),
                    reward: achievement.reward,
                    target,
                    progress: progressValue,
                    isUnlocked,
                    unlockedAt: progress?.unlockedAt,
                    claimed: progress?.claimed || false,
                    claimedAt: progress?.claimedAt,
                };
            });

            setAchievements(mergedAchievements);
            setLoading(false);
            console.log("🏆 Achievements updated from Firestore:", mergedAchievements.length);
        };

        // Listen to achievements catalog
        const catalogRef = collection(db, "achievements");
        const catalogQuery = query(catalogRef);
        const unsubscribeCatalog = onSnapshot(
            catalogQuery,
            (snapshot) => {
                catalog = snapshot.docs.map((doc) => ({
                    achievementId: doc.id,
                    ...doc.data(),
                })) as Achievement[];
                catalogLoaded = true;
                console.log("📚 Achievements catalog updated:", catalog.length);
                mergeAndUpdate();
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
            (snapshot) => {
                userProgress = snapshot.docs.map((doc) => ({
                    achievementId: doc.id,
                    ...doc.data(),
                })) as UserAchievementProgress[];
                progressLoaded = true;
                console.log("📊 User progress updated:", userProgress.length);
                mergeAndUpdate();
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
