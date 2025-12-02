import type { TaskDifficulty } from "./Task";

export type TimeOfDay = "morning" | "afternoon" | "evening" | "night";
export type EnergyRequirement = "low" | "medium" | "high";

export interface AITaskTemplate {
  id: string;              // task_ai_001
  title: string;
  difficulty: TaskDifficulty;
  category: string;        // study, fitness, cleaning, ...
  energyRequirement: EnergyRequirement;
  recommendedAt: TimeOfDay[];
  baseXP: number;
  baseGold: number;
}
