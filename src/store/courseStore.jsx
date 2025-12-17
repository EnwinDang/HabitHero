import { useState, useCallback, useEffect } from 'react';
import { db } from '../firebase';
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  deleteDoc,
  query,
  where
} from 'firebase/firestore';
import { loadTasks } from '../services/task.service';

// Helper functions to map between Firestore format and UI format
function mapCourseFromFirestore(docData, docId) {
  const data = docData;
  const modules = data.modules ? Object.entries(data.modules).map(([moduleId, moduleData]) => ({
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
    year: data.startDate ? new Date(data.startDate).getFullYear().toString() : '',
    program: data.courseCode || '',
    active: data.isActive !== false,
    description: data.description || '',
    startDate: data.startDate || null,
    endDate: data.endDate || null,
    createdBy: data.createdBy || null,
    modules: modules,
  };
}

function mapCourseToFirestore(uiCourse) {
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

function mapModuleFromFirestore(moduleId, moduleData, courseId) {
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

function mapModuleToFirestore(uiModule) {
  return {
    title: uiModule.name,
    description: uiModule.description || null,
    isActive: uiModule.active !== false,
    order: uiModule.order || 0,
    achievementId: uiModule.achievementId || null,
  };
}

export function useCourses() {
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Define loadCourses with useCallback to ensure stable reference
  const loadCourses = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Get all courses from Firestore
      const coursesRef = collection(db, 'courses');
      const coursesSnapshot = await getDocs(coursesRef);
      
      const coursesList = [];
      
      // Process each course
      for (const courseDoc of coursesSnapshot.docs) {
        const courseData = courseDoc.data();
        const courseId = courseDoc.id;
        
        // Map course data
        const mappedCourse = mapCourseFromFirestore(courseData, courseId);
        
        // Load tasks for each module to calculate exercise counts
        try {
          const allTasks = await loadTasks(courseId);
          
          // Update module exercise counts
          mappedCourse.modules = mappedCourse.modules.map(module => {
            const moduleTasks = allTasks.filter(t => t.moduleId === module.id);
            return {
              ...module,
              exercises: moduleTasks.length,
              completion: moduleTasks.length > 0 
                ? Math.round((moduleTasks.filter(t => t.isActive).length / moduleTasks.length) * 100)
                : 0,
            };
          });
        } catch (err) {
          console.error(`Error loading tasks for course ${courseId}:`, err);
          // Continue with modules without task data
        }
        
        coursesList.push(mappedCourse);
      }
      
      setCourses(coursesList);
    } catch (err) {
      console.error('Error loading courses:', err);
      if (err.code === 'permission-denied') {
        setError('Permission denied. Please check your Firestore security rules to allow read access to the courses collection.');
      } else {
        setError(err.message || 'Failed to load courses');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  // Load courses on mount
  useEffect(() => {
    loadCourses();
  }, [loadCourses]);

  const addCourse = useCallback(async (courseData) => {
    try {
      setError(null);
      
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
      
      const mapped = mapCourseFromFirestore({ ...firestoreCourse, courseId, modules: {} }, courseId);
      setCourses(prev => [...prev, { ...mapped, modules: [] }]);
      return mapped;
    } catch (err) {
      console.error('Error creating course:', err);
      if (err.code === 'permission-denied') {
        setError('Permission denied. Please check your Firestore security rules to allow write access to the courses collection.');
      } else {
        setError(err.message || 'Failed to create course');
      }
      throw err;
    }
  }, []);

  const updateCourse = useCallback(async (id, updates) => {
    try {
      setError(null);
      const course = courses.find(c => c.id === id);
      if (!course) throw new Error('Course not found');
      
      const firestoreCourse = mapCourseToFirestore({ ...course, ...updates });
      const courseRef = doc(db, 'courses', id);
      
      // Update only the fields that changed
      await updateDoc(courseRef, firestoreCourse);
      
      const updated = mapCourseFromFirestore({ ...course, ...updates }, id);
      setCourses(prev => prev.map(c => c.id === id ? { ...updated, modules: c.modules } : c));
      return updated;
    } catch (err) {
      console.error('Error updating course:', err);
      setError(err.message || 'Failed to update course');
      throw err;
    }
  }, [courses]);

  const deleteCourse = useCallback(async (id) => {
    try {
      setError(null);
      const courseRef = doc(db, 'courses', id);
      await deleteDoc(courseRef);
      setCourses(prev => prev.filter(c => c.id !== id));
    } catch (err) {
      console.error('Error deleting course:', err);
      setError(err.message || 'Failed to delete course');
      throw err;
    }
  }, []);

  const setCourseActive = useCallback(async (id, active) => {
    try {
      await updateCourse(id, { active });
    } catch (err) {
      throw err;
    }
  }, [updateCourse]);

  const addModule = useCallback(async (courseId, moduleData) => {
    try {
      setError(null);
      
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
      
      const mapped = mapModuleFromFirestore(moduleId, firestoreModule, courseId);
      
      setCourses(prev => prev.map(c => 
        c.id === courseId 
          ? { ...c, modules: [...(c.modules || []), mapped] }
          : c
      ));
      return mapped;
    } catch (err) {
      console.error('Error creating module:', err);
      setError(err.message || 'Failed to create module');
      throw err;
    }
  }, []);

  const updateModule = useCallback(async (courseId, moduleId, updates) => {
    try {
      setError(null);
      const course = courses.find(c => c.id === courseId);
      const module = course?.modules?.find(m => m.id === moduleId);
      if (!module) throw new Error('Module not found');
      
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
      
      // Load tasks to calculate exercise counts
      const allTasks = await loadTasks(courseId, moduleId);
      const mapped = {
        ...mapModuleFromFirestore(moduleId, firestoreModule, courseId),
        exercises: allTasks.length,
        completion: allTasks.length > 0 
          ? Math.round((allTasks.filter(t => t.isActive).length / allTasks.length) * 100)
          : 0,
      };
      
      setCourses(prev => prev.map(c => 
        c.id === courseId
          ? { ...c, modules: (c.modules || []).map(m => m.id === moduleId ? mapped : m) }
          : c
      ));
      return mapped;
    } catch (err) {
      console.error('Error updating module:', err);
      setError(err.message || 'Failed to update module');
      throw err;
    }
  }, [courses]);

  const deleteModule = useCallback(async (courseId, moduleId) => {
    try {
      setError(null);
      
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
      
      setCourses(prev => prev.map(c => 
        c.id === courseId
          ? { ...c, modules: (c.modules || []).filter(m => m.id !== moduleId) }
          : c
      ));
    } catch (err) {
      console.error('Error deleting module:', err);
      setError(err.message || 'Failed to delete module');
      throw err;
    }
  }, []);

  const setModuleActive = useCallback(async (courseId, moduleId, active) => {
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
