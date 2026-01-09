import {
  getTeacherDashboard,
  getCourseStudents,
  type TeacherDashboard,
  type StudentInfo,
} from "../api/teacherDashboard.api";
import { CoursesAPI } from "../api/courses.api";
import { TasksAPI } from "../api/tasks.api";
import { cache, cacheKeys } from "../utils/cache";

/**
 * Load complete teacher dashboard data
 * Now fully API-based - builds dashboard from API instead of Realtime Database
 */
export async function loadTeacherDashboard(teacherId: string): Promise<TeacherDashboard | null> {
  const cacheKey = cacheKeys.dashboard(teacherId);
  
  // Check cache first
  const cached = cache.get<TeacherDashboard | null>(cacheKey);
  if (cached !== null) {
    console.log('📦 Cache hit for dashboard:', teacherId);
    return cached;
  }
  
  console.log('🌐 Cache miss, building dashboard from API...');
  
  try {
    // Build dashboard structure from API (courses, modules, students)
    console.log('🔄 [API] Fetching courses from API...');
    const courses = await CoursesAPI.list(false); // Get all courses
    console.log(`✅ [API] Loaded ${courses.length} courses from API`);
    
    const data: TeacherDashboard = { managedCourses: {} };
    
    // Build dashboard for each course
    const coursePromises = courses.map(async (course) => {
      try {
        // Load modules for this course
        console.log(`🔄 [API] Fetching modules for course ${course.courseId}...`);
        const modules = await CoursesAPI.listModules(course.courseId).catch(() => []);
        console.log(`✅ [API] Loaded ${modules.length} modules for ${course.courseId}`);
        
        // Load students for this course
        console.log(`🔄 [API] Fetching students for course ${course.courseId}...`);
        const students = await loadCourseStudents(teacherId, course.courseId);
        const studentCount = students ? Object.keys(students).length : 0;
        
        // Calculate module stats
        const moduleStats: { [moduleId: string]: any } = {};
        
        // Load tasks for each module to get accurate task counts
        const modulePromises = modules.map(async (module) => {
          try {
            const tasks = await TasksAPI.list({ 
              courseId: course.courseId, 
              moduleId: module.moduleId 
            });
            const taskCount = tasks.length;
            
          moduleStats[module.moduleId] = {
            completedBy: 0, // Would need student progress data
            completionRate: 0, // Would need student progress data
              totalTasks: taskCount,
            };
          } catch (err) {
            console.warn(`⚠️ Failed to load tasks for module ${module.moduleId}:`, err);
            // Fallback to 0 if task loading fails
            moduleStats[module.moduleId] = {
              completedBy: 0,
              completionRate: 0,
              totalTasks: 0,
            };
          }
        });
        
        // Wait for all module task counts to be loaded
        await Promise.all(modulePromises);
        
        // Calculate average XP from students
        let totalXP = 0;
        let studentCountWithXP = 0;
        if (students) {
          Object.values(students).forEach((student: any) => {
            if (student.totalXP) {
              totalXP += student.totalXP;
              studentCountWithXP++;
            }
          });
        }
        const averageXP = studentCountWithXP > 0 ? Math.round(totalXP / studentCountWithXP) : 0;
        
        data.managedCourses[course.courseId] = {
          overview: {
            averageXP: averageXP,
            modulesCompleted: 0, // Would need student progress data
            tasksCompletedToday: 0, // Would need task completion tracking
            totalStudents: studentCount,
          },
          modules: moduleStats,
          students: students || {},
        };
        
        console.log(`  ✅ Built dashboard for ${course.courseId}: ${studentCount} students, ${modules.length} modules`);
      } catch (err) {
        console.error(`  ❌ Error building dashboard for course ${course.courseId}:`, err);
        // Still add course with empty data
        data.managedCourses[course.courseId] = {
          overview: {
            averageXP: 0,
            modulesCompleted: 0,
            tasksCompletedToday: 0,
            totalStudents: 0,
          },
          modules: {},
          students: {},
        };
      }
    });
    
    await Promise.all(coursePromises);
    
    const totalStudents = Object.values(data.managedCourses).reduce(
      (sum, course) => sum + (course.overview?.totalStudents || 0),
      0
    );
    console.log(`✅ Dashboard built from API: ${courses.length} courses, ${totalStudents} total students`);
    
    // Cache for 1 minute (dashboard data changes frequently)
    cache.set(cacheKey, data, 60 * 1000);
    
    return data;
  } catch (err) {
    console.error('❌ [API] Error building dashboard from API:', err);
    // Fallback: Try Realtime Database if API completely fails
    console.warn('⚠️ [FALLBACK] API failed, falling back to Realtime Database...');
    const fallbackData = await getTeacherDashboard(teacherId);
    if (fallbackData) {
      // Still enrich with API student counts
      if (fallbackData.managedCourses) {
        const courseIds = Object.keys(fallbackData.managedCourses);
        const studentCountPromises = courseIds.map(async (courseId) => {
          try {
            console.log(`🔄 [FALLBACK] Fetching students for course ${courseId} via API (within fallback)...`);
            const students = await loadCourseStudents(teacherId, courseId);
            const count = students ? Object.keys(students).length : 0;
            console.log(`✅ [FALLBACK] Found ${count} students for ${courseId}`);
            return { courseId, studentCount: count };
          } catch {
            console.warn(`⚠️ [FALLBACK] Failed to fetch students for ${courseId}`);
            return { courseId, studentCount: 0 };
          }
        });
        const studentCounts = await Promise.all(studentCountPromises);
        studentCounts.forEach(({ courseId, studentCount }) => {
          if (fallbackData.managedCourses[courseId]) {
            if (!fallbackData.managedCourses[courseId].overview) {
              fallbackData.managedCourses[courseId].overview = {
                averageXP: 0,
                modulesCompleted: 0,
                tasksCompletedToday: 0,
                totalStudents: 0,
              };
            }
            fallbackData.managedCourses[courseId].overview.totalStudents = studentCount;
          }
        });
      }
      return fallbackData;
    }
    return null;
  }
}

