import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useRealtimeUser } from "@/hooks/useRealtimeUser";
import { useTheme, getThemeClasses } from "@/context/ThemeContext";

// Accent colors
const accentColors = [
    { color: "#06b6d4", name: "Cyan" },
    { color: "#a855f7", name: "Purple" },
    { color: "#f97316", name: "Orange" },
    { color: "#22c55e", name: "Green" },
    { color: "#3b82f6", name: "Blue" },
    { color: "#ef4444", name: "Red" },
];

export default function SettingsPage() {
    const navigate = useNavigate();
    const { logout, loading: authLoading } = useAuth();
    const { user, loading: userLoading } = useRealtimeUser();
    const { darkMode, setDarkMode, accentColor, setAccentColor } = useTheme();

    // Get theme classes
    const theme = getThemeClasses(darkMode, accentColor);

    // Notification settings state
    const [enableNotifications, setEnableNotifications] = useState(true);
    const [taskReminders, setTaskReminders] = useState(true);
    const [battleNotifications, setBattleNotifications] = useState(true);
    const [achievementAlerts, setAchievementAlerts] = useState(true);

    // Audio settings state
    const [soundEffects, setSoundEffects] = useState(true);

    // Reset confirmation
    const [showResetConfirm, setShowResetConfirm] = useState(false);

    async function handleLogout() {
        await logout();
        navigate("/login");
    }

    if (authLoading || userLoading) {
        return (
            <div className={`min-h-screen ${theme.bg} flex items-center justify-center transition-colors duration-300`}>
                <div className="text-xl animate-pulse" style={theme.accentText}>Laden...</div>
            </div>
        );
    }

    if (!user) {
        return null;
    }

    return (
        <div className={`min-h-screen ${theme.bg} flex transition-colors duration-300`}>
            {/* SIDEBAR */}
            <aside className={`w-64 ${theme.sidebar} flex flex-col min-h-screen transition-colors duration-300`} style={{ ...theme.borderStyle, borderRightWidth: '1px', borderRightStyle: 'solid' }}>
                <div className="p-6">
                    <h1 className="text-2xl font-bold" style={theme.gradientText}>
                        HabitHero
                    </h1>
                </div>

                <nav className="flex-1 px-4">
                    <ul className="space-y-2">
                        <NavItem icon="⚔️" label="Home" onClick={() => navigate("/dashboard")} darkMode={darkMode} accentColor={accentColor} />
                        <NavItem icon="📜" label="Quests" onClick={() => { }} darkMode={darkMode} accentColor={accentColor} />
                        <NavItem icon="⏱️" label="Focus Mode" onClick={() => navigate("/focus")} darkMode={darkMode} accentColor={accentColor} />
                        <NavItem icon="📊" label="Stats" onClick={() => navigate("/stats")} darkMode={darkMode} accentColor={accentColor} />
                        <NavItem icon="🏆" label="Achievements" onClick={() => navigate("/achievements")} darkMode={darkMode} accentColor={accentColor} />
                        <NavItem icon="📅" label="Calendar" onClick={() => navigate("/calendar")} darkMode={darkMode} accentColor={accentColor} />
                        <NavItem icon="👤" label="Profile" onClick={() => navigate("/profile")} darkMode={darkMode} accentColor={accentColor} />
                        <NavItem icon="⚙️" label="Settings" active onClick={() => navigate("/settings")} darkMode={darkMode} accentColor={accentColor} />
                    </ul>
                </nav>

                <div className="p-4" style={{ ...theme.borderStyle, borderTopWidth: '1px', borderTopStyle: 'solid' }}>
                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-3 text-red-400 hover:text-red-300 w-full px-4 py-2 rounded-lg hover:bg-red-900/20 transition-colors"
                    >
                        <span>🚪</span>
                        <span>Logout</span>
                    </button>
                </div>
            </aside>

            {/* MAIN CONTENT */}
            <main className="flex-1 p-8 overflow-y-auto">
                {/* Header */}
                <div className="mb-6">
                    <h2 className={`text-3xl font-bold ${theme.text}`}>Settings</h2>
                    <p className={theme.textMuted}>Customize your HabitHero experience</p>
                </div>

                <div className="max-w-3xl space-y-6">
                    {/* Theme Settings */}
                    <div className={`${theme.card} rounded-2xl p-6 transition-colors duration-300`} style={{ ...theme.borderStyle, borderWidth: '1px', borderStyle: 'solid' }}>
                        <h3 className={`text-xl font-bold ${theme.text} mb-4 flex items-center gap-2`}>
                            <span>🌙</span> Theme Settings
                        </h3>
                        <div className={`flex justify-between items-center p-4 ${theme.inputBg} rounded-xl`}>
                            <div>
                                <p className="font-medium" style={theme.accentText}>Dark Mode</p>
                                <p className={`${theme.textSubtle} text-sm`}>
                                    {darkMode ? "Shadow realm activated" : "Light mode active"}
                                </p>
                            </div>
                            <button
                                onClick={() => setDarkMode(!darkMode)}
                                className="w-14 h-8 rounded-full p-1 transition-all"
                                style={{
                                    backgroundColor: darkMode ? accentColor : '#d1d5db',
                                    boxShadow: darkMode ? `0 0 10px ${accentColor}50` : 'none'
                                }}
                            >
                                <div className={`w-6 h-6 rounded-full bg-white shadow transition-transform ${darkMode ? 'translate-x-6' : 'translate-x-0'}`} />
                            </button>
                        </div>
                    </div>

                    {/* Accent Color */}
                    <div className={`${theme.card} rounded-2xl p-6 transition-colors duration-300`} style={{ ...theme.borderStyle, borderWidth: '1px', borderStyle: 'solid' }}>
                        <h3 className={`text-xl font-bold ${theme.text} mb-4 flex items-center gap-2`}>
                            <span>🎨</span> Accent Color
                        </h3>
                        <div className="flex flex-wrap gap-3">
                            {accentColors.map((colorOption, i) => (
                                <button
                                    key={i}
                                    onClick={() => setAccentColor(colorOption.color)}
                                    className="w-14 h-14 rounded-xl transition-all"
                                    style={{
                                        backgroundColor: colorOption.color,
                                        boxShadow: accentColor === colorOption.color ? `0 0 20px ${colorOption.color}` : `0 0 10px ${colorOption.color}40`,
                                        transform: accentColor === colorOption.color ? 'scale(1.1)' : 'scale(1)',
                                        borderWidth: accentColor === colorOption.color ? '3px' : '0',
                                        borderStyle: 'solid',
                                        borderColor: 'white'
                                    }}
                                    title={colorOption.name}
                                />
                            ))}
                        </div>
                    </div>

                    {/* Notifications */}
                    <div className={`${theme.card} rounded-2xl p-6 transition-colors duration-300`} style={{ ...theme.borderStyle, borderWidth: '1px', borderStyle: 'solid' }}>
                        <h3 className={`text-xl font-bold ${theme.text} mb-4 flex items-center gap-2`}>
                            <span>🔔</span> Notifications
                        </h3>
                        <div className="space-y-4">
                            <ToggleSetting
                                label="Enable Notifications"
                                description="Receive all app notifications"
                                value={enableNotifications}
                                onChange={setEnableNotifications}
                                accentColor={accentColor}
                                theme={theme}
                            />
                            <ToggleSetting
                                label="Task Reminders"
                                description="Get reminded about incomplete tasks"
                                value={taskReminders}
                                onChange={setTaskReminders}
                                accentColor={accentColor}
                                theme={theme}
                            />
                            <ToggleSetting
                                label="Battle Notifications"
                                description="Battle results and stamina updates"
                                value={battleNotifications}
                                onChange={setBattleNotifications}
                                accentColor={accentColor}
                                theme={theme}
                            />
                            <ToggleSetting
                                label="Achievement Alerts"
                                description="Get notified when you unlock achievements"
                                value={achievementAlerts}
                                onChange={setAchievementAlerts}
                                accentColor={accentColor}
                                theme={theme}
                            />
                        </div>
                    </div>

                    {/* Audio */}
                    <div className={`${theme.card} rounded-2xl p-6 transition-colors duration-300`} style={{ ...theme.borderStyle, borderWidth: '1px', borderStyle: 'solid' }}>
                        <h3 className={`text-xl font-bold ${theme.text} mb-4 flex items-center gap-2`}>
                            <span>🔊</span> Audio
                        </h3>
                        <ToggleSetting
                            label="Sound Effects"
                            description="Battle sounds and UI feedback"
                            value={soundEffects}
                            onChange={setSoundEffects}
                            accentColor={accentColor}
                            theme={theme}
                        />
                    </div>

                    {/* Danger Zone */}
                    <div className="rounded-2xl p-6 transition-colors duration-300" style={{
                        backgroundColor: darkMode ? 'rgba(127, 29, 29, 0.2)' : 'rgba(254, 226, 226, 1)',
                        borderWidth: '1px',
                        borderStyle: 'solid',
                        borderColor: darkMode ? 'rgba(185, 28, 28, 0.5)' : 'rgba(252, 165, 165, 1)'
                    }}>
                        <h3 className="text-xl font-bold text-red-500 mb-4 flex items-center gap-2">
                            <span>🗑️</span> Danger Zone
                        </h3>
                        <div className="space-y-3">
                            <p className={`font-medium ${theme.text}`}>Reset All Data</p>
                            <p className={theme.textMuted}>
                                This will permanently delete all your tasks, progress, items, and achievements. This action cannot be undone.
                            </p>
                            {showResetConfirm ? (
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => {
                                            // TODO: Implement reset functionality
                                            console.log("Reset all data");
                                            setShowResetConfirm(false);
                                        }}
                                        className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors"
                                    >
                                        Confirm Reset
                                    </button>
                                    <button
                                        onClick={() => setShowResetConfirm(false)}
                                        className={`px-4 py-2 ${theme.inputBg} ${theme.text} font-medium rounded-lg transition-colors`}
                                    >
                                        Cancel
                                    </button>
                                </div>
                            ) : (
                                <button
                                    onClick={() => setShowResetConfirm(true)}
                                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors"
                                >
                                    Reset All Data
                                </button>
                            )}
                        </div>
                    </div>

                    {/* App Version */}
                    <div className="rounded-2xl p-5 text-white" style={{ background: `linear-gradient(to right, ${accentColor}, #a855f7)` }}>
                        <p className="font-bold">App Version</p>
                        <p className="opacity-80">HabitHero v1.0.0</p>
                        <p className="text-sm opacity-60 mt-2">Made with ❤️ for productivity heroes everywhere</p>
                    </div>
                </div>
            </main>
        </div>
    );
}

/* Toggle Setting Component */
function ToggleSetting({
    label,
    description,
    value,
    onChange,
    accentColor,
    theme
}: {
    label: string;
    description: string;
    value: boolean;
    onChange: (value: boolean) => void;
    accentColor: string;
    theme: ReturnType<typeof getThemeClasses>;
}) {
    return (
        <div className={`flex justify-between items-center p-4 ${theme.inputBg} rounded-xl`}>
            <div>
                <p className={`font-medium ${theme.text}`}>{label}</p>
                <p className={`${theme.textSubtle} text-sm`}>{description}</p>
            </div>
            <button
                onClick={() => onChange(!value)}
                className="w-14 h-8 rounded-full p-1 transition-all"
                style={{
                    backgroundColor: value ? accentColor : '#d1d5db',
                    boxShadow: value ? `0 0 10px ${accentColor}50` : 'none'
                }}
            >
                <div className={`w-6 h-6 rounded-full bg-white shadow transition-transform ${value ? 'translate-x-6' : 'translate-x-0'}`} />
            </button>
        </div>
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
    icon: string;
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
                <span>{icon}</span>
                <span className="font-medium">{label}</span>
            </button>
        </li>
    );
}
