import { ItemInstance } from "./item.model";

export interface Lootbox {
  lootboxId: string;
  name: string;
  description?: string | null;
  enable: boolean;
}

export interface LootboxOpenResult {
  lootboxId: string;
  opened: number;
  results: ItemInstance[];
}
