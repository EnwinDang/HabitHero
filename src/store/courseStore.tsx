import { useState, useCallback, useEffect } from 'react';
import { CoursesAPI, ModulesAPI } from '../api/courses.api';
import type { Course as APICourse } from '../models/course.model';
import type { Module as APIModule } from '../models/module.model';
import { loadTasks } from '../services/task.service';
import { cache, cacheKeys } from '../utils/cache';
import { db } from '../firebase';
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  deleteDoc,
} from 'firebase/firestore';

// UI format types
interface UIModule {
  id: string;
  name: string;
  description: string;
  active: boolean;
  order: number;
  achievementId: string | null;
  courseId: string;
  exercises: number;
  completion: number;
}

interface UICourse {
  id: string;
  name: string;
  courseCode: string;
  active: boolean;
  description: string;
  startDate: string | null;
  endDate: string | null;
  createdBy: string | null;
  modules: UIModule[];
}

// Helper functions to map between API format and UI format
function mapCourseFromAPI(apiCourse: APICourse, modules: APIModule[] = []) {
  const uiModules = modules.map((apiModule, index) => {
    // Handle missing moduleId - use index as fallback (shouldn't happen but defensive)
    const moduleId = apiModule.moduleId || `missing-id-${index}`;
    if (!apiModule.moduleId) {
      console.warn('⚠️ Module missing moduleId from API:', apiModule);
    }
    return {
      id: moduleId,
      name: apiModule.title || '',
      description: apiModule.description || '',
      active: apiModule.isActive !== false,
      order: apiModule.order || 0,
      achievementId: apiModule.achievementId || null,
      courseId: apiCourse.courseId,
      exercises: 0, // Will be calculated from tasks
      completion: 0, // Will be calculated
    };
  });

  return {
    id: apiCourse.courseId,
    name: apiCourse.name || '',
    courseCode: apiCourse.courseCode || '',
    active: apiCourse.isActive !== false,
    description: apiCourse.description || '',
    startDate: apiCourse.startDate || null,
    endDate: apiCourse.endDate || null,
    createdBy: apiCourse.createdBy || null, // Get from API response
    modules: uiModules,
  };
}

// Helper functions to map between Firestore format and UI format (fallback)
function mapCourseFromFirestore(docData: any, docId: string) {
  const data = docData;
  const modules = data.modules ? Object.entries(data.modules).map(([moduleId, moduleData]: [string, any]) => ({
    id: moduleId,
    name: moduleData.title || '',
    description: moduleData.description || '',
    active: moduleData.isActive !== false,
    order: moduleData.order || 0,
    achievementId: moduleData.achievementId || null,
    courseId: docId,
  })) : [];

  return {
    id: docId,
    name: data.name || '',
    courseCode: data.courseCode || '',
    active: data.isActive !== false,
    description: data.description || '',
    startDate: data.startDate || null,
    endDate: data.endDate || null,
    createdBy: data.createdBy || null,
    modules: modules,
  };
}

function mapCourseToFirestore(uiCourse: any) {
  return {
    name: uiCourse.name,
    courseCode: uiCourse.courseCode || uiCourse.program || '',
    description: uiCourse.description || null,
    isActive: uiCourse.active !== false,
    startDate: uiCourse.startDate || null,
    endDate: uiCourse.endDate || null,
    createdBy: uiCourse.createdBy || null,
  };
}

function mapModuleFromFirestore(moduleId: string, moduleData: any, courseId: string) {
  return {
    id: moduleId,
    name: moduleData.title || '',
    description: moduleData.description || '',
    active: moduleData.isActive !== false,
    order: moduleData.order || 0,
    achievementId: moduleData.achievementId || null,
    courseId: courseId,
    exercises: 0, // Will be calculated from tasks
    completion: 0, // Will be calculated
  };
}

function mapModuleToFirestore(uiModule: any) {
  return {
    title: uiModule.name,
    description: uiModule.description || null,
    isActive: uiModule.active !== false,
    order: uiModule.order || 0,
    achievementId: uiModule.achievementId || null,
  };
}

function mapCourseToAPI(uiCourse: any) {
  return {
    name: uiCourse.name,
    courseCode: uiCourse.courseCode || '',
    description: uiCourse.description || null,
    isActive: uiCourse.active !== false,
    startDate: uiCourse.startDate || null,
    endDate: uiCourse.endDate || null,
  } as Partial<APICourse>;
}

