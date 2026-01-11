import { useEffect, useState } from "react";
import { db } from "@/firebase";
import { auth } from "@/firebase";
import { doc, onSnapshot } from "firebase/firestore";
import type { User } from "@/models/user.model";

export function useRealtimeUser() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      setUser(null);
      setLoading(false);
      return;
    }

    const userRef = doc(db, "users", currentUser.uid);

    // Real-time listener
    const unsubscribe = onSnapshot(
      userRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const userData = {
            uid: snapshot.id,
            ...snapshot.data(),
          } as User;

          // Ensure stats object exists with required defaults
          if (!userData.stats) {
            userData.stats = {
              level: 1,
              xp: 0,
              gold: 0,
              hp: 100,
              streak: 0,
              battlesWon: 0,
              battlesPlayed: 0,
            } as any;
          }
          if (userData.stats.level === undefined) userData.stats.level = 1 as any;
          if (userData.stats.xp === undefined) userData.stats.xp = 0 as any;
          if (userData.stats.gold === undefined) userData.stats.gold = 0 as any;
          if (userData.stats.hp === undefined) userData.stats.hp = 100 as any;
          if (userData.stats.streak === undefined) userData.stats.streak = 0 as any;
          if (userData.stats.battlesWon === undefined) userData.stats.battlesWon = 0 as any;
          if (userData.stats.battlesPlayed === undefined) userData.stats.battlesPlayed = 0 as any;
          if (userData.stats.lootboxesOpened === undefined) userData.stats.lootboxesOpened = 0 as any;

          // Set default values for streak-related fields if they don't exist
          if (userData.stats.pomodoroStreak === undefined || userData.stats.pomodoroStreak === null) {
            userData.stats.pomodoroStreak = 0;
          }
          if (userData.stats.maxPomodoroStreak === undefined || userData.stats.maxPomodoroStreak === null) {
            userData.stats.maxPomodoroStreak = 0;
          }

          // Set default values for today's pomodoro stats if they don't exist
          if (userData.stats.todaysSessions === undefined || userData.stats.todaysSessions === null) {
            userData.stats.todaysSessions = 0;
          }
          if (userData.stats.todaysFocusSeconds === undefined || userData.stats.todaysFocusSeconds === null) {
            userData.stats.todaysFocusSeconds = 0;
          }

          setUser(userData);
          setLoading(false);
          setError(null);
          console.log("👤 Realtime user updated:", userData.displayName);
          console.log("📊 Full user data:", userData);
          console.log("⭐ Stats object:", userData.stats);
          console.log("💎 XP value:", userData.stats?.xp, "Type:", typeof userData.stats?.xp);
          console.log("🎯 Level value:", userData.stats?.level, "Type:", typeof userData.stats?.level);
          console.log("📈 TotalXP value:", userData.stats?.totalXP, "Type:", typeof userData.stats?.totalXP);
          console.log("⬆️ NextLevelXP value:", userData.stats?.nextLevelXP, "Type:", typeof userData.stats?.nextLevelXP);
        }
      },
      (err) => {
        console.error("❌ Firestore user listener error:", err);
        setError("Could not load realtime user data");
        setLoading(false);
      }
    );

    // Cleanup listener
    return () => {
      console.log("🔌 Disconnecting user listener");
      unsubscribe();
    };
  }, []);

  return { user, loading, error };
}