/**
 * Load students for a specific course
 * Uses CoursesAPI.listStudents (same pattern as courses.service.ts)
 * Falls back to Realtime Database if API unavailable
 */
export async function loadCourseStudents(teacherId: string, courseId: string): Promise<{ [studentId: string]: StudentInfo } | null> {
  const cacheKey = cacheKeys.courseStudents(teacherId, courseId);
  
  const cached = cache.get<{ [studentId: string]: StudentInfo } | null>(cacheKey);
  if (cached !== null && cached !== undefined) {
    console.log('📦 Cache hit for course students:', courseId);
    return cached;
  }
  
  console.log('🌐 Cache miss, fetching course students:', courseId);
  
  // Use CoursesAPI.listStudents (same as courses.service.ts pattern)
  try {
    console.log(`🔄 [API] Fetching students for course ${courseId} from API...`);
    const studentsArray = await CoursesAPI.listStudents(courseId);
    
    // Backend returns full student data: { uid, displayName, tasksCompleted, totalXP, currentModule, lastActive, enrolledAt }
    // Convert array to object format expected by the UI: { [studentId: string]: StudentInfo }
    const studentsMap: { [studentId: string]: StudentInfo } = {};
    
    for (const student of studentsArray) {
      // Backend already provides all needed data
      studentsMap[student.uid] = {
        displayName: (student as any).displayName || student.uid,
        currentModule: (student as any).currentModule || '',
        lastActive: (student as any).lastActive || '',
        tasksCompleted: (student as any).tasksCompleted || 0,
        totalXP: (student as any).totalXP || 0,
      };
    }
    
    // Cache for 1 minute
    cache.set(cacheKey, studentsMap, 60 * 1000);
    console.log(`✅ [API] Successfully loaded ${Object.keys(studentsMap).length} students from API for course ${courseId}`);
    return studentsMap;
  } catch (apiErr: any) {
    // API failed, fallback to Realtime Database
    console.warn(`⚠️ [FALLBACK] API unavailable for course ${courseId}, falling back to Realtime Database:`, apiErr.message);
    
    try {
      console.log(`🔄 [FALLBACK] Fetching students from Realtime Database for course ${courseId}...`);
      const data = await getCourseStudents(teacherId, courseId);
      
      // Cache for 1 minute (student data changes more frequently)
      cache.set(cacheKey, data, 60 * 1000);
      const count = data ? Object.keys(data).length : 0;
      console.log(`✅ [FALLBACK] Successfully loaded ${count} students from Realtime Database for course ${courseId}`);
      return data;
    } catch (fallbackErr: any) {
      console.error(`❌ [FALLBACK] Both API and Realtime Database failed for course ${courseId}:`, fallbackErr);
      return null;
    }
  }
}

// Re-export types for convenience
export type {
  TeacherDashboard,
  StudentInfo,
};

