export interface Achievement {
  achievementId: string;
  title: string;
  description?: string | null;
  category?: string | null;
  reward?: AchievementReward;
  isActive: boolean;
  condition?: {
    description?: string;
    operator?: string;
    type?: string;
    value?: number;
  };
  iconLocked?: string;
  iconUnlocked?: string;
  icon?: string; // Fallback for frontend
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
  claimed?: boolean;
  claimedAt?: number;
}
