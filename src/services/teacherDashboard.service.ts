import {
  getTeacherDashboard,
  getManagedCourses,
  getCourseOverview,
  getCourseModules,
  getCourseStudents,
  subscribeToTeacherDashboard,
  type TeacherDashboard,
  type CourseOverview,
  type ManagedCourse,
  type CourseModules,
  type StudentInfo,
} from "../api/teacherDashboard.api";

/**
 * Load complete teacher dashboard data
 */
export async function loadTeacherDashboard(teacherId: string): Promise<TeacherDashboard | null> {
  return getTeacherDashboard(teacherId);
}

/**
 * Load managed courses for a teacher
 */
export async function loadManagedCourses(teacherId: string): Promise<{ [courseId: string]: ManagedCourse } | null> {
  return getManagedCourses(teacherId);
}

/**
 * Load overview statistics for a specific course
 */
export async function loadCourseOverview(teacherId: string, courseId: string): Promise<CourseOverview | null> {
  return getCourseOverview(teacherId, courseId);
}

/**
 * Load module statistics for a specific course
 */
export async function loadCourseModules(teacherId: string, courseId: string): Promise<CourseModules | null> {
  return getCourseModules(teacherId, courseId);
}

/**
 * Load students for a specific course
 */
export async function loadCourseStudents(teacherId: string, courseId: string): Promise<{ [studentId: string]: StudentInfo } | null> {
  return getCourseStudents(teacherId, courseId);
}

/**
 * Subscribe to real-time teacher dashboard updates
 * Returns an unsubscribe function
 */
export function subscribeToDashboard(
  teacherId: string,
  callback: (data: TeacherDashboard | null) => void
): () => void {
  return subscribeToTeacherDashboard(teacherId, callback);
}

// Re-export types for convenience
export type {
  TeacherDashboard,
  CourseOverview,
  ManagedCourse,
  CourseModules,
  StudentInfo,
};

