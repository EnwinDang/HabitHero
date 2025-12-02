import { db, ref, get, update } from "./firebase";

export const AIProfileService = {
  async getAIProfile(uid: string) {
    return (await get(ref(db, `users/${uid}/aiProfile`))).val();
  },
  async updateAIProfile(uid: string, partial: any) {
    return update(ref(db, `users/${uid}/aiProfile`), partial);
  }
};
