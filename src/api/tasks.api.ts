import { apiFetch } from "./client";
import type { Task, TaskCompletionResult } from "../models/task.model";

export type TasksQuery = {
  courseId?: string;
  moduleId?: string;
  activeOnly?: boolean;
};

function qs(params: Record<string, any>): string {
  const sp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v === undefined || v === null || v === "") return;
    sp.append(k, String(v));
  });
  const s = sp.toString();
  return s ? `?${s}` : "";
}

export type CompleteTaskRequest = {
  completedAt?: number;
  notes?: string;
};

export const TasksAPI = {
  list(query: TasksQuery = {}): Promise<Task[]> {
    return apiFetch<Task[]>(`/tasks${qs(query)}`);
  },

  create(task: Task): Promise<Task> {
    return apiFetch<Task>("/tasks", { method: "POST", body: JSON.stringify(task) });
  },

  get(taskId: string): Promise<Task> {
    return apiFetch<Task>(`/tasks/${taskId}`);
  },

  replace(taskId: string, task: Task): Promise<Task> {
    return apiFetch<Task>(`/tasks/${taskId}`, { method: "PUT", body: JSON.stringify(task) });
  },

  patch(taskId: string, patch: Partial<Task>): Promise<Task> {
    return apiFetch<Task>(`/tasks/${taskId}`, { method: "PATCH", body: JSON.stringify(patch) });
  },

  delete(taskId: string): Promise<void> {
    return apiFetch<void>(`/tasks/${taskId}`, { method: "DELETE" });
  },

  // Module-scoped
  listForModule(courseId: string, moduleId: string): Promise<Task[]> {
    return apiFetch<Task[]>(`/courses/${courseId}/modules/${moduleId}/tasks`);
  },

  createForModule(courseId: string, moduleId: string, task: Task): Promise<Task> {
    return apiFetch<Task>(`/courses/${courseId}/modules/${moduleId}/tasks`, {
      method: "POST",
      body: JSON.stringify(task),
    });
  },

  // Completion
  complete(taskId: string, body: CompleteTaskRequest = {}): Promise<TaskCompletionResult> {
    return apiFetch<TaskCompletionResult>(`/tasks/${taskId}/complete`, {
      method: "POST",
      body: JSON.stringify(body),
    });
  },
};
