import { RewardBreakdown } from "./reward.model";

export type CombatResult = "win" | "lose" | "draw" | "pending";

export interface Combat {
  combatId: string;
  uid: string;
  worldId: string;
  stage: number;
  monsterId?: string;
  result: CombatResult;
  log?: Record<string, any>[];
  reward?: RewardBreakdown;
  createdAt?: number;
}

export interface CombatSummary {
  combatId?: string;
  worldId?: string;
  stage?: number;
  result?: CombatResult;
}
