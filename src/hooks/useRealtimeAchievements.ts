import { useEffect, useState, useCallback, useRef } from "react";
import { auth } from "@/firebase";
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
    };
    return categoryIcons[achievement.category || ""] || "🏆";
}

export function useRealtimeAchievements() {
    const [achievements, setAchievements] = useState<AchievementWithProgress[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const loadAchievements = async () => {
            const user = auth.currentUser;
            if (!user) {
                setAchievements([]);
                setLoading(false);
                return;
            }

            try {
                setLoading(true);
                setError(null);

                // Fetch achievements catalog and user progress in parallel
                const [catalogResponse, userProgress] = await Promise.all([
                    AchievementsAPI.list(),
                    AchievementsAPI.getUserProgress(user.uid),
                ]);

                const catalog = catalogResponse.data || [];
                const progressMap = new Map<string, UserAchievementProgress>();
                userProgress.forEach((progress) => {
                    progressMap.set(progress.achievementId, progress);
                });

                // Merge catalog with user progress
                const mergedAchievements: AchievementWithProgress[] = catalog.map((achievement) => {
                    const userProgress = progressMap.get(achievement.achievementId);
                    return {
                        achievementId: achievement.achievementId,
                        title: achievement.title,
                        description: achievement.description,
                        category: achievement.category || "Other",
                        icon: getIcon(achievement),
                        reward: achievement.reward,
                        target: getTarget(achievement),
                        progress: userProgress?.progress || 0,
                        isUnlocked: userProgress?.isUnlocked || false,
                        unlockedAt: userProgress?.unlockedAt,
                        claimed: userProgress?.claimed || false,
                        claimedAt: userProgress?.claimedAt,
                    };
                });

                setAchievements(mergedAchievements);
                setLoading(false);
                console.log("🏆 Achievements loaded from API:", mergedAchievements.length);
            } catch (err: any) {
                console.error("❌ Failed to load achievements:", err);
                setError("Could not load achievements");
                setAchievements([]);
                setLoading(false);
            }
        };

        loadAchievements();

        // Poll for updates every 30 seconds (since we're not using realtime listeners)
        // This is less aggressive than 5 seconds to avoid unnecessary reloads
        const interval = setInterval(() => {
            loadAchievements();
        }, 30000);

        return () => {
            clearInterval(interval);
        };
    }, []);

    const refetch = useCallback(async () => {
        const user = auth.currentUser;
        if (!user) {
            setAchievements([]);
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            setError(null);

            const [catalogResponse, userProgress] = await Promise.all([
                AchievementsAPI.list(),
                AchievementsAPI.getUserProgress(user.uid),
            ]);

            const catalog = catalogResponse.data || [];
            const progressMap = new Map<string, UserAchievementProgress>();
            userProgress.forEach((progress) => {
                progressMap.set(progress.achievementId, progress);
            });

            const mergedAchievements: AchievementWithProgress[] = catalog.map((achievement) => {
                const userProgress = progressMap.get(achievement.achievementId);
                return {
                    achievementId: achievement.achievementId,
                    title: achievement.title,
                    description: achievement.description,
                    category: achievement.category || "Other",
                    icon: getIcon(achievement),
                    reward: achievement.reward,
                    target: getTarget(achievement),
                    progress: userProgress?.progress || 0,
                    isUnlocked: userProgress?.isUnlocked || false,
                    unlockedAt: userProgress?.unlockedAt,
                    claimed: userProgress?.claimed || false,
                    claimedAt: userProgress?.claimedAt,
                };
            });

            setAchievements(mergedAchievements);
            setLoading(false);
        } catch (err: any) {
            console.error("❌ Failed to load achievements:", err);
            setError("Could not load achievements");
            setAchievements([]);
            setLoading(false);
        }
    }, []);

    return { achievements, loading, error, refetch };
}
