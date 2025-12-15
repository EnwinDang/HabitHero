export interface PlatformStats {
  totalUsers: number;
  activeUsers: number;
  tasksCompleted: number;
  combatsResolved: number;
}

export interface UserStatsSnapshot {
  uid: string;
  level: number;
  xp: number;
  gold: number;
  updatedAt: number;
}
