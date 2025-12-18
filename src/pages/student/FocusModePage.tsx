import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useRealtimeUser } from "@/hooks/useRealtimeUser";
import { useTheme, getThemeClasses } from "@/context/ThemeContext";
import { UsersAPI } from "@/api/users.api";

export default function FocusModePage() {
    const navigate = useNavigate();
    const { user: authUser, logout } = useAuth();
    const { user, loading } = useRealtimeUser();
    const { darkMode, accentColor } = useTheme();
    const theme = getThemeClasses(darkMode, accentColor);

    // Timer State
    const [timeLeft, setTimeLeft] = useState(25 * 60);
    const [isRunning, setIsRunning] = useState(false);
    const [sessions, setSessions] = useState(0);
    const [totalFocusTime, setTotalFocusTime] = useState(0);

    // Timer Settings
    const [focusDuration, setFocusDuration] = useState(25);
    const [breakDuration, setBreakDuration] = useState(5);

    // XP notification
    const [xpGained, setXpGained] = useState<number | null>(null);

    // Timer Effect with XP reward
    useEffect(() => {
        let interval: ReturnType<typeof setInterval>;
        if (isRunning && timeLeft > 0) {
            interval = setInterval(() => {
                setTimeLeft((prev) => prev - 1);
                setTotalFocusTime((prev) => prev + 1);
            }, 1000);
        } else if (timeLeft === 0 && isRunning) {
            setIsRunning(false);
            setSessions((prev) => prev + 1);

            // Award XP when timer completes!
            awardXP();

            setTimeLeft(focusDuration * 60);
        }
        return () => clearInterval(interval);
    }, [isRunning, timeLeft, focusDuration]);

    // Award XP function - XP is calculated by the backend
    const awardXP = async () => {
        if (!authUser?.uid) return;

        try {
            // Call backend to complete focus session and get XP reward
            const result = await UsersAPI.completeFocusSession(authUser.uid, focusDuration);

            // Show XP notification with the amount from the backend
            setXpGained(result.xpGained);
            setTimeout(() => setXpGained(null), 3000);
        } catch (error) {
            console.error("Failed to complete focus session:", error);
        }
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    };

    const getMinutesLeft = () => {
        return Math.ceil(timeLeft / 60);
    };

    const handleStart = () => setIsRunning(true);
    const handlePause = () => setIsRunning(false);
    const handleReset = () => {
        setIsRunning(false);
        setTimeLeft(focusDuration * 60);
    };

    const progress = ((focusDuration * 60 - timeLeft) / (focusDuration * 60)) * 100;

    async function handleLogout() {
        await logout();
        navigate("/login");
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-xl text-gray-600">Loading...</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 flex">
            {/* XP Notification */}
            {xpGained && (
                <div className="fixed top-8 left-1/2 transform -translate-x-1/2 z-50 animate-bounce">
                    <div className="bg-purple-600 text-white px-6 py-3 rounded-full shadow-lg flex items-center gap-2">
                        <span className="text-xl">⭐</span>
                        <span className="font-bold">+{xpGained} XP earned!</span>
                    </div>
                </div>
            )}

            {/* SIDEBAR */}
            <aside className="w-64 bg-white flex flex-col min-h-screen border-r border-gray-200">
                <div className="p-6">
                    <h1 className="text-2xl font-bold text-purple-600">HabitHero</h1>
                </div>

                <nav className="flex-1 px-4">
                    <ul className="space-y-2">
                        <SidebarItem icon="⚔️" label="Home" onClick={() => navigate("/dashboard")} />
                        <SidebarItem icon="📜" label="Quests" onClick={() => { }} />
                        <SidebarItem icon="⏱️" label="Focus Mode" active onClick={() => navigate("/focus")} />
                        <SidebarItem icon="📊" label="Stats" onClick={() => navigate("/stats")} />
                        <SidebarItem icon="🏆" label="Achievements" onClick={() => { }} />
                        <SidebarItem icon="📅" label="Calendar" onClick={() => { }} />
                        <SidebarItem icon="👤" label="Profile" onClick={() => navigate("/profile")} />
                        <SidebarItem icon="⚙️" label="Settings" onClick={() => { }} />
                    </ul>
                </nav>

                <div className="p-4 border-t border-gray-200">
                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-3 text-red-500 hover:text-red-600 w-full px-4 py-2 rounded-lg hover:bg-red-50 transition-colors"
                    >
                        <span>🚪</span>
                        <span>Logout</span>
                    </button>
                </div>
            </aside>

            {/* MAIN CONTENT */}
            <main className="flex-1 p-8 overflow-y-auto bg-gray-50">
                {/* Header */}
                <div className="mb-8">
                    <h2 className="text-3xl font-bold text-gray-800">Focus Mode</h2>
                    <p className="text-purple-600">Stay focused with the Pomodoro technique</p>
                </div>

                {/* Main Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                    {/* Timer Card - Takes 2 columns */}
                    <div className="lg:col-span-2 bg-white rounded-2xl p-8 shadow-sm">
                        <div className="text-center mb-8">
                            <h3 className="text-2xl font-bold text-gray-800">Focus Time</h3>
                            <p className="text-purple-500">Time to concentrate</p>
                        </div>

                        {/* Timer Circle */}
                        <div className="flex justify-center mb-8">
                            <div className="relative w-64 h-64">
                                <svg className="w-full h-full transform -rotate-90">
                                    <circle
                                        cx="128"
                                        cy="128"
                                        r="110"
                                        stroke="#e5e7eb"
                                        strokeWidth="8"
                                        fill="none"
                                    />
                                    <circle
                                        cx="128"
                                        cy="128"
                                        r="110"
                                        stroke="#8b5cf6"
                                        strokeWidth="8"
                                        fill="none"
                                        strokeLinecap="round"
                                        strokeDasharray={2 * Math.PI * 110}
                                        strokeDashoffset={2 * Math.PI * 110 * (1 - progress / 100)}
                                        className="transition-all duration-1000"
                                    />
                                </svg>
                                <div className="absolute inset-0 flex flex-col items-center justify-center">
                                    <span className="text-4xl font-bold text-gray-800">{formatTime(timeLeft)}</span>
                                    <span className="text-gray-500">{getMinutesLeft()} minutes left</span>
                                </div>
                            </div>
                        </div>

                        {/* Controls */}
                        <div className="flex justify-center gap-4">
                            {!isRunning ? (
                                <button
                                    onClick={handleStart}
                                    className="flex flex-col items-center gap-1 bg-purple-600 hover:bg-purple-700 text-white px-8 py-3 rounded-xl font-medium transition-colors"
                                >
                                    <span>▶️</span>
                                    <span>Start</span>
                                </button>
                            ) : (
                                <button
                                    onClick={handlePause}
                                    className="flex flex-col items-center gap-1 bg-purple-600 hover:bg-purple-700 text-white px-8 py-3 rounded-xl font-medium transition-colors"
                                >
                                    <span>⏸️</span>
                                    <span>Pause</span>
                                </button>
                            )}
                            <button
                                onClick={handleReset}
                                className="flex flex-col items-center gap-1 bg-white border-2 border-purple-200 text-purple-600 hover:bg-purple-50 px-8 py-3 rounded-xl font-medium transition-colors"
                            >
                                <span>🔄</span>
                                <span>Reset</span>
                            </button>
                        </div>
                    </div>

                    {/* Right Column - Stats */}
                    <div className="space-y-6">
                        {/* Current XP */}
                        {user && (
                            <div className="bg-white rounded-2xl p-6 shadow-sm">
                                <div className="flex items-center gap-2 mb-3">
                                    <span className="text-xl">⭐</span>
                                    <h3 className="text-lg font-bold text-gray-800">Your XP</h3>
                                </div>
                                <p className="text-3xl font-bold text-purple-600">{user.stats.xp || 0} XP</p>
                                <p className="text-gray-500 text-sm">Level {user.stats.level || 1}</p>
                            </div>
                        )}

                        {/* Focus Streak */}
                        <div className="bg-white rounded-2xl p-6 shadow-sm">
                            <div className="flex items-center gap-2 mb-3">
                                <span className="text-xl">🔥</span>
                                <h3 className="text-lg font-bold text-gray-800">Focus Streak</h3>
                            </div>
                            <p className="text-3xl font-bold text-gray-800">{user?.stats?.streak || 0} days</p>
                            <p className="text-gray-500 text-sm">Keep it up!</p>
                        </div>

                        {/* Today's Stats */}
                        <div className="bg-white rounded-2xl p-6 shadow-sm">
                            <h3 className="text-lg font-bold text-gray-800 mb-4">Today's Stats</h3>
                            <div className="space-y-3">
                                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                                    <span className="text-gray-600">Sessions</span>
                                    <span className="font-bold text-gray-800">{sessions}</span>
                                </div>
                                <div className="flex justify-between items-center py-2">
                                    <span className="text-gray-600">Focus Time</span>
                                    <span className="font-bold text-purple-600">{Math.floor(totalFocusTime / 60)} min</span>
                                </div>
                            </div>
                        </div>

                        {/* Timer Settings */}
                        <div className="bg-white rounded-2xl p-6 shadow-sm">
                            <div className="flex items-center gap-2 mb-4">
                                <span>⚙️</span>
                                <h3 className="text-lg font-bold text-gray-800">Timer Settings</h3>
                            </div>
                            <div className="space-y-4">
                                <div>
                                    <label className="text-sm text-gray-600 block mb-1">Focus Duration</label>
                                    <select
                                        value={focusDuration}
                                        onChange={(e) => {
                                            const newDuration = parseInt(e.target.value);
                                            setFocusDuration(newDuration);
                                            if (!isRunning) setTimeLeft(newDuration * 60);
                                        }}
                                        className="w-full p-2 border border-gray-200 rounded-lg text-gray-800 bg-white"
                                    >
                                        <option value={15}>15 minutes</option>
                                        <option value={25}>25 minutes</option>
                                        <option value={30}>30 minutes</option>
                                        <option value={45}>45 minutes</option>
                                        <option value={60}>60 minutes</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-sm text-gray-600 block mb-1">Break Duration</label>
                                    <select
                                        value={breakDuration}
                                        onChange={(e) => setBreakDuration(parseInt(e.target.value))}
                                        className="w-full p-2 border border-gray-200 rounded-lg text-gray-800 bg-white"
                                    >
                                        <option value={5}>5 minutes</option>
                                        <option value={10}>10 minutes</option>
                                        <option value={15}>15 minutes</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Focus Tips */}
                <div className="bg-white rounded-2xl p-6 shadow-sm">
                    <h3 className="text-xl font-bold text-gray-800 mb-6">Focus Tips</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-purple-50 rounded-xl p-4">
                            <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center mb-3">
                                <span>🎯</span>
                            </div>
                            <h4 className="font-bold text-purple-700 mb-1">Stay Focused</h4>
                            <p className="text-purple-600 text-sm">Eliminate distractions during work sessions</p>
                        </div>

                        <div className="bg-orange-50 rounded-xl p-4">
                            <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center mb-3">
                                <span>☕</span>
                            </div>
                            <h4 className="font-bold text-orange-700 mb-1">Take Breaks</h4>
                            <p className="text-orange-600 text-sm">Rest your mind during break time</p>
                        </div>

                        <div className="bg-green-50 rounded-xl p-4">
                            <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center mb-3">
                                <span>📅</span>
                            </div>
                            <h4 className="font-bold text-green-700 mb-1">Be Consistent</h4>
                            <p className="text-green-600 text-sm">Build a daily focus habit</p>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}

/* Sidebar Item Component */
function SidebarItem({
    icon,
    label,
    active = false,
    onClick,
}: {
    icon: string;
    label: string;
    active?: boolean;
    onClick: () => void;
}) {
    return (
        <li>
            <button
                onClick={onClick}
                className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl transition-all ${active
                    ? "bg-purple-50 text-purple-600 border border-purple-200"
                    : "text-gray-600 hover:bg-gray-50"
                    }`}
            >
                <span>{icon}</span>
                <span className="font-medium">{label}</span>
            </button>
        </li>
    );
}
