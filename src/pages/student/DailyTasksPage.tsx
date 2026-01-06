import { useState, useEffect } from "react";
import { useRealtimeUser } from "@/hooks/useRealtimeUser";
import { useAuth } from "@/context/AuthContext";
import { useTheme, getThemeClasses } from "@/context/ThemeContext";
import { TasksAPI } from "@/api/tasks.api";
import { CoursesAPI } from "@/api/courses.api";
import type { Task } from "@/models/task.model";
import type { Course } from "@/models/course.model";
import {
    ClipboardList,
    BookOpen,
    Coins,
    Star,
    Check,
    Plus,
    ChevronDown,
    GraduationCap,
} from "lucide-react";

export default function DailyTasksPage() {
    const { user, loading: userLoading } = useRealtimeUser();
    const { firebaseUser } = useAuth();
    const { darkMode, accentColor } = useTheme();
    const theme = getThemeClasses(darkMode, accentColor);

    const [enrolledCourses, setEnrolledCourses] = useState<Course[]>([]);
    const [availableCourses, setAvailableCourses] = useState<Course[]>([]);
    const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedDifficulty, setSelectedDifficulty] = useState<string>("all");
    const [showCourseDropdown, setShowCourseDropdown] = useState(false);
    const [enrollingCourse, setEnrollingCourse] = useState<string | null>(null);

    useEffect(() => {
        loadCoursesAndTasks();
    }, [firebaseUser]);

    async function loadCoursesAndTasks() {
        if (!firebaseUser) return;
        
        try {
            setLoading(true);
            const courses = await CoursesAPI.list(true);
            
            // Check which courses the user is enrolled in
            const enrolled: Course[] = [];
            const available: Course[] = [];
            
            for (const course of courses) {
                try {
                    const students = await CoursesAPI.listStudents(course.courseId);
                    if (students.some((s) => s.uid === firebaseUser.uid)) {
                        enrolled.push(course);
                    } else {
                        available.push(course);
                    }
                } catch (err) {
                    console.error(`Error checking enrollment for ${course.courseId}:`, err);
                    available.push(course);
                }
            }
            
            setEnrolledCourses(enrolled);
            setAvailableCourses(available);
            
            // Select first enrolled course by default
            if (enrolled.length > 0) {
                await selectCourse(enrolled[0]);
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
            const courseTasks = await TasksAPI.list({
                courseId: course.courseId,
                activeOnly: true
            });
            setTasks(courseTasks);
        } catch (error) {
            console.error("Error loading tasks:", error);
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

    async function handleCompleteTask(taskId: string) {
        try {
            await TasksAPI.complete(taskId);
            // Remove completed task from list
            setTasks(tasks.filter(t => t.taskId !== taskId));
        } catch (error) {
            console.error("Error completing task:", error);
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
                                    {/* Enrolled Courses */}
                                    {enrolledCourses.length > 0 && (
                                        <div className="p-4">
                                            <p className={`text-xs font-bold uppercase tracking-wider ${theme.textSubtle} mb-2`}>
                                                My Courses
                                            </p>
                                            {enrolledCourses.map((course) => (
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
                            <p className={theme.textMuted}>Enroll in a course to start completing tasks!</p>
                            {availableCourses.length > 0 && (
                                <div className="mt-6 space-y-2">
                                    {availableCourses.map((course) => (
                                        <button
                                            key={course.courseId}
                                            onClick={() => handleEnrollCourse(course)}
                                            disabled={enrollingCourse === course.courseId}
                                            className="w-full p-4 rounded-xl text-left transition-all flex items-center gap-3"
                                            style={{
                                                backgroundColor: `${accentColor}10`,
                                                borderWidth: '1px',
                                                borderStyle: 'solid',
                                                borderColor: `${accentColor}30`,
                                                opacity: enrollingCourse === course.courseId ? 0.6 : 1
                                            }}
                                        >
                                            <BookOpen size={20} style={{ color: accentColor }} />
                                            <div className="flex-1">
                                                <p className={`font-bold ${theme.text}`}>{course.name}</p>
                                                <p className={`text-sm ${theme.textSubtle}`}>{course.courseCode}</p>
                                            </div>
                                            <Plus size={20} style={{ color: accentColor }} />
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    ) : null}
                </div>

                {/* Course Info */}
                {selectedCourse && selectedCourse.description && (
                    <div className={`${theme.card} rounded-xl p-4 mb-6`} style={{ ...theme.borderStyle, borderWidth: '1px', borderStyle: 'solid' }}>
                        <p className={theme.textMuted}>{selectedCourse.description}</p>
                    </div>
                )}

                {/* Only show filters and tasks if a course is selected */}
                {selectedCourse && (
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
                            <div className="text-center py-12">
                                <ClipboardList size={40} className={`mb-4 mx-auto ${darkMode ? 'text-gray-500' : 'text-gray-400'}`} />
                                <p className={theme.textMuted}>No tasks available</p>
                                <p className={`${theme.textSubtle} text-sm`}>Check back later for new exercises!</p>
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
            </main>
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
