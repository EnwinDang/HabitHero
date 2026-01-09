import { api } from "./axios-instance";

export type SubmissionStatus = "pending" | "approved" | "rejected";

export interface Submission {
  submissionId: string;
  studentId: string;
  imageUrl: string | null;
  status: SubmissionStatus;
  teacherComment: string | null;
  createdAt: number;
  updatedAt: number;
  claimedAt?: number;
  courseId?: string;
  moduleId?: string;
  taskId?: string;
  teacherId?: string;
  taskTitle?: string;
  moduleName?: string;
  courseName?: string;
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

  async list(taskId: string, courseId: string, moduleId: string, status?: SubmissionStatus): Promise<Submission[]> {
    const params = new URLSearchParams({ courseId, moduleId });
    if (status) params.append("status", status);
    const res = await api.get<Submission[]>(`/tasks/${taskId}/submissions?${params}`);
    return res.data;
  },

  async listForTeacher(status?: SubmissionStatus): Promise<Submission[]> {
    const params = new URLSearchParams();
    if (status) params.append("status", status);
    const suffix = params.toString() ? `?${params.toString()}` : "";
    const res = await api.get<Submission[]>(`/teacher/submissions${suffix}`);
    return res.data;
  },

  async update(
    taskId: string,
    submissionId: string,
    courseId: string,
    moduleId: string,
    status: SubmissionStatus,
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

  async listLatest(taskId: string, courseId: string, moduleId: string, status?: SubmissionStatus): Promise<Submission | undefined> {
    const subs = await this.list(taskId, courseId, moduleId, status);
    return subs[0];
  },

  async listLatestByTasks(
    taskIds: string[],
    courseId: string,
    moduleId: string,
    status?: SubmissionStatus
  ): Promise<Record<string, Submission>> {
    const results = await Promise.all(
      taskIds.map(async (taskId) => {
        try {
          const latest = await this.listLatest(taskId, courseId, moduleId, status);
          return [taskId, latest] as const;
        } catch (err) {
          console.error(`Failed to load submissions for task ${taskId}`, err);
          return [taskId, undefined] as const;
        }
      })
    );

    return results.reduce<Record<string, Submission>>((acc, [taskId, submission]) => {
      if (submission) acc[taskId] = submission;
      return acc;
    }, {});
  },
};
