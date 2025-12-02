import { db, ref, get, update } from "./firebase";

export const AIConfigService = {
  async getConfig() {
    return (await get(ref(db, `aiConfig`))).val();
  },
  async updateConfig(partial: any) {
    return update(ref(db, `aiConfig`), partial);
  }
};
