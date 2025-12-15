import { ItemRarity, StatBlock } from "./item.model";

export interface Pet {
  petId: string;
  name: string;
  rarity: ItemRarity;
  element?: string | null;
  baseStats?: StatBlock;
  abilities?: string[];
  isActive: boolean;
}
