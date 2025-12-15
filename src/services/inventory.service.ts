import { UsersAPI } from "../api/users.api";
import type { Inventory, EquippedItems } from "../models/inventory.model";

export async function loadInventory(uid: string): Promise<Inventory> {
  return UsersAPI.getInventory(uid);
}

export async function equipItem(
  uid: string,
  patch: Partial<EquippedItems>
): Promise<EquippedItems> {
  return UsersAPI.patchEquipped(uid, patch);
}
