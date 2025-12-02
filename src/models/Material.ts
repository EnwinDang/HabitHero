import type { ItemRarity } from "./Item";

export interface Material {
  id: string;           // mat_1
  name: string;         // "Abyssal Essence"
  rarity: ItemRarity;
  imageUrl?: string;
}
