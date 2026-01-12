export interface GameConfig {
  xpMultiplier: number;
  goldMultiplier: number;
  combatEnabled: boolean;
  maxDailyTasks?: number;
}

export interface DifficultyConfig {
  easy: number;
  medium: number;
  hard: number;
}

export interface StaminaConfig {
  max: number;
  regenPerHour: number;
  battleCost: {
    normal: number;
    elite: number;
    miniBoss: number;
    boss: number;
  };
}

export interface GameConfigMain {
  enemyMultiplier?: number;
  rewardMultiplier?: number;
  stamina: StaminaConfig;
  streaks?: {
    dailyTaskBonusGold?: number;
    dailyTaskBonusXP?: number;
  };
}
