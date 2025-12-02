import type { ElementType } from "./Item";
import type { Skill } from "./Skill";
import type { BossAbility } from "./BossAbility";

export type MonsterTier = "normal" | "mini_boss" | "big_boss";

export type MonsterBehaviorType = "aggressive" | "defensive" | "random" | "tactical";
export type MonsterAttackPattern = "burst" | "steady" | "chaotic";

export interface MonsterBehavior {
  type: MonsterBehaviorType;
  attackPattern: MonsterAttackPattern;
}

export interface Monster {
  id: string;            // bv. monster_1_5
  name: string;          // bv. "Ash Reaper"
  elementType: ElementType;
  weakness: ElementType;
  baseHealth: number;
  baseDamage: number;
  tier: MonsterTier;
  skills: Skill[];
  behavior: MonsterBehavior;
  bossAbilities?: BossAbility[];
}
