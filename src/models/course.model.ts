export interface Course {
  courseId: string;
  name: string;
  description?: string | null;
  courseCode: string;
  startDate?: string;
  endDate?: string;
  isActive: boolean;
}

export interface CourseEnrollment {
  uid: string;
  enrolledAt?: number;
}
