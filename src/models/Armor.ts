import type { Item } from "./Item";

export type ArmorSlot = "helmet" | "chestplate" | "pants" | "boots";

export interface Armor extends Item {
  slot: ArmorSlot;
}
