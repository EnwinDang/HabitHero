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
    iconLocked?: string;
    iconUnlocked?: string;
    reward?: {
        xp?: number;
        gold?: number;
        lootbox?: string;
    };
    condition?: {
        key?: string;
        operator?: string;
        type?: string;
        value?: number;
        days?: number;
        moduleId?: string;
        worldId?: string;
    };
    progress: number;
    target: number;
    isUnlocked: boolean;
    unlockedAt?: number;
    claimed?: boolean;
    claimedAt?: number;
}

interface FirestoreAchievement {
    title: string;
    description?: string;
    category?: string;
    iconLocked?: string;
    iconUnlocked?: string;
    reward?: {
        xp?: number;
        gold?: number;
        lootbox?: string;
    };
    condition?: {
        key?: string;
        operator?: string;
        type?: string;
        value?: number;
        days?: number;
        moduleId?: string;
        worldId?: string;
    };
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

        // Listen to achievements collection (definitions)
        const achievementsRef = collection(db, "achievements");
        const achievementsQuery = query(achievementsRef);

        // Listen to user progress
        const progressRef = collection(db, "users", user.uid, "achievements");
        const progressQuery = query(progressRef);

        let achievementsCatalog: Map<string, FirestoreAchievement> = new Map();
        let userProgressMap: Map<string, UserAchievementProgress> = new Map();
        let achievementsLoaded = false;
        let progressLoaded = false;

        const mergeData = () => {
            if (!achievementsLoaded || !progressLoaded) return;

            const merged: AchievementWithProgress[] = [];

            achievementsCatalog.forEach((achData, achId) => {
                const userProgress = userProgressMap.get(achId);
                // Get target from condition.value OR condition.days (for streak achievements)
                const target = achData.condition?.value || achData.condition?.days || 1;

                merged.push({
                    achievementId: achId,
                    title: achData.title,
                    description: achData.description,
                    category: achData.category,
                    icon: achData.iconUnlocked || "🏆",
                    iconLocked: achData.iconLocked,
                    iconUnlocked: achData.iconUnlocked,
                    reward: achData.reward,
                    condition: achData.condition,
                    progress: userProgress?.progress || 0,
                    target: target,
                    isUnlocked: userProgress?.isUnlocked || false,
                    unlockedAt: userProgress?.unlockedAt,
                    claimed: userProgress?.claimed || false,
                    claimedAt: userProgress?.claimedAt,
                });
            });

            setAchievements(merged);
            setLoading(false);
            setError(null);
            console.log("🏆 Realtime achievements updated:", merged.length);
        };

        // Subscribe to achievements definitions
        const unsubscribeAchievements = onSnapshot(
            achievementsQuery,
            (snapshot) => {
                achievementsCatalog.clear();
                snapshot.docs.forEach((doc) => {
                    achievementsCatalog.set(doc.id, doc.data() as FirestoreAchievement);
                });
                achievementsLoaded = true;
                mergeData();
            },
            (err) => {
                console.error("❌ Firestore achievements catalog error:", err);
                setError("Could not load achievements catalog");
                setLoading(false);
            }
        );

        // Subscribe to user progress
        const unsubscribeProgress = onSnapshot(
            progressQuery,
            (snapshot) => {
                userProgressMap.clear();
                snapshot.docs.forEach((doc) => {
                    userProgressMap.set(doc.id, doc.data() as UserAchievementProgress);
                });
                progressLoaded = true;
                mergeData();
            },
            (err) => {
                console.error("❌ Firestore achievement progress error:", err);
                setError("Could not load achievement progress");
                setLoading(false);
            }
        );

        return () => {
            unsubscribeAchievements();
            unsubscribeProgress();
        };
    }, []);

    return { achievements, loading, error };
}
