import { db, ref, get, update } from "./firebase";

export const EquippedService = {
  async getEquipped(uid: string) {
    return (await get(ref(db, `users/${uid}/equipped`))).val();
  },
  async equip(uid: string, partial: any) {
    return update(ref(db, `users/${uid}/equipped`), partial);
  }
};
