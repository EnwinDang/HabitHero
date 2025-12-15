import { ItemInstance } from "./item.model";

export interface Inventory {
  gold: number;
  items: ItemInstance[];
  materials?: Record<string, number>;
  lastUpdatedAt?: number;
}

export interface EquippedItems {
  weaponItemId?: string | null;
  armorItemId?: string | null;
  petId?: string | null;
  cosmeticIds?: string[];
}
