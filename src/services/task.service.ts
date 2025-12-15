import { TasksAPI } from "../api/tasks.api";
import type { Task, TaskCompletionResult } from "../models/task.model";

export async function loadTasks(
  courseId?: string,
  moduleId?: string
): Promise<Task[]> {
  return TasksAPI.list({ courseId, moduleId });
}

export async function completeTaskFlow(
  taskId: string
): Promise<TaskCompletionResult> {
  // hier kan later extra frontend logica bij
  return TasksAPI.complete(taskId);
}
