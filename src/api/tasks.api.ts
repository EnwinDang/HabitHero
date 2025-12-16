import { api } from "./axios-instance";
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
  async list(query: TasksQuery = {}): Promise<Task[]> {
    const res = await api.get<Task[]>(`/tasks${qs(query)}`);
    return res.data;
  },

  async create(task: Task): Promise<Task> {
    const res = await api.post<Task>("/tasks", task);
    return res.data;
  },

  async complete(taskId: string, req?: CompleteTaskRequest): Promise<TaskCompletionResult> {
    const res = await api.post<TaskCompletionResult>(
      `/tasks/${taskId}/complete`,
      req || {}
    );
    return res.data;
  },

  async getTask(taskId: string): Promise<Task> {
    const res = await api.get<Task>(`/tasks/${taskId}`);
    return res.data;
  },

  async update(taskId: string, task: Partial<Task>): Promise<Task> {
    const res = await api.patch<Task>(`/tasks/${taskId}`, task);
    return res.data;
  },

  async delete(taskId: string): Promise<void> {
    await api.delete(`/tasks/${taskId}`);
  },
};
