import type { ItemRarity, ElementType } from "./Item";

export type PetSkillEffect = "heal" | "shield" | "damage_boost" | "crit_boost";

export interface PetSkill {
  name: string;
  effect: PetSkillEffect;
  power: number;
}

export interface Pet {
  id: string;           // pet_1
  petName: string;
  elementType: ElementType;
  rarity: ItemRarity;
  buffs: {
    damage: number;
    health: number;
    critChance: number;
  };
  skill: PetSkill;
  imageUrl?: string;
}
