export type BattleResult = "win" | "lose";

export interface BattleEntry {
  monsterId: string;
  result: BattleResult;
  timestamp: number; // Unix epoch
}
