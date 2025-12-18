import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useRealtimeUser } from "@/hooks/useRealtimeUser";
import { useTheme, getThemeClasses } from "@/context/ThemeContext";
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
    Gamepad2,
    Mail,
    CalendarDays,
    Moon,
    UserCircle
} from "lucide-react";

// Avatar options - Game themed
const avatars = ["⚔️", "🛡️", "🗡️", "🏹", "🔮", "🐉", "👑", "💀"];

export default function ProfilePage() {
    const navigate = useNavigate();
    const { logout, loading: authLoading } = useAuth();
    const { user, loading: userLoading } = useRealtimeUser();
    const { darkMode, setDarkMode, accentColor } = useTheme();

    const [selectedAvatar, setSelectedAvatar] = useState(0);

    // Get theme classes
    const theme = getThemeClasses(darkMode, accentColor);

    async function handleLogout() {
        await logout();
        navigate("/login");
    }

    if (authLoading || userLoading) {
        return (
            <div
                className={`min-h-screen ${theme.bg} flex items-center justify-center transition-colors duration-300`}
            >
                <div className="text-xl animate-pulse" style={theme.accentText}>
                    Laden...
                </div>
            </div>
        );
    }

    if (!user) {
        return null;
    }

    const memberSince = new Date().toLocaleDateString("nl-NL", {
        month: "long",
        year: "numeric",
    });

    return (
        <div
            className={`min-h-screen ${theme.bg} flex transition-colors duration-300`}
        >
            {/* SIDEBAR */}
            <aside
                className={`w-64 ${theme.sidebar} flex flex-col min-h-screen transition-colors duration-300`}
                style={{
                    ...theme.borderStyle,
                    borderRightWidth: "1px",
                    borderRightStyle: "solid",
                }}
            >
                <div className="p-6">
                    <h1 className="text-2xl font-bold" style={theme.gradientText}>
                        HabitHero
                    </h1>
                </div>

                <nav className="flex-1 px-4">
                    <ul className="space-y-2">
                        <NavItem
                            icon={<Sword size={20} />}
                            label="Home"
                            onClick={() => navigate("/dashboard")}
                            darkMode={darkMode}
                            accentColor={accentColor}
                        />
                        <NavItem
                            icon={<Scroll size={20} />}
                            label="Quests"
                            onClick={() => { }}
                            darkMode={darkMode}
                            accentColor={accentColor}
                        />
                        <NavItem
                            icon={<Timer size={20} />}
                            label="Focus Mode"
                            onClick={() => navigate("/focus")}
                            darkMode={darkMode}
                            accentColor={accentColor}
                        />
                        <NavItem
                            icon={<BarChart3 size={20} />}
                            label="Stats"
                            onClick={() => navigate("/stats")}
                            darkMode={darkMode}
                            accentColor={accentColor}
                        />
                        <NavItem
                            icon={<Trophy size={20} />}
                            label="Achievements"
                            onClick={() => navigate("/achievements")}
                            darkMode={darkMode}
                            accentColor={accentColor}
                        />
                        <NavItem
                            icon={<Calendar size={20} />}
                            label="Calendar"
                            onClick={() => navigate("/calendar")}
                            darkMode={darkMode}
                            accentColor={accentColor}
                        />
                        <NavItem
                            icon={<User size={20} />}
                            label="Profile"
                            active
                            onClick={() => navigate("/profile")}
                            darkMode={darkMode}
                            accentColor={accentColor}
                        />
                        <NavItem
                            icon={<Settings size={20} />}
                            label="Settings"
                            onClick={() => navigate("/settings")}
                            darkMode={darkMode}
                            accentColor={accentColor}
                        />
                    </ul>
                </nav>

                <div
                    className="p-4"
                    style={{
                        ...theme.borderStyle,
                        borderTopWidth: "1px",
                        borderTopStyle: "solid",
                    }}
                >
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
                <div className="mb-8">
                    <h2 className={`text-4xl font-bold ${theme.text}`}>
                        Profile Settings
                    </h2>
                </div>

                <div className="space-y-6">
                    {/* TOP ROW: Profile + My Information (same height) */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
                        {/* LEFT - PROFILE CARD */}
                        <div className="h-full">
                            <div className="relative h-full">
                                {/* Glow */}
                                <div
                                    className="absolute -inset-1 rounded-2xl blur-lg opacity-30"
                                    style={{
                                        background: `linear-gradient(to bottom, ${accentColor}, #a855f7)`,
                                    }}
                                ></div>

                                {/* Card */}
                                <div
                                    className={`relative bg-gradient-to-b ${theme.cardGradient} rounded-2xl p-6 text-center overflow-hidden transition-colors duration-300 h-full`}
                                    style={{
                                        ...theme.borderStyle,
                                        borderWidth: "1px",
                                        borderStyle: "solid",
                                    }}
                                >
                                    {/* Corner decorations */}
                                    <div
                                        className="absolute top-0 left-0 w-12 h-12 border-l-2 border-t-2"
                                        style={{ borderColor: `${accentColor}80` }}
                                    ></div>
                                    <div
                                        className="absolute top-0 right-0 w-12 h-12 border-r-2 border-t-2"
                                        style={{ borderColor: `${accentColor}80` }}
                                    ></div>
                                    <div
                                        className="absolute bottom-0 left-0 w-12 h-12 border-l-2 border-b-2"
                                        style={{ borderColor: `${accentColor}80` }}
                                    ></div>
                                    <div
                                        className="absolute bottom-0 right-0 w-12 h-12 border-r-2 border-b-2"
                                        style={{ borderColor: `${accentColor}80` }}
                                    ></div>

                                    {/* Avatar */}
                                    <div
                                        className="w-28 h-28 mx-auto rounded-xl border-2 flex items-center justify-center mb-4"
                                        style={{
                                            borderColor: `${accentColor}80`,
                                            backgroundColor: darkMode
                                                ? "rgba(88, 28, 135, 0.3)"
                                                : "rgba(219, 234, 254, 0.5)",
                                            boxShadow: `0 0 30px ${accentColor}30`,
                                        }}
                                    >
                                        <span className="text-5xl">{avatars[selectedAvatar]}</span>
                                    </div>

                                    <h3 className={`text-2xl font-bold ${theme.text}`}>
                                        {user.displayName}
                                    </h3>

                                    <div
                                        className="mt-6 pt-4"
                                        style={{
                                            borderTopWidth: "1px",
                                            borderTopStyle: "solid",
                                            borderColor: `${accentColor}30`,
                                        }}
                                    >
                                        <p
                                            className="text-4xl font-bold"
                                            style={theme.gradientText}
                                        >
                                            Level {user.stats.level}
                                        </p>
                                    </div>

                                    {/* Stats Preview */}
                                    <div className="grid grid-cols-3 gap-2 mt-4">
                                        <div className={`${theme.inputBg} rounded-lg p-2`}>
                                            <p className="text-yellow-400 font-bold">
                                                {user.stats.gold}
                                            </p>
                                            <p className={`${theme.textSubtle} text-xs`}>Gold</p>
                                        </div>
                                        <div className={`${theme.inputBg} rounded-lg p-2`}>
                                            <p className="font-bold" style={theme.accentText}>
                                                {user.stats.xp}
                                            </p>
                                            <p className={`${theme.textSubtle} text-xs`}>XP</p>
                                        </div>
                                        <div className={`${theme.inputBg} rounded-lg p-2`}>
                                            <p className="text-orange-400 font-bold">
                                                {user.stats.streak}
                                            </p>
                                            <p className={`${theme.textSubtle} text-xs`}>Streak</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* RIGHT - MY INFORMATION */}
                        <div className="h-full">
                            <div
                                className={`${theme.card} rounded-2xl p-6 transition-colors duration-300 h-full`}
                                style={{
                                    ...theme.borderStyle,
                                    borderWidth: "1px",
                                    borderStyle: "solid",
                                }}
                            >
                                <div className="flex justify-between items-center mb-6">
                                    <h3
                                        className={`text-xl font-bold ${theme.text} flex items-center gap-2`}
                                    >
                                        <ClipboardList size={20} style={{ color: accentColor }} /> My Information
                                    </h3>
                                    <button
                                        className="px-4 py-1.5 rounded-lg text-sm transition-colors"
                                        style={{
                                            ...theme.accentText,
                                            borderWidth: "1px",
                                            borderStyle: "solid",
                                            borderColor: `${accentColor}80`,
                                        }}
                                    >
                                        Edit
                                    </button>
                                </div>

                                <div className="space-y-4">
                                    <InfoRow
                                        icon={<UserCircle size={20} />}
                                        label=""
                                        value={user.displayName || "Hero"}
                                        darkMode={darkMode}
                                    />
                                    <InfoRow
                                        icon={<Mail size={20} />}
                                        label=""
                                        value={user.email || "hunter@shadow.com"}
                                        darkMode={darkMode}
                                    />
                                    <InfoRow
                                        icon={<CalendarDays size={20} />}
                                        label=""
                                        value={memberSince}
                                        darkMode={darkMode}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Avatar + Theme + Accent (structured) */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Choose Avatar */}
                        <div
                            className={`${theme.card} rounded-2xl p-6 transition-colors duration-300`}
                            style={{
                                ...theme.borderStyle,
                                borderWidth: "1px",
                                borderStyle: "solid",
                            }}
                        >
                            <h3
                                className={`text-xl font-bold ${theme.text} mb-4 flex items-center gap-2`}
                            >
                                <span>🎭</span> Choose Avatar
                            </h3>
                            <div className="grid grid-cols-4 gap-3">
                                {avatars.map((avatar, index) => (
                                    <button
                                        key={index}
                                        onClick={() => setSelectedAvatar(index)}
                                        className="p-4 rounded-xl text-3xl transition-all border-2"
                                        style={{
                                            backgroundColor:
                                                selectedAvatar === index
                                                    ? darkMode
                                                        ? `${accentColor}20`
                                                        : `${accentColor}10`
                                                    : darkMode
                                                        ? "rgba(55, 65, 81, 0.3)"
                                                        : "rgba(243, 244, 246, 1)",
                                            borderColor:
                                                selectedAvatar === index ? accentColor : "transparent",
                                            boxShadow:
                                                selectedAvatar === index
                                                    ? `0 0 15px ${accentColor}40`
                                                    : "none",
                                        }}
                                    >
                                        {avatar}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Theme + Accent */}
                        <div className="space-y-6">
                            {/* Theme Settings */}
                            <div
                                className={`${theme.card} rounded-2xl p-6 transition-colors duration-300`}
                                style={{
                                    ...theme.borderStyle,
                                    borderWidth: "1px",
                                    borderStyle: "solid",
                                }}
                            >
                                <h3
                                    className={`text-xl font-bold ${theme.text} mb-4 flex items-center gap-2`}
                                >
                                    <span>🌙</span> Theme Settings
                                </h3>
                                <div
                                    className={`flex justify-between items-center p-4 ${theme.inputBg} rounded-xl`}
                                >
                                    <div>
                                        <p className="font-medium" style={theme.accentText}>
                                            Dark Mode
                                        </p>
                                        <p className={`${theme.textSubtle} text-sm`}>
                                            {darkMode
                                                ? "Shadow realm activated"
                                                : "Light mode active"}
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => setDarkMode(!darkMode)}
                                        className="w-14 h-8 rounded-full p-1 transition-all"
                                        style={{
                                            backgroundColor: darkMode ? accentColor : "#d1d5db",
                                            boxShadow: darkMode
                                                ? `0 0 10px ${accentColor}50`
                                                : "none",
                                        }}
                                    >
                                        <div
                                            className={`w-6 h-6 rounded-full bg-white shadow transition-transform ${darkMode ? "translate-x-6" : "translate-x-0"
                                                }`}
                                        />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
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
    accentColor,
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
                style={
                    active
                        ? {
                            background: `linear-gradient(to right, ${accentColor}20, rgba(168, 85, 247, 0.1))`,
                            color: accentColor,
                            borderWidth: "1px",
                            borderStyle: "solid",
                            borderColor: `${accentColor}50`,
                        }
                        : {
                            color: darkMode ? "#9ca3af" : "#6b7280",
                        }
                }
            >
                {icon}
                <span className="font-medium">{label}</span>
            </button>
        </li>
    );
}

/* Info Row Component */
function InfoRow({
    icon,
    label,
    value,
    darkMode,
}: {
    icon: React.ReactNode;
    label: string;
    value: string;
    darkMode: boolean;
}) {
    return (
        <div
            className="flex items-center gap-4 p-3 rounded-xl"
            style={{
                backgroundColor: darkMode
                    ? "rgba(55, 65, 81, 0.2)"
                    : "rgba(243, 244, 246, 1)",
            }}
        >
            <span className="text-xl">{icon}</span>
            <div>
                <p
                    className={darkMode ? "text-gray-500" : "text-gray-400"}
                    style={{ fontSize: "0.875rem" }}
                >
                    {label}
                </p>
                <p
                    className={`font-medium ${darkMode ? "text-white" : "text-gray-800"}`}
                >
                    {value}
                </p>
            </div>
        </div>
    );
}
