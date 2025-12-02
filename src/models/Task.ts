export type TaskDifficulty = "easy" | "medium" | "hard" | "extreme";

export interface Task {
  id?: string;              // Firebase key (optional on create)
  title: string;
  difficulty: TaskDifficulty;
  xpReward: number;
  goldReward: number;
  isCompleted: boolean;
  timestamp: number;        // Unix epoch (seconds or ms)
  category?: string;        // e.g. study, fitness, cleaning...
}
