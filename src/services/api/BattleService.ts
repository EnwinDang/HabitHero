import { db, ref, get, push } from "./firebase";

export const BattleService = {
  async getHistory(uid: string) {
    return (await get(ref(db, `users/${uid}/battleHistory`))).val();
  },
  async addBattleEntry(uid: string, entry: any) {
    return push(ref(db, `users/${uid}/battleHistory`), entry);
  }
};
