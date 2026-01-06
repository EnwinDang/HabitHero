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