function mapModuleFromAPI(apiModule: APIModule) {
  // Handle missing moduleId - this shouldn't happen but defensive
  if (!apiModule.moduleId) {
    console.warn('⚠️ Module missing moduleId from API:', apiModule);
  }
  return {
    id: apiModule.moduleId || `missing-id-${Date.now()}`,
    name: apiModule.title || '',
    description: apiModule.description || '',
    active: apiModule.isActive !== false,
    order: apiModule.order || 0,
    achievementId: apiModule.achievementId || null,
    courseId: apiModule.courseId || '',
    exercises: 0, // Will be calculated from tasks
    completion: 0, // Will be calculated
  };
}

function mapModuleToAPI(uiModule: any) {
  return {
    title: uiModule.name,
    description: uiModule.description || null,
    isActive: uiModule.active !== false,
    order: uiModule.order || 0,
    achievementId: uiModule.achievementId || null,
  } as Partial<APIModule>;
}

export function useCourses() {
  const [courses, setCourses] = useState<UICourse[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<UICourse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Define loadCourses with useCallback to ensure stable reference
  const loadCourses = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Check cache first
      const cacheKey = cacheKeys.courses();
      const cached = cache.get<UICourse[]>(cacheKey);
      if (cached !== null && cached !== undefined) {
        console.log('📦 Cache hit for courses');
        setCourses(cached);
        setLoading(false);
        return;
      }
      
      console.log('🌐 Cache miss, fetching courses...');
      
      // Try API first, fallback to Firestore if API is not available
      let coursesList: any[] = [];
      
      try {
        console.log('🔄 [API] Attempting to fetch courses from API...');
      // Get all courses from API
      const apiCourses = await CoursesAPI.list(false); // Get all courses, not just active
        console.log(`✅ [API] Loaded ${apiCourses.length} courses from API`);
      
      // Load modules for all courses in parallel
        console.log('🔄 [API] Loading modules for all courses...');
      const modulesPromises = apiCourses.map(course => 
        CoursesAPI.listModules(course.courseId).catch(err => {
            console.error(`❌ [API] Error loading modules for course ${course.courseId}:`, err);
          return []; // Return empty array on error
        })
      );
      
      const allModulesArrays = await Promise.all(modulesPromises);
      
      // Map courses with their modules
      const coursesWithModules = apiCourses.map((apiCourse, index) => ({
        apiCourse,
        modules: allModulesArrays[index] || [],
      }));
      
      // Load all tasks in parallel for all modules
        console.log('🔄 [API] Loading tasks for all modules...');
      const taskPromises = coursesWithModules.flatMap(({ apiCourse, modules }) => 
        modules.map(module => 
          loadTasks(apiCourse.courseId, module.moduleId).catch(err => {
            console.error(`❌ [API] Error loading tasks for course ${apiCourse.courseId}, module ${module.moduleId}:`, err);
            return []; // Return empty array on error
          })
        )
      );
      
      const allTasksArrays = await Promise.all(taskPromises);
      
      // Process courses with their corresponding tasks and modules
      let taskArrayIndex = 0;
        coursesList = coursesWithModules.map(({ apiCourse, modules }) => {
        const mappedCourse = mapCourseFromAPI(apiCourse, modules);
        
        // Update module exercise counts
        mappedCourse.modules = mappedCourse.modules.map((module) => {
          const moduleTasks = allTasksArrays[taskArrayIndex] || [];
          taskArrayIndex++;
          return {
            ...module,
            exercises: moduleTasks.length,
            completion: moduleTasks.length > 0 
              ? Math.round((moduleTasks.filter(t => !t.isActive).length / moduleTasks.length) * 100)
              : 0,
          };
        });
        
        return mappedCourse;
      });
        
        console.log(`✅ [API] Successfully loaded ${coursesList.length} courses with modules and tasks from API`);
      } catch (apiErr: any) {
        // API failed, fallback to Firestore
        console.warn('⚠️ [FALLBACK] API unavailable, falling back to Firestore:', apiErr.message);
        console.log('🔄 [FALLBACK] Fetching courses from Firestore...');
        
        // Get all courses from Firestore
        const coursesRef = collection(db, 'courses');
        const coursesSnapshot = await getDocs(coursesRef);
        console.log(`✅ [FALLBACK] Loaded ${coursesSnapshot.size} courses from Firestore`);
        
        // Map all courses first (without task data)
        const coursePromises = coursesSnapshot.docs.map(async (courseDoc) => {
          const courseData = courseDoc.data();
          const courseId = courseDoc.id;
          return {
            courseId,
            mappedCourse: mapCourseFromFirestore(courseData, courseId),
          };
        });
        
        const coursesWithIds = await Promise.all(coursePromises);
        
        // Load all tasks in parallel for all modules
        const taskPromises = coursesWithIds.flatMap(({ courseId, mappedCourse }) => 
          mappedCourse.modules.map(module => 
            loadTasks(courseId, module.id).catch(err => {
              console.error(`Error loading tasks for course ${courseId}, module ${module.id}:`, err);
              return []; // Return empty array on error
            })
          )
        );
        
        const allTasksArrays = await Promise.all(taskPromises);
        
        // Process courses with their corresponding tasks
        let taskArrayIndex = 0;
        coursesList = coursesWithIds.map(({ courseId, mappedCourse }) => {
          // Update module exercise counts
          mappedCourse.modules = mappedCourse.modules.map((module) => {
            const moduleTasks = allTasksArrays[taskArrayIndex] || [];
            taskArrayIndex++;
            return {
              ...module,
              exercises: moduleTasks.length,
              completion: moduleTasks.length > 0 
                ? Math.round((moduleTasks.filter(t => !t.isActive).length / moduleTasks.length) * 100)
                : 0,
            };
          });
          
          return mappedCourse;
        });
        
        console.log(`✅ [FALLBACK] Successfully loaded ${coursesList.length} courses with modules and tasks from Firestore`);
      }
      
      // Cache the courses for 3 minutes
      cache.set(cacheKey, coursesList, 3 * 60 * 1000);
      setCourses(coursesList);
    } catch (err: any) {
      console.error('Error loading courses:', err);
      setError(err.message || 'Failed to load courses');
    } finally {
      setLoading(false);
    }
  }, []);

  // Load courses on mount
  useEffect(() => {
    loadCourses();
  }, [loadCourses]);

  const addCourse = useCallback(async (courseData: any) => {
    try {
      setError(null);
      
      // Try API first, fallback to Firestore
      let mapped: any;
      
      try {
        console.log('🔄 [API] Attempting to create course via API...');
      const apiCourseData = mapCourseToAPI({
        ...courseData,
        active: courseData.active !== undefined ? courseData.active : true,
        courseCode: courseData.courseCode || courseData.program || '',
      });
      
      // Create course via API (backend will generate courseId)
      const createdCourse = await CoursesAPI.create(apiCourseData as APICourse);
        mapped = mapCourseFromAPI(createdCourse, []);
        console.log('✅ [API] Course created via API');
      } catch (apiErr: any) {
        // API failed, fallback to Firestore
        console.warn('⚠️ [FALLBACK] API unavailable, using Firestore fallback:', apiErr.message);
        
        // Generate courseId from courseCode or use a timestamp-based ID
        const courseId = courseData.courseCode?.replace(/\s+/g, '') || `course_${Date.now()}`;
        
        const firestoreCourse = mapCourseToFirestore({
          ...courseData,
          active: courseData.active !== undefined ? courseData.active : true,
          courseCode: courseData.courseCode || courseData.program || courseId,
        });
        
        // Add createdBy if available from auth
        const { auth } = await import('../firebase');
        if (auth.currentUser) {
          firestoreCourse.createdBy = auth.currentUser.uid;
        }
        
        // Create course document
        const courseRef = doc(db, 'courses', courseId);
        await setDoc(courseRef, {
          ...firestoreCourse,
          courseId: courseId,
          modules: {}, // Initialize empty modules object
        });
        
        mapped = mapCourseFromFirestore({ ...firestoreCourse, courseId, modules: {} }, courseId);
        mapped.modules = [];
        console.log('✅ [FALLBACK] Course created via Firestore');
      }
      
      // Invalidate cache and reload courses
      cache.delete(cacheKeys.courses());
      await loadCourses();
      
      return mapped;
    } catch (err: any) {
      console.error('Error creating course:', err);
      setError(err.message || 'Failed to create course');
      throw err;
    }
  }, [loadCourses]);

  const updateCourse = useCallback(async (id: string, updates: any) => {
    try {
      setError(null);
      const course = courses.find(c => c.id === id);
      if (!course) throw new Error('Course not found');
      
      let mapped: any;
      
      try {
      // Map updates to API format
      const apiUpdates = mapCourseToAPI({ ...course, ...updates });
      
      // Update via API
      const updatedCourse = await CoursesAPI.patch(id, apiUpdates);
      
      // Reload modules for this course
      const modules = await CoursesAPI.listModules(id).catch(() => []);
      
      // Map to UI format
        mapped = mapCourseFromAPI(updatedCourse, modules);
        console.log('✅ [API] Course updated via API');
      } catch (apiErr: any) {
        // API failed, fallback to Firestore
        console.warn('⚠️ [FALLBACK] API unavailable, using Firestore fallback:', apiErr.message);
        
        const firestoreCourse = mapCourseToFirestore({ ...course, ...updates });
        const courseRef = doc(db, 'courses', id);
        
        // Update only the fields that changed
        await updateDoc(courseRef, firestoreCourse);
        
        mapped = mapCourseFromFirestore({ ...course, ...updates }, id);
        mapped.modules = course.modules; // Preserve existing modules
        console.log('✅ [FALLBACK] Course updated via Firestore');
      }
      
      // Update local state with existing modules data (exercises, completion)
      const existingCourse = courses.find(c => c.id === id);
      if (existingCourse) {
        mapped.modules = mapped.modules.map((module: any) => {
          const existingModule = existingCourse.modules.find(m => m.id === module.id);
          return existingModule || module;
        });
      }
      
      // Invalidate cache and update state
      cache.delete(cacheKeys.courses());
      setCourses(prev => {
        const updatedList = prev.map(c => c.id === id ? mapped : c);
        return updatedList;
      });
      
      return mapped;
    } catch (err: any) {
      console.error('Error updating course:', err);
      setError(err.message || 'Failed to update course');
      throw err;
    }
  }, [courses]);

  const deleteCourse = useCallback(async (id: string) => {
    try {
      setError(null);
      
      try {
      await CoursesAPI.delete(id);
        console.log('✅ [API] Course deleted via API');
      } catch (apiErr: any) {
        // API failed, fallback to Firestore
        console.warn('⚠️ [FALLBACK] API unavailable, using Firestore fallback:', apiErr.message);
        const courseRef = doc(db, 'courses', id);
        await deleteDoc(courseRef);
        console.log('✅ [FALLBACK] Course deleted via Firestore');
      }
      
      // Invalidate cache
      cache.delete(cacheKeys.courses());
      cache.delete(cacheKeys.tasks(id));
      
      // Update local state
      setCourses(prev => prev.filter(c => c.id !== id));
    } catch (err: any) {
      console.error('Error deleting course:', err);
      setError(err.message || 'Failed to delete course');
      throw err;
    }
  }, []);

  const setCourseActive = useCallback(async (id: string, active: boolean) => {
    try {
      await updateCourse(id, { active });
    } catch (err) {
      throw err;
    }
  }, [updateCourse]);

  const addModule = useCallback(async (courseId: string, moduleData: any) => {
    try {
      setError(null);
      
      let mapped: any;
      
      try {
      const apiModuleData = mapModuleToAPI({
        ...moduleData,
        active: moduleData.active !== undefined ? moduleData.active : true,
      });
      
      // Create module via API (backend will generate moduleId)
      const createdModule = await CoursesAPI.createModule(courseId, {
        ...apiModuleData,
        courseId,
      } as APIModule);
        
        mapped = mapModuleFromAPI(createdModule);
        console.log('✅ [API] Module created via API');
      } catch (apiErr: any) {
        // API failed, fallback to Firestore
        console.warn('⚠️ [FALLBACK] API unavailable, using Firestore fallback:', apiErr.message);
        
        // Generate moduleId
        const moduleId = `module_${Date.now()}`;
        
        const firestoreModule = mapModuleToFirestore({
          ...moduleData,
          active: moduleData.active !== undefined ? moduleData.active : true,
        });
        
        // Get course document
        const courseRef = doc(db, 'courses', courseId);
        const courseDoc = await getDoc(courseRef);
        
        if (!courseDoc.exists()) {
          throw new Error('Course not found');
        }
        
        const courseData = courseDoc.data();
        const modules = courseData.modules || {};
        
        // Add new module to modules object
        modules[moduleId] = {
          ...firestoreModule,
          moduleId: moduleId,
        };
        
        // Update course document
        await updateDoc(courseRef, { modules });
        
        mapped = mapModuleFromFirestore(moduleId, firestoreModule, courseId);
        console.log('✅ [FALLBACK] Module created via Firestore');
      }
      
      // Load tasks to calculate exercise count for the new module
      let exercises = 0;
      let completion = 0;
      try {
        const allTasks = await loadTasks(courseId, mapped.id);
        exercises = allTasks.length;
        completion = allTasks.length > 0 
          ? Math.round((allTasks.filter(t => t.isActive).length / allTasks.length) * 100)
          : 0;
      } catch (err) {
        console.error(`Error loading tasks for new module ${mapped.id}:`, err);
      }
      
      mapped.exercises = exercises;
      mapped.completion = completion;
      
      // Invalidate cache and update state
      cache.delete(cacheKeys.courses());
      cache.delete(cacheKeys.tasks(courseId));
      
      setCourses(prev => {
        const updated = prev.map(c => 
          c.id === courseId 
            ? { ...c, modules: [...(c.modules || []), mapped] }
            : c
        );
        return updated;
      });
      
      return mapped;
    } catch (err: any) {
      console.error('Error creating module:', err);
      setError(err.message || 'Failed to create module');
      throw err;
    }
  }, []);

  const updateModule = useCallback(async (courseId: string, moduleId: string, updates: any) => {
    try {
      setError(null);
      const course = courses.find(c => c.id === courseId);
      const module = course?.modules?.find(m => m.id === moduleId);
      if (!module) throw new Error('Module not found');
      
      let mapped: any;
      
      try {
      // Map updates to API format
      const apiUpdates = mapModuleToAPI({ ...module, ...updates });
      
      // Update via API
      const updatedModule = await ModulesAPI.patch(moduleId, apiUpdates);
        mapped = mapModuleFromAPI(updatedModule);
        console.log('✅ [API] Module updated via API');
      } catch (apiErr: any) {
        // API failed, fallback to Firestore
        console.warn('⚠️ [FALLBACK] API unavailable, using Firestore fallback:', apiErr.message);
        
        const firestoreModule = mapModuleToFirestore({ ...module, ...updates });
        
        // Get course document
        const courseRef = doc(db, 'courses', courseId);
        const courseDoc = await getDoc(courseRef);
        
        if (!courseDoc.exists()) {
          throw new Error('Course not found');
        }
        
        const courseData = courseDoc.data();
        const modules = courseData.modules || {};
        
        // Update module in modules object
        modules[moduleId] = {
          ...firestoreModule,
          moduleId: moduleId,
          achievementId: module.achievementId || null,
        };
        
        // Update course document
        await updateDoc(courseRef, { modules });
        
        mapped = mapModuleFromFirestore(moduleId, firestoreModule, courseId);
        console.log('✅ [FALLBACK] Module updated via Firestore');
      }
      
      // Load tasks to calculate exercise counts
      const allTasks = await loadTasks(courseId, moduleId);
      mapped.exercises = allTasks.length;
      mapped.completion = allTasks.length > 0 
          ? Math.round((allTasks.filter(t => t.isActive).length / allTasks.length) * 100)
        : 0;
      
      // Invalidate cache and update state
      cache.delete(cacheKeys.courses());
      cache.delete(cacheKeys.tasks(courseId, moduleId));
      
      setCourses(prev => {
        const updated = prev.map(c => 
          c.id === courseId
            ? { ...c, modules: (c.modules || []).map(m => m.id === moduleId ? mapped : m) }
            : c
        );
        return updated;
      });
      
      return mapped;
    } catch (err: any) {
      console.error('Error updating module:', err);
      setError(err.message || 'Failed to update module');
      throw err;
    }
  }, [courses]);

  const deleteModule = useCallback(async (courseId: string, moduleId: string) => {
    try {
      setError(null);
      
      try {
      await ModulesAPI.delete(moduleId);
        console.log('✅ [API] Module deleted via API');
      } catch (apiErr: any) {
        // API failed, fallback to Firestore
        console.warn('⚠️ [FALLBACK] API unavailable, using Firestore fallback:', apiErr.message);
        
        // Get course document
        const courseRef = doc(db, 'courses', courseId);
        const courseDoc = await getDoc(courseRef);
        
        if (!courseDoc.exists()) {
          throw new Error('Course not found');
        }
        
        const courseData = courseDoc.data();
        const modules = courseData.modules || {};
        
        // Remove module from modules object
        delete modules[moduleId];
        
        // Update course document
        await updateDoc(courseRef, { modules });
        console.log('✅ [FALLBACK] Module deleted via Firestore');
      }
      
      // Invalidate cache
      cache.delete(cacheKeys.courses());
      cache.delete(cacheKeys.tasks(courseId, moduleId));
      
      // Update local state
      setCourses(prev => {
        const updated = prev.map(c => 
          c.id === courseId
            ? { ...c, modules: (c.modules || []).filter(m => m.id !== moduleId) }
            : c
        );
        return updated;
      });
    } catch (err: any) {
      console.error('Error deleting module:', err);
      setError(err.message || 'Failed to delete module');
      throw err;
    }
  }, []);

  const setModuleActive = useCallback(async (courseId: string, moduleId: string, active: boolean) => {
    try {
      await updateModule(courseId, moduleId, { active });
    } catch (err) {
      throw err;
    }
  }, [updateModule]);

  return {
    courses,
    selectedCourse,
    setSelectedCourse,
    loading,
    error,
    addCourse,
    updateCourse,
    deleteCourse,
    setCourseActive,
    addModule,
    updateModule,
    deleteModule,
    setModuleActive,
    refreshCourses: loadCourses,
  };
}
