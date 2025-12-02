import { db, ref, get, update } from "./firebase";

export const AchievementService = {
  async getProgress(uid: string) {
    return (await get(ref(db, `users/${uid}/achievementProgress`))).val();
  },
  async updateProgress(uid: string, partial: any) {
    return update(ref(db, `users/${uid}/achievementProgress`), partial);
  }
};
