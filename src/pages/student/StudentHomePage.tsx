import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useTheme, getThemeClasses } from "@/context/ThemeContext";
import { useRealtimeTasks } from "@/hooks/useRealtimeTasks";
import { useRealtimeUser } from "@/hooks/useRealtimeUser";
import { getLevelFromXP, getCurrentLevelProgress, getXPToNextLevel, formatXP } from "@/utils/xpCurve";
import { 
  TrendingUp, 
  Coins, 
  Flame, 
  Star, 
  Zap, 
  BookOpen, 
  Target, 
  User, 
  AlertTriangle, 
  Loader2, 
  CheckCircle2,
  ChevronRight,
  History
} from "lucide-react";
import { db } from "@/firebase";
import { doc, updateDoc, collection, getDocs, getDoc } from "firebase/firestore";
import type { Task } from "@/models/task.model";
// Note: Task achievement updates are handled by backend in /tasks/{taskId}/complete endpoint
import { UsersAPI } from "@/api/users.api";
import { StaminaBar } from "@/components/StaminaBar";

export default function StudentHomePage() {
  const navigate = useNavigate();
  const { logout, loading } = useAuth(); 
  const { user, loading: userLoading, error: userError } = useRealtimeUser();
  const { tasks, loading: tasksLoading, error: tasksError } = useRealtimeTasks();
  const { darkMode, accentColor } = useTheme();
  const { firebaseUser } = useAuth();

  const [error, setError] = useState<string | null>(null);
  const [completingTaskId, setCompletingTaskId] = useState<string | null>(null);
  const [courseTasks, setCourseTasks] = useState<Task[]>([]);
  const [courseTasksLoading, setCourseTasksLoading] = useState(true);
  const [completedCourseTaskIds, setCompletedCourseTaskIds] = useState<Set<string>>(new Set());
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

  // Load course tasks
  useEffect(() => {
    async function loadCourseTasks() {
      if (!user) {
        setCourseTasks([]);
        setCourseTasksLoading(false);
        return;
      }
      
      try {
        setCourseTasksLoading(true);
        // Get all courses and their modules to load tasks
        const coursesRef = collection(db, "courses");
        const coursesSnapshot = await getDocs(coursesRef);
        
        const allTasks: Task[] = [];
        
        for (const courseDoc of coursesSnapshot.docs) {
          const courseId = courseDoc.id;
          const courseData = courseDoc.data();

          // Check enrollment in two places:
          // 1. Check the students map field on the course document (faster)
          const mapHasUser = courseData.students && Boolean(courseData.students[user.uid]);
          
          // 2. Check the students subcollection (fallback)
          let subcollectionHasUser = false;
          if (!mapHasUser) {
            const enrollmentSnap = await getDoc(doc(db, `courses/${courseId}/students/${user.uid}`));
            subcollectionHasUser = enrollmentSnap.exists();
          }

          // Skip courses where the student is not enrolled
          if (!mapHasUser && !subcollectionHasUser) {
            continue;
          }

          const modulesRef = collection(db, `courses/${courseId}/modules`);
          const modulesSnapshot = await getDocs(modulesRef);
          
          for (const moduleDoc of modulesSnapshot.docs) {
            const moduleId = moduleDoc.id;
            const tasksRef = collection(db, `courses/${courseId}/modules/${moduleId}/tasks`);
            const tasksSnapshot = await getDocs(tasksRef);
            
            tasksSnapshot.docs.forEach(taskDoc => {
              const task = {
                taskId: taskDoc.id,
                courseId,
                moduleId,
                ...taskDoc.data()
              } as Task;
              allTasks.push(task);
            });
          }
        }
        
        console.log(`📚 Loaded ${allTasks.length} course tasks from ${coursesSnapshot.docs.length} courses`);
        setCourseTasks(allTasks);
      } catch (error) {
        console.error("Error loading course tasks:", error);
      } finally {
        setCourseTasksLoading(false);
      }
    }
    
    loadCourseTasks();
  }, [user]);

  // Load completed course task IDs from user's tasks collection
  useEffect(() => {
    async function loadCompletedCourseTasks() {
      if (!firebaseUser) {
        setCompletedCourseTaskIds(new Set());
        return;
      }

      try {
        // Get all completed tasks from user's tasks collection
        const userTasksRef = collection(db, "users", firebaseUser.uid, "tasks");
        const userTasksSnapshot = await getDocs(userTasksRef);
        
        const completedIds = new Set<string>();
        userTasksSnapshot.docs.forEach((doc) => {
          const task = doc.data();
          // Check if it's a completed course task (has courseId, moduleId, and isActive: false or claimedAt)
          if (task.courseId && task.moduleId && (!task.isActive || task.claimedAt)) {
            // Create the same ID format used when storing: `${courseId}_${moduleId}_${taskId}`
            const taskId = task.taskId || doc.id.split('_').slice(2).join('_'); // Extract taskId from doc ID if needed
            const key = `${task.courseId}_${task.moduleId}_${taskId}`;
            completedIds.add(key);
            // Also add just the taskId for matching
            if (task.taskId) {
              completedIds.add(task.taskId);
            }
          }
        });
        
        setCompletedCourseTaskIds(completedIds);
      } catch (error) {
        console.error("Error loading completed course tasks:", error);
      }
    }

    loadCompletedCourseTasks();
  }, [firebaseUser, tasks]); // Re-check when tasks change

  // Calculate tasks by difficulty (all course tasks from enrolled courses)
  const tasksByDifficulty = useMemo(() => {
    const difficultyCounts: Record<string, { total: number; completed: number }> = {
      personal: { total: 0, completed: 0 },
      easy: { total: 0, completed: 0 },
      medium: { total: 0, completed: 0 },
      hard: { total: 0, completed: 0 },
      extreme: { total: 0, completed: 0 },
    };

    // Count total tasks by difficulty from all course tasks
    courseTasks.forEach((task) => {
      const difficulty = (task.difficulty || "personal").toLowerCase();
      if (difficulty in difficultyCounts) {
        difficultyCounts[difficulty].total += 1;
      } else {
        difficultyCounts.personal.total += 1;
      }
    });

    // Count completed course tasks by difficulty from user's tasks collection
    // Only count tasks that have courseId and moduleId (course tasks)
    tasks.forEach((task) => {
      if (task.courseId && task.moduleId) {
        // This is a course task
        const difficulty = (task.difficulty || "personal").toLowerCase();
        if (difficulty in difficultyCounts && (!task.isActive || task.completedAt || task.claimedAt)) {
          difficultyCounts[difficulty].completed += 1;
        }
      }
    });

    // Also check completedCourseTaskIds for course tasks that might not be in tasks collection yet
    courseTasks.forEach((task) => {
      if (task.courseId && task.moduleId) {
        const taskKey = `${task.courseId}_${task.moduleId}_${task.taskId}`;
        const isCompleted = completedCourseTaskIds.has(taskKey) || completedCourseTaskIds.has(task.taskId);
        if (isCompleted) {
          const difficulty = (task.difficulty || "personal").toLowerCase();
          if (difficulty in difficultyCounts) {
            // Only increment if not already counted from tasks collection
            // This prevents double counting
            const alreadyCounted = tasks.some(
              (t) => t.courseId === task.courseId && 
                     t.moduleId === task.moduleId && 
                     t.taskId === task.taskId && 
                     (!t.isActive || t.completedAt || t.claimedAt)
            );
            if (!alreadyCounted) {
              difficultyCounts[difficulty].completed += 1;
            }
          }
        }
      }
    });

    // Debug logging
    console.log('📊 Tasks by Difficulty:', {
      totalCourseTasks: courseTasks.length,
      breakdown: Object.entries(difficultyCounts).map(([difficulty, counts]) => ({
        difficulty,
        total: counts.total,
        completed: counts.completed
      }))
    });

    return difficultyCounts;
  }, [courseTasks, tasks, completedCourseTaskIds]);

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

    // Find the task in either personal tasks or course tasks
    const allTasks = [...tasks, ...courseTasks];
    const task = allTasks.find((t) => t.taskId === taskId);
    
    if (!task) {
      setError("Taak niet gevonden");
      return;
    }

    // If it's a course task, navigate to the course tasks page to submit evidence
    if (task.courseId && task.moduleId) {
      navigate(`/student/courses-tasks?courseId=${task.courseId}&moduleId=${task.moduleId}`);
      return;
    }

    // Handle personal tasks
    setCompletingTaskId(taskId);
    try {
      const taskRef = doc(db, "users", firebaseUser.uid, "tasks", taskId);
      await updateDoc(taskRef, {
        isActive: false, 
        completedAt: Date.now(),
      });
      
      // Note: Task achievement updates are handled by backend in /tasks/{taskId}/complete endpoint
      // No need to update achievements here - backend already does it
      
      setError(null);
    } catch (err) {
      console.error("Failed to mark task as done:", err);
      setError("Kon taak niet als voltooid markeren");
    } finally {
      setCompletingTaskId(null);
    }
  };

  // Filter today's tasks (including both personal tasks and course tasks)
  // Include completed tasks so we can show them with a checkmark
  const todaysTasks = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Combine personal tasks and course tasks
    const allTasks = [...tasks, ...courseTasks];

    return allTasks.filter((task) => {
      // Include tasks that are due today (both completed and incomplete)
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
  }, [tasks, courseTasks]);

  if (loading || userLoading || courseTasksLoading) {
    return (
      <div className={`min-h-screen ${theme.bg} flex items-center justify-center transition-colors duration-300`}>
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="animate-spin" size={32} style={theme.accentText} />
          <div className="text-xl font-medium" style={theme.accentText}>
            Dashboard laden...
          </div>
        </div>
      </div>
    );
  }

  if (!user) return null;

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
          <div className={`border-l-4 p-4 mb-6 rounded flex items-start gap-3 ${darkMode ? "bg-yellow-900/30 border-yellow-600" : "bg-yellow-100 border-yellow-500"}`}>
            <AlertTriangle className={darkMode ? "text-yellow-200" : "text-yellow-800"} size={20} />
            <div>
              <p className={`font-semibold ${darkMode ? "text-yellow-200" : "text-yellow-800"}`}>
                Waarschuwing
              </p>
              <p className={darkMode ? "text-yellow-100" : "text-yellow-700"}>
                {error || userError || tasksError}
              </p>
            </div>
          </div>
        )}

        {/* STATS CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
          <div className={`rounded-xl p-5 ${theme.card} border ${theme.border}`}>
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp size={18} style={theme.accentText} />
              <span className={`font-medium ${theme.text}`}>Level</span>
            </div>
            <p className="text-3xl font-bold" style={theme.accentText}>{level}</p>
          </div>

          <div className={`rounded-xl p-5 ${theme.card} border ${theme.border}`}>
            <div className="flex items-center gap-2 mb-2">
              <Zap size={18} style={theme.accentText} />
              <span className={`font-medium ${theme.text}`}>Experience</span>
            </div>
            <p className="text-3xl font-bold" style={theme.accentText}>{currentXP}</p>
            <div className={`w-full rounded-full h-2 overflow-hidden mt-3 ${darkMode ? "bg-gray-700" : "bg-violet-200"}`}>
              <div className="h-full transition-all duration-300" style={{ width: `${levelProgress.percentage}%`, backgroundColor: accentColor }} />
            </div>
            <p className={`text-xs ${theme.textMuted} mt-2`}>
              Nog <span className="font-semibold" style={theme.accentText}>{formatXP(xpToNextLevel)} XP</span> tot level {level + 1}
            </p>
          </div>

          <div className={`rounded-xl p-5 ${theme.card} border ${theme.border}`}>
            <div className="flex items-center gap-2 mb-2">
              <Coins size={18} style={theme.accentText} />
              <span className={`font-medium ${theme.text}`}>Goud</span>
            </div>
            <p className="text-3xl font-bold" style={theme.accentText}>{user.stats.gold}</p>
          </div>

          <div className={`rounded-xl p-5 ${theme.card} border ${theme.border}`}>
            <div className="flex items-center gap-2 mb-2">
              <Flame size={18} style={theme.accentText} />
              <span className={`font-medium ${theme.text}`}>Focus Streak</span>
            </div>
            <p className="text-3xl font-bold" style={theme.accentText}>{user.stats.streak || 0}</p>
            <p className={`text-xs ${theme.textMuted} mt-1`}>Huidige streak</p>
          </div>

          <div className={`rounded-xl p-5 ${theme.card} border ${theme.border}`}>
            <div className="flex items-center gap-2 mb-2">
              <Star size={18} style={theme.accentText} />
              <span className={`font-medium ${theme.text}`}>Login Streak</span>
            </div>
            <p className="text-3xl font-bold" style={theme.accentText}>{user.stats.loginStreak || 0}</p>
            <p className={`text-xs ${theme.textMuted} mt-1`}>Record</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <div className={`rounded-xl p-6 ${theme.card} border ${theme.border}`}>
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <BookOpen size={24} style={theme.accentText} />
                  <h2 className={`text-2xl font-bold ${theme.text}`}>Taken vandaag</h2>
                </div>
                <button 
                  onClick={() => navigate("/student/calendar")} 
                  className="text-sm font-semibold px-4 py-2 rounded flex items-center gap-1 transition" 
                  style={theme.accentText}
                >
                  Alles zien <ChevronRight size={16} />
                </button>
              </div>

              {(tasksLoading || courseTasksLoading) && todaysTasks.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <Loader2 className="animate-spin mb-2 opacity-50" size={24} />
                  <p className={theme.textMuted}>Taken laden...</p>
                </div>
              ) : todaysTasks.length === 0 ? (
                <div className={`flex flex-col items-center justify-center py-12 rounded-lg ${theme.hoverAccent}`}>
                  <CheckCircle2 size={48} className="mb-2 opacity-20" style={theme.accentText} />
                  <p className={`font-semibold ${theme.text}`}>Geen taken voor vandaag</p>
                  <p className={`text-sm ${theme.textMuted} mt-1`}>Je bent vrij om te genieten!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {todaysTasks.map((task: Task) => {
                    // Check if task is completed
                    // For personal tasks: check isActive and completedAt
                    // For course tasks: check if they exist in user's tasks collection with isActive: false or claimedAt
                    let isCompleted = false;
                    if (task.courseId && task.moduleId) {
                      // Course task: check if it's in completedCourseTaskIds
                      const taskKey = `${task.courseId}_${task.moduleId}_${task.taskId}`;
                      isCompleted = completedCourseTaskIds.has(taskKey) || completedCourseTaskIds.has(task.taskId);
                    } else {
                      // Personal task: check isActive and completedAt
                      isCompleted = !task.isActive || (task.completedAt !== null && task.completedAt !== undefined);
                    }
                    return (
                      <div key={task.taskId} className={`rounded-lg p-4 border ${theme.border} ${theme.hoverAccent} transition ${isCompleted ? 'opacity-75' : ''}`}>
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              {isCompleted && (
                                <CheckCircle2 
                                  size={20} 
                                  className="flex-shrink-0" 
                                  style={{ color: '#22c55e' }}
                                />
                              )}
                              <h3 className={`font-semibold text-lg ${theme.text} ${isCompleted ? 'line-through' : ''}`}>
                                {task.title}
                              </h3>
                            </div>
                            {task.description && <p className={`text-sm ${theme.textMuted} mt-1`}>{task.description}</p>}
                            <div className="flex items-center gap-3 mt-3 flex-wrap">
                              {(task.courseId || task.moduleId) && (
                                <>
                                  <span className={`text-xs px-2 py-1 rounded-full border`} style={{ backgroundColor: `${accentColor}20`, borderColor: `${accentColor}40`, color: accentColor }}>
                                    {task.difficulty}
                                  </span>
                                  <span className="text-xs font-semibold" style={{ color: accentColor }}>+{task.xp} XP</span>
                                  <span className={`text-xs font-semibold flex items-center gap-1 ${theme.textMuted}`}>
                                    +{task.gold} <Coins size={12} />
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                          {!isCompleted ? (
                            <button 
                              onClick={() => handleMarkAsDone(task.taskId)} 
                              disabled={completingTaskId === task.taskId} 
                              className="px-4 py-2 rounded-lg text-sm font-semibold transition whitespace-nowrap text-white disabled:opacity-50" 
                              style={{ backgroundColor: accentColor }}
                            >
                              {completingTaskId === task.taskId ? "Bezig..." : "Mark as Done"}
                            </button>
                          ) : (
                            <div className="px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap flex items-center gap-2" style={{ color: '#22c55e', backgroundColor: 'rgba(34, 197, 94, 0.1)' }}>
                              <CheckCircle2 size={16} />
                              Voltooid
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-6">
            <div className={`rounded-xl p-5 ${theme.card} border ${theme.border}`}>
              <div className="flex items-center gap-2 mb-4">
                <Star size={20} style={theme.accentText} />
                <p className={`font-semibold ${theme.text}`}>Statistieken</p>
              </div>
              <div className="space-y-3 text-sm">
                <div className={`flex justify-between items-center pb-3 border-b ${theme.border}`}>
                  <span className={theme.textMuted}>Totale Taken</span>
                  <span className={`font-semibold ${theme.text}`}>{tasks.length}</span>
                </div>
                <div className={`flex justify-between items-center pb-3 border-b ${theme.border}`}>
                  <span className={theme.textMuted}>Focus Vandaag</span>
                  <div className="text-right">
                    <span className="block font-semibold" style={theme.accentText}>
                      {user.stats.todaysSessions || 0} sessies
                    </span>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className={theme.textMuted}>Beste Streak</span>
                  <span className="font-semibold" style={theme.accentText}>{user.stats.maxStreak || 0} dagen</span>
                </div>
              </div>
            </div>

            <div className={`rounded-xl p-5 ${theme.card} border ${theme.border}`}>
              <div className="flex items-center gap-2 mb-3">
                <History size={20} style={theme.accentText} />
                <p className={`font-semibold ${theme.text}`}>Totaal Focus</p>
              </div>
              <p className="text-3xl font-bold" style={theme.accentText}>
                {user.stats.totalSessions || 0} <span className="text-sm font-normal">sessies</span>
              </p>
              <p className={`text-xs ${theme.textMuted} mt-2`}>
                Totaal {(() => {
                  const totalSecs = user.stats.totalFocusSeconds || 0;
                  const hours = Math.floor(totalSecs / 3600);
                  const mins = Math.floor((totalSecs % 3600) / 60);
                  return hours > 0 ? `${hours} uur en ${mins} min` : `${mins} minuten`;
                })()} geconcentreerd
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}