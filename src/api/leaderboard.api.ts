import { realtimeDb } from "../firebase";
import { ref, get, onValue, off } from "firebase/database";

export interface LeaderboardEntry {
  uid: string;
  displayName: string;
  rank: number;
  xp?: number;
  tasksCompleted?: number;
  level?: number;
  lastUpdated?: number;
  monstersDefeated?: number;
  bossesDefeated?: number;
}

/**
 * Get global XP leaderboard
 */
export async function getGlobalXPLeaderboard(): Promise<LeaderboardEntry[] | null> {
  try {
    const leaderboardRef = ref(realtimeDb, `leaderboards/globalXP`);
    const snapshot = await get(leaderboardRef);
    
    if (snapshot.exists()) {
      const data = snapshot.val();
      // Convert object to array and sort by rank
      return Object.entries(data)
        .map(([uid, entry]: [string, any]) => ({
          uid,
          ...entry,
        }))
        .sort((a, b) => (a.rank || 0) - (b.rank || 0));
    }
    
    return null;
  } catch (error) {
    console.error("Error fetching global XP leaderboard:", error);
    throw error;
  }
}

/**
 * Get course-specific leaderboard
 */
export async function getCourseLeaderboard(courseId: string): Promise<LeaderboardEntry[] | null> {
  try {
    const leaderboardRef = ref(realtimeDb, `leaderboards/courses/${courseId}`);
    const snapshot = await get(leaderboardRef);
    
    if (snapshot.exists()) {
      const data = snapshot.val();
      // Convert object to array and sort by rank
      return Object.entries(data)
        .map(([uid, entry]: [string, any]) => ({
          uid,
          ...entry,
        }))
        .sort((a, b) => (a.rank || 0) - (b.rank || 0));
    }
    
    return null;
  } catch (error) {
    console.error("Error fetching course leaderboard:", error);
    throw error;
  }
}

/**
 * Get module-specific leaderboard
 */
export async function getModuleLeaderboard(courseId: string, moduleId: string): Promise<LeaderboardEntry[] | null> {
  try {
    const leaderboardRef = ref(realtimeDb, `leaderboards/modules/${courseId}_${moduleId}`);
    const snapshot = await get(leaderboardRef);
    
    if (snapshot.exists()) {
      const data = snapshot.val();
      // Convert object to array and sort by rank
      return Object.entries(data)
        .map(([uid, entry]: [string, any]) => ({
          uid,
          ...entry,
        }))
        .sort((a, b) => (a.rank || 0) - (b.rank || 0));
    }
    
    return null;
  } catch (error) {
    console.error("Error fetching module leaderboard:", error);
    throw error;
  }
}

/**
 * Get world-specific leaderboard
 */
export async function getWorldLeaderboard(worldId: string): Promise<LeaderboardEntry[] | null> {
  try {
    const leaderboardRef = ref(realtimeDb, `leaderboards/worlds/${worldId}`);
    const snapshot = await get(leaderboardRef);
    
    if (snapshot.exists()) {
      const data = snapshot.val();
      // Convert object to array and sort by rank
      return Object.entries(data)
        .map(([uid, entry]: [string, any]) => ({
          uid,
          ...entry,
        }))
        .sort((a, b) => (a.rank || 0) - (b.rank || 0));
    }
    
    return null;
  } catch (error) {
    console.error("Error fetching world leaderboard:", error);
    throw error;
  }
}

/**
 * Subscribe to real-time updates for global XP leaderboard
 * Returns an unsubscribe function
 */
export function subscribeToGlobalXPLeaderboard(
  callback: (data: LeaderboardEntry[] | null) => void
): () => void {
  const leaderboardRef = ref(realtimeDb, `leaderboards/globalXP`);
  
  const unsubscribe = onValue(
    leaderboardRef,
    (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const entries = Object.entries(data)
          .map(([uid, entry]: [string, any]) => ({
            uid,
            ...entry,
          }))
          .sort((a, b) => (a.rank || 0) - (b.rank || 0));
        callback(entries);
      } else {
        callback(null);
      }
    },
    (error) => {
      console.error("Error in global XP leaderboard subscription:", error);
      callback(null);
    }
  );
  
  // Return unsubscribe function
  return () => {
    off(leaderboardRef);
    unsubscribe();
  };
}

