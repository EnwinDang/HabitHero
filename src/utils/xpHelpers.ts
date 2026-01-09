import { doc, getDoc, updateDoc, increment } from "firebase/firestore";
import { db } from "@/firebase";
import { getLevelFromXP } from "@/utils/xpCurve";

/**
 * Add XP to a user and automatically handle level-ups with rewards
 * @param userId - The user's UID
 * @param xpAmount - Amount of XP to add
 * @returns Object with level-up info if leveled up, null otherwise
 */
export async function addXPWithLevelUp(
  userId: string,
  xpAmount: number
): Promise<{
  leveledUp: boolean;
  oldLevel?: number;
  newLevel?: number;
  rewards?: { gold?: number; gems?: number };
} | null> {
  if (!userId || xpAmount <= 0) return null;

  try {
    const userRef = doc(db, "users", userId);

    // Increment XP
    await updateDoc(userRef, { "stats.xp": increment(xpAmount) });

    // Fetch updated user to check level
    const snap = await getDoc(userRef);
    if (!snap.exists()) return null;

    const userData = snap.data();
    const newTotalXP = userData?.stats?.xp ?? 0;
    const oldTotalXP = newTotalXP - xpAmount;
    const oldLevel = getLevelFromXP(oldTotalXP);
    const newLevel = getLevelFromXP(newTotalXP);

    if (newLevel > oldLevel) {
      // Fetch level rewards from Firestore
      const levelsSnap = await getDoc(doc(db, "levels", "definitions"));
      const levelsData = levelsSnap.data();
      const levels = levelsData?.levels || [];
      const levelDef = levels.find((l: any) => l.level === newLevel);
      const reward = levelDef?.rewards || {};

      // Update user's level and apply rewards
      const updates: any = {
        "stats.level": newLevel,
      };
      if (reward.gold) {
        updates["stats.gold"] = increment(reward.gold);
      }
      if (reward.gems) {
        updates["stats.gems"] = increment(reward.gems);
      }
      await updateDoc(userRef, updates);

      return {
        leveledUp: true,
        oldLevel,
        newLevel,
        rewards: reward,
      };
    }

    return { leveledUp: false };
  } catch (error) {
    console.error("Failed to add XP with level-up:", error);
    return null;
  }
}
