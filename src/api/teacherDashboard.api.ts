import { realtimeDb } from "../firebase";
import { ref, get, onValue, off } from "firebase/database";

export interface ModuleStats {
  completedBy: number;
  completionRate: number;
  totalTasks: number;
}

export interface CourseModules {
  [moduleId: string]: ModuleStats;
}

export interface StudentInfo {
  displayName: string;
  currentModule: string;
  lastActive: string;
  tasksCompleted: number;
  totalXP: number;
}

export interface CourseOverview {
  averageXP: number;
  modulesCompleted: number;
  tasksCompletedToday: number;
  totalStudents: number;
}

export interface ManagedCourse {
  modules: CourseModules;
  overview: CourseOverview;
  students: {
    [studentId: string]: StudentInfo;
  };
}

export interface TeacherDashboard {
  managedCourses: {
    [courseId: string]: ManagedCourse;
  };
}

/**
 * Get teacher dashboard data (one-time fetch)
 */
export async function getTeacherDashboard(teacherId: string): Promise<TeacherDashboard | null> {
  try {
    const dashboardRef = ref(realtimeDb, `teacherDashboard/teacherDashboards/${teacherId}`);
    const snapshot = await get(dashboardRef);
    
    if (snapshot.exists()) {
      return snapshot.val() as TeacherDashboard;
    }
    
    return null;
  } catch (error) {
    console.error("Error fetching teacher dashboard:", error);
    throw error;
  }
}

/**
 * Get managed courses for a teacher
 */
export async function getManagedCourses(teacherId: string): Promise<{ [courseId: string]: ManagedCourse } | null> {
  try {
    const coursesRef = ref(realtimeDb, `teacherDashboard/teacherDashboards/${teacherId}/managedCourses`);
    const snapshot = await get(coursesRef);
    
    if (snapshot.exists()) {
      return snapshot.val() as { [courseId: string]: ManagedCourse };
    }
    
    return null;
  } catch (error) {
    console.error("Error fetching managed courses:", error);
    throw error;
  }
}

/**
 * Get overview for a specific course
 */
export async function getCourseOverview(
  teacherId: string,
  courseId: string
): Promise<CourseOverview | null> {
  try {
    const overviewRef = ref(realtimeDb, `teacherDashboard/teacherDashboards/${teacherId}/managedCourses/${courseId}/overview`);
    const snapshot = await get(overviewRef);
    
    if (snapshot.exists()) {
      return snapshot.val() as CourseOverview;
    }
    
    return null;
  } catch (error) {
    console.error("Error fetching course overview:", error);
    throw error;
  }
}

/**
 * Get module stats for a specific course
 */
export async function getCourseModules(
  teacherId: string,
  courseId: string
): Promise<CourseModules | null> {
  try {
    const modulesRef = ref(realtimeDb, `teacherDashboard/teacherDashboards/${teacherId}/managedCourses/${courseId}/modules`);
    const snapshot = await get(modulesRef);
    
    if (snapshot.exists()) {
      return snapshot.val() as CourseModules;
    }
    
    return null;
  } catch (error) {
    console.error("Error fetching course modules:", error);
    throw error;
  }
}

/**
 * Get students for a specific course
 */
export async function getCourseStudents(
  teacherId: string,
  courseId: string
): Promise<{ [studentId: string]: StudentInfo } | null> {
  try {
    const studentsRef = ref(realtimeDb, `teacherDashboard/teacherDashboards/${teacherId}/managedCourses/${courseId}/students`);
    const snapshot = await get(studentsRef);
    
    if (snapshot.exists()) {
      return snapshot.val() as { [studentId: string]: StudentInfo };
    }
    
    return null;
  } catch (error) {
    console.error("Error fetching course students:", error);
    throw error;
  }
}

/**
 * Subscribe to real-time updates for teacher dashboard
 * Returns an unsubscribe function
 */
export function subscribeToTeacherDashboard(
  teacherId: string,
  callback: (data: TeacherDashboard | null) => void
): () => void {
  const dashboardRef = ref(realtimeDb, `teacherDashboard/teacherDashboards/${teacherId}`);
  
  const unsubscribe = onValue(
    dashboardRef,
    (snapshot) => {
      if (snapshot.exists()) {
        callback(snapshot.val() as TeacherDashboard);
      } else {
        callback(null);
      }
    },
    (error) => {
      console.error("Error in teacher dashboard subscription:", error);
      callback(null);
    }
  );
  
  // Return unsubscribe function
  return () => {
    off(dashboardRef);
    unsubscribe();
  };
}

