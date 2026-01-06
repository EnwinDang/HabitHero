import { useState, useEffect } from "react";
import { useRealtimeUser } from "@/hooks/useRealtimeUser";
import { useRealtimeAchievements } from "@/hooks/useRealtimeAchievements";
import { useRealtimeTasks } from "@/hooks/useRealtimeTasks";
import { useTheme, getThemeClasses } from "@/context/ThemeContext";
import {
  onStreakUpdated,
  onLevelUp,
  onTaskCompleted,
} from "@/services/achievement.service";
import { Trophy, Star, TrendingUp, Coins, Lock, Check } from "lucide-react";

export default function AchievementsPage() {
  const { user, loading: userLoading } = useRealtimeUser();
  const { achievements, loading: achievementsLoading } =
    useRealtimeAchievements();
  const { tasks } = useRealtimeTasks();
  const { darkMode, accentColor } = useTheme();

  // Get theme classes
  const theme = getThemeClasses(darkMode, accentColor);

  // Filter state
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  // Sync achievements with user stats when they load
  useEffect(() => {
    if (user && !userLoading) {
      // Update streak achievements
      if (user.stats.streak > 0) {
        onStreakUpdated(user.stats.streak);
      }

      // Update level achievements
      if (user.stats.level > 0) {
        onLevelUp(user.stats.level);
      }
    }
  }, [user, userLoading]);

  // Sync task achievements when tasks load
  useEffect(() => {
    if (tasks.length > 0) {
      const completedTasks = tasks.filter((t) => !t.isActive).length;
      if (completedTasks > 0) {
        onTaskCompleted(completedTasks);
      }
    }
  }, [tasks]);

  if (userLoading || achievementsLoading) {
    return (
      <div
        className={`min-h-screen ${theme.bg} flex items-center justify-center transition-colors duration-300`}
      >
        <div className="text-xl animate-pulse" style={theme.accentText}>
          Loading...
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  // Get unique categories
  const categories = [
    "all",
    ...new Set(achievements.map((a) => a.category || "Other")),
  ];

  // Filter achievements
  const filteredAchievements =
    selectedCategory === "all"
      ? achievements
      : achievements.filter((a) => a.category === selectedCategory);

  // Stats
  const totalAchievements = achievements.length;
  const unlockedAchievements = achievements.filter((a) => a.isUnlocked).length;
  const totalXPReward = achievements
    .filter((a) => a.isUnlocked)
    .reduce((sum, a) => sum + (a.reward?.xp || 0), 0);

  return (
    <div className={`min-h-screen ${theme.bg} transition-colors duration-300`}>
      <main className="p-8 overflow-y-auto">
        {/* Header */}
        <div className="mb-6">
          <h2 className={`text-3xl font-bold ${theme.text}`}>Achievements</h2>
          <p className={theme.textMuted}>
            Track your progress and unlock rewards
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-xl p-5 text-white">
            <div className="flex items-center gap-2 mb-2">
              <Trophy size={18} />
              <span className="font-medium">Unlocked</span>
            </div>
            <p className="text-3xl font-bold">
              {unlockedAchievements}/{totalAchievements}
            </p>
            <p className="text-yellow-200 text-sm">
              {Math.round((unlockedAchievements / totalAchievements) * 100)}%
              Complete
            </p>
          </div>

          <div className="bg-gradient-to-br from-purple-600 to-purple-700 rounded-xl p-5 text-white">
            <div className="flex items-center gap-2 mb-2">
              <Star size={18} />
              <span className="font-medium">XP Earned</span>
            </div>
            <p className="text-3xl font-bold">{totalXPReward}</p>
            <p className="text-purple-200 text-sm">From achievements</p>
          </div>

          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-5 text-white">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp size={18} />
              <span className="font-medium">Your Level</span>
            </div>
            <p className="text-3xl font-bold">{user.stats.level}</p>
            <p className="text-green-200 text-sm">Keep going!</p>
          </div>
        </div>

        {/* Category Filter */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className="px-4 py-2 rounded-xl font-medium transition-all capitalize"
              style={
                selectedCategory === category
                  ? {
                      background: `linear-gradient(to right, ${accentColor}, #a855f7)`,
                      color: "white",
                    }
                  : {
                      backgroundColor: darkMode
                        ? "rgba(55, 65, 81, 0.3)"
                        : "rgba(243, 244, 246, 1)",
                      color: darkMode ? "#9ca3af" : "#6b7280",
                    }
              }
            >
              {category}
            </button>
          ))}
        </div>

        {/* Achievements Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredAchievements.map((achievement) => (
            <AchievementCard
              key={achievement.achievementId}
              achievement={achievement}
              darkMode={darkMode}
              accentColor={accentColor}
              theme={theme}
            />
          ))}
        </div>

        {filteredAchievements.length === 0 && (
          <div className="text-center py-12">
            <Trophy
              size={40}
              className={`mb-4 mx-auto ${
                darkMode ? "text-gray-500" : "text-gray-400"
              }`}
            />
            <p className={theme.textMuted}>No achievements in this category</p>
          </div>
        )}
      </main>
    </div>
  );
}

/* Achievement Card Component */
function AchievementCard({
  achievement,
  darkMode,
  accentColor,
  theme,
}: {
  achievement: {
    achievementId: string;
    title: string;
    description?: string | null;
    icon?: string;
    progress: number;
    target: number;
    isUnlocked: boolean;
    reward?: { xp?: number; gold?: number };
  };
  darkMode: boolean;
  accentColor: string;
  theme: ReturnType<typeof getThemeClasses>;
}) {
  const progressPercent = Math.min(
    100,
    Math.round((achievement.progress / achievement.target) * 100)
  );

  return (
    <div
      className={`rounded-2xl p-5 transition-all ${
        achievement.isUnlocked ? "" : "opacity-70"
      }`}
      style={{
        backgroundColor: darkMode
          ? "rgba(31, 41, 55, 0.5)"
          : "rgba(255, 255, 255, 1)",
        borderWidth: "1px",
        borderStyle: "solid",
        borderColor: achievement.isUnlocked
          ? accentColor
          : darkMode
          ? "rgba(75, 85, 99, 0.5)"
          : "rgba(229, 231, 235, 1)",
        boxShadow: achievement.isUnlocked
          ? `0 0 20px ${accentColor}30`
          : "none",
      }}
    >
      {/* Header */}
      <div className="flex items-start gap-3 mb-4">
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
          style={{
            backgroundColor: achievement.isUnlocked
              ? `${accentColor}20`
              : darkMode
              ? "rgba(55, 65, 81, 0.5)"
              : "rgba(243, 244, 246, 1)",
            borderWidth: "2px",
            borderStyle: "solid",
            borderColor: achievement.isUnlocked ? accentColor : "transparent",
          }}
        >
          {achievement.isUnlocked ? achievement.icon : <Lock size={20} />}
        </div>
        <div className="flex-1">
          <h3 className={`font-bold ${theme.text}`}>{achievement.title}</h3>
          <p className={`text-sm ${theme.textMuted}`}>
            {achievement.description}
          </p>
        </div>
        {achievement.isUnlocked && (
          <Check size={20} className="text-green-500" />
        )}
      </div>

      {/* Progress Bar */}
      <div className="mb-3">
        <div className="flex justify-between text-sm mb-1">
          <span className={theme.textMuted}>Progress</span>
          <span
            style={
              achievement.isUnlocked
                ? theme.accentText
                : { color: darkMode ? "#9ca3af" : "#6b7280" }
            }
          >
            {achievement.progress}/{achievement.target}
          </span>
        </div>
        <div
          className={`h-2 rounded-full overflow-hidden ${
            darkMode ? "bg-gray-700" : "bg-gray-200"
          }`}
        >
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${progressPercent}%`,
              background: achievement.isUnlocked
                ? `linear-gradient(to right, ${accentColor}, #a855f7)`
                : darkMode
                ? "#4b5563"
                : "#9ca3af",
            }}
          />
        </div>
      </div>

      {/* Rewards */}
      {achievement.reward && (
        <div
          className="flex gap-3 pt-3"
          style={{
            borderTopWidth: "1px",
            borderTopStyle: "solid",
            ...theme.borderStyle,
          }}
        >
          {achievement.reward.xp && (
            <div className="flex items-center gap-1 text-sm">
              <Star size={14} style={theme.accentText} />
              <span style={theme.accentText}>+{achievement.reward.xp} XP</span>
            </div>
          )}
          {achievement.reward.gold && (
            <div className="flex items-center gap-1 text-sm">
              <Coins size={14} className="text-yellow-500" />
              <span className="text-yellow-500">
                +{achievement.reward.gold}
              </span>
            </div>
          )}
        </div>
      )}
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
