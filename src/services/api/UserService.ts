import { db, ref, get, set, update, remove } from "./firebase";

export const UserService = {
  async getUser(uid: string) {
    return (await get(ref(db, `users/${uid}`))).val();
  },
  async createUser(uid: string, data: any) {
    return set(ref(db, `users/${uid}`), data);
  },
  async updateUser(uid: string, partial: any) {
    return update(ref(db, `users/${uid}`), partial);
  },
  async deleteUser(uid: string) {
    return remove(ref(db, `users/${uid}`));
  }
};
