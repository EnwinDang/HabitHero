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

          setUser(userData);
          setLoading(false);
          setError(null);
          console.log("👤 Realtime user updated:", userData.displayName);
          console.log("📊 Full user data:", userData);
          console.log("⭐ Stats object:", userData.stats);
          console.log("💎 XP value:", userData.stats?.xp, "Type:", typeof userData.stats?.xp);
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
