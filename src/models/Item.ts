export type ItemRarity = "common" | "uncommon" | "rare" | "epic" | "legendary";
export type ElementType = "fire" | "water" | "earth" | "wind" | "normal";
export type ItemType = "weapon" | "helmet" | "chestplate" | "pants" | "boots" | "accessory";

export interface StatBoosts {
  damage: number;
  defense: number;
  health: number;
}

export interface Item {
  id: string;              // item_123
  itemName: string;        // bv. "Blazing Aegis"
  type: ItemType;
  elementType: ElementType;
  power: number;
  rarity: ItemRarity;
  requiredLevel: number;
  sellValue: number;
  critChance: number;      // extra crit kans
  critDamage: number;      // extra crit dmg
  statBoosts: StatBoosts;
  imageUrl?: string;
}
