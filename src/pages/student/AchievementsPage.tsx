import { useState, useEffect, useRef } from "react";
import { useRealtimeUser } from "@/hooks/useRealtimeUser";
import { useRealtimeAchievements } from "@/hooks/useRealtimeAchievements";
import { useRealtimeTasks } from "@/hooks/useRealtimeTasks";
import { useTheme, getThemeClasses } from "@/context/ThemeContext";
import { useAuth } from "@/context/AuthContext";
import { UsersAPI } from "@/api/users.api";
import {
  onStreakUpdated,
  onLevelUp,
  onTaskCompleted,
  onFocusSessionCompleted,
  onMonsterDefeated,
} from "@/services/achievement.service";
import { AchievementsAPI } from "@/api/achievements.api";
import { Trophy, Star, TrendingUp, Coins, Lock, Check, Gift } from "lucide-react";

export default function AchievementsPage() {
  const { user, loading: userLoading } = useRealtimeUser();
  const { firebaseUser } = useAuth();
  const { achievements, loading: achievementsLoading } =
    useRealtimeAchievements();
  const { tasks } = useRealtimeTasks();
  const { darkMode, accentColor } = useTheme();

  // Get theme classes
  const theme = getThemeClasses(darkMode, accentColor);

  // Filter state
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [claimedAchievements, setClaimedAchievements] = useState<Set<string>>(new Set());

  // Track previous values to avoid unnecessary syncs
  const prevLevelRef = useRef<number>(0);
  const prevStreakRef = useRef<number>(0);
  const prevFocusSessionsRef = useRef<number>(0);
  const prevCompletedTasksRef = useRef<number>(0);
  const prevMonstersDefeatedRef = useRef<number>(0);

  // Handle claim achievement (API-based)
  const handleClaim = async (achievementId: string) => {
    if (!user || !firebaseUser || claimingId) return;

    const achievement = achievements.find(a => a.achievementId === achievementId);
    if (!achievement || !achievement.isUnlocked) return;

    // Use the achievement ID directly (same in both collections)
    console.log(`🎁 Claiming achievement: ${achievementId}`);

    try {
      setClaimingId(achievementId);

      // Claim achievement via API using the achievement ID
      const result = await UsersAPI.claimAchievement(firebaseUser.uid, achievementId);

      // Show reward notification
      const rewards = [];
      if (result.rewards.xp > 0) rewards.push(`+${result.rewards.xp} XP`);
      if (result.rewards.gold > 0) rewards.push(`+${result.rewards.gold} Gold`);
      
      if (result.leveledUp) {
        rewards.push(`Level Up! Level ${result.newLevel}`);
      }

      if (rewards.length > 0) {
        alert(`🎉 Claimed!\n${rewards.join(' • ')}`);
      }

      // Mark as claimed locally
      setClaimedAchievements(prev => new Set([...prev, achievementId]));

      // Refresh page to show updated stats
      setTimeout(() => window.location.reload(), 1000);
    } catch (error: any) {
      console.error("Failed to claim achievement:", error);
      
      // Check if error is "already claimed"
      const errorMessage = error?.message || "";
      if (errorMessage.includes("already claimed") || errorMessage.includes("Achievement already claimed")) {
        alert("This achievement has already been claimed!");
        // Mark as claimed locally to prevent further attempts
        setClaimedAchievements(prev => new Set([...prev, achievementId]));
        // Refresh to update UI
        setTimeout(() => window.location.reload(), 500);
      } else {
        alert("Failed to claim reward. Please try again.");
      }
    } finally {
      setClaimingId(null);
    }
  };

  // Sync achievements with user stats when they change
  useEffect(() => {
    if (user && !userLoading) {
      // Update streak achievements only if streak changed
      const currentStreak = user.stats.streak || 0;
      if (currentStreak > 0 && currentStreak !== prevStreakRef.current) {
        prevStreakRef.current = currentStreak;
        onStreakUpdated(currentStreak);
      }

      // Update level achievements only if level changed
      const userLevel = user.stats?.level || 1;
      if (userLevel > 0 && userLevel !== prevLevelRef.current) {
        prevLevelRef.current = userLevel;
        onLevelUp(userLevel);
      }

      // Update focus session achievements only if count changed
      // Same pattern as monster achievements
      const focusSessions = user.stats.focusSessionsCompleted || 0;
      if (focusSessions !== prevFocusSessionsRef.current) {
        prevFocusSessionsRef.current = focusSessions;
        console.log(`🔄 Syncing focus achievements with ${focusSessions} sessions`);
        onFocusSessionCompleted(focusSessions).catch(err => {
          console.error("Failed to update focus achievements:", err);
        });
      }

      // Update monster defeat achievements only if count changed
      // Check both progression.monstersDefeated (primary) and stats.monstersDefeated (fallback)
      const monstersDefeated = user.progression?.monstersDefeated || user.stats.monstersDefeated || 0;
      if (monstersDefeated !== prevMonstersDefeatedRef.current) {
        prevMonstersDefeatedRef.current = monstersDefeated;
        console.log(`🔄 Syncing monster defeat achievements with ${monstersDefeated} monsters`);
        onMonsterDefeated(monstersDefeated).catch(err => {
          console.error("Failed to update monster achievements:", err);
        });
      }
    }
    // Use specific values instead of the entire user object to avoid re-renders
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    user?.stats?.streak,
    user?.stats?.level,
    user?.stats?.focusSessionsCompleted,
    user?.progression?.monstersDefeated,
    user?.stats?.monstersDefeated,
    userLoading
  ]);

  // Sync task achievements when tasks change
  useEffect(() => {
    if (tasks.length > 0) {
      const completedTasks = tasks.filter((t) => !t.isActive).length;
      if (completedTasks > 0 && completedTasks !== prevCompletedTasksRef.current) {
        prevCompletedTasksRef.current = completedTasks;
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
          <div className="bg-yellow-500 rounded-xl p-5 text-white">
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

          <div className="bg-purple-600 rounded-xl p-5 text-white">
            <div className="flex items-center gap-2 mb-2">
              <Star size={18} />
              <span className="font-medium">XP Earned</span>
            </div>
            <p className="text-3xl font-bold">{totalXPReward}</p>
            <p className="text-purple-200 text-sm">From achievements</p>
          </div>

          <div className="bg-green-600 rounded-xl p-5 text-white">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp size={18} />
              <span className="font-medium">Your Level</span>
            </div>
            <p className="text-3xl font-bold">{user.stats?.level || 1}</p>
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
                    backgroundColor: accentColor,
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
              onClaim={handleClaim}
              isClaiming={claimingId === achievement.achievementId}
              isClaimed={claimedAchievements.has(achievement.achievementId)}
            />
          ))}
        </div>

        {filteredAchievements.length === 0 && (
          <div className="text-center py-12">
            <Trophy
              size={40}
              className={`mb-4 mx-auto ${darkMode ? "text-gray-500" : "text-gray-400"
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
  onClaim,
  isClaiming,
  isClaimed,
}: {
  achievement: {
    achievementId: string;
    progressId?: string; // Mapped progress ID for backend API calls
    title: string;
    description?: string | null;
    category?: string | null;
    icon?: string;
    progress: number;
    target: number;
    isUnlocked: boolean;
    reward?: { xp?: number; gold?: number };
    claimed?: boolean;
    claimedAt?: number;
  };
  darkMode: boolean;
  accentColor: string;
  theme: ReturnType<typeof getThemeClasses>;
  onClaim: (achievementId: string) => void;
  isClaiming: boolean;
  isClaimed: boolean;
}) {
  // Calculate progress percentage, ensuring we don't divide by zero
  const target = achievement.target || 1;
  const progress = achievement.progress || 0;
  // Cap displayed progress at target (don't show 2/1, show 1/1 instead)
  const displayedProgress = Math.min(progress, target);
  const progressPercent = Math.min(
    100,
    Math.max(0, Math.round((displayedProgress / target) * 100))
  );

  // Debug logging for achievements with progress or focus achievements
  if (progress > 0 || achievement.isUnlocked || achievement.category === "Focus" || achievement.title?.toLowerCase().includes("focus")) {
    console.log(`📊 Achievement ${achievement.achievementId}: progress=${progress}, target=${target}, percent=${progressPercent}%, unlocked=${achievement.isUnlocked}, category=${achievement.category || "N/A"}`);
  }

  // Use claimed status from Firestore data, fallback to prop for local state
  const isAlreadyClaimed = achievement.claimed || isClaimed;
  const canClaim = achievement.isUnlocked && !isAlreadyClaimed;

  // Debug logging for claim button
  if (achievement.isUnlocked) {
    console.log(`🔍 Achievement ${achievement.achievementId}: isUnlocked=${achievement.isUnlocked}, isAlreadyClaimed=${isAlreadyClaimed}, canClaim=${canClaim}`);
  }

  // State to track if image failed to load
  const [imageError, setImageError] = useState(false);

  // Reset image error when achievement changes
  useEffect(() => {
    setImageError(false);
  }, [achievement.achievementId, achievement.icon]);

  // Helper to render icon - check if it's an image filename or emoji
  const renderIcon = () => {
    if (!achievement.isUnlocked) {
      return <Lock size={20} />;
    }
    
    const icon = achievement.icon || "";
    // Check if icon is an image filename (ends with .png, .jpg, .svg, etc.)
    if (icon.match(/\.(png|jpg|jpeg|svg|gif|webp)$/i) && !imageError) {
      // Try to load from assets/achievements/ directory
      return (
        <img
          src={`/assets/achievements/${icon}`}
          alt={achievement.title}
          className="w-8 h-8 object-contain"
          onError={() => setImageError(true)}
        />
      );
    }
    
    // If it's an emoji or text, or image failed, render emoji/fallback
    return <span>{imageError ? "🔓" : (icon || "🔓")}</span>;
  };

  return (
    <div
      className="rounded-2xl p-5 transition-all opacity-70"
      style={{
        backgroundColor: darkMode
          ? "rgba(31, 41, 55, 0.5)"
          : "rgba(255, 255, 255, 1)",
        borderWidth: "1px",
        borderStyle: "solid",
        borderColor: darkMode
          ? "rgba(75, 85, 99, 0.5)"
          : "rgba(229, 231, 235, 1)",
        boxShadow: "none",
      }}
    >
      {/* Header */}
      <div className="flex items-start gap-3 mb-4">
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl relative"
          style={{
            backgroundColor: darkMode
              ? "rgba(55, 65, 81, 0.5)"
              : "rgba(243, 244, 246, 1)",
            borderWidth: "2px",
            borderStyle: "solid",
            borderColor: "transparent",
          }}
        >
          {renderIcon()}
        </div>
        <div className="flex-1">
          <h3 className={`font-bold ${theme.text}`}>{achievement.title}</h3>
          <p className={`text-sm ${theme.textMuted}`}>
            {achievement.description}
          </p>
        </div>
        {isAlreadyClaimed && (
          <Check size={20} className="text-green-500" />
        )}
      </div>

      {/* Progress Bar */}
      <div className="mb-3">
        <div className="flex justify-between text-sm mb-1">
          <span className={theme.textMuted}>Progress</span>
          <span style={{ color: darkMode ? "#9ca3af" : "#6b7280" }}>
            {displayedProgress}/{target}
          </span>
        </div>
        {/* Progress bar container */}
        <div
          style={{
            height: '8px',
            backgroundColor: darkMode ? "rgba(55, 65, 81, 1)" : "rgba(229, 231, 235, 1)",
            width: '100%',
            borderRadius: '9999px',
            overflow: 'hidden',
            position: 'relative',
          }}
        >
          {/* Progress bar fill */}
          <div
            style={{
              width: `${progressPercent}%`,
              height: '100%',
              minWidth: progressPercent > 0 ? '2px' : '0px',
              backgroundColor: "#f97316", // Always orange
              borderRadius: '9999px',
              transition: 'width 0.3s ease',
              position: 'absolute',
              left: 0,
              top: 0,
            }}
          />
        </div>
      </div>

      {/* Rewards */}
      {achievement.reward && (
        <div
          className="flex gap-3 pt-3 mb-3"
          style={{
            borderTop: "1px solid rgba(139, 92, 246, 0.25)",
            borderRight: "1px solid rgba(139, 92, 246, 0.25)",
            borderBottom: "1px solid rgba(139, 92, 246, 0.25)",
            borderLeft: "1px solid rgba(139, 92, 246, 0.25)",
          }}
        >
          {achievement.reward.xp && (
            <div className="flex items-center gap-1 text-sm">
              <Star size={14} style={{ color: accentColor }} />
              <span style={{ color: accentColor }}>+{achievement.reward.xp} XP</span>
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

      {/* Claim Button */}
      {canClaim && (
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log(`🎁 Claim button clicked for ${achievement.achievementId}`);
            onClaim(achievement.achievementId);
          }}
          disabled={isClaiming}
          className="w-full py-2 px-4 rounded-xl font-bold text-white transition-all flex items-center justify-center gap-2"
          style={{
            backgroundColor: isClaiming ? "#6b7280" : accentColor,
            opacity: 1, // Full opacity to override parent opacity
            cursor: isClaiming ? "not-allowed" : "pointer",
            pointerEvents: "auto", // Ensure button is clickable
            position: "relative",
            zIndex: 10,
          }}
        >
          <Gift size={18} />
          {isClaiming ? "Claiming..." : "Claim Reward"}
        </button>
      )}

      {isAlreadyClaimed && (
        <div className="w-full py-2 px-4 rounded-xl font-bold text-center bg-green-500 bg-opacity-20 text-green-500 border border-green-500">
          ✓ Claimed
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
