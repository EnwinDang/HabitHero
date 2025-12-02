import { db, ref, get, push, update, remove } from "./firebase";

export const AITaskLibraryService = {
  async getAll() {
    return (await get(ref(db, `tasksLibrary`))).val();
  },
  async create(template: any) {
    return push(ref(db, `tasksLibrary`), template);
  },
  async update(taskId: string, partial: any) {
    return update(ref(db, `tasksLibrary/${taskId}`), partial);
  },
  async delete(taskId: string) {
    return remove(ref(db, `tasksLibrary/${taskId}`));
  }
};
