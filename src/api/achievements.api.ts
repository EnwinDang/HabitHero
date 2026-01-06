import { apiFetch } from "./client";
import type { Achievement } from "../models/achievement.model";

export const AchievementsAPI = {
  list(): Promise<Achievement[]> {
    return apiFetch<Achievement[]>("/achievements");
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
};
