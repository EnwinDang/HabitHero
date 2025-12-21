import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useRealtimeUser } from "@/hooks/useRealtimeUser";
import { useRealtimeTasks } from "@/hooks/useRealtimeTasks";
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
  TrendingUp,
  Star,
  Coins,
  Flame,
  ClipboardList,
  FileText,
} from "lucide-react";

export default function StatsPage() {
  const navigate = useNavigate();
  const { logout, loading: authLoading } = useAuth();
  const { user, loading: userLoading } = useRealtimeUser();
  const { tasks } = useRealtimeTasks();
  const { darkMode, accentColor } = useTheme();

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

  // Real data from database only
  const level = user.stats?.level || 1;
  const xp = user.stats?.xp || 0;
  const gold = user.stats?.gold || 0;
  const streak = user.stats?.streak || 0;
  const maxXP = 1200;
  const xpProgress = Math.round(((xp % maxXP) / maxXP) * 100);

  // Real task data from database
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => !t.isActive).length;
  const activeTasks = tasks.filter((t) => t.isActive).length;

  // Tasks by difficulty (real data)
  const easyTasks = tasks.filter((t) => t.difficulty === "easy").length;
  const mediumTasks = tasks.filter((t) => t.difficulty === "medium").length;
  const hardTasks = tasks.filter((t) => t.difficulty === "hard").length;
  const extremeTasks = tasks.filter((t) => t.difficulty === "extreme").length;

  // Completed tasks by difficulty (real data)
  const completedEasy = tasks.filter(
    (t) => !t.isActive && t.difficulty === "easy"
  ).length;
  const completedMedium = tasks.filter(
    (t) => !t.isActive && t.difficulty === "medium"
  ).length;
  const completedHard = tasks.filter(
    (t) => !t.isActive && t.difficulty === "hard"
  ).length;
  const completedExtreme = tasks.filter(
    (t) => !t.isActive && t.difficulty === "extreme"
  ).length;

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
              onClick={() => {}}
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
              active
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
        <div className="mb-6">
          <h2 className={`text-3xl font-bold ${theme.text}`}>
            Hero Statistics
          </h2>
          <p className={theme.textMuted}>Track your progress and performance</p>
        </div>

        {/* Top Stats Cards - REAL DATA */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          {/* Level Card */}
          <div className="bg-gradient-to-br from-purple-600 to-purple-700 rounded-xl p-5 text-white">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp size={18} />
              <span className="font-medium">Level</span>
            </div>
            <p className="text-3xl font-bold">{level}</p>
            <p className="text-purple-200 text-sm">Current Level</p>
          </div>

          {/* XP Progress Card */}
          <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl p-5 text-white">
            <div className="flex items-center gap-2 mb-2">
              <Star size={18} />
              <span className="font-medium">XP Progress</span>
            </div>
            <p className="text-3xl font-bold">{xpProgress}%</p>
            <p className="text-orange-200 text-sm">
              {xp % maxXP} / {maxXP}
            </p>
          </div>

          {/* Gold Card */}
          <div className="bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-xl p-5 text-white">
            <div className="flex items-center gap-2 mb-2">
              <Coins size={18} />
              <span className="font-medium">Gold</span>
            </div>
            <p className="text-3xl font-bold">{gold}</p>
            <p className="text-yellow-200 text-sm">Total Earned</p>
          </div>

          {/* Streak Card */}
          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-5 text-white">
            <div className="flex items-center gap-2 mb-2">
              <Flame size={18} />
              <span className="font-medium">Streak</span>
            </div>
            <p className="text-3xl font-bold">{streak}</p>
            <p className="text-green-200 text-sm">Days in a row</p>
          </div>
        </div>

        {/* Task Statistics - REAL DATA */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Task Overview */}
          <div
            className={`${theme.card} rounded-2xl p-6`}
            style={{
              ...theme.borderStyle,
              borderWidth: "1px",
              borderStyle: "solid",
            }}
          >
            <h3
              className={`text-xl font-bold ${theme.text} mb-4 flex items-center gap-2`}
            >
              <ClipboardList size={20} /> Task Overview
            </h3>

            {totalTasks === 0 ? (
              <div className="text-center py-8">
                <FileText
                  size={40}
                  className={`mb-4 mx-auto ${
                    darkMode ? "text-gray-500" : "text-gray-400"
                  }`}
                />
                <p className={theme.textMuted}>No tasks yet</p>
                <p className={`${theme.textSubtle} text-sm`}>
                  Create your first task to see statistics!
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div
                  className="flex justify-between items-center p-3 rounded-lg"
                  style={{
                    backgroundColor: darkMode
                      ? "rgba(55, 65, 81, 0.3)"
                      : "rgba(243, 244, 246, 1)",
                  }}
                >
                  <span className={theme.textMuted}>Total Tasks</span>
                  <span className={`font-bold ${theme.text}`}>
                    {totalTasks}
                  </span>
                </div>
                <div
                  className="flex justify-between items-center p-3 rounded-lg"
                  style={{
                    backgroundColor: darkMode
                      ? "rgba(34, 197, 94, 0.1)"
                      : "rgba(220, 252, 231, 1)",
                  }}
                >
                  <span className="text-green-500">Completed</span>
                  <span className="font-bold text-green-500">
                    {completedTasks}
                  </span>
                </div>
                <div
                  className="flex justify-between items-center p-3 rounded-lg"
                  style={{
                    backgroundColor: darkMode
                      ? "rgba(59, 130, 246, 0.1)"
                      : "rgba(219, 234, 254, 1)",
                  }}
                >
                  <span className="text-blue-500">Active</span>
                  <span className="font-bold text-blue-500">{activeTasks}</span>
                </div>

                {/* Completion progress bar */}
                {totalTasks > 0 && (
                  <div className="mt-4">
                    <div className="flex justify-between text-sm mb-1">
                      <span className={theme.textMuted}>Completion Rate</span>
                      <span style={theme.accentText}>
                        {Math.round((completedTasks / totalTasks) * 100)}%
                      </span>
                    </div>
                    <div
                      className={`h-3 rounded-full overflow-hidden ${
                        darkMode ? "bg-gray-800" : "bg-gray-200"
                      }`}
                    >
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${(completedTasks / totalTasks) * 100}%`,
                          background: `linear-gradient(to right, ${accentColor}, #a855f7)`,
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Tasks by Difficulty - REAL DATA */}
          <div
            className={`${theme.card} rounded-2xl p-6`}
            style={{
              ...theme.borderStyle,
              borderWidth: "1px",
              borderStyle: "solid",
            }}
          >
            <h3
              className={`text-xl font-bold ${theme.text} mb-4 flex items-center gap-2`}
            >
              <Sword size={20} /> Tasks by Difficulty
            </h3>

            {totalTasks === 0 ? (
              <div className="text-center py-8">
                <BarChart3
                  size={40}
                  className={`mb-4 mx-auto ${
                    darkMode ? "text-gray-500" : "text-gray-400"
                  }`}
                />
                <p className={theme.textMuted}>No data yet</p>
                <p className={`${theme.textSubtle} text-sm`}>
                  Complete tasks to see difficulty breakdown!
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <DifficultyBar
                  label="Easy"
                  total={easyTasks}
                  completed={completedEasy}
                  color="#22c55e"
                  darkMode={darkMode}
                  theme={theme}
                />
                <DifficultyBar
                  label="Medium"
                  total={mediumTasks}
                  completed={completedMedium}
                  color="#f59e0b"
                  darkMode={darkMode}
                  theme={theme}
                />
                <DifficultyBar
                  label="Hard"
                  total={hardTasks}
                  completed={completedHard}
                  color="#ef4444"
                  darkMode={darkMode}
                  theme={theme}
                />
                <DifficultyBar
                  label="Extreme"
                  total={extremeTasks}
                  completed={completedExtreme}
                  color="#a855f7"
                  darkMode={darkMode}
                  theme={theme}
                />
              </div>
            )}
          </div>
        </div>

        {/* Total XP Info */}
        <div
          className={`${theme.card} rounded-2xl p-6`}
          style={{
            ...theme.borderStyle,
            borderWidth: "1px",
            borderStyle: "solid",
          }}
        >
          <h3
            className={`text-xl font-bold ${theme.text} mb-4 flex items-center gap-2`}
          >
            <TrendingUp size={20} /> Experience Progress
          </h3>
          <div className="flex items-center gap-6">
            <div className="flex-1">
              <div className="flex justify-between text-sm mb-2">
                <span className={theme.textMuted}>Total XP Earned</span>
                <span className={`font-bold ${theme.text}`}>{xp} XP</span>
              </div>
              <div
                className={`h-4 rounded-full overflow-hidden ${
                  darkMode ? "bg-gray-800" : "bg-gray-200"
                }`}
              >
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${xpProgress}%`,
                    background: `linear-gradient(to right, ${accentColor}, #a855f7)`,
                    boxShadow: `0 0 10px ${accentColor}80`,
                  }}
                />
              </div>
              <p className={`${theme.textSubtle} text-sm mt-2`}>
                {maxXP - (xp % maxXP)} XP until Level {level + 1}
              </p>
            </div>
            <div
              className="text-center px-6 py-4 rounded-xl"
              style={{
                backgroundColor: darkMode
                  ? "rgba(88, 28, 135, 0.3)"
                  : "rgba(243, 232, 255, 1)",
              }}
            >
              <p className="text-4xl font-bold" style={theme.accentText}>
                {level}
              </p>
              <p className={theme.textMuted + " text-sm"}>Current Level</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

/* Difficulty Bar Component */
function DifficultyBar({
  label,
  total,
  completed,
  color,
  darkMode,
  theme,
}: {
  label: string;
  total: number;
  completed: number;
  color: string;
  darkMode: boolean;
  theme: ReturnType<typeof getThemeClasses>;
}) {
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span style={{ color }}>{label}</span>
        <span className={theme.textMuted}>
          {completed}/{total}
        </span>
      </div>
      <div
        className={`h-2 rounded-full overflow-hidden ${
          darkMode ? "bg-gray-800" : "bg-gray-200"
        }`}
      >
        <div
          className="h-full rounded-full transition-all"
          style={{
            width: `${percentage}%`,
            backgroundColor: color,
          }}
        />
      </div>
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
