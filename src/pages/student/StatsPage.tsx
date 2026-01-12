import { useRealtimeUser } from "@/hooks/useRealtimeUser";
import { useRealtimeTasks } from "@/hooks/useRealtimeTasks";
import { useRealtimeAchievements } from "@/hooks/useRealtimeAchievements";
import { useTheme, getThemeClasses } from "@/context/ThemeContext";
import { getCurrentLevelProgress, getXPForLevel, getXPToNextLevel, getLevelFromXP } from "@/utils/xpCurve";
import { useState, useEffect, useMemo } from "react";
import { db } from "@/firebase";
import { doc, getDoc, collection, getDocs, query, where } from "firebase/firestore";
import type { Task } from "@/models/task.model";
import { StaminaBar } from "@/components/StaminaBar";
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
  const { achievements, loading: achievementsLoading } = useRealtimeAchievements();
  const { darkMode, accentColor } = useTheme();
  const [equippedStats, setEquippedStats] = useState<Record<string, number>>({});
  const [totalAvailableItems, setTotalAvailableItems] = useState<number>(0);
  const [courseTasks, setCourseTasks] = useState<Task[]>([]);
  const [completedCourseTaskIds, setCompletedCourseTaskIds] = useState<Set<string>>(new Set());
  const [staminaConfig, setStaminaConfig] = useState<{
    maxStamina: number;
    regenRateMinutes: number;
  } | null>(null);

  // Get theme classes
  const theme = getThemeClasses(darkMode, accentColor);

  // ============ 1. STAMINA: Read from Firestore (user.stats) ============
  // ⚠️ IMPORTANT: This stamina calculation is UI-ONLY and NOT authoritative.
  // 
  // The backend (POST /combat/start, GET /users/:uid/stamina) is the source of truth
  // for all stamina checks and business logic decisions.
  //
  // This frontend calculation is used ONLY for:
  // - Display purposes (progress bars, timers, visual feedback)
  // - Optimistic UI updates (greyed-out buttons, countdown timers)
  //
  // DO NOT use this calculated value for:
  // - Battle eligibility checks (use API: UsersAPI.getStamina())
  // - Stamina consumption decisions (backend handles this)
  // - Any business logic that affects game state
  //
  // The backend will always validate and recalculate stamina on every request.

  useEffect(() => {
    // Fetch gameConfig for regeneration rate (used for UI display only)
    const fetchStaminaConfig = async () => {
      try {
        const configDoc = await getDoc(doc(db, "gameConfig", "main"));
        if (configDoc.exists()) {
          const config = configDoc.data();
          const staminaConfig = config.stamina || {};
          const maxStamina = staminaConfig.max || 100;
          const regenPerHour = staminaConfig.regenPerHour || 10;
          const regenRateMinutes = regenPerHour > 0 ? 60 / regenPerHour : 5;
          
          setStaminaConfig({ maxStamina, regenRateMinutes });
        } else {
          // Defaults if config doesn't exist
          setStaminaConfig({ maxStamina: 100, regenRateMinutes: 5 });
        }
      } catch (err) {
        console.warn("Failed to fetch stamina config:", err);
        setStaminaConfig({ maxStamina: 100, regenRateMinutes: 5 });
      }
    };

    fetchStaminaConfig();
  }, []);

  // Calculate visual stamina for UI display only (NOT authoritative)
  // This mirrors the backend calculation for consistent UI, but backend is source of truth
  const calculateStaminaData = () => {
    if (!user?.stats || !staminaConfig) return null;

    const currentStamina = user.stats.stamina ?? staminaConfig.maxStamina;
    const maxStamina = user.stats.maxStamina ?? staminaConfig.maxStamina;
    const lastRegen = user.stats.lastStaminaRegen;

    // Calculate regeneration (same logic as backend, but for display only)
    const now = Date.now();
    // Clamp lastRegen to prevent negative values or future timestamps (defensive)
    const safeLastRegen = lastRegen ? Math.min(lastRegen, now) : now;
    const minutesPassed = (now - safeLastRegen) / 60000;
    const pointsToAdd = Math.floor(minutesPassed / staminaConfig.regenRateMinutes);
    
    const newStamina = Math.min(maxStamina, Math.max(0, currentStamina + pointsToAdd));
    const newLastRegen = safeLastRegen + (pointsToAdd * staminaConfig.regenRateMinutes * 60000);

    // Calculate time until next regeneration (for countdown timer display)
    const minutesUntilNext = staminaConfig.regenRateMinutes - ((now - newLastRegen) / 60000) % staminaConfig.regenRateMinutes;
    const nextRegenIn = Math.ceil(minutesUntilNext * 60000);

    return {
      currentStamina: newStamina,
      maxStamina,
      nextRegenIn,
    };
  };

  // Visual stamina data (UI-only, not authoritative)
  const staminaData = calculateStaminaData();

  // ============ 2. TOTAL STATS: Read from Firestore (user.stats.totalStats) ============
  // Read directly from user.stats.totalStats (updated by backend when items are equipped/unequipped)
  useEffect(() => {
    const totals = user?.stats?.totalStats;
    if (totals && Object.keys(totals).length > 0) {
      setEquippedStats(totals);
    } else {
      setEquippedStats({});
    }
  }, [user?.stats?.totalStats]);

  // ============ 3. TOTAL AVAILABLE ITEMS: Read from Firestore collections ============
  // Read directly from Firestore item collections
  useEffect(() => {
    const fetchTotalItems = async () => {
      try {
        const collections = [
          "items_weapons",
          "items_armor",
          "items_arcane",
          "items_pets",
          "items_accessories"
        ];
        
        let totalCount = 0;
        const allItemIds = new Set<string>(); // Track unique item IDs across collections
        
        for (const collectionName of collections) {
          try {
            // Read directly from Firestore
            // Note: Items use "isActive" field, not "active"
            // Filter for active items (isActive !== false, meaning true or undefined)
            const itemsRef = collection(db, collectionName);
            const snapshot = await getDocs(itemsRef);
            
            snapshot.docs.forEach((doc) => {
              const item = doc.data();
              // Only count active items (isActive !== false)
              if (item.isActive === false) return;
              
              const itemId = item.itemId || doc.id;
              if (itemId && !allItemIds.has(itemId)) {
                allItemIds.add(itemId);
                totalCount++;
              }
            });
          } catch (err) {
            console.warn(`Failed to fetch items from ${collectionName}:`, err);
          }
        }
        
        console.log(`📦 [StatsPage] Total available items: ${totalCount}`);
        setTotalAvailableItems(totalCount);
      } catch (err) {
        console.error("Failed to fetch total available items:", err);
        setTotalAvailableItems(0);
      }
    };

    fetchTotalItems();
  }, []);

  // Load course tasks
  useEffect(() => {
    async function loadCourseTasks() {
      if (!user) {
        setCourseTasks([]);
        return;
      }
      
      try {
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
        
        console.log(`📚 [StatsPage] Loaded ${allTasks.length} course tasks from ${coursesSnapshot.docs.length} courses`);
        setCourseTasks(allTasks);
      } catch (error) {
        console.error("Error loading course tasks:", error);
      }
    }
    
    loadCourseTasks();
  }, [user]);

  // Load completed course task IDs from user's tasks collection
  useEffect(() => {
    async function loadCompletedCourseTasks() {
      if (!user) {
        setCompletedCourseTaskIds(new Set());
        return;
      }

      try {
        // Get all completed tasks from user's tasks collection
        const userTasksRef = collection(db, "users", user.uid, "tasks");
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
  }, [user, tasks]); // Re-check when tasks change

  // Calculate tasks by difficulty (including course tasks) - MUST be before early returns
  const tasksByDifficulty = useMemo(() => {
    // Handle case when user or data is not loaded yet
    if (!user || !tasks || !courseTasks) {
      return {
        personal: { total: 0, completed: 0 },
        easy: { total: 0, completed: 0 },
        medium: { total: 0, completed: 0 },
        hard: { total: 0, completed: 0 },
        extreme: { total: 0, completed: 0 },
      };
    }
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
      } else {
        // Personal task (no courseId/moduleId)
        const difficulty = (task.difficulty || "personal").toLowerCase();
        if (difficulty in difficultyCounts) {
          difficultyCounts[difficulty].total += 1;
          if (!task.isActive || task.completedAt) {
            difficultyCounts[difficulty].completed += 1;
          }
        } else {
          difficultyCounts.personal.total += 1;
          if (!task.isActive || task.completedAt) {
            difficultyCounts.personal.completed += 1;
          }
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

    console.log('📊 [StatsPage] Tasks by Difficulty:', {
      totalCourseTasks: courseTasks.length,
      breakdown: Object.entries(difficultyCounts).map(([difficulty, counts]) => ({
        difficulty,
        total: counts.total,
        completed: counts.completed
      }))
    });

    return difficultyCounts;
  }, [courseTasks, tasks, completedCourseTaskIds, user]);

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

  // Real task data from database (personal tasks only for display)
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => !t.isActive).length;
  const activeTasks = tasks.filter((t) => t.isActive).length;

  // Tasks by difficulty (including course tasks)
  const easyTasks = tasksByDifficulty.easy.total;
  const mediumTasks = tasksByDifficulty.medium.total;
  const hardTasks = tasksByDifficulty.hard.total;
  const extremeTasks = tasksByDifficulty.extreme.total;
  const personalTasks = tasksByDifficulty.personal.total;

  // Completed tasks by difficulty (including course tasks)
  const completedEasy = tasksByDifficulty.easy.completed;
  const completedMedium = tasksByDifficulty.medium.completed;
  const completedHard = tasksByDifficulty.hard.completed;
  const completedExtreme = tasksByDifficulty.extreme.completed;
  const completedPersonal = tasksByDifficulty.personal.completed;

  // Combat stats (if tracked in user.stats or user.progression)
  const battlesWon = user.stats?.battlesWon || 0;
  const battlesPlayed = user.stats?.battlesPlayed || 0;
  const monstersDefeated = user.progression?.monstersDefeated || user.stats?.monstersDefeated || 0;
  // Calculate win rate, cap at 100% to handle data inconsistencies
  const winRate = battlesPlayed > 0 
    ? Math.min(100, Math.round((Math.min(battlesWon, battlesPlayed) / battlesPlayed) * 100))
    : 0;

  // Collection stats
  // Count unique items by itemId (same logic as totalAvailableItems)
  const uniqueItems = (() => {
    const items = user.inventory?.inventory?.items || [];
    const uniqueItemIds = new Set<string>();
    items.forEach((item: any) => {
      const itemId = item?.itemId;
      if (itemId) {
        uniqueItemIds.add(itemId);
      }
    });
    const count = uniqueItemIds.size;
    console.log(`📦 [StatsPage] Unique items in inventory: ${count}`, { items: items.length, uniqueIds: Array.from(uniqueItemIds) });
    return count;
  })();
  const lootboxesOpened = user.stats?.lootboxesOpened || 0;
  
  // Calculate collection progress (unique items collected / total available unique items)
  const collectionProgress = totalAvailableItems > 0 
    ? Math.round((uniqueItems / totalAvailableItems) * 100)
    : 0;
  
  console.log(`📦 [StatsPage] Collection progress: ${uniqueItems}/${totalAvailableItems} = ${collectionProgress}%`);

  // Achievement stats
  const unlockedAchievements = achievements.filter((a) => a.isUnlocked).length;
  const totalAchievements = achievements.length;
  const achievementProgress = totalAchievements > 0 ? Math.round((unlockedAchievements / totalAchievements) * 100) : 0;

  return (
    <div className={`min-h-screen ${theme.bg} transition-colors duration-300`}>
      <main className="p-8 overflow-y-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h2 className={`text-3xl font-bold ${theme.text}`}>
                Hero Statistics
              </h2>
              <p className={theme.textMuted}>Track your progress and performance</p>
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
              {xp} / {maxXP}
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
                  label="Personal"
                  total={personalTasks}
                  completed={completedPersonal}
                  color="#3b82f6"
                  darkMode={darkMode}
                  theme={theme}
                />
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
                        width: `${Math.min(100, winRate)}%`,
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
                    background: `conic-gradient(${accentColor} ${collectionProgress}%, ${darkMode ? '#1f2937' : '#e5e7eb'} 0)`,
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
                <p className={`${theme.textMuted} text-sm mt-2`}>
                  {totalAvailableItems > 0 
                    ? `${uniqueItems}/${totalAvailableItems} Items`
                    : totalAvailableItems === 0 && uniqueItems === 0
                    ? "Loading..."
                    : `${uniqueItems} Items Collected`}
                </p>
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
                // Check if all achievements are unlocked
                const allUnlocked = achievements.length > 0 && achievements.every((a) => a.isUnlocked);
                
                if (allUnlocked) {
                  // Show congratulatory message when all achievements are unlocked
                  const studentName = user?.displayName || "Hero";
                  return (
                    <div
                      className="p-3 rounded-lg"
                      style={{
                        backgroundColor: darkMode
                          ? "rgba(34, 197, 94, 0.1)"
                          : "rgba(220, 252, 231, 1)",
                      }}
                    >
                      <p className="text-xs text-green-500 mb-1">🎉 All Achievements Unlocked!</p>
                      <p className={`${theme.text} text-sm font-medium`}>
                        Well done {studentName}, more Achievements coming soon!
                      </p>
                    </div>
                  );
                }
                
                // Find unlocked achievements with progress, sorted by completion percentage (closest first)
                const unlockedWithProgress = achievements
                  .filter((a) => !a.isUnlocked && a.progress > 0)
                  .sort((a, b) => {
                    // Sort by completion percentage (highest first = closest to completion)
                    const aPercent = (a.progress / a.target) * 100;
                    const bPercent = (b.progress / b.target) * 100;
                    return bPercent - aPercent;
                  });
                
                // If no achievements with progress, show the first unlocked achievement
                const nextAchievement = unlockedWithProgress.length > 0
                  ? unlockedWithProgress[0] // Closest to completion
                  : achievements.find((a) => !a.isUnlocked); // First unlocked achievement
                
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

        {/* Total Stats Card */}
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
            <Sword size={20} /> Total Stats
          </h3>

          {(() => {
            const statKeys = [
              "hp",
              "attack",
              "magicAttack",
              "defense",
              "magicResist",
              "speed",
              "critChance",
              "critDamage",
              "goldBonus",
              "xpBonus",
            ];

            // Use totalStats from backend (equippedStats contains the combined total)
            const displayStats: Record<string, number> = {};
            statKeys.forEach((k) => {
              displayStats[k] = Number((equippedStats as any)?.[k] ?? 0);
            });

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
                {statKeys.map((key) => {
                  const value = displayStats[key] || 0;
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
                <span className={`font-bold ${theme.text}`}>{totalXP} XP</span>
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
                {maxXP - xp} XP until Level {level + 1}
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
