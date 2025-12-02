export type EnergyLevel = "low" | "medium" | "high";
export type StressLevel = "low" | "normal" | "high";

export interface AIProfile {
  energyLevel: EnergyLevel;
  stressLevel: StressLevel;
  preferredCategories: string[];      // bv. ['study','fitness']
  avoidedCategories: string[];        // bv. ['cleaning']
  successfulTasks: Record<string, number>; // category -> count
  failedTasks: Record<string, number>;     // category -> count
  lastSuggestedTasks: string[];       // task_ai_001, ...
  activeBoosts: {
    xpBoost: number;                  // bv. 0.1 = +10%
    goldBoost: number;                // bv. 0.2 = +20%
  };
}
