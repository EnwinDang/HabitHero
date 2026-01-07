import {
  getGlobalXPLeaderboard,
  getCourseLeaderboard,
  getModuleLeaderboard,
  getWorldLeaderboard,
  subscribeToGlobalXPLeaderboard,
  type LeaderboardEntry,
} from "../api/leaderboard.api";

/**
 * Load global XP leaderboard
 */
export async function loadGlobalXPLeaderboard(): Promise<LeaderboardEntry[] | null> {
  return getGlobalXPLeaderboard();
}

/**
 * Load course-specific leaderboard
 */
export async function loadCourseLeaderboard(courseId: string): Promise<LeaderboardEntry[] | null> {
  return getCourseLeaderboard(courseId);
}

/**
 * Load module-specific leaderboard
 */
export async function loadModuleLeaderboard(courseId: string, moduleId: string): Promise<LeaderboardEntry[] | null> {
  return getModuleLeaderboard(courseId, moduleId);
}

/**
 * Load world-specific leaderboard
 */
export async function loadWorldLeaderboard(worldId: string): Promise<LeaderboardEntry[] | null> {
  return getWorldLeaderboard(worldId);
}

/**
 * Subscribe to real-time global XP leaderboard updates
 * Returns an unsubscribe function
 */
export function subscribeToLeaderboard(
  callback: (data: LeaderboardEntry[] | null) => void
): () => void {
  return subscribeToGlobalXPLeaderboard(callback);
}

// Re-export types for convenience
export type { LeaderboardEntry };

