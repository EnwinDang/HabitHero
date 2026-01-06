import { useEffect, useState } from "react";
import { db, auth } from "@/firebase";
import { collection, query, onSnapshot } from "firebase/firestore";
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

// Pre-defined achievements for the app
const ACHIEVEMENTS_CATALOG: Omit<AchievementWithProgress, 'progress' | 'isUnlocked' | 'unlockedAt'>[] = [
    {
        achievementId: "first_task",
        title: "First Steps",
        description: "Complete your first task",
        category: "Tasks",
        icon: "🎯",
        target: 1,
        reward: { xp: 50, gold: 25 }
    },
    {
        achievementId: "task_master_10",
        title: "Task Hunter",
        description: "Complete 10 tasks",
        category: "Tasks",
        icon: "⚔️",
        target: 10,
        reward: { xp: 200, gold: 100 }
    },
    {
        achievementId: "task_master_50",
        title: "Task Warrior",
        description: "Complete 50 tasks",
        category: "Tasks",
        icon: "🛡️",
        target: 50,
        reward: { xp: 500, gold: 250 }
    },
    {
        achievementId: "task_master_100",
        title: "Task Legend",
        description: "Complete 100 tasks",
        category: "Tasks",
        icon: "👑",
        target: 100,
        reward: { xp: 1000, gold: 500 }
    },
    {
        achievementId: "focus_first",
        title: "Focus Initiate",
        description: "Complete your first focus session",
        category: "Focus",
        icon: "⏱️",
        target: 1,
        reward: { xp: 50, gold: 25 }
    },
    {
        achievementId: "focus_10",
        title: "Deep Focus",
        description: "Complete 10 focus sessions",
        category: "Focus",
        icon: "🧘",
        target: 10,
        reward: { xp: 300, gold: 150 }
    },
    {
        achievementId: "streak_3",
        title: "Getting Started",
        description: "Reach a 3-day streak",
        category: "Streak",
        icon: "🔥",
        target: 3,
        reward: { xp: 100, gold: 50 }
    },
    {
        achievementId: "streak_7",
        title: "Week Warrior",
        description: "Reach a 7-day streak",
        category: "Streak",
        icon: "💪",
        target: 7,
        reward: { xp: 250, gold: 125 }
    },
    {
        achievementId: "streak_30",
        title: "Monthly Master",
        description: "Reach a 30-day streak",
        category: "Streak",
        icon: "🏆",
        target: 30,
        reward: { xp: 1000, gold: 500 }
    },
    {
        achievementId: "level_5",
        title: "Rising Star",
        description: "Reach level 5",
        category: "Level",
        icon: "⭐",
        target: 5,
        reward: { xp: 200, gold: 100 }
    },
    {
        achievementId: "level_10",
        title: "Hero",
        description: "Reach level 10",
        category: "Level",
        icon: "🌟",
        target: 10,
        reward: { xp: 500, gold: 250 }
    },
    {
        achievementId: "level_25",
        title: "Champion",
        description: "Reach level 25",
        category: "Level",
        icon: "💎",
        target: 25,
        reward: { xp: 1000, gold: 500 }
    },
];

export function useRealtimeAchievements() {
    const [achievements, setAchievements] = useState<AchievementWithProgress[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const user = auth.currentUser;
        if (!user) {
            // Return default achievements with 0 progress
            setAchievements(
                ACHIEVEMENTS_CATALOG.map(a => ({
                    ...a,
                    progress: 0,
                    isUnlocked: false
                }))
            );
            setLoading(false);
            return;
        }

        const progressRef = collection(db, "users", user.uid, "achievements");
        const q = query(progressRef);

        const unsubscribe = onSnapshot(
            q,
            (snapshot) => {
                const progressMap = new Map<string, UserAchievementProgress>();
                snapshot.docs.forEach((doc) => {
                    const data = doc.data() as UserAchievementProgress;
                    progressMap.set(doc.id, data);
                });

                // Merge catalog with user progress
                const mergedAchievements = ACHIEVEMENTS_CATALOG.map(achievement => {
                    const userProgress = progressMap.get(achievement.achievementId);
                    return {
                        ...achievement,
                        progress: userProgress?.progress || 0,
                        isUnlocked: userProgress?.isUnlocked || false,
                        unlockedAt: userProgress?.unlockedAt,
                        claimed: userProgress?.claimed || false,
                        claimedAt: userProgress?.claimedAt,
                    };
                });

                setAchievements(mergedAchievements);
                setLoading(false);
                setError(null);
                console.log("🏆 Realtime achievements updated:", mergedAchievements.length);
            },
            (err) => {
                console.error("❌ Firestore achievements error:", err);
                // On error, still show achievements with 0 progress
                setAchievements(
                    ACHIEVEMENTS_CATALOG.map(a => ({
                        ...a,
                        progress: 0,
                        isUnlocked: false
                    }))
                );
                setError("Could not load achievement progress");
                setLoading(false);
            }
        );

        return () => {
            unsubscribe();
        };
    }, []);

    return { achievements, loading, error };
}
