import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useRealtimeUser } from "@/hooks/useRealtimeUser";
import { useTheme, getThemeClasses } from "@/context/ThemeContext";
import { TasksAPI } from "@/api/tasks.api";
import { CoursesAPI } from "@/api/courses.api";
import type { Task } from "@/models/task.model";
import type { Course } from "@/models/course.model";
import {
    Sword,
    Scroll,
    Timer,
    BarChart3,
    Trophy,
    Calendar,
    User,
    Settings,
    LogOut,
    ClipboardList,
    BookOpen,
    Coins,
    Star,
    Check
} from "lucide-react";

export default function DailyTasksPage() {
    const navigate = useNavigate();
    const { logout } = useAuth();
    const { user, loading: userLoading } = useRealtimeUser();
    const { darkMode, accentColor } = useTheme();
    const theme = getThemeClasses(darkMode, accentColor);

    const [course, setCourse] = useState<Course | null>(null);
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedDifficulty, setSelectedDifficulty] = useState<string>("all");

    useEffect(() => {
        loadCourseAndTasks();
    }, []);

    async function loadCourseAndTasks() {
        try {
            setLoading(true);
            // Fetch all courses and find Programming Essentials 1
            const courses = await CoursesAPI.list(true);
            const pe1Course = courses.find(c =>
                c.name.toLowerCase().includes("programming essentials 1") ||
                c.courseCode.toLowerCase().includes("pe1")
            );

            if (pe1Course) {
                setCourse(pe1Course);

                // Fetch tasks for this course
                const courseTasks = await TasksAPI.list({
                    courseId: pe1Course.courseId,
                    activeOnly: true
                });
                setTasks(courseTasks);
            }
        } catch (error) {
            console.error("Error loading course and tasks:", error);
        } finally {
            setLoading(false);
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

    const handleLogout = async () => {
        await logout();
        navigate("/");
    };

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
        <div className={`min-h-screen ${theme.bg} flex transition-colors duration-300`}>
            {/* SIDEBAR */}
            <aside className={`w-64 ${theme.card} flex flex-col transition-colors duration-300`} style={{ ...theme.borderStyle, borderRightWidth: '1px', borderRightStyle: 'solid' }}>
                <div className="p-6">
                    <h2 className={`text-2xl font-bold ${theme.text}`}>HabitHero</h2>
                    <p className={theme.textMuted}>Daily Tasks</p>
                </div>

                <nav className="flex-1 px-4">
                    <ul className="space-y-2">
                        <NavItem icon={<Sword size={20} />} label="Home" onClick={() => navigate("/dashboard")} darkMode={darkMode} accentColor={accentColor} />
                        <NavItem icon={<Scroll size={20} />} label="Quests" onClick={() => { }} darkMode={darkMode} accentColor={accentColor} />
                        <NavItem icon={<ClipboardList size={20} />} label="Daily Tasks" active onClick={() => navigate("/daily-tasks")} darkMode={darkMode} accentColor={accentColor} />
                        <NavItem icon={<Timer size={20} />} label="Focus Mode" onClick={() => navigate("/focus")} darkMode={darkMode} accentColor={accentColor} />
                        <NavItem icon={<BarChart3 size={20} />} label="Stats" onClick={() => navigate("/stats")} darkMode={darkMode} accentColor={accentColor} />
                        <NavItem icon={<Trophy size={20} />} label="Achievements" onClick={() => navigate("/achievements")} darkMode={darkMode} accentColor={accentColor} />
                        <NavItem icon={<Calendar size={20} />} label="Calendar" onClick={() => navigate("/calendar")} darkMode={darkMode} accentColor={accentColor} />
                        <NavItem icon={<User size={20} />} label="Profile" onClick={() => navigate("/profile")} darkMode={darkMode} accentColor={accentColor} />
                        <NavItem icon={<Settings size={20} />} label="Settings" onClick={() => navigate("/settings")} darkMode={darkMode} accentColor={accentColor} />
                    </ul>
                </nav>

                <div className="p-4" style={{ ...theme.borderStyle, borderTopWidth: '1px', borderTopStyle: 'solid' }}>
                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-3 text-red-400 hover:text-red-300 w-full px-4 py-2 rounded-lg hover:bg-red-900/20 transition-colors"
                    >
                        <LogOut size={20} />
                        <span>Logout</span>
                    </button>
                </div>
            </aside>

            {/* MAIN CONTENT */}
            <main className="flex-1 p-8 overflow-y-auto">
                {/* Header */}
                <div className="mb-6">
                    <h2 className={`text-3xl font-bold ${theme.text}`}>Daily Tasks</h2>
                    <p className={theme.textMuted}>Complete exercises to earn XP and Gold</p>
                </div>

                {/* Course Info */}
                {course && (
                    <div className={`${theme.card} rounded-2xl p-6 mb-6`} style={{ ...theme.borderStyle, borderWidth: '1px', borderStyle: 'solid' }}>
                        <div className="flex items-center gap-3 mb-2">
                            <BookOpen size={24} style={{ color: accentColor }} />
                            <div>
                                <h3 className={`text-xl font-bold ${theme.text}`}>{course.name}</h3>
                                <p className={`text-sm ${theme.textMuted}`}>{course.courseCode}</p>
                            </div>
                        </div>
                        {course.description && (
                            <p className={`${theme.textMuted} mt-2`}>{course.description}</p>
                        )}
                    </div>
                )}

                {/* Difficulty Filter */}
                <div className="flex gap-2 mb-6 flex-wrap">
                    <button
                        onClick={() => setSelectedDifficulty("all")}
                        className={`px-4 py-2 rounded-xl font-medium transition-all ${selectedDifficulty === "all"
                                ? `text-white`
                                : darkMode ? 'text-gray-400 hover:text-gray-200' : 'text-gray-600 hover:text-gray-800'
                            }`}
                        style={selectedDifficulty === "all" ? {
                            background: `linear-gradient(to right, ${accentColor}, #a855f7)`
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
                        background: completing ? '#6b7280' : `linear-gradient(to right, ${accentColor}, #a855f7)`,
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
