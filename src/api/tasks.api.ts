import { apiFetch } from "./client";

export function getTasks(courseId?: string, moduleId?: string) {
  const params = new URLSearchParams();
  if (courseId) params.append("courseId", courseId);
  if (moduleId) params.append("moduleId", moduleId);

  return apiFetch(`/tasks?${params.toString()}`);
}

export function completeTask(taskId: string) {
  return apiFetch(`/tasks/${taskId}/complete`, {
    method: "POST",
  });
}