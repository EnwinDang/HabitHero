export type StageType = "normal" | "mini_boss" | "big_boss";

export interface Stage {
  stageNumber: number;
  monsterId: string;
  difficultyMultiplier: number;
  type?: StageType;
}
