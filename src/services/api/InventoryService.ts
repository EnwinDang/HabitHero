import { db, ref, get, update, push } from "./firebase";

export const InventoryService = {
  async getInventory(uid: string) {
    return (await get(ref(db, `users/${uid}/inventory`))).val();
  },
  async updateInventory(uid: string, partial: any) {
    return update(ref(db, `users/${uid}/inventory`), partial);
  },
  async addWeapon(uid: string, weaponId: string) {
    return push(ref(db, `users/${uid}/inventory/weapons`), weaponId);
  }
};
