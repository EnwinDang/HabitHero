import { api } from "./axios-instance";

export interface Submission {
  submissionId: string;
  studentId: string;
  imageUrl: string | null;
  status: "pending" | "approved" | "rejected";
  teacherComment: string | null;
  createdAt: number;
  updatedAt: number;
  claimedAt?: number;
}

export const SubmissionsAPI = {
  async create(taskId: string, courseId: string, moduleId: string, imageUrl: string): Promise<Submission> {
    const res = await api.post<Submission>(`/tasks/${taskId}/submissions`, {
      courseId,
      moduleId,
      imageUrl,
    });
    return res.data;
  },

  async list(taskId: string, courseId: string, moduleId: string, status?: string): Promise<Submission[]> {
    const params = new URLSearchParams({ courseId, moduleId });
    if (status) params.append("status", status);
    const res = await api.get<Submission[]>(`/tasks/${taskId}/submissions?${params}`);
    return res.data;
  },

  async update(
    taskId: string,
    submissionId: string,
    courseId: string,
    moduleId: string,
    status: "pending" | "approved" | "rejected",
    teacherComment?: string
  ): Promise<Submission> {
    const res = await api.patch<Submission>(`/tasks/${taskId}/submissions/${submissionId}`, {
      courseId,
      moduleId,
      status,
      teacherComment,
    });
    return res.data;
  },

  async claim(taskId: string, courseId: string, moduleId: string): Promise<any> {
    const res = await api.post(`/tasks/${taskId}/claim`, {
      courseId,
      moduleId,
    });
    return res.data;
  },
};
