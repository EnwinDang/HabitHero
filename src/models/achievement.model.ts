export interface Achievement {
  achievementId: string;
  title: string;
  description?: string | null;
  category?: string | null;
  reward?: AchievementReward;
  isActive: boolean;
}

export interface AchievementReward {
  xp?: number;
  gold?: number;
  lootboxId?: string;
}

export interface UserAchievementProgress {
  achievementId: string;
  progress: number;
  isUnlocked: boolean;
  unlockedAt?: number;
}
