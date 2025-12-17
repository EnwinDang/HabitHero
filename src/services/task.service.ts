import { TasksAPI } from "../api/tasks.api";
import type { Task, TaskCompletionResult } from "../models/task.model";

export async function loadTasks(
  courseId?: string,
  moduleId?: string
): Promise<Task[]> {
  return TasksAPI.list({ courseId, moduleId });
}

export async function getTask(taskId: string): Promise<Task> {
  return TasksAPI.getTask(taskId);
}

export async function createTask(task: Task): Promise<Task> {
  return TasksAPI.create(task);
}

export async function updateTask(taskId: string, task: Partial<Task>): Promise<Task> {
  return TasksAPI.update(taskId, task);
}

export async function deleteTask(taskId: string): Promise<void> {
  return TasksAPI.delete(taskId);
}

export async function completeTaskFlow(
  taskId: string
): Promise<TaskCompletionResult> {
  // hier kan later extra frontend logica bij
  return TasksAPI.complete(taskId);
}
