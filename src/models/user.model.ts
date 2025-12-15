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
}

export interface UserStats {
  level: number;
  xp: number;
  gold: number;
  streak: number;
}

export interface UserSettings {
  notificationsEnabled: boolean;
  theme: "dark" | "light";
  language: string;
}
