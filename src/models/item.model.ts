export type ItemRarity = "common" | "uncommon" | "rare" | "epic" | "legendary";
export type ItemType = "weapon" | "armor" | "consumable" | "material" | "pet" | "misc";

export interface Item {
  itemId: string;
  name: string;
  description?: string | null;
  type: ItemType;
  rarity: ItemRarity;
  element?: string | null;
  icon?: string | null;
  stats?: StatBlock;
  valueGold?: number;
  isActive: boolean;
}

export interface ItemInstance {
  instanceId?: string;
  itemId: string;
  quantity: number;
  obtainedAt?: number;
  meta?: Record<string, any>;
}

export interface StatBlock {
  hp?: number;
  attack?: number;
  defense?: number;
  crit?: number;
  speed?: number;
}
