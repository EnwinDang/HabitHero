export type TaskDifficulty = "easy" | "medium" | "hard";

export interface Task {
  id: string;
  userId: string;

  title: string;
  description?: string;

  difficulty: TaskDifficulty;
  xpReward: number;
  goldReward: number;

  isCompleted: boolean;

  // Kalender & AI
  timestamp: number;   // UNIX timestamp (ms of s)
  date: string;        // ISO datetime → verplicht voor Google Calendar

  // Extra
  category?: string;
  createdAt: number;
}
