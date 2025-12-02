import { db, ref, get } from "./firebase";

export const GameDataService = {
  async getWorlds() {
    return (await get(ref(db, `worlds`))).val();
  },
  async getMonsters() {
    return (await get(ref(db, `monsters`))).val();
  },
  async getLootboxes() {
    return (await get(ref(db, `lootboxes`))).val();
  }
};
