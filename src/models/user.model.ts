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
  lastLoginAt?: number;
  stats: UserStats;
  settings?: UserSettings;
  worldMapProgress?: WorldMapProgress;
}

export interface UserStats {
  level: number;
  xp: number;  // Changed back to 'xp' to match Firebase
  gold: number;
  streak: number;
  maxStreak?: number;
  gems?: number;
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
