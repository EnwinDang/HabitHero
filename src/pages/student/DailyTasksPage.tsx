import { useState, useEffect } from "react";
import { useRealtimeUser } from "@/hooks/useRealtimeUser";
import { useAuth } from "@/context/AuthContext";
import { useTheme, getThemeClasses } from "@/context/ThemeContext";
import { TasksAPI } from "@/api/tasks.api";
import { CoursesAPI } from "@/api/courses.api";
import { db } from "@/firebase";
import { collection, query, where, getDocs, doc, setDoc, getDoc, deleteDoc } from "firebase/firestore";
import type { Task } from "@/models/task.model";
import type { Course } from "@/models/course.model";
import type { Module } from "@/models/module.model";
import {
    ClipboardList,
    BookOpen,
    Coins,
    Star,
    Check,
    Plus,
    ChevronDown,
    GraduationCap,
    Key,
    Layers,
    X,
    LogOut,
} from "lucide-react";

export default function DailyTasksPage() {
    const { user, loading: userLoading } = useRealtimeUser();
    const { firebaseUser } = useAuth();
    const { darkMode, accentColor } = useTheme();
    const theme = getThemeClasses(darkMode, accentColor);

    const [enrolledCourses, setEnrolledCourses] = useState<Course[]>([]);
    const [availableCourses, setAvailableCourses] = useState<Course[]>([]);
    const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
    const [modules, setModules] = useState<Module[]>([]);
    const [selectedModule, setSelectedModule] = useState<Module | null>(null);
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedDifficulty, setSelectedDifficulty] = useState<string>("all");
    const [showCourseDropdown, setShowCourseDropdown] = useState(false);
    const [enrollingCourse, setEnrollingCourse] = useState<string | null>(null);
    const [showCodeInput, setShowCodeInput] = useState(false);
    const [courseCode, setCourseCode] = useState("");
    const [codeError, setCodeError] = useState("");
    const [courseSearchQuery, setCourseSearchQuery] = useState("");

    useEffect(() => {
        loadCoursesAndTasks();
    }, [firebaseUser]);

    async function loadCoursesAndTasks() {
        if (!firebaseUser) return;
        
        try {
            setLoading(true);
            
            // Only load enrolled courses by checking where student is enrolled
            const enrolled: Course[] = [];
            const coursesSnapshot = await getDocs(collection(db, "courses"));
            
            // Use Promise.all to check enrollments in parallel instead of sequentially
            const enrollmentChecks = coursesSnapshot.docs.map(async (courseDoc) => {
                const studentDoc = await getDoc(doc(db, `courses/${courseDoc.id}/students/${firebaseUser.uid}`));
                
                if (studentDoc.exists()) {
                    return {
                        courseId: courseDoc.id,
                        ...courseDoc.data()
                    } as Course;
                }
                return null;
            });
            
            const results = await Promise.all(enrollmentChecks);
            const enrolledCourses = results.filter((course): course is Course => course !== null);
            
            setEnrolledCourses(enrolledCourses);
            setAvailableCourses([]); // No courses shown as "available" - only via code
            
            // Select first enrolled course by default if any
            if (enrolledCourses.length > 0) {
                await selectCourse(enrolledCourses[0]);
            }
        } catch (error) {
            console.error("Error loading courses:", error);
        } finally {
            setLoading(false);
        }
    }

    async function selectCourse(course: Course) {
        setSelectedCourse(course);
        setShowCourseDropdown(false);
        
        try {
            // Load modules for the course
            const courseModules = await CoursesAPI.listModules(course.courseId);
            setModules(courseModules.sort((a, b) => a.order - b.order));
            
            // Select first module by default
            if (courseModules.length > 0) {
                await selectModule(courseModules[0], course.courseId);
            } else {
                // No modules, load all course tasks directly from Firestore
                const tasksRef = collection(db, "tasks");
                const q = query(
                    tasksRef,
                    where("courseId", "==", course.courseId),
                    where("isActive", "==", true)
                );
                
                const snapshot = await getDocs(q);
                const courseTasks = snapshot.docs.map(doc => ({
                    taskId: doc.id,
                    ...doc.data()
                })) as Task[];
                
                setTasks(courseTasks);
                setSelectedModule(null);
            }
        } catch (error) {
            console.error("Error loading modules:", error);
            setModules([]);
            setTasks([]);
        }
    }

    async function selectModule(module: Module, courseId?: string) {
        setSelectedModule(module);
        
        try {
            // Load tasks directly from Firestore
            const tasksRef = collection(db, "tasks");
            const q = query(
                tasksRef,
                where("courseId", "==", courseId || selectedCourse?.courseId),
                where("moduleId", "==", module.moduleId),
                where("isActive", "==", true)
            );
            
            const snapshot = await getDocs(q);
            const moduleTasks = snapshot.docs.map(doc => ({
                taskId: doc.id,
                ...doc.data()
            })) as Task[];
            
            console.log('Loaded tasks for module:', module.title, moduleTasks);
            setTasks(moduleTasks);
        } catch (error) {
            console.error("Error loading module tasks:", error);
            setTasks([]);
        }
    }

    async function handleEnrollCourse(course: Course) {
        if (!firebaseUser) return;

        try {
            setEnrollingCourse(course.courseId);
            await CoursesAPI.enroll(course.courseId, {
                uid: firebaseUser.uid,
                enrolledAt: Date.now(),
            });

            // Move course from available to enrolled
            setAvailableCourses(availableCourses.filter(c => c.courseId !== course.courseId));
            setEnrolledCourses([...enrolledCourses, course]);
            
            // Auto-select the newly enrolled course
            await selectCourse(course);
        } catch (error) {
            console.error("Error enrolling in course:", error);
            alert("Error al inscribirse en el curso. Por favor intenta de nuevo.");
        } finally {
            setEnrollingCourse(null);
        }
    }

    async function handleEnrollWithCode() {
        if (!firebaseUser || !courseCode.trim()) {
            setCodeError("Please enter a course code");
            return;
        }

        try {
            setEnrollingCourse("code-enrollment");
            setCodeError("");

            // Find course by courseCode (exact match) from Firestore
            const coursesSnapshot = await getDocs(collection(db, "courses"));
            const foundCourse = coursesSnapshot.docs
                .map(doc => ({
                    courseId: doc.id,
                    ...doc.data()
                } as Course))
                .find(c => c.courseCode === courseCode.trim());

            if (!foundCourse) {
                setCodeError("Invalid course code. Please check and try again.");
                setEnrollingCourse(null);
                return;
            }

            // Check if already enrolled by checking Firestore directly
            const studentDoc = await getDoc(doc(db, `courses/${foundCourse.courseId}/students/${firebaseUser.uid}`));
            if (studentDoc.exists()) {
                setCodeError("You are already enrolled in this course.");
                setEnrollingCourse(null);
                return;
            }

            // Enroll in the course directly in Firestore
            const studentRef = doc(db, `courses/${foundCourse.courseId}/students/${firebaseUser.uid}`);
            await setDoc(studentRef, {
                uid: firebaseUser.uid,
                enrolledAt: Date.now(),
            });

            console.log("✅ Enrolled in course:", foundCourse.name);

            // Update state
            setEnrolledCourses([...enrolledCourses, foundCourse]);
            
            // Select the newly enrolled course
            await selectCourse(foundCourse);
            
            // Close modal and reset
            setShowCodeInput(false);
            setCourseCode("");
            setCodeError("");
        } catch (error) {
            console.error("Error enrolling with code:", error);
            setCodeError("Error enrolling in course. Please try again.");
        } finally {
            setEnrollingCourse(null);
        }
    }

    async function handleLeaveCourse() {
        if (!firebaseUser || !selectedCourse) return;

        const confirmLeave = window.confirm(`Are you sure you want to leave the course "${selectedCourse.name}"?`);
        if (!confirmLeave) return;

        try {
            // Delete student document from Firestore
            const studentRef = doc(db, `courses/${selectedCourse.courseId}/students/${firebaseUser.uid}`);
            await deleteDoc(studentRef);

            console.log("✅ Left course:", selectedCourse.name);

            // Update state
            setEnrolledCourses(enrolledCourses.filter(c => c.courseId !== selectedCourse.courseId));
            setSelectedCourse(null);
            setModules([]);
            setTasks([]);
            setShowCourseDropdown(false);

            // Select first remaining enrolled course if any
            const remainingCourses = enrolledCourses.filter(c => c.courseId !== selectedCourse.courseId);
            if (remainingCourses.length > 0) {
                await selectCourse(remainingCourses[0]);
            }
        } catch (error) {
            console.error("Error leaving course:", error);
            alert("Error leaving course. Please try again.");
        }
    }

    async function handleCompleteTask(taskId: string) {
        try {
            const result = await TasksAPI.complete(taskId, {
                completedAt: Date.now()
            });
            
            // Remove completed task from list
            setTasks(tasks.filter(t => t.taskId !== taskId));
            
            // Show reward notification
            if (result.reward) {
                const messages = [];
                if (result.reward.xpGained) messages.push(`+${result.reward.xpGained} XP`);
                if (result.reward.goldGained) messages.push(`+${result.reward.goldGained} Gold`);
                if (result.reward.leveledUp) messages.push(`🎉 Level Up! Now level ${result.reward.newLevel}`);
                if (result.reward.achievementsUnlocked?.length) {
                    messages.push(`🏆 Achievement unlocked: ${result.reward.achievementsUnlocked.join(', ')}`);
                }
                if (result.reward.lootboxGranted) messages.push(`🎁 Lootbox received!`);
                
                if (messages.length > 0) {
                    alert(messages.join('\n'));
                }
            }
            
            // Refresh user data to update stats
            window.location.reload();
        } catch (error) {
            console.error("Error completing task:", error);
            alert("Error completing task. Please try again.");
        }
    }

    const filteredTasks = selectedDifficulty === "all"
        ? tasks
        : tasks.filter(t => t.difficulty === selectedDifficulty);

    const easyTasks = tasks.filter(t => t.difficulty === "easy");
    const mediumTasks = tasks.filter(t => t.difficulty === "medium");
    const hardTasks = tasks.filter(t => t.difficulty === "hard");
    const extremeTasks = tasks.filter(t => t.difficulty === "extreme");

    if (userLoading || loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-xl animate-pulse" style={theme.accentText}>
                    Laden...
                </div>
            </div>
        );
    }

    if (!user) {
        return null;
    }

    return (
        <div className={`min-h-screen ${theme.bg} transition-colors duration-300`}>
            <main className="p-8 overflow-y-auto">
                {/* Header */}
                <div className="mb-6 flex items-center justify-between">
                    <div>
                        <h2 className={`text-3xl font-bold ${theme.text}`}>Daily Tasks</h2>
                        <p className={theme.textMuted}>Complete exercises to earn XP and Gold</p>
                    </div>
                    <div className="flex gap-2">
                        {selectedCourse && (
                            <button
                                onClick={() => setShowCourseDropdown(!showCourseDropdown)}
                                className="px-4 py-2 rounded-xl font-medium transition-all flex items-center gap-2"
                                style={{
                                    backgroundColor: `${accentColor}20`,
                                    color: accentColor,
                                    borderWidth: '1px',
                                    borderStyle: 'solid',
                                    borderColor: `${accentColor}50`
                                }}
                            >
                                <BookOpen size={18} />
                                Change Course
                            </button>
                        )}
                        <button
                            onClick={() => setShowCodeInput(true)}
                            className="px-4 py-2 rounded-xl font-medium transition-all flex items-center gap-2 text-white"
                            style={{
                                backgroundColor: accentColor
                            }}
                        >
                            <Key size={18} />
                            Add Course
                        </button>
                        {selectedCourse && (
                            <button
                                onClick={handleLeaveCourse}
                                className="px-4 py-2 rounded-xl font-medium transition-all flex items-center gap-2"
                                style={{
                                    backgroundColor: 'rgba(239, 68, 68, 0.2)',
                                    color: '#ef4444',
                                    borderWidth: '1px',
                                    borderStyle: 'solid',
                                    borderColor: 'rgba(239, 68, 68, 0.5)'
                                }}
                            >
                                <LogOut size={18} />
                                Leave Course
                            </button>
                        )}
                    </div>
                </div>

                {/* Course Selector */}
                <div className="mb-6">
                    {selectedCourse ? (
                        <div className="relative">
                            {/* Current Course Display */}
                            <div
                                className={`${theme.card} rounded-2xl p-6 transition-colors duration-300`}
                                style={{ ...theme.borderStyle, borderWidth: '1px', borderStyle: 'solid' }}
                            >
                                <div className="flex items-center gap-3">
                                    <div
                                        className="w-12 h-12 rounded-xl flex items-center justify-center"
                                        style={{ backgroundColor: `${accentColor}20` }}
                                    >
                                        <BookOpen size={24} style={{ color: accentColor }} />
                                    </div>
                                    <div>
                                        <h3 className={`text-xl font-bold ${theme.text}`}>{selectedCourse.name}</h3>
                                        <p className={`text-sm ${theme.textMuted}`}>{selectedCourse.courseCode}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Dropdown Menu */}
                            {showCourseDropdown && (
                                <div
                                    className={`absolute top-full left-0 right-0 mt-2 ${theme.card} rounded-2xl shadow-xl z-10 overflow-hidden`}
                                    style={{ ...theme.borderStyle, borderWidth: '1px', borderStyle: 'solid' }}
                                >
                                    {/* Search Input */}
                                    <div className="p-4 border-b" style={{ borderColor: `${accentColor}20` }}>
                                        <input
                                            type="text"
                                            value={courseSearchQuery}
                                            onChange={(e) => setCourseSearchQuery(e.target.value)}
                                            placeholder="Search courses..."
                                            className={`w-full px-4 py-2 rounded-xl ${theme.inputBg} ${theme.text} border transition-colors`}
                                            style={{
                                                borderColor: `${accentColor}30`,
                                                outline: 'none'
                                            }}
                                            onFocus={(e) => e.target.style.borderColor = accentColor}
                                            onBlur={(e) => e.target.style.borderColor = `${accentColor}30`}
                                            autoFocus
                                        />
                                    </div>

                                    {/* Enrolled Courses */}
                                    {enrolledCourses.filter(c => 
                                        c.name.toLowerCase().includes(courseSearchQuery.toLowerCase()) ||
                                        c.courseCode.toLowerCase().includes(courseSearchQuery.toLowerCase())
                                    ).length > 0 && (
                                        <div className="p-4">
                                            <p className={`text-xs font-bold uppercase tracking-wider ${theme.textSubtle} mb-2`}>
                                                My Courses
                                            </p>
                                            {enrolledCourses
                                                .filter(c => 
                                                    c.name.toLowerCase().includes(courseSearchQuery.toLowerCase()) ||
                                                    c.courseCode.toLowerCase().includes(courseSearchQuery.toLowerCase())
                                                )
                                                .map((course) => (
                                                <button
                                                    key={course.courseId}
                                                    onClick={() => selectCourse(course)}
                                                    className={`w-full p-3 rounded-lg text-left transition-colors mb-1 flex items-center gap-3 ${
                                                        selectedCourse.courseId === course.courseId
                                                            ? 'bg-opacity-20'
                                                            : 'hover:bg-opacity-10'
                                                    }`}
                                                    style={{
                                                        backgroundColor: selectedCourse.courseId === course.courseId
                                                            ? `${accentColor}20`
                                                            : darkMode ? 'rgba(55, 65, 81, 0.3)' : 'rgba(243, 244, 246, 0.5)'
                                                    }}
                                                >
                                                    <BookOpen size={18} style={{ color: accentColor }} />
                                                    <div className="flex-1">
                                                        <p className={`font-medium ${theme.text}`}>{course.name}</p>
                                                        <p className={`text-xs ${theme.textSubtle}`}>{course.courseCode}</p>
                                                    </div>
                                                    {selectedCourse.courseId === course.courseId && (
                                                        <Check size={18} style={{ color: accentColor }} />
                                                    )}
                                                </button>
                                            ))}
                                        </div>
                                    )}

                                    {/* Available Courses */}
                                    {availableCourses.length > 0 && (
                                        <div className={`p-4 ${enrolledCourses.length > 0 ? 'border-t' : ''}`} style={{ borderColor: `${accentColor}20` }}>
                                            <p className={`text-xs font-bold uppercase tracking-wider ${theme.textSubtle} mb-2`}>
                                                Available Courses
                                            </p>
                                            {availableCourses.map((course) => (
                                                <button
                                                    key={course.courseId}
                                                    onClick={() => handleEnrollCourse(course)}
                                                    disabled={enrollingCourse === course.courseId}
                                                    className={`w-full p-3 rounded-lg text-left transition-colors mb-1 flex items-center gap-3`}
                                                    style={{
                                                        backgroundColor: darkMode ? 'rgba(55, 65, 81, 0.3)' : 'rgba(243, 244, 246, 0.5)',
                                                        opacity: enrollingCourse === course.courseId ? 0.6 : 1,
                                                        cursor: enrollingCourse === course.courseId ? 'not-allowed' : 'pointer'
                                                    }}
                                                >
                                                    <div
                                                        className="w-8 h-8 rounded-lg flex items-center justify-center"
                                                        style={{ backgroundColor: `${accentColor}20` }}
                                                    >
                                                        <Plus size={16} style={{ color: accentColor }} />
                                                    </div>
                                                    <div className="flex-1">
                                                        <p className={`font-medium ${theme.text}`}>{course.name}</p>
                                                        <p className={`text-xs ${theme.textSubtle}`}>{course.courseCode}</p>
                                                    </div>
                                                    {enrollingCourse === course.courseId && (
                                                        <span className={`text-xs ${theme.textMuted}`}>Enrolling...</span>
                                                    )}
                                                </button>
                                            ))}
                                        </div>
                                    )}

                                    {enrolledCourses.length === 0 && availableCourses.length === 0 && (
                                        <div className="p-8 text-center">
                                            <GraduationCap size={40} className="mx-auto mb-2" style={{ color: accentColor }} />
                                            <p className={theme.textMuted}>No courses available</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    ) : enrolledCourses.length === 0 ? (
                        <div className={`${theme.card} rounded-2xl p-8 text-center`} style={{ ...theme.borderStyle, borderWidth: '1px', borderStyle: 'solid' }}>
                            <GraduationCap size={48} className="mx-auto mb-4" style={{ color: accentColor }} />
                            <h3 className={`text-xl font-bold ${theme.text} mb-2`}>No Courses Enrolled</h3>
                            <p className={`${theme.textMuted} mb-4`}>Enter a course code from your teacher to get started!</p>
                            
                            <button
                                onClick={() => setShowCodeInput(true)}
                                className="px-6 py-3 rounded-xl font-bold transition-all text-white inline-flex items-center gap-2 mt-4"
                                style={{ backgroundColor: accentColor }}
                            >
                                <Key size={20} />
                                Enter Course Code
                            </button>
                        </div>
                    ) : null}
                </div>

                {/* Course Info */}
                {selectedCourse && selectedCourse.description && (
                    <div className={`${theme.card} rounded-xl p-4 mb-6`} style={{ ...theme.borderStyle, borderWidth: '1px', borderStyle: 'solid' }}>
                        <p className={theme.textMuted}>{selectedCourse.description}</p>
                    </div>
                )}

                {/* Modules */}
                {selectedCourse && modules.length > 0 && (
                    <div className="mb-6">
                        <h3 className={`text-lg font-bold ${theme.text} mb-3 flex items-center gap-2`}>
                            <Layers size={20} style={{ color: accentColor }} />
                            Modules
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {modules.map((module) => (
                                <button
                                    key={module.moduleId}
                                    onClick={() => selectModule(module)}
                                    className={`${theme.card} rounded-xl p-4 text-left transition-all hover:scale-105`}
                                    style={{
                                        ...theme.borderStyle,
                                        borderWidth: '2px',
                                        borderStyle: 'solid',
                                        borderColor: selectedModule?.moduleId === module.moduleId ? accentColor : 'transparent',
                                        backgroundColor: selectedModule?.moduleId === module.moduleId 
                                            ? `${accentColor}10` 
                                            : undefined
                                    }}
                                >
                                    <div className="flex items-start gap-3">
                                        <div
                                            className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                                            style={{
                                                backgroundColor: selectedModule?.moduleId === module.moduleId 
                                                    ? `${accentColor}20` 
                                                    : darkMode ? 'rgba(55, 65, 81, 0.3)' : 'rgba(243, 244, 246, 1)'
                                            }}
                                        >
                                            <span className="font-bold" style={{ color: accentColor }}>
                                                {module.order}
                                            </span>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h4 className={`font-bold ${theme.text} mb-1 truncate`}>
                                                {module.title}
                                            </h4>
                                            {module.description && (
                                                <p className={`text-xs ${theme.textSubtle} line-clamp-2`}>
                                                    {module.description}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Only show filters and tasks if a course is selected */}
                {selectedCourse && (
                    <>
                        {/* Module selection message */}
                        {modules.length > 0 && !selectedModule && (
                            <div className={`${theme.card} rounded-xl p-6 text-center mb-6`} style={{ ...theme.borderStyle, borderWidth: '1px', borderStyle: 'solid' }}>
                                <Layers size={40} className="mx-auto mb-3" style={{ color: accentColor }} />
                                <p className={`${theme.text} font-medium`}>Select a module above to view tasks</p>
                            </div>
                        )}

                        {/* Show filters and tasks only if module is selected or no modules exist */}
                        {(selectedModule || modules.length === 0) && (
                            <>
                                {/* Difficulty Filter */}
                                <div className="flex gap-2 mb-6 flex-wrap">
                            <button
                                onClick={() => setSelectedDifficulty("all")}
                                className={`px-4 py-2 rounded-xl font-medium transition-all ${selectedDifficulty === "all"
                                    ? `text-white`
                                    : darkMode ? 'text-gray-400 hover:text-gray-200' : 'text-gray-600 hover:text-gray-800'
                                    }`}
                                style={selectedDifficulty === "all" ? {
                                    backgroundColor: accentColor
                                } : {
                                    backgroundColor: darkMode ? 'rgba(55, 65, 81, 0.3)' : 'rgba(243, 244, 246, 1)'
                                }}
                            >
                                All ({tasks.length})
                            </button>
                            <DifficultyFilter
                                label="Easy"
                                count={easyTasks.length}
                                isSelected={selectedDifficulty === "easy"}
                                onClick={() => setSelectedDifficulty("easy")}
                                color="#22c55e"
                                darkMode={darkMode}
                            />
                            <DifficultyFilter
                                label="Medium"
                                count={mediumTasks.length}
                                isSelected={selectedDifficulty === "medium"}
                                onClick={() => setSelectedDifficulty("medium")}
                                color="#f59e0b"
                                darkMode={darkMode}
                            />
                            <DifficultyFilter
                                label="Hard"
                                count={hardTasks.length}
                                isSelected={selectedDifficulty === "hard"}
                                onClick={() => setSelectedDifficulty("hard")}
                                color="#ef4444"
                                darkMode={darkMode}
                            />
                            <DifficultyFilter
                                label="Extreme"
                                count={extremeTasks.length}
                                isSelected={selectedDifficulty === "extreme"}
                                onClick={() => setSelectedDifficulty("extreme")}
                                color="#a855f7"
                                darkMode={darkMode}
                            />
                        </div>

                        {/* Tasks */}
                        {filteredTasks.length === 0 ? (
                            <div className={`${theme.card} rounded-xl text-center py-12`} style={{ ...theme.borderStyle, borderWidth: '1px', borderStyle: 'solid' }}>
                                <ClipboardList size={48} className={`mb-4 mx-auto`} style={{ color: accentColor, opacity: 0.5 }} />
                                <p className={`${theme.text} font-medium mb-2`}>No tasks available</p>
                                <p className={`${theme.textSubtle} text-sm`}>
                                    {selectedModule 
                                        ? `No tasks found in ${selectedModule.title}` 
                                        : 'No tasks found in this course'}
                                </p>
                                {selectedDifficulty !== "all" && (
                                    <p className={`${theme.textMuted} text-xs mt-2`}>
                                        Try selecting "All" difficulty
                                    </p>
                                )}
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                {filteredTasks.map(task => (
                                    <TaskCard
                                        key={task.taskId}
                                        task={task}
                                        onComplete={handleCompleteTask}
                                        darkMode={darkMode}
                                        accentColor={accentColor}
                                        theme={theme}
                                    />
                                ))}
                            </div>
                        )}
                            </>
                        )}
                    </>
                )}
            </main>

            {/* Course Code Input Modal */}
            {showCodeInput && (
                <div 
                    className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
                    onClick={() => {
                        setShowCodeInput(false);
                        setCourseCode("");
                        setCodeError("");
                    }}
                >
                    <div 
                        className={`${theme.card} rounded-2xl p-8 max-w-md w-full`}
                        style={{ ...theme.borderStyle, borderWidth: '1px', borderStyle: 'solid' }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center gap-3 mb-4">
                            <div
                                className="w-12 h-12 rounded-xl flex items-center justify-center"
                                style={{ backgroundColor: `${accentColor}20` }}
                            >
                                <Key size={24} style={{ color: accentColor }} />
                            </div>
                            <div>
                                <h3 className={`text-2xl font-bold ${theme.text}`}>Enter Course Code</h3>
                                <p className={`text-sm ${theme.textMuted}`}>Get the code from your teacher</p>
                            </div>
                        </div>

                        <div className="mb-4">
                            <input
                                type="text"
                                value={courseCode}
                                onChange={(e) => {
                                    setCourseCode(e.target.value);
                                    setCodeError("");
                                }}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && courseCode.trim() && enrollingCourse !== "code-enrollment") {
                                        handleEnrollWithCode();
                                    }
                                }}
                                placeholder="Enter course code..."
                                className={`w-full px-4 py-3 rounded-xl font-mono text-lg ${theme.inputBg} ${theme.text} border-2 transition-colors`}
                                style={{
                                    borderColor: codeError ? '#ef4444' : `${accentColor}30`,
                                    outline: 'none'
                                }}
                                onFocus={(e) => e.target.style.borderColor = accentColor}
                                onBlur={(e) => e.target.style.borderColor = codeError ? '#ef4444' : `${accentColor}30`}
                                autoFocus
                            />
                            {codeError && (
                                <p className="text-red-500 text-sm mt-2">{codeError}</p>
                            )}
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => {
                                    setShowCodeInput(false);
                                    setCourseCode("");
                                    setCodeError("");
                                }}
                                className={`flex-1 px-4 py-3 rounded-xl font-medium transition-colors ${theme.inputBg} ${theme.text}`}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleEnrollWithCode}
                                disabled={!courseCode.trim() || enrollingCourse === "code-enrollment"}
                                className="flex-1 px-4 py-3 rounded-xl font-medium transition-all text-white"
                                style={{
                                    backgroundColor: (!courseCode.trim() || enrollingCourse === "code-enrollment") ? '#6b7280' : accentColor,
                                    opacity: (!courseCode.trim() || enrollingCourse === "code-enrollment") ? 0.6 : 1,
                                    cursor: (!courseCode.trim() || enrollingCourse === "code-enrollment") ? 'not-allowed' : 'pointer'
                                }}
                            >
                                {enrollingCourse === "code-enrollment" ? "Adding..." : "Add Course"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

/* Task Card Component */
function TaskCard({
    task,
    onComplete,
    darkMode,
    accentColor,
    theme
}: {
    task: Task;
    onComplete: (taskId: string) => void;
    darkMode: boolean;
    accentColor: string;
    theme: any;
}) {
    const [completing, setCompleting] = useState(false);

    const difficultyColors = {
        easy: { bg: darkMode ? 'rgba(34, 197, 94, 0.1)' : 'rgba(220, 252, 231, 1)', text: '#22c55e', border: 'rgba(34, 197, 94, 0.3)' },
        medium: { bg: darkMode ? 'rgba(245, 158, 11, 0.1)' : 'rgba(254, 243, 199, 1)', text: '#f59e0b', border: 'rgba(245, 158, 11, 0.3)' },
        hard: { bg: darkMode ? 'rgba(239, 68, 68, 0.1)' : 'rgba(254, 226, 226, 1)', text: '#ef4444', border: 'rgba(239, 68, 68, 0.3)' },
        extreme: { bg: darkMode ? 'rgba(168, 85, 247, 0.1)' : 'rgba(243, 232, 255, 1)', text: '#a855f7', border: 'rgba(168, 85, 247, 0.3)' }
    };

    const colors = difficultyColors[task.difficulty];

    async function handleComplete() {
        setCompleting(true);
        try {
            await onComplete(task.taskId);
        } finally {
            setCompleting(false);
        }
    }

    return (
        <div
            className={`${theme.card} rounded-xl p-5 transition-colors duration-300`}
            style={{ ...theme.borderStyle, borderWidth: '1px', borderStyle: 'solid' }}
        >
            <div className="flex justify-between items-start mb-3">
                <h3 className={`text-lg font-bold ${theme.text} flex-1`}>{task.title}</h3>
                <span
                    className="px-3 py-1 rounded-lg text-xs font-bold uppercase"
                    style={{
                        backgroundColor: colors.bg,
                        color: colors.text,
                        borderWidth: '1px',
                        borderStyle: 'solid',
                        borderColor: colors.border
                    }}
                >
                    {task.difficulty}
                </span>
            </div>

            {task.description && (
                <p className={`${theme.textMuted} text-sm mb-4`}>{task.description}</p>
            )}

            {task.dueAt && (
                <div className="mb-3">
                    <p className={`text-xs ${theme.textSubtle} flex items-center gap-1`}>
                        📅 Due: {new Date(task.dueAt).toLocaleDateString('en-US', { 
                            month: 'short', 
                            day: 'numeric',
                            year: 'numeric'
                        })}
                    </p>
                </div>
            )}

            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1">
                        <Star size={16} style={{ color: accentColor }} />
                        <span className={`text-sm font-medium ${theme.text}`}>{task.xp} XP</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <Coins size={16} className="text-yellow-500" />
                        <span className={`text-sm font-medium ${theme.text}`}>{task.gold} Gold</span>
                    </div>
                </div>

                <button
                    onClick={handleComplete}
                    disabled={completing}
                    className="px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 text-white"
                    style={{
                        backgroundColor: completing ? '#6b7280' : accentColor, // Use solid accent color
                        opacity: completing ? 0.5 : 1,
                        cursor: completing ? 'not-allowed' : 'pointer'
                    }}
                >
                    <Check size={16} />
                    {completing ? 'Completing...' : 'Complete'}
                </button>
            </div>
        </div>
    );
}

/* Difficulty Filter Component */
function DifficultyFilter({
    label,
    count,
    isSelected,
    onClick,
    color,
    darkMode
}: {
    label: string;
    count: number;
    isSelected: boolean;
    onClick: () => void;
    color: string;
    darkMode: boolean;
}) {
    return (
        <button
            onClick={onClick}
            className={`px-4 py-2 rounded-xl font-medium transition-all ${isSelected
                ? 'text-white'
                : darkMode ? 'text-gray-400 hover:text-gray-200' : 'text-gray-600 hover:text-gray-800'
                }`}
            style={isSelected ? {
                backgroundColor: color
            } : {
                backgroundColor: darkMode ? 'rgba(55, 65, 81, 0.3)' : 'rgba(243, 244, 246, 1)'
            }}
        >
            {label} ({count})
        </button>
    );
}

/* Navigation Item Component */
function NavItem({
    icon,
    label,
    active = false,
    onClick,
    darkMode,
    accentColor
}: {
    icon: React.ReactNode;
    label: string;
    active?: boolean;
    onClick: () => void;
    darkMode: boolean;
    accentColor: string;
}) {
    return (
        <li>
            <button
                onClick={onClick}
                className="flex items-center gap-3 w-full px-4 py-3 rounded-xl transition-all"
                style={active ? {
                    background: `linear-gradient(to right, ${accentColor}20, rgba(168, 85, 247, 0.1))`,
                    color: accentColor,
                    borderWidth: '1px',
                    borderStyle: 'solid',
                    borderColor: `${accentColor}50`
                } : {
                    color: darkMode ? '#9ca3af' : '#6b7280'
                }}
            >
                {icon}
                <span className="font-medium">{label}</span>
            </button>
        </li>
    );
}
