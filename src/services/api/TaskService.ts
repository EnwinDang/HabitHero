import { db, ref, set, get, update, remove, push } from "./firebase";
import type { Task } from "../../models/Task";

export class TaskService {
  /**
   * Create a new task
   */
  static async createTask(
    userId: string,
    title: string,
    difficulty: "easy" | "medium" | "hard",
    xpReward: number,
    goldReward: number,
    date: Date,
    category?: string
  ): Promise<Task> {
    
    // Firebase maakt automatisch een unieke ID
    const taskRef = push(ref(db, `tasks/`));
    const id = taskRef.key as string;

    const timestamp = Math.floor(date.getTime());  // milliseconden
    const isoString = date.toISOString();

    const newTask: Task = {
      id,
      userId,
      title,
      difficulty,
      xpReward,
      goldReward,
      isCompleted: false,

      timestamp,
      date: isoString,

      category: category ?? "general",
      createdAt: Date.now(),
    };

    await set(taskRef, newTask);
    return newTask;
  }

  /**
   * Get all tasks for a specific user
   */
  static async getTasksForUser(userId: string): Promise<Record<string, Task>> {
    const snapshot = await get(ref(db, `tasks/`));

    if (!snapshot.exists()) return {};

    const allTasks: Record<string, Task> = snapshot.val();

    // Filter op userId
    const filtered = Object.fromEntries(
      Object.entries(allTasks).filter(([_, t]) => t.userId === userId)
    );

    return filtered;
  }

  /**
   * Mark a task as completed
   */
  static async completeTask(taskId: string) {
    await update(ref(db, `tasks/${taskId}`), {
      isCompleted: true,
    });
  }

  /**
   * Update a task fully or partially
   */
  static async updateTask(taskId: string, data: Partial<Task>) {
    await update(ref(db, `tasks/${taskId}`), data);
  }

  /**
   * Delete a task
   */
  static async deleteTask(taskId: string) {
    await remove(ref(db, `tasks/${taskId}`));
  }

  /**
   * Helper — convert Task.date to Date()
   */
  static toDate(task: Task): Date {
    return new Date(task.date);
  }
}
