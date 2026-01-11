import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useTheme, getThemeClasses } from "@/context/ThemeContext";
import { useRealtimeTasks } from "@/hooks/useRealtimeTasks";
import { useRealtimeUser } from "@/hooks/useRealtimeUser";
import { getLevelFromXP, getCurrentLevelProgress, getXPToNextLevel, formatXP } from "@/utils/xpCurve";
import { TrendingUp, Coins, Flame, Star, Zap, BookOpen, Target } from "lucide-react";
import { db } from "@/firebase";
import { doc, updateDoc } from "firebase/firestore";
import type { Task } from "@/models/task.model";
import { onTaskCompleted } from "@/services/achievement.service";
import { UsersAPI } from "@/api/users.api";
import { StaminaBar } from "@/components/StaminaBar";

export default function StudentHomePage() {
  const navigate = useNavigate();
  const { logout, loading: authLoading } = useAuth();
  const { user, loading: userLoading, error: userError } = useRealtimeUser();
  const { tasks, loading: tasksLoading, error: tasksError } = useRealtimeTasks();
  const { darkMode, accentColor } = useTheme();
  const { firebaseUser } = useAuth();

  const [error, setError] = useState<string | null>(null);
  const [completingTaskId, setCompletingTaskId] = useState<string | null>(null);
  const theme = getThemeClasses(darkMode, accentColor);
  
  // Stamina state
  const [staminaData, setStaminaData] = useState<{
    currentStamina: number;
    maxStamina: number;
    nextRegenIn: number;
  } | null>(null);

  // Fetch stamina data
  useEffect(() => {
    const fetchStamina = async () => {
      if (!user) return;
      
      try {
        const data = await UsersAPI.getStamina(user.uid);
        setStaminaData({
          currentStamina: data.currentStamina,
          maxStamina: data.maxStamina,
          nextRegenIn: data.nextRegenIn,
        });
      } catch (err) {
        console.warn("Failed to fetch stamina:", err);
      }
    };

    fetchStamina();
    // Update stamina every 60 seconds
    const interval = setInterval(fetchStamina, 60000);
    return () => clearInterval(interval);
  }, [user]);

  // Calculate level and XP progress
  const level = user?.stats?.level || 1;
  const currentXP = user?.stats?.xp || 0;
  const nextLevelXP = user?.stats?.nextLevelXP || 100;
  const totalXP = user?.stats?.totalXP || currentXP;
  
  const levelProgress = {
    percentage: nextLevelXP > 0 ? Math.round((currentXP / nextLevelXP) * 100) : 0,
    current: currentXP,
    required: nextLevelXP
  };
  
  const xpToNextLevel = Math.max(0, nextLevelXP - currentXP);

  // Mark task as done
  const handleMarkAsDone = async (taskId: string) => {
    if (!firebaseUser) {
      setError("Je moet ingelogd zijn");
      return;
    }

    setCompletingTaskId(taskId);
    try {
      const taskRef = doc(db, "users", firebaseUser.uid, "tasks", taskId);
      await updateDoc(taskRef, {
        isActive: false, // Mark as completed
        completedAt: Date.now(),
      });
      
      // Count completed tasks (including the one we just marked as done)
      const currentlyCompleted = tasks.filter((t) => !t.isActive).length;
      const completedTasks = currentlyCompleted + 1; // +1 for the task we just completed
      await onTaskCompleted(completedTasks);
      
      setError(null);
    } catch (err) {
      console.error("Failed to mark task as done:", err);
      setError("Kon taak niet als voltooid markeren");
    } finally {
      setCompletingTaskId(null);
    }
  };

  // Filter today's tasks
  const todaysTasks = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return tasks.filter((task) => {
      if (task.completedAt) return false; // Don't show completed tasks

      if (task.dueAt) {
        const dueDate = new Date(task.dueAt);
        dueDate.setHours(0, 0, 0, 0);
        return dueDate.getTime() === today.getTime();
      }

      if (task.date) {
        const taskDate = new Date(task.date);
        taskDate.setHours(0, 0, 0, 0);
        return taskDate.getTime() === today.getTime();
      }

      return false;
    });
  }, [tasks]);

  if (authLoading || userLoading) {
    return (
      <div
        className={`min-h-screen ${theme.bg} flex items-center justify-center transition-colors duration-300`}
      >
        <div className="text-xl animate-pulse" style={theme.accentText}>
          Dashboard laden...
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
        <div className="mb-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h2 className={`text-3xl font-bold ${theme.text}`}>
                Welkom, {user.displayName}! 👋
              </h2>
              <p className={theme.textMuted}>Hier is je dagelijkse overzicht</p>
            </div>
            {staminaData && (
              <div className="flex-shrink-0" style={{ minWidth: '300px' }}>
                <StaminaBar
                  currentStamina={staminaData.currentStamina}
                  maxStamina={staminaData.maxStamina}
                  nextRegenIn={staminaData.nextRegenIn}
                  showTimer={true}
                  size="medium"
                />
              </div>
            )}
          </div>
        </div>

        {/* ERROR MESSAGE */}
        {(error || userError || tasksError) && (
          <div
            className={`border-l-4 p-4 mb-6 rounded ${
              darkMode ? "bg-yellow-900/30 border-yellow-600" : "bg-yellow-100 border-yellow-500"
            }`}
          >
            <p
              className={`font-semibold ${
                darkMode ? "text-yellow-200" : "text-yellow-800"
              }`}
            >
              ⚠️ Waarschuwing
            </p>
            <p className={darkMode ? "text-yellow-100" : "text-yellow-700"}>
              {error || userError || tasksError}
            </p>
          </div>
        )}

        {/* STATS CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
          {/* Level Card */}
          <div className={`rounded-xl p-5 ${theme.card} border ${theme.border}`}>
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp size={18} style={theme.accentText} />
              <span className={`font-medium ${theme.text}`}>Level</span>
            </div>
            <p className="text-3xl font-bold" style={theme.accentText}>
              {level}
            </p>
          </div>

          {/* XP Card */}
          <div className={`rounded-xl p-5 ${theme.card} border ${theme.border}`}>
            <div className="flex items-center gap-2 mb-2">
              <Zap size={18} style={theme.accentText} />
              <span className={`font-medium ${theme.text}`}>Experience</span>
            </div>
            <p className="text-3xl font-bold" style={theme.accentText}>
              {currentXP}
            </p>
            <div
              className={`w-full rounded-full h-2 overflow-hidden mt-3 ${
                darkMode ? "bg-gray-700" : "bg-violet-200"
              }`}
            >
              <div
                className={`h-full transition-all duration-300`}
                style={{
                  width: `${levelProgress.percentage}%`,
                  backgroundColor: accentColor,
                }}
              />
            </div>
            <p className={`text-xs ${theme.textMuted} mt-2`}>
              Nog <span className="font-semibold" style={theme.accentText}>
                {formatXP(xpToNextLevel)} XP
              </span> tot level {level + 1}
            </p>
          </div>

          {/* Gold Card */}
          <div className={`rounded-xl p-5 ${theme.card} border ${theme.border}`}>
            <div className="flex items-center gap-2 mb-2">
              <Coins size={18} style={theme.accentText} />
              <span className={`font-medium ${theme.text}`}>Goud</span>
            </div>
            <p className="text-3xl font-bold" style={theme.accentText}>
              {user.stats.gold}
            </p>
          </div>

          {/* Pomodoro Streak Card */}
          <div className={`rounded-xl p-5 ${theme.card} border ${theme.border}`}>
            <div className="flex items-center gap-2 mb-2">
              <Flame size={18} style={theme.accentText} />
              <span className={`font-medium ${theme.text}`}>Pomodoro Streak</span>
            </div>
            <p className="text-3xl font-bold" style={theme.accentText}>
              {user.stats.pomodoroStreak || 0}
            </p>
          </div>

          {/* Login Streak Card */}
          <div className={`rounded-xl p-5 ${theme.card} border ${theme.border}`}>
            <div className="flex items-center gap-2 mb-2">
              <Star size={18} style={theme.accentText} />
              <span className={`font-medium ${theme.text}`}>Inlog streak</span>
            </div>
            <p className="text-3xl font-bold" style={theme.accentText}>
              {user.stats.loginStreak || 0}
            </p>
          </div>
        </div>

        {/* MAIN CONTENT - Tasks and Sidebar */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* TODAY'S TASKS */}
          <div className="lg:col-span-2">
            <div className={`rounded-xl p-6 ${theme.card} border ${theme.border}`}>
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <BookOpen size={24} style={theme.accentText} />
                  <h2 className={`text-2xl font-bold ${theme.text}`}>
                    Taken vandaag
                  </h2>
                  {tasksLoading && (
                    <span className={`text-sm ${theme.textMuted}`}>🔄</span>
                  )}
                </div>
                <button
                  onClick={() => navigate("/student/calendar")}
                  className={`text-sm font-semibold px-4 py-2 rounded transition`}
                  style={theme.accentText}
                >
                  Alles zien →
                </button>
              </div>

              {tasksLoading && todaysTasks.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <p className={theme.textMuted}>Taken laden...</p>
                  <div className="animate-spin text-2xl mt-2">⏳</div>
                </div>
              ) : todaysTasks.length === 0 ? (
                <div
                  className={`flex flex-col items-center justify-center py-12 rounded-lg ${theme.hoverAccent}`}
                >
                  <p className="text-3xl mb-2">🎉</p>
                  <p className={`font-semibold ${theme.text}`}>
                    Geen taken voor vandaag
                  </p>
                  <p className={`text-sm ${theme.textMuted} mt-1`}>
                    Je bent vrij om te genieten!
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {todaysTasks.map((task: Task) => (
                    <div
                      key={task.taskId}
                      className={`rounded-lg p-4 border ${theme.border} ${theme.hoverAccent} transition`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <h3 className={`font-semibold text-lg ${theme.text}`}>
                            {task.title}
                          </h3>
                          {task.description && (
                            <p className={`text-sm ${theme.textMuted} mt-1`}>
                              {task.description}
                            </p>
                          )}
                          <div className="flex items-center gap-3 mt-3 flex-wrap">
                            {/* Only show difficulty and rewards for course tasks */}
                            {(task.courseId || task.moduleId) && (
                              <>
                                <span
                                  className={`text-xs px-2 py-1 rounded-full border`}
                                  style={{
                                    backgroundColor: `${accentColor}20`,
                                    borderColor: `${accentColor}40`,
                                    color: accentColor,
                                  }}
                                >
                                  {task.difficulty}
                                </span>
                                <span
                                  className="text-xs font-semibold"
                                  style={{ color: accentColor }}
                                >
                                  +{task.xp} XP
                                </span>
                                <span className={`text-xs font-semibold ${theme.textMuted}`}>
                                  +{task.gold} 🪙
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={() => handleMarkAsDone(task.taskId)}
                          disabled={completingTaskId === task.taskId}
                          className="px-4 py-2 rounded-lg text-sm font-semibold transition whitespace-nowrap text-white disabled:opacity-50"
                          style={{ backgroundColor: accentColor }}
                        >
                          {completingTaskId === task.taskId ? "Bezig..." : "Mark as Done"}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* SIDEBAR */}
          <div className="space-y-6">
            {/* Quick Stats */}
            <div className={`rounded-xl p-5 ${theme.card} border ${theme.border}`}>
              <div className="flex items-center gap-2 mb-4">
                <Star size={20} style={theme.accentText} />
                <p className={`font-semibold ${theme.text}`}>Statistieken</p>
              </div>
              <div className={`space-y-3 text-sm`}>
                <div className={`flex justify-between items-center pb-3 border-b ${theme.border}`}>
                  <span className={theme.textMuted}>Totale Taken</span>
                  <span className={`font-semibold ${theme.text}`}>
                    {tasks.length}
                  </span>
                </div>
                <div className={`flex justify-between items-center pb-3 border-b ${theme.border}`}>
                  <span className={theme.textMuted}>Vandaag Restant</span>
                  <span className="font-semibold" style={theme.accentText}>
                    {todaysTasks.length}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className={theme.textMuted}>Max Pomodoro Streak</span>
                  <span className="font-semibold" style={theme.accentText}>
                    {user.stats.maxPomodoroStreak || 0}
                  </span>
                </div>
              </div>
            </div>

            {/* Focus Sessions */}
            <div className={`rounded-xl p-5 ${theme.card} border ${theme.border}`}>
              <div className="flex items-center gap-2 mb-3">
                <Target size={20} style={theme.accentText} />
                <p className={`font-semibold ${theme.text}`}>Focus Sessions</p>
              </div>
              <p className="text-3xl font-bold" style={theme.accentText}>
                {user.stats.focusSessionsCompleted || 0}
              </p>
              <p className={`text-xs ${theme.textMuted} mt-2`}>
                Pomodoro sessies voltooid
              </p>
            </div>

          </div>
        </div>
      </main>
    </div>
  );
}
