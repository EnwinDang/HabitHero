export type UserRole = "student" | "teacher" | "admin";
export type UserStatus = "active" | "disabled";

export interface User {
  uid: string;
  displayName: string;
  email: string;
  photoURL?: string | null;
  role: UserRole;
  status: UserStatus;
  createdAt?: number;
  lastLoginAt?: string; // stored as YYYY-MM-DD string
  stats: UserStats;
  settings?: UserSettings;
  worldMapProgress?: WorldMapProgress;
  inventory?: {
    inventory?: {
      items?: any[];
      lootboxes?: any[];
    };
    equiped?: Record<string, any>;
    equippedBonuses?: Record<string, any>;
    equippedStats?: Record<string, number>;
  };
}

export interface UserStats {
  level: number;
  xp: number;  // Changed back to 'xp' to match Firebase
  totalXP?: number; // Total XP accumulated across all levels
  nextLevelXP?: number; // XP needed to reach next level
  gold: number;
  hp: number;
  streak: number;
  maxStreak?: number;
  gems?: number;
  focusSessionsCompleted?: number;
  lastFocusDate?: string; // YYYY-MM-DD; last day with completed focus session
  pomodoroStreak?: number;
  maxPomodoroStreak?: number;
  loginStreak?: number;
  maxLoginStreak?: number;
  lastLoginDate?: string; // stored as YYYY-MM-DD string
  todaysSessions?: number; // Sessions completed today
  todaysFocusSeconds?: number; // Total focus seconds today
  totalSessions?: number; // Total sessions completed across all time
  totalFocusSeconds?: number; // Total focus seconds across all time
  lastPomodoroDayKey?: string; // YYYY-MM-DD; last day pomodoro stats were recorded
  totalStats?: Record<string, number>; // Calculated total stats (base + equipped)
  battlesWon?: number; // Battles won
  battlesPlayed?: number; // Total battles played
  monstersDefeated?: number; // Monsters defeated
  lootboxesOpened?: number; // Lootboxes opened
}

export interface UserSettings {
  notificationsEnabled: boolean;
  theme: "dark" | "light";
  language: string;
}

export interface WorldMapProgress {
  [realmId: string]: {
    completedLevels: number[]; // Array of completed level IDs
  };
}
