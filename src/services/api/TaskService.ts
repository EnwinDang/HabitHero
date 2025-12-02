import { db, ref, get, push, update, remove } from "./firebase";

export const TaskService = {
  async getTasks(uid: string) {
    return (await get(ref(db, `users/${uid}/tasks`))).val();
  },
  async createTask(uid: string, task: any) {
    return push(ref(db, `users/${uid}/tasks`), task);
  },
  async updateTask(uid: string, taskId: string, partial: any) {
    return update(ref(db, `users/${uid}/tasks/${taskId}`), partial);
  },
  async deleteTask(uid: string, taskId: string) {
    return remove(ref(db, `users/${uid}/tasks/${taskId}`));
  }
};
