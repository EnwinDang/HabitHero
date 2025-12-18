import { TasksAPI } from "../api/tasks.api";
import type { Task, TaskCompletionResult } from "../models/task.model";
import { cache, cacheKeys } from "../utils/cache";

export async function loadTasks(
  courseId?: string,
  moduleId?: string
): Promise<Task[]> {
  const cacheKey = cacheKeys.tasks(courseId, moduleId);
  
  // Check cache first
  const cached = cache.get<Task[]>(cacheKey);
  if (cached !== null) {
    console.log('📦 Cache hit for tasks:', cacheKey);
    return cached;
  }
  
  console.log('🌐 Cache miss, fetching tasks:', cacheKey);
  const tasks = await TasksAPI.list({ courseId, moduleId });
  
  // Cache for 2 minutes (tasks change less frequently)
  cache.set(cacheKey, tasks, 2 * 60 * 1000);
  
  return tasks;
}

export async function getTask(taskId: string): Promise<Task> {
  return TasksAPI.getTask(taskId);
}

export async function createTask(task: Task): Promise<Task> {
  const result = await TasksAPI.create(task);
  
  // Invalidate cache for this course/module
  if (task.courseId) {
    cache.delete(cacheKeys.tasks(task.courseId));
    if (task.moduleId) {
      cache.delete(cacheKeys.tasks(task.courseId, task.moduleId));
    }
    // Also invalidate courses cache since exercise counts changed
    cache.delete(cacheKeys.courses());
  }
  
  return result;
}

export async function updateTask(taskId: string, task: Partial<Task>): Promise<Task> {
  const result = await TasksAPI.update(taskId, task);
  
  // Invalidate cache for this course/module
  if (task.courseId) {
    cache.delete(cacheKeys.tasks(task.courseId));
    if (task.moduleId) {
      cache.delete(cacheKeys.tasks(task.courseId, task.moduleId));
    }
    // Also invalidate courses cache since exercise counts might have changed
    cache.delete(cacheKeys.courses());
  }
  
  return result;
}

export async function deleteTask(taskId: string): Promise<void> {
  await TasksAPI.delete(taskId);
  
  // Note: We don't know courseId/moduleId from just taskId
  // Clear all task caches to be safe (or we could fetch the task first)
  cache.clearPrefix('tasks:');
  // Also invalidate courses cache since exercise counts changed
  cache.delete(cacheKeys.courses());
}

export async function completeTaskFlow(
  taskId: string
): Promise<TaskCompletionResult> {
  // hier kan later extra frontend logica bij
  return TasksAPI.complete(taskId);
}
