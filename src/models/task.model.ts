import { RewardBreakdown } from "./reward.model";
import { CombatSummary } from "./combat.model";

export type TaskDifficulty = "easy" | "medium" | "hard";

export interface Task {
  taskId: string;
  courseId?: string;
  moduleId?: string;
  title: string;
  description?: string | null;
  difficulty: TaskDifficulty;
  xp: number;
  gold: number;
  date?: string;
  dueAt?: number;
  achievementTag?: string | null;
  isRepeatable: boolean;
  isActive: boolean;
}

export interface TaskCompletionResult {
  taskId: string;
  reward: RewardBreakdown;
  combat?: CombatSummary;
}
