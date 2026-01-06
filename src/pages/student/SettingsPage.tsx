import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
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
  Sparkles,
  Palette,
  Bell,
  AlertTriangle,
  Info,
  Moon,
} from "lucide-react";

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
  const { darkMode, setDarkMode, accentColor, setAccentColor } = useTheme();

  // Settings state
  const [enableNotifications, setEnableNotifications] = useState(true);
  const [taskReminders, setTaskReminders] = useState(true);
  const [battleNotifications, setBattleNotifications] = useState(true);
  const [achievementAlerts, setAchievementAlerts] = useState(true);

  // Get theme classes
  const theme = getThemeClasses(darkMode, accentColor);

  async function handleLogout() {
    await logout();
    navigate("/login");
  }

  if (authLoading) {
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

  return (
    <div className={`min-h-screen ${theme.bg} transition-colors duration-300`}>
      <main className="p-8 overflow-y-auto">
        {/* Header */}
        <div className="mb-8">
          <h2 className={`text-4xl font-bold ${theme.text}`}>Settings</h2>
          <p style={theme.accentText} className="mt-2">
            Customize your HabitHero experience
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-6xl mx-auto">
          {/* Appearance Section */}
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
              <Sparkles size={24} /> Appearance
            </h3>

            {/* Dark Mode Toggle */}
            <SettingRow
              icon={<Moon size={20} />}
              title="Dark Mode"
              description="Switch to dark theme"
              darkMode={darkMode}
              accentColor={accentColor}
            >
              <Toggle
                enabled={darkMode}
                onToggle={() => setDarkMode(!darkMode)}
                accentColor={accentColor}
              />
            </SettingRow>
          </div>

          {/* Accent Color Section */}
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
              <Palette size={24} /> Accent Color
            </h3>
            <p className={`${theme.textSubtle} text-sm mb-4`}>
              Choose your power color
            </p>
            <div className="flex flex-wrap gap-3">
              {accentColors.map((colorOption, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => {
                    console.log("Changing accent color to:", colorOption.color);
                    setAccentColor(colorOption.color);
                  }}
                  className="w-12 h-12 rounded-xl transition-all cursor-pointer"
                  style={{
                    backgroundColor: colorOption.color,
                    boxShadow:
                      accentColor === colorOption.color
                        ? `0 0 20px ${colorOption.color}`
                        : `0 0 10px ${colorOption.color}40`,
                    transform:
                      accentColor === colorOption.color
                        ? "scale(1.1)"
                        : "scale(1)",
                    borderWidth:
                      accentColor === colorOption.color ? "2px" : "0",
                    borderStyle: "solid",
                    borderColor: "white",
                  }}
                  title={colorOption.name}
                  aria-label={`Set accent color to ${colorOption.name}`}
                />
              ))}
            </div>
          </div>

          {/* Notifications Section */}
          <div
            className={`${theme.card} rounded-2xl p-6 transition-colors duration-300 md:col-span-2`}
            style={{
              ...theme.borderStyle,
              borderWidth: "1px",
              borderStyle: "solid",
            }}
          >
            <h3
              className={`text-xl font-bold ${theme.text} mb-4 flex items-center gap-2`}
            >
              <Bell size={24} /> Notifications
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <SettingRow
                icon={null}
                title="Enable Notifications"
                description="Receive all app notifications"
                darkMode={darkMode}
                accentColor={accentColor}
              >
                <Toggle
                  enabled={enableNotifications}
                  onToggle={() => setEnableNotifications(!enableNotifications)}
                  accentColor={accentColor}
                />
              </SettingRow>

              <SettingRow
                icon={null}
                title="Task Reminders"
                description="Get reminded about incomplete tasks"
                darkMode={darkMode}
                accentColor={accentColor}
              >
                <Toggle
                  enabled={taskReminders}
                  onToggle={() => setTaskReminders(!taskReminders)}
                  accentColor={accentColor}
                />
              </SettingRow>

              <SettingRow
                icon={null}
                title="Battle Notifications"
                description="Battle results and stamina updates"
                darkMode={darkMode}
                accentColor={accentColor}
              >
                <Toggle
                  enabled={battleNotifications}
                  onToggle={() => setBattleNotifications(!battleNotifications)}
                  accentColor={accentColor}
                />
              </SettingRow>

              <SettingRow
                icon={null}
                title="Achievement Alerts"
                description="Get notified when you unlock achievements"
                darkMode={darkMode}
                accentColor={accentColor}
              >
                <Toggle
                  enabled={achievementAlerts}
                  onToggle={() => setAchievementAlerts(!achievementAlerts)}
                  accentColor={accentColor}
                />
              </SettingRow>
            </div>
          </div>

          {/* Danger Zone */}
          <div
            className="rounded-2xl p-6 transition-colors duration-300"
            style={{
              backgroundColor: darkMode
                ? "rgba(127, 29, 29, 0.2)"
                : "rgba(254, 226, 226, 1)",
              borderWidth: "1px",
              borderStyle: "solid",
              borderColor: "rgba(239, 68, 68, 0.3)",
            }}
          >
            <h3 className="text-xl font-bold text-red-500 mb-4 flex items-center gap-2">
              <AlertTriangle size={24} /> Danger Zone
            </h3>

            <div className="mb-4">
              <p
                className={`font-medium ${darkMode ? "text-red-300" : "text-red-700"
                  }`}
              >
                Reset All Data
              </p>
              <p
                className={`text-sm ${darkMode ? "text-red-400/70" : "text-red-600/70"
                  }`}
              >
                This will permanently delete all your tasks, progress, items,
                and achievements. This action cannot be undone.
              </p>
            </div>

            <button
              className="bg-red-500 hover:bg-red-600 text-white px-6 py-2 rounded-xl font-bold transition-colors"
              style={{ boxShadow: "0 0 15px rgba(239, 68, 68, 0.3)" }}
            >
              Reset All Data
            </button>
          </div>

          {/* App Version */}
          <div
            className="rounded-2xl p-6 transition-colors duration-300"
            style={{
              backgroundColor: accentColor, // Use solid accent color instead of gradient
            }}
          >
            <h3 className="text-xl font-bold text-white mb-1 flex items-center gap-2">
              <Info size={24} /> App Version
            </h3>
            <p className="text-white/80">HabitHero v1.0.0</p>
          </div>
        </div>
      </main>
    </div>
  );
}

