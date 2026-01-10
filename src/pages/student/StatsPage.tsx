import { useRealtimeUser } from "@/hooks/useRealtimeUser";
import { useRealtimeTasks } from "@/hooks/useRealtimeTasks";
import { useTheme, getThemeClasses } from "@/context/ThemeContext";
import { getCurrentLevelProgress, getXPForLevel, getXPToNextLevel, getLevelFromXP } from "@/utils/xpCurve";
import { useState, useEffect } from "react";
import { AchievementsAPI } from "@/api/achievements.api";
import { auth } from "@/firebase";
import {
  Sword,
  BarChart3,
  TrendingUp,
  Star,
  Coins,
  Flame,
  ClipboardList,
  FileText,
  Shield,
  Zap,
  Trophy,
  Target,
  Package,
  Gift,
} from "lucide-react";

export default function StatsPage() {
  const { user, loading: userLoading } = useRealtimeUser();
  const { tasks } = useRealtimeTasks();
  const { darkMode, accentColor } = useTheme();
  const [achievements, setAchievements] = useState<any[]>([]);

  // Get theme classes
  const theme = getThemeClasses(darkMode, accentColor);

  // Load achievements
  useEffect(() => {
    const loadAchievements = async () => {
      const currentUser = auth.currentUser;
      if (!currentUser) return;

      try {
        const [catalogResponse, userProgress] = await Promise.all([
          AchievementsAPI.list(),
          AchievementsAPI.getUserProgress(currentUser.uid),
        ]);

        const catalog = catalogResponse.data || [];
        const progressMap = new Map(userProgress.map(p => [p.achievementId, p]));

        const merged = catalog.map((achievement) => {
          const userProg = progressMap.get(achievement.achievementId);
          const target = achievement.condition?.value || 1;
          return {
            ...achievement,
            target,
            progress: userProg?.progress || 0,
            isUnlocked: userProg?.isUnlocked || false,
            unlockedAt: userProg?.unlockedAt,
            claimed: userProg?.claimed || false,
          };
        });

        setAchievements(merged);
      } catch (error) {
        console.error("Failed to load achievements:", error);
        setAchievements([]);
      }
    };

    loadAchievements();
  }, []);



  if (userLoading) {
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


  // Real data from database only - use stats.level from database, not calculated
  const level = user.stats?.level || 1;  // Use level from database (updated by backend)
  const totalXP = user.stats?.totalXP || user.stats?.xp || 0;  // Use totalXP if available, fallback to xp
  const currentXP = user.stats?.xp || 0;  // Current XP for current level
  const nextLevelXP = user.stats?.nextLevelXP || 100;  // XP needed for next level
  const gold = user.stats?.gold || 0;
  const streak = user.stats?.streak || 0;
  const loginStreak = user.stats?.loginStreak || 0;
  const maxLoginStreak = user.stats?.maxLoginStreak || 0;
  const gems = user.stats?.gems || 0;

  // Calculate XP progress - use database values if available, otherwise calculate
  const levelProgress = nextLevelXP > 0 
    ? { current: currentXP, required: nextLevelXP, percentage: Math.round((currentXP / nextLevelXP) * 100) }
    : getCurrentLevelProgress(totalXP, level);
  const xp = levelProgress.current;
  const maxXP = levelProgress.required;
  const xpProgress = levelProgress.percentage;

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

  // Combat stats (if tracked in user.stats)
  const battlesWon = user.stats?.battlesWon || 0;
  const battlesPlayed = user.stats?.battlesPlayed || 0;
  const monstersDefeated = user.stats?.monstersDefeated || 0;
  const winRate = battlesPlayed > 0 ? Math.round((battlesWon / battlesPlayed) * 100) : 0;

  // Collection stats
  const uniqueItems = user.inventory?.inventory?.items?.length || 0;
  const lootboxesOpened = user.stats?.lootboxesOpened || 0;

  // Achievement stats
  const unlockedAchievements = achievements.filter((a) => a.isUnlocked).length;
  const totalAchievements = achievements.length;
  const achievementProgress = totalAchievements > 0 ? Math.round((unlockedAchievements / totalAchievements) * 100) : 0;

  return (
    <div className={`min-h-screen ${theme.bg} transition-colors duration-300`}>
      <main className="p-8 overflow-y-auto">
        {/* Header */}
        <div className="mb-6">
          <h2 className={`text-3xl font-bold ${theme.text}`}>
            Hero Statistics
          </h2>
          <p className={theme.textMuted}>Track your progress and performance</p>
        </div>

        {/* Top Stats Cards - REAL DATA */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
          {/* Level Card */}
          <div className="bg-purple-600 rounded-xl p-5 text-white">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp size={18} />
              <span className="font-medium">Level</span>
            </div>
            <p className="text-3xl font-bold">{level}</p>
            <p className="text-purple-200 text-sm">Current Level</p>
          </div>

          {/* XP Progress Card */}
          <div className="bg-orange-500 rounded-xl p-5 text-white">
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
          <div className="bg-yellow-500 rounded-xl p-5 text-white">
            <div className="flex items-center gap-2 mb-2">
              <Coins size={18} />
              <span className="font-medium">Gold</span>
            </div>
            <p className="text-3xl font-bold">{gold}</p>
            <p className="text-yellow-200 text-sm">Total Gold</p>
          </div>

          {/* Task Streak Card */}
          <div className="bg-green-600 rounded-xl p-5 text-white">
            <div className="flex items-center gap-2 mb-2">
              <Flame size={18} />
              <span className="font-medium">Task Streak</span>
            </div>
            <p className="text-3xl font-bold">{streak}</p>
            <p className="text-green-200 text-sm">Days Streak</p>
          </div>

          {/* Login Streak Card */}
          <div className="bg-blue-600 rounded-xl p-5 text-white">
            <div className="flex items-center gap-2 mb-2">
              <Zap size={18} />
              <span className="font-medium">Login Streak</span>
            </div>
            <p className="text-3xl font-bold">{loginStreak}</p>
            <p className="text-blue-200 text-sm">Current / {maxLoginStreak} Max</p>
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
                  className={`mb-4 mx-auto ${darkMode ? "text-gray-500" : "text-gray-400"
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
                      className={`h-3 rounded-full overflow-hidden ${darkMode ? "bg-gray-800" : "bg-gray-200"
                        }`}
                    >
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${(completedTasks / totalTasks) * 100}%`,
                          background: `${accentColor}`,
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
                  className={`mb-4 mx-auto ${darkMode ? "text-gray-500" : "text-gray-400"
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

        {/* Combat Statistics, Collection Progress, Achievements - 3 column grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* Combat Statistics */}
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
              <Sword size={20} /> Combat Statistics
            </h3>

            <div className="space-y-4">
              <div
                className="flex justify-between items-center p-3 rounded-lg"
                style={{
                  backgroundColor: darkMode
                    ? "rgba(239, 68, 68, 0.1)"
                    : "rgba(254, 226, 226, 1)",
                }}
              >
                <span className="text-red-500">Battles Won</span>
                <span className="font-bold text-red-500">{battlesWon}</span>
              </div>
              <div
                className="flex justify-between items-center p-3 rounded-lg"
                style={{
                  backgroundColor: darkMode
                    ? "rgba(139, 92, 246, 0.1)"
                    : "rgba(237, 233, 254, 1)",
                }}
              >
                <span className="text-purple-500">Monsters Defeated</span>
                <span className="font-bold text-purple-500">{monstersDefeated}</span>
              </div>
              <div
                className="flex justify-between items-center p-3 rounded-lg"
                style={{
                  backgroundColor: darkMode
                    ? "rgba(34, 197, 94, 0.1)"
                    : "rgba(220, 252, 231, 1)",
                }}
              >
                <span className="text-green-500">Win Rate</span>
                <span className="font-bold text-green-500">{winRate}%</span>
              </div>

              {/* Win rate progress bar */}
              {battlesPlayed > 0 && (
                <div className="mt-4">
                  <div className="flex justify-between text-sm mb-1">
                    <span className={theme.textMuted}>Total Battles</span>
                    <span style={theme.accentText}>{battlesPlayed}</span>
                  </div>
                  <div
                    className={`h-3 rounded-full overflow-hidden ${
                      darkMode ? "bg-gray-800" : "bg-gray-200"
                    }`}
                  >
                    <div
                      className="h-full rounded-full transition-all bg-gradient-to-r from-red-500 to-purple-500"
                      style={{
                        width: `${winRate}%`,
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Collection Progress */}
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
              <Package size={20} /> Collection Progress
            </h3>

            <div className="space-y-4">
              <div
                className="flex justify-between items-center p-3 rounded-lg"
                style={{
                  backgroundColor: darkMode
                    ? "rgba(59, 130, 246, 0.1)"
                    : "rgba(219, 234, 254, 1)",
                }}
              >
                <span className="text-blue-500">Unique Items</span>
                <span className="font-bold text-blue-500">{uniqueItems}</span>
              </div>
              <div
                className="flex justify-between items-center p-3 rounded-lg"
                style={{
                  backgroundColor: darkMode
                    ? "rgba(245, 158, 11, 0.1)"
                    : "rgba(254, 243, 199, 1)",
                }}
              >
                <span className="text-orange-500">Lootboxes Opened</span>
                <span className="font-bold text-orange-500">{lootboxesOpened}</span>
              </div>

              {/* Visual representation */}
              <div className="mt-4 text-center">
                <div
                  className="inline-flex items-center justify-center w-24 h-24 rounded-full"
                  style={{
                    background: `conic-gradient(${accentColor} ${achievementProgress}%, ${darkMode ? '#1f2937' : '#e5e7eb'} 0)`,
                  }}
                >
                  <div
                    className="w-20 h-20 rounded-full flex items-center justify-center"
                    style={{
                      backgroundColor: darkMode ? '#111827' : '#ffffff',
                    }}
                  >
                    <Gift size={32} style={{ color: accentColor }} />
                  </div>
                </div>
                <p className={`${theme.textMuted} text-sm mt-2`}>Collection Growing</p>
              </div>
            </div>
          </div>

          {/* Achievements Overview */}
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
              <Trophy size={20} /> Achievements
            </h3>

            <div className="space-y-4">
              <div
                className="flex justify-between items-center p-3 rounded-lg"
                style={{
                  backgroundColor: darkMode
                    ? "rgba(234, 179, 8, 0.1)"
                    : "rgba(254, 249, 195, 1)",
                }}
              >
                <span className="text-yellow-500">Unlocked</span>
                <span className="font-bold text-yellow-500">
                  {unlockedAchievements}/{totalAchievements}
                </span>
              </div>

              {/* Achievement progress circle */}
              <div className="flex flex-col items-center py-4">
                <div
                  className="relative inline-flex items-center justify-center w-32 h-32 rounded-full"
                  style={{
                    background: `conic-gradient(${accentColor} ${achievementProgress}%, ${darkMode ? '#1f2937' : '#e5e7eb'} 0)`,
                  }}
                >
                  <div
                    className="w-28 h-28 rounded-full flex flex-col items-center justify-center"
                    style={{
                      backgroundColor: darkMode ? '#111827' : '#ffffff',
                    }}
                  >
                    <Trophy size={32} style={{ color: accentColor }} />
                    <p className="text-2xl font-bold mt-1" style={theme.accentText}>
                      {achievementProgress}%
                    </p>
                  </div>
                </div>
                <p className={`${theme.textMuted} text-sm mt-3`}>
                  {totalAchievements - unlockedAchievements} remaining
                </p>
              </div>

              {/* Next achievement hint */}
              {(() => {
                const nextAchievement = achievements.find(
                  (a) => !a.isUnlocked && a.progress > 0
                );
                if (nextAchievement) {
                  return (
                    <div
                      className="p-3 rounded-lg"
                      style={{
                        backgroundColor: darkMode
                          ? "rgba(168, 85, 247, 0.1)"
                          : "rgba(243, 232, 255, 1)",
                      }}
                    >
                      <p className="text-xs text-purple-500 mb-1">Next Achievement</p>
                      <p className={`${theme.text} text-sm font-medium truncate`}>
                        {nextAchievement.title}
                      </p>
                      <div className="mt-2">
                        <div
                          className={`h-2 rounded-full overflow-hidden ${
                            darkMode ? "bg-gray-800" : "bg-gray-200"
                          }`}
                        >
                          <div
                            className="h-full rounded-full bg-purple-500"
                            style={{
                              width: `${Math.min(
                                100,
                                (nextAchievement.progress / nextAchievement.target) * 100
                              )}%`,
                            }}
                          />
                        </div>
                        <p className="text-xs text-purple-500 mt-1">
                          {nextAchievement.progress}/{nextAchievement.target}
                        </p>
                      </div>
                    </div>
                  );
                }
                return null;
              })()}
            </div>
          </div>
        </div>

        {/* Equipment Stats */}
        <div
          className={`${theme.card} rounded-2xl p-6 mb-6`}
          style={{
            ...theme.borderStyle,
            borderWidth: "1px",
            borderStyle: "solid",
          }}
        >
          <h3
            className={`text-xl font-bold ${theme.text} mb-4 flex items-center gap-2`}
          >
            <Shield size={20} /> Equipment Stats
          </h3>

          {(() => {
            const equippedStats = user.inventory?.equippedStats || {};
            const statEntries = Object.entries(equippedStats).filter(
              ([, v]) => v !== undefined && v !== null && Number(v) !== 0
            );

            if (statEntries.length === 0) {
              return (
                <div className="text-center py-8">
                  <Shield
                    size={40}
                    className={`mb-4 mx-auto ${darkMode ? "text-gray-500" : "text-gray-400"}`}
                  />
                  <p className={theme.textMuted}>No equipment equipped</p>
                  <p className={`${theme.textSubtle} text-sm`}>
                    Equip items to see your total stats!
                  </p>
                </div>
              );
            }

            const formatStatValue = (key: string, value: number): string => {
              if (key === 'critChance' || key === 'critDamage' || key === 'goldBonus' || key === 'xpBonus') {
                const scaled = value <= 1 ? value * 100 : value;
                const rounded = Math.round(scaled * 10) / 10;
                return `${rounded}%`;
              }
              return `${value}`;
            };

            const formatStatKey = (key: string): string => {
              const labels: Record<string, string> = {
                hp: "HP",
                attack: "ATK",
                magicAttack: "MAG ATK",
                defense: "DEF",
                magicResist: "MAG RES",
                critChance: "CRIT CH",
                critDamage: "CRIT DMG",
                speed: "SPD",
                goldBonus: "GOLD",
                xpBonus: "XP",
              };
              return labels[key] || key.toUpperCase();
            };

            const statColors: Record<string, string> = {
              attack: "#ef4444",
              magicAttack: "#8b5cf6",
              hp: "#22c55e",
              defense: "#3b82f6",
              magicResist: "#06b6d4",
              speed: "#f59e0b",
              critChance: "#ec4899",
              critDamage: "#f97316",
              goldBonus: "#eab308",
              xpBonus: "#a855f7",
            };

            return (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {statEntries.map(([key, value]) => {
                  const color = statColors[key] || accentColor;
                  return (
                    <div
                      key={key}
                      className="p-4 rounded-xl text-center"
                      style={{
                        backgroundColor: darkMode
                          ? `${color}15`
                          : `${color}10`,
                        borderWidth: "1px",
                        borderStyle: "solid",
                        borderColor: `${color}30`,
                      }}
                    >
                      <p
                        className="text-xs font-medium mb-1"
                        style={{ color }}
                      >
                        {formatStatKey(key)}
                      </p>
                      <p className="text-2xl font-bold" style={{ color }}>
                        {formatStatValue(key, Number(value))}
                      </p>
                    </div>
                  );
                })}
              </div>
            );
          })()}
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
                className={`h-4 rounded-full overflow-hidden ${darkMode ? "bg-gray-800" : "bg-gray-200"
                  }`}
              >
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${xpProgress}%`,
                    background: `${accentColor}`,
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
        className={`h-2 rounded-full overflow-hidden ${darkMode ? "bg-gray-800" : "bg-gray-200"
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
              background: `${accentColor}20`,
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
