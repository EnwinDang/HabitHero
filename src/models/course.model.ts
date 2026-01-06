export interface Course {
  courseId: string;
  name: string;
  description?: string | null;
  courseCode: string;
  startDate?: string | null;
  endDate?: string | null;
  isActive: boolean;
  createdBy?: string;
  students?: Record<string, boolean>;
  createdAt?: number;
  updatedAt?: number;
}

export interface CourseEnrollment {
  uid: string;
  enrolledAt?: number;
}