/* Toggle Component */
function Toggle({
  enabled,
  onToggle,
  accentColor,
}: {
  enabled: boolean;
  onToggle: () => void;
  accentColor: string;
}) {
  return (
    <button
      onClick={onToggle}
      className="w-14 h-8 rounded-full p-1 transition-all"
      style={{
        backgroundColor: enabled ? accentColor : "#d1d5db",
        boxShadow: enabled ? `0 0 10px ${accentColor}50` : "none",
      }}
    >
      <div
        className={`w-6 h-6 rounded-full bg-white shadow transition-transform ${enabled ? "translate-x-6" : "translate-x-0"
          }`}
      />
    </button>
  );
}

/* Setting Row Component */
function SettingRow({
  icon,
  title,
  description,
  children,
  darkMode,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  children: React.ReactNode;
  darkMode: boolean;
  accentColor: string;
}) {
  return (
    <div
      className="flex justify-between items-center p-4 rounded-xl"
      style={{
        backgroundColor: darkMode
          ? "rgba(55, 65, 81, 0.2)"
          : "rgba(243, 244, 246, 1)",
      }}
    >
      <div className="flex items-center gap-3">
        {icon && <span className="text-xl">{icon}</span>}
        <div>
          <p
            className={`font-medium ${darkMode ? "text-white" : "text-gray-800"
              }`}
          >
            {title}
          </p>
          <p
            className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-500"
              }`}
          >
            {description}
          </p>
        </div>
      </div>
      {children}
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
