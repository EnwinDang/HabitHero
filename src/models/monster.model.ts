import { StatBlock } from "./item.model";

export type MonsterTier = "normal" | "elite" | "miniBoss" | "boss";

export interface Monster {
  monsterId: string;
  name: string;
  worldId?: string;
  tier: MonsterTier;
  elementType?: string;
  baseStats?: StatBlock;
  lootboxId?: string;
  isActive: boolean;
}
