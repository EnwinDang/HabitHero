import { apiFetch } from "./client";
import type { Achievement } from "../models/achievement.model";

export interface UserAchievementProgress {
  achievementId: string;
  progress: number;
  isUnlocked: boolean;
  unlockedAt?: number;
  claimed?: boolean;
  claimedAt?: number;
}

export const AchievementsAPI = {
  // Get achievements catalog
  list(): Promise<{ data: Achievement[] }> {
    return apiFetch<{ data: Achievement[] }>("/achievements");
  },

  // Get user's achievement progress
  getUserProgress(uid: string): Promise<UserAchievementProgress[]> {
    return apiFetch<UserAchievementProgress[]>(`/users/${uid}/achievements`);
  },

  // Update user's achievement progress
  updateUserProgress(
    uid: string,
    achievementId: string,
    progress: {
      progress?: number;
      isUnlocked?: boolean;
      unlockedAt?: number;
    }
  ): Promise<UserAchievementProgress> {
    return apiFetch<UserAchievementProgress>(
      `/users/${uid}/achievements/${achievementId}`,
      {
        method: "PATCH",
        body: JSON.stringify(progress),
      }
    );
  },

  create(a: Achievement): Promise<Achievement> {
    return apiFetch<Achievement>("/achievements", {
      method: "POST",
      body: JSON.stringify(a),
    });
  },

  get(achievementId: string): Promise<Achievement> {
    return apiFetch<Achievement>(`/achievements/${achievementId}`);
  },

  replace(achievementId: string, a: Achievement): Promise<Achievement> {
    return apiFetch<Achievement>(`/achievements/${achievementId}`, {
      method: "PUT",
      body: JSON.stringify(a),
    });
  },

  patch(
    achievementId: string,
    patch: Partial<Achievement>
  ): Promise<Achievement> {
    return apiFetch<Achievement>(`/achievements/${achievementId}`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    });
  },

  delete(achievementId: string): Promise<void> {
    return apiFetch<void>(`/achievements/${achievementId}`, {
      method: "DELETE",
    });
  },

  // Claim achievement reward
  claim(achievementId: string): Promise<{
    success: boolean;
    xpReward: number;
    goldReward: number;
  }> {
    return apiFetch<{
      success: boolean;
      xpReward: number;
      goldReward: number;
    }>(`/achievements/${achievementId}/claim`, {
      method: "POST",
    });
  },
};
