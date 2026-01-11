import * as admin from "firebase-admin";
import { onRequest } from "firebase-functions/v1/https";
import express from "express";
import cors from "cors";

// Initialize Admin SDK
admin.initializeApp();

const app = express();
const db = admin.firestore();

// Enable ignoring undefined properties in Firestore writes
db.settings({ ignoreUndefinedProperties: true });

// Constants
const ITEM_COLLECTIONS = ["items_weapons", "items_armor", "items_arcane", "items_pets", "items_accessories"];

// Middleware
app.use(
  cors({
    origin: true,
  })
);
app.use(express.json());

/**
 * Calculate current level from total XP using Firestore level definitions
 */
async function calculateLevelFromXP(totalXP: number): Promise<{
  level: number;
  currentXP: number;
  nextLevelXP: number;
  rewards?: any;
}> {
  try {
    console.log(`🔍 [calculateLevelFromXP] Calculating level for totalXP: ${totalXP}`);
    const levelsSnap = await db.collection("levels").doc("definitions").get();
    if (!levelsSnap.exists) {
      console.error("❌ [calculateLevelFromXP] Level definitions not found in Firestore");
      throw new Error("Level definitions not found in Firestore. Please ensure levels/definitions document exists.");
    }

    const levelsData = levelsSnap.data() || {};
    // Support both 'levels' array and 'value' array structures
    let levels = levelsData.levels || levelsData.value || [];
    
    // Filter out null entries (entry 0 is often null in Firestore arrays)
    levels = levels.filter((level: any) => level !== null && level !== undefined);
    
    console.log(`📚 [calculateLevelFromXP] Found ${levels.length} level definitions (after filtering nulls)`);
    console.log(`📋 [calculateLevelFromXP] Levels data structure:`, {
      hasLevelsData: !!levelsData,
      hasLevelsArray: Array.isArray(levelsData.levels),
      hasValueArray: Array.isArray(levelsData.value),
      originalLength: (levelsData.levels || levelsData.value || []).length,
      filteredLength: levels.length,
      firstLevel: levels[0] || null,
      levelsDataKeys: Object.keys(levelsData)
    });

    // If no level definitions, throw error
    if (levels.length === 0) {
      console.error("❌ [calculateLevelFromXP] No level definitions found in array");
      throw new Error("Level definitions array is empty. Please ensure levels/definitions has a 'levels' or 'value' array with level data.");
    }

    let currentLevel = 1;
    let currentXP = totalXP;
    let nextLevelXP = 100;
    let rewards = undefined;

    // Find current level
    // Note: levels array may be 1-based (entry 0 is null), so level number = array index
    for (let i = 0; i < levels.length; i++) {
      const levelDef = levels[i];
      
      // Check if levelDef has required fields
      if (!levelDef || typeof levelDef.xpRequiredTotal === 'undefined') {
        console.warn(`⚠️ [calculateLevelFromXP] Invalid level definition at index ${i}:`, levelDef);
        continue;
      }
      
      // Use level field if exists, otherwise use array index + 1 (1-based)
      const levelNumber = levelDef.level !== undefined ? levelDef.level : (i + 1);
      
      if (totalXP >= levelDef.xpRequiredTotal) {
        currentLevel = levelNumber;
        currentXP = totalXP - levelDef.xpRequiredTotal;
        
        // Get next level XP if exists
        if (i + 1 < levels.length) {
          const nextLevelDef = levels[i + 1];
          if (nextLevelDef && typeof nextLevelDef.xpRequiredTotal !== 'undefined') {
            nextLevelXP = nextLevelDef.xpRequiredTotal - levelDef.xpRequiredTotal;
            rewards = nextLevelDef.rewards;
          }
        }
      } else {
        break;
      }
    }

    console.log(`✅ [calculateLevelFromXP] Result: level=${currentLevel}, currentXP=${currentXP}, nextLevelXP=${nextLevelXP}`);
    return { level: currentLevel, currentXP, nextLevelXP, rewards };
  } catch (error) {
    console.error("❌ [calculateLevelFromXP] Error calculating level from XP:", error);
    return { level: 1, currentXP: 0, nextLevelXP: 100 };
  }
}

/**
 * Auth middleware
 */
/**
 * Helper: Calculate total stats (base + equipped)
 */
async function calculateTotalStatsForUser(user: any) {
  const userLevel = user.stats?.level || 1;
  const equipped = user.inventory?.equiped || { armor: {}, pets: {}, accessoiries: {}, weapon: "" };
  const equippedBonuses = user.inventory?.equippedBonuses || {};
  const items = user.inventory?.inventory?.items || [];

  const configSnap = await db.collection("worldConfig").doc("playerScaling").get();
  const configData = configSnap.exists ? (configSnap.data() || {}) : {};
  
  const configBaseStats = configData.baseStats || {};
  const baseStats = { 
    attack: configBaseStats.attack || 10, 
    defense: configBaseStats.defense || 6, 
    health: configBaseStats.health || 100,
    magic: configBaseStats.magic || 8, 
    magicResist: configBaseStats.magicResist || 5 
  };
  
  const configPerLevel = configData.perLevel || {};
  const perLevel = { 
    attack: configPerLevel.attack ?? 2, 
    defense: configPerLevel.defense ?? 1.5, 
    health: configPerLevel.health ?? 12, 
    magic: configPerLevel.magic ?? 2, 
    magicResist: configPerLevel.magicResist ?? 1.5 
  };
  
  const levelFactor = Math.max(0, userLevel - 1);
  const userBaseStats: Record<string, number> = {
    attack: Math.round((baseStats.attack) + (perLevel.attack) * levelFactor),
    defense: Math.round((baseStats.defense) + (perLevel.defense) * levelFactor),
    hp: Math.round((baseStats.health) + (perLevel.health) * levelFactor),
    magicAttack: Math.round((baseStats.magic) + (perLevel.magic) * levelFactor),
    magicResist: Math.round((baseStats.magicResist) + (perLevel.magicResist) * levelFactor),
    speed: 0,
    critChance: 0,
    critDamage: 0,
    goldBonus: 0,
    xpBonus: 0,
  };

  const aggregateKeys = ["attack","magicAttack","hp","defense","magicResist","speed","critChance","critDamage","goldBonus","xpBonus"];
  const equippedTotals: Record<string, number> = Object.fromEntries(aggregateKeys.map(k => [k, 0]));

  const resolveVal = (key: string, statsObj: any, buffsObj: any) => {
    const s = statsObj || {};
    const b = buffsObj || {};
    if (key === "critChance") return Number(s.crit ?? b.crit ?? s.critChance ?? b.critChance ?? 0);
    if (key === "magicAttack") return Number(s.magic ?? b.magic ?? s.magicAttack ?? b.magicAttack ?? 0);
    if (key === "magicResist") return Number(s.magicRes ?? b.magicRes ?? s.magicResist ?? b.magicResist ?? 0);
    if (key === "goldBonus") return Number(s.gold ?? b.gold ?? s.goldBonus ?? b.goldBonus ?? 0);
    if (key === "xpBonus") return Number(s.xp ?? b.xp ?? s.xpBonus ?? b.xpBonus ?? 0);
    return Number(s[key] ?? b[key] ?? 0);
  };

  const resolveFromInventory = (eqId: string) => {
    const match = items.find((i: any) => i.itemId === eqId || i.id === eqId || i.instanceId === eqId);
    return match || null;
  };

  const equippedIds: string[] = [
    ...(equipped.weapon ? [equipped.weapon] : []),
    ...Object.values(equipped.armor || {}),
    ...Object.values(equipped.pets || {}),
    ...Object.values(equipped.accessoiries || {}),
  ].filter(Boolean) as string[];

  const collections = ["items_weapons","items_armor","items_arcane","items_pets","items_accessories"];

  for (const eqId of equippedIds) {
    let found: any = null;
    for (const col of collections) {
      try {
        const snap = await db.collection(col).doc(eqId).get();
        if (snap.exists) {
          found = snap.data();
          break;
        }
      } catch {}
    }
    if (!found) {
      found = resolveFromInventory(eqId);
    }
    if (!found) continue;
    const statsObj: any = found.stats || {};
    const buffsObj: any = found.buffs || {};
    for (const key of aggregateKeys) {
      const val = resolveVal(key, statsObj, buffsObj);
      if (!isNaN(val)) equippedTotals[key] += val;
    }
  }

  for (const [bonusSlot, bonusData] of Object.entries(equippedBonuses)) {
    if (bonusData && typeof bonusData === 'object') {
      for (const key of aggregateKeys) {
        const val = resolveVal(key, bonusData, {});
        if (!isNaN(val)) equippedTotals[key] += val;
      }
    }
  }

  const totalStats: Record<string, number> = {};
  for (const key of aggregateKeys) {
    totalStats[key] = (userBaseStats[key] || 0) + (equippedTotals[key] || 0);
  }

  return totalStats;
}

async function requireAuth(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) {
  try {
    const header = req.headers.authorization || "";
    const [type, token] = header.split(" ");

    if (type !== "Bearer" || !token) {
      return res.status(401).json({ error: "Missing Bearer token" });
    }

    const decoded = await admin.auth().verifyIdToken(token);
    (req as any).user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid token" });
  }
}

// Helper: get user role from Firestore (defaults to 'student')
async function getUserRole(uid: string): Promise<string> {
  try {
    const snap = await db.collection("users").doc(uid).get();
    return snap.data()?.role || "student";
  } catch (err) {
    console.error("Error fetching user role", err);
    return "student";
  }
}

/**
 * Helper: Achievement targets (fallback if not available from achievement catalog)
 */
const ACHIEVEMENT_TARGETS: Record<string, number> = {
  first_task: 1,
  task_master_10: 10,
  task_master_50: 50,
  task_master_100: 100,
  focus_first: 1,
  focus_10: 10,
  streak_3: 3,
  streak_7: 7,
  streak_30: 30,
  level_5: 5,
  level_10: 10,
  level_25: 25,
  monster_first: 1,
  monster_10: 10,
  monster_50: 50,
  monster_100: 100,
};

/**
 * Helper: Update achievement progress for a user
 */
async function updateAchievementProgress(
  uid: string,
  achievementId: string,
  newProgress: number
): Promise<void> {
  try {
    // Get target from hardcoded list (fallback)
    const target = ACHIEVEMENT_TARGETS[achievementId] || 1;
    const isUnlocked = newProgress >= target;

    const achievementRef = db.collection("users").doc(uid).collection("achievements").doc(achievementId);
    
    // Check if document exists
    const existingDoc = await achievementRef.get();
    const existingData = existingDoc.exists ? existingDoc.data() : {};
    
    // Don't decrease progress or lock an already unlocked achievement
    const currentProgress = existingData.progress || 0;
    const currentUnlocked = existingData.isUnlocked || false;
    
    const updateData: any = {
      achievementId,
      progress: Math.max(newProgress, currentProgress), // Never decrease progress
      isUnlocked: currentUnlocked || isUnlocked, // Once unlocked, stay unlocked
      updatedAt: Date.now(),
    };
    
    // Set unlockedAt if just unlocked
    if (isUnlocked && !currentUnlocked) {
      updateData.unlockedAt = Date.now();
    } else if (existingData.unlockedAt) {
      updateData.unlockedAt = existingData.unlockedAt; // Preserve existing unlockedAt
    }

    await achievementRef.set(updateData, { merge: true });
    
    if (isUnlocked && !currentUnlocked) {
      console.log(`🏆 Achievement unlocked: ${uid} - ${achievementId}!`);
    }
  } catch (error) {
    console.error(`❌ Failed to update achievement ${achievementId} for user ${uid}:`, error);
    // Don't throw - achievement updates shouldn't break main flow
  }
}

/**
 * Helper: Update level-related achievements
 */
async function updateLevelAchievements(uid: string, currentLevel: number): Promise<void> {
  try {
    // Query catalog for all level achievements
    const achievementsRef = db.collection("achievements");
    const snapshot = await achievementsRef.get();
    
    const levelAchievements = snapshot.docs
      .map(doc => ({
        achievementId: doc.id,
        ...doc.data()
      }))
      .filter((achievement: any) => {
        const category = (achievement.category || "").toLowerCase();
        const id = (achievement.achievementId || "").toLowerCase();
        return category === "level" || id.includes("level");
      });

    // Update all level achievements
    await Promise.all(
      levelAchievements.map(async (achievement: any) => {
        await updateAchievementProgress(uid, achievement.achievementId, currentLevel);
      })
    );
  } catch (error) {
    console.error("Error updating level achievements:", error);
  }
}

/**
 * Helper: Update task-related achievements
 * Queries catalog for all task achievements and updates them
 */
async function updateTaskAchievements(uid: string, totalCompletedTasks: number): Promise<void> {
  try {
    // Query catalog for all task-related achievements
    const achievementsRef = db.collection("achievements");
    const snapshot = await achievementsRef.get();
    
    const taskAchievements = snapshot.docs
      .map(doc => ({
        achievementId: doc.id,
        ...doc.data()
      }))
      .filter((achievement: any) => {
        const category = (achievement.category || "").toLowerCase();
        const id = (achievement.achievementId || "").toLowerCase();
        return category === "tasks" || category === "difficulty" || category === "task" ||
               id.includes("task") || id.includes("easy") || id.includes("medium") ||
               id.includes("hard") || id.includes("extreme");
      });

    // Update all task achievements
    await Promise.all(
      taskAchievements.map(async (achievement: any) => {
        const target = achievement.condition?.value || 1;
        await updateAchievementProgress(uid, achievement.achievementId, totalCompletedTasks);
      })
    );
  } catch (error) {
    console.error("Error updating task achievements:", error);
  }
}

/**
 * Helper: Update monster defeat achievements
 * Queries catalog for all monster/combat achievements and updates them
 */
/**
 * Calculate current stamina with regeneration
 */
/**
 * Get stamina configuration from gameConfig/main
 * Returns maxStamina, regenerationRate (in minutes), and battle costs by tier
 */
async function getStaminaConfig(): Promise<{ 
  maxStamina: number; 
  regenRateMinutes: number;
  battleCosts: {
    normal: number;
    elite: number;
    miniBoss: number;
    boss: number;
  };
}> {
  try {
    const gameConfigSnap = await db.collection("gameConfig").doc("main").get();
    const gameConfig = gameConfigSnap.exists ? (gameConfigSnap.data() || {}) : {};
    
    // Map gameConfig structure to our expected format
    const staminaConfig = gameConfig.stamina || {};
    const maxStamina = staminaConfig.max || 100;
    const regenPerHour = staminaConfig.regenPerHour || 10;
    
    // Convert regenPerHour to regenRateMinutes (e.g., 10/hour = 6 minutes per point)
    const regenRateMinutes = regenPerHour > 0 ? 60 / regenPerHour : 5;
    
    // Get battle costs by tier
    const battleCost = staminaConfig.battleCost || {};
    const battleCosts = {
      normal: battleCost.normal || 5,
      elite: battleCost.elite || 8,
      miniBoss: battleCost.miniBoss || 12,
      boss: battleCost.boss || 20,
    };
    
    return { maxStamina, regenRateMinutes, battleCosts };
  } catch (error) {
    console.warn("Failed to get stamina config from gameConfig, using defaults:", error);
    return { 
      maxStamina: 100, 
      regenRateMinutes: 5,
      battleCosts: {
        normal: 5,
        elite: 8,
        miniBoss: 12,
        boss: 20,
      }
    };
  }
}

/**
 * Determine monster tier from stage number or monster data
 */
async function getMonsterTier(
  worldId: string | undefined,
  stage: number | undefined,
  monsterId: string | undefined
): Promise<'normal' | 'elite' | 'miniBoss' | 'boss'> {
  // First, try to get tier from monster document if monsterId is provided
  if (monsterId) {
    try {
      const monsterSnap = await db.collection("monsters").doc(monsterId).get();
      if (monsterSnap.exists) {
        const monsterData = monsterSnap.data();
        const tier = monsterData?.tier;
        if (tier === 'normal' || tier === 'elite' || tier === 'miniBoss' || tier === 'boss') {
          return tier;
        }
      }
    } catch (error) {
      console.warn("Failed to get monster tier from monster document:", error);
    }
  }
  
  // Fallback: determine tier from stage number using worldConfig
  if (worldId && stage !== undefined) {
    try {
      const stageStructureSnap = await db.collection("worldConfig").doc("stageStructure").get();
      if (stageStructureSnap.exists) {
        const config = stageStructureSnap.data() || {};
        const bossStage = config.bossStage || 10;
        const miniBossStage = config.miniBossStage || 5;
        const eliteStages = config.eliteStages || [];
        
        if (stage === bossStage) {
          return 'boss';
        } else if (stage === miniBossStage) {
          return 'miniBoss';
        } else if (eliteStages.includes(stage)) {
          return 'elite';
        }
      }
    } catch (error) {
      console.warn("Failed to get tier from stage structure:", error);
    }
  }
  
  // Default to normal
  return 'normal';
}

async function calculateCurrentStamina(
  currentStamina: number,
  maxStamina: number,
  lastRegen: number | undefined,
  regenRateMinutes: number
): Promise<{ stamina: number; lastRegen: number }> {
  const now = Date.now();
  const lastRegenTime = lastRegen || now;
  const minutesPassed = (now - lastRegenTime) / 60000;
  const pointsToAdd = Math.floor(minutesPassed / regenRateMinutes);
  
  const newStamina = Math.min(maxStamina, Math.max(0, currentStamina + pointsToAdd));
  const newLastRegen = lastRegenTime + (pointsToAdd * regenRateMinutes * 60000);
  
  return { stamina: newStamina, lastRegen: newLastRegen };
}

async function updateMonsterDefeatAchievements(uid: string, totalMonstersDefeated: number): Promise<void> {
  try {
    // Query catalog for all monster/combat achievements
    const achievementsRef = db.collection("achievements");
    const snapshot = await achievementsRef.get();
    
    const monsterAchievements = snapshot.docs
      .map(doc => ({
        achievementId: doc.id,
        ...doc.data()
      }))
      .filter((achievement: any) => {
        const category = (achievement.category || "").toLowerCase();
        const id = (achievement.achievementId || "").toLowerCase();
        return category === "monster" || category === "combat" ||
               id.includes("monster") || id.includes("monsters");
      });

    // Update all monster achievements
    await Promise.all(
      monsterAchievements.map(async (achievement: any) => {
        await updateAchievementProgress(uid, achievement.achievementId, totalMonstersDefeated);
      })
    );
  } catch (error) {
    console.error("Error updating monster achievements:", error);
  }
}

// ============ AUTH ============

/**
 * GET /auth/me
 * Updates login streak on each login
 * Stores lastLoginAt as ISO string in format "2026-01-08"
 */
app.get("/auth/me", requireAuth, async (req, res) => {
  try {
    const uid = (req as any).user.uid;
    const decoded = (req as any).user as admin.auth.DecodedIdToken;

    const userRef = db.collection("users").doc(uid);
    const snap = await userRef.get();

    // Get today's date in "YYYY-MM-DD" format
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const todayDateString = `${year}-${month}-${day}`; // "2026-01-08"

    if (!snap.exists) {
      // Get defaultPlayer template from Firestore
      const templateSnap = await db.collection("templates").doc("defaultPlayer").get();
      const defaultPlayer = templateSnap.data()?.player || {};

      // Get stamina config for new users
      const { maxStamina } = await getStaminaConfig();
      const now = Date.now();

      const newUser = {
        uid,
        email: decoded.email,
        displayName: decoded.name || decoded.email?.split("@")[0] || "Hero",
        photoURL: decoded.picture || null,
        role: "student",
        status: "active",
        createdAt: Date.now(),
        updatedAt: Date.now(),
        lastLoginAt: todayDateString, // "2026-01-08" as string
        ...defaultPlayer,
        settings: {
          notificationsEnabled: true,
          theme: "dark",
          language: "nl",
        },
        stats: {
          ...(defaultPlayer.stats || {}),
          gold: 400, // New accounts start with 400 gold
          loginStreak: 1,
          maxLoginStreak: 1,
          lastLoginDate: todayDateString, // Same format for consistency
          stamina: maxStamina, // Start with full stamina
          maxStamina: maxStamina,
          lastStaminaRegen: now, // Initialize regeneration timestamp
        },
      };
      await userRef.set(newUser);
      return res.status(200).json(newUser);
    }

    const user = snap.data();
    const lastLoginDate = user.stats?.lastLoginDate;
    
    // Initialize level and XP if missing
    let needsStatsInit = false;
    const updates: any = {
      updatedAt: Date.now(),
      lastLoginAt: todayDateString,
    };

    if (!user.stats?.level || !user.stats?.totalXP) {
      needsStatsInit = true;
      const initTotalXP = user.stats?.totalXP || user.stats?.xp || 0;
      const levelData = await calculateLevelFromXP(initTotalXP);
      updates["stats.level"] = levelData.level;
      updates["stats.xp"] = levelData.currentXP;
      updates["stats.totalXP"] = initTotalXP;
      updates["stats.nextLevelXP"] = levelData.nextLevelXP;
      console.log(`🔧 [Auth Init] Initialized stats for user ${uid}: level ${levelData.level}, totalXP ${initTotalXP}`);
    }
    
    // Calculate new login streak
    let loginStreak = user.stats?.loginStreak || 0;
    let maxLoginStreak = user.stats?.maxLoginStreak || 0;

    // Check if user logged in today
    if (lastLoginDate !== todayDateString) {
      if (!lastLoginDate) {
        // No previous login date, this is user's first login
        loginStreak = 1;
        maxLoginStreak = 1;
      } else {
        // Get yesterday's date
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayYear = yesterday.getFullYear();
        const yesterdayMonth = String(yesterday.getMonth() + 1).padStart(2, '0');
        const yesterdayDay = String(yesterday.getDate()).padStart(2, '0');
        const yesterdayDateString = `${yesterdayYear}-${yesterdayMonth}-${yesterdayDay}`;

        if (lastLoginDate === yesterdayDateString) {
          // User logged in yesterday, increment streak
          loginStreak = loginStreak + 1;
          // Update maxLoginStreak if needed
          maxLoginStreak = Math.max(maxLoginStreak || 0, loginStreak);
        } else {
          // User didn't log in yesterday, reset streak to 1
          loginStreak = 1;
        }
      }
    }

    // Update user with new login data
    updates["stats.loginStreak"] = loginStreak;
    updates["stats.maxLoginStreak"] = maxLoginStreak;
    updates["stats.lastLoginDate"] = todayDateString;

    // Initialize stamina if missing (for existing users)
    if (user.stats?.stamina === undefined || user.stats?.maxStamina === undefined) {
      const { maxStamina } = await getStaminaConfig();
      const now = Date.now();
      
      updates["stats.stamina"] = maxStamina;
      updates["stats.maxStamina"] = maxStamina;
      updates["stats.lastStaminaRegen"] = now;
      console.log(`🔧 [Auth Init] Initialized stamina for user ${uid}: ${maxStamina}/${maxStamina}`);
    } else {
      // Update stamina with regeneration on login
      const { maxStamina, regenRateMinutes } = await getStaminaConfig();
      const currentStamina = user.stats?.stamina ?? maxStamina;
      const lastRegen = user.stats?.lastStaminaRegen;

      const { stamina, lastRegen: newLastRegen } = await calculateCurrentStamina(
        currentStamina,
        maxStamina,
        lastRegen,
        regenRateMinutes
      );

      if (stamina !== currentStamina || !user.stats?.maxStamina) {
        updates["stats.stamina"] = stamina;
        updates["stats.lastStaminaRegen"] = newLastRegen;
        updates["stats.maxStamina"] = maxStamina;
      }
    }

    await userRef.update(updates);

    // Return updated user data
    const updatedSnap = await userRef.get();
    const userData = updatedSnap.data() || {};

    // Ensure total stats are calculated on login so clients always see base + equipped values
    try {
      const totalStats = await calculateTotalStatsForUser(userData);
      await userRef.update({ "stats.totalStats": totalStats });
      (userData as any).stats = { ...(userData as any).stats, totalStats };
    } catch (calcErr) {
      console.error("Error recalculating total stats on login", calcErr);
    }
    
    return res.status(200).json(userData);
  } catch (e: any) {
    console.error("Error in /auth/me:", e);
    return res.status(500).json({ error: e?.message });
  }
});

// ============ TASKS ============

/**
 * GET /tasks
 */
app.get("/tasks", requireAuth, async (req, res) => {
  try {
    const { courseId, moduleId, activeOnly } = req.query;

    if (!courseId || !moduleId) {
      return res.status(400).json({ error: "courseId and moduleId are required" });
    }

    const tasksSnap = await db
      .collection("courses")
      .doc(String(courseId))
      .collection("modules")
      .doc(String(moduleId))
      .collection("tasks")
      .get();

    let tasks = tasksSnap.docs.map((doc) => ({
      taskId: doc.id,
      ...doc.data(),
    }));

    if (activeOnly === "true") {
      tasks = tasks.filter((t: any) => t.isActive !== false);
    }

    return res.status(200).json(tasks);
  } catch (e: any) {
    console.error("Error in GET /tasks:", e);
    return res.status(500).json({ error: e?.message });
  }
});

/**
 * POST /tasks
 */
app.post("/tasks", requireAuth, async (req, res) => {
  try {
    const { title, description, difficulty, xp, gold, dueAt, isRepeatable, canvasUrl, courseId, moduleId } = req.body;

    if (!courseId || !moduleId) {
      return res.status(400).json({ error: "courseId and moduleId are required" });
    }

    const tasksRef = db
      .collection("courses")
      .doc(String(courseId))
      .collection("modules")
      .doc(String(moduleId))
      .collection("tasks");

    const newTaskRef = tasksRef.doc();

    const task = {
      title,
      description,
      difficulty,
      xp,
      gold,
      dueAt: dueAt || null,
      isRepeatable: isRepeatable || false,
      isActive: true,
      canvasUrl: canvasUrl || null,
      courseId,
      moduleId,
      createdAt: Date.now(),
      completedAt: null,
    };

    await newTaskRef.set(task);

    return res.status(201).json({
      taskId: newTaskRef.id,
      ...task,
    });
  } catch (e: any) {
    console.error("Error in POST /tasks:", e);
    return res.status(500).json({ error: e?.message });
  }
});

/**
 * GET /tasks/{taskId}
 */
app.get("/tasks/:taskId", requireAuth, async (req, res) => {
  try {
    const { taskId } = req.params;
    const { courseId, moduleId } = req.query;

    if (!courseId || !moduleId) {
      return res.status(400).json({ error: "courseId and moduleId are required" });
    }

    const taskSnap = await db
      .collection("courses")
      .doc(String(courseId))
      .collection("modules")
      .doc(String(moduleId))
      .collection("tasks")
      .doc(taskId)
      .get();

    if (!taskSnap.exists) {
      return res.status(404).json({ error: "Task not found" });
    }

    return res.status(200).json({
      taskId: taskSnap.id,
      ...taskSnap.data(),
    });
  } catch (e: any) {
    console.error("Error in GET /tasks/:taskId:", e);
    return res.status(500).json({ error: e?.message });
  }
});

/**
 * PATCH /tasks/{taskId}
 */
app.patch("/tasks/:taskId", requireAuth, async (req, res) => {
  try {
    const { taskId } = req.params;
    const { courseId, moduleId } = req.body;

    if (!courseId || !moduleId) {
      return res.status(400).json({ error: "courseId and moduleId are required" });
    }

    const taskRef = db
      .collection("courses")
      .doc(String(courseId))
      .collection("modules")
      .doc(String(moduleId))
      .collection("tasks")
      .doc(taskId);

    await taskRef.update({
      ...req.body,
      updatedAt: Date.now(),
    });

    const updated = await taskRef.get();
    return res.status(200).json({
      taskId: updated.id,
      ...updated.data(),
    });
  } catch (e: any) {
    console.error("Error in PATCH /tasks/:taskId:", e);
    return res.status(500).json({ error: e?.message });
  }
});

/**
 * DELETE /tasks/{taskId}
 */
app.delete("/tasks/:taskId", requireAuth, async (req, res) => {
  try {
    const { taskId } = req.params;
    const { courseId, moduleId } = req.query;

    if (!courseId || !moduleId) {
      return res.status(400).json({ error: "courseId and moduleId are required" });
    }

    await db
      .collection("courses")
      .doc(String(courseId))
      .collection("modules")
      .doc(String(moduleId))
      .collection("tasks")
      .doc(taskId)
      .delete();

    return res.status(200).json({ success: true });
  } catch (e: any) {
    console.error("Error in DELETE /tasks/:taskId:", e);
    return res.status(500).json({ error: e?.message });
  }
});

// ============ TASK SUBMISSIONS ============

const SUBMISSION_STATUS = ["pending", "approved", "rejected"] as const;

/**
 * POST /tasks/:taskId/submissions
 * Student uploads evidence (imageUrl) for a task inside a module
 */
app.post("/tasks/:taskId/submissions", requireAuth, async (req, res) => {
  try {
    const uid = (req as any).user.uid;
    const { taskId } = req.params;
    const { courseId, moduleId, imageUrl } = req.body;

    if (!courseId || !moduleId) {
      return res.status(400).json({ error: "courseId and moduleId are required" });
    }

    const courseRef = db.collection("courses").doc(String(courseId));
    const courseSnap = await courseRef.get();
    const courseData = courseSnap.data() || {};

    const taskRef = courseRef
      .collection("modules")
      .doc(String(moduleId))
      .collection("tasks")
      .doc(taskId);

    // Check if student already has a submission for this task
    const taskSnap = await taskRef.get();
    const taskData = taskSnap.data() || {};
    const existingSubmissions = taskData.submissions || {};
    
    // Find existing submission by this student
    let submissionId: string | null = null;
    for (const [sid, sub] of Object.entries(existingSubmissions)) {
      if ((sub as any).studentId === uid) {
        submissionId = sid;
        break;
      }
    }

    // If no existing submission, generate new ID
    if (!submissionId) {
      submissionId = db.collection("__ids").doc().id;
    }

    const now = Date.now();
    const existingSubmission = submissionId && existingSubmissions[submissionId] ? existingSubmissions[submissionId] : null;
    
    const submission = {
      studentId: uid,
      imageUrl: imageUrl || null,
      status: "pending" as (typeof SUBMISSION_STATUS)[number],
      teacherComment: null as string | null,
      createdAt: existingSubmission ? (existingSubmission as any).createdAt : now,
      updatedAt: now,
      courseId,
      moduleId,
      taskId,
      // attach owning teacher; do NOT default to student uid
      teacherId: courseData.createdBy || courseData.teacherId || null,
    };

    // Store submission inside task document map (replaces existing if any)
    await taskRef.set(
      {
        latestSubmissionStatus: submission.status,
        submissions: {
          [submissionId]: submission,
        },
      },
      { merge: true }
    );

    return res.status(201).json({ submissionId, ...submission });
  } catch (e: any) {
    console.error("Error in POST /tasks/:taskId/submissions:", e);
    return res.status(500).json({ error: e?.message });
  }
});

/**
 * GET /tasks/:taskId/submissions
 * Students get their own submissions; teachers/admin see all
 */
app.get("/tasks/:taskId/submissions", requireAuth, async (req, res) => {
  try {
    const uid = (req as any).user.uid;
    const { taskId } = req.params;
    const { courseId, moduleId, status } = req.query;

    if (!courseId || !moduleId) {
      return res.status(400).json({ error: "courseId and moduleId are required" });
    }

    const role = await getUserRole(uid);
    const taskSnap = await db
      .collection("courses")
      .doc(String(courseId))
      .collection("modules")
      .doc(String(moduleId))
      .collection("tasks")
      .doc(taskId)
      .get();

    if (!taskSnap.exists) {
      return res.status(404).json({ error: "Task not found" });
    }

    const taskData: any = taskSnap.data() || {};
    const submissionMap: Record<string, any> = taskData.submissions || {};
    let submissions = Object.entries(submissionMap).map(([id, value]) => ({
      submissionId: id,
      ...value,
    }));

    // Filter in memory
    if (role === "student") {
      submissions = submissions.filter((s: any) => s.studentId === uid);
    }
    if (status && typeof status === "string" && SUBMISSION_STATUS.includes(status as any)) {
      submissions = submissions.filter((s: any) => s.status === status);
    }

    // Sorteer op createdAt descending
    submissions.sort((a: any, b: any) => (b.createdAt || 0) - (a.createdAt || 0));

    return res.status(200).json(submissions);
  } catch (e: any) {
    console.error("Error in GET /tasks/:taskId/submissions:", e);
    return res.status(500).json({ error: e?.message });
  }
});

/**
 * GET /teacher/submissions
 * Teachers/admin see all submissions across their courses (optionally filter by status)
 */
app.get("/teacher/submissions", requireAuth, async (req, res) => {
  try {
    const uid = (req as any).user.uid;
    const role = await getUserRole(uid);
    if (role !== "teacher" && role !== "admin") {
      return res.status(403).json({ error: "Not authorized" });
    }

    const { status } = req.query;
    const allSubs: any[] = [];

    const coursesSnap = await db.collection("courses").where("createdBy", "==", uid).get();

    for (const courseDoc of coursesSnap.docs) {
      const courseId = courseDoc.id;
      const courseData = courseDoc.data();
      const modulesSnap = await courseDoc.ref.collection("modules").get();

      for (const moduleDoc of modulesSnap.docs) {
        const moduleId = moduleDoc.id;
        const moduleData = moduleDoc.data();
        const tasksSnap = await moduleDoc.ref.collection("tasks").get();

        for (const taskDoc of tasksSnap.docs) {
          const taskId = taskDoc.id;
          const taskData: any = taskDoc.data() || {};
          const submissionMap: Record<string, any> = taskData.submissions || {};

          for (const [submissionId, sub] of Object.entries(submissionMap)) {
            const studentId = (sub as any).studentId;
            let studentName = studentId;
            if (studentId) {
              try {
                const studentSnap = await db.collection("users").doc(studentId).get();
                if (studentSnap.exists) {
                  const studentData = studentSnap.data();
                  studentName = studentData?.displayName || studentData?.email?.split('@')[0] || studentId;
                }
              } catch (err) {
                console.error("Error fetching student name:", err);
              }
            }
            allSubs.push({
              submissionId,
              ...sub,
              taskId,
              moduleId,
              courseId,
              taskTitle: taskData.title,
              moduleName: moduleData.name || moduleData.title,
              courseName: courseData.name,
              studentName,
            });
          }
        }
      }
    }

    // Optional status filter in-memory
    let filtered = allSubs;
    if (status && typeof status === "string" && SUBMISSION_STATUS.includes(status as any)) {
      filtered = filtered.filter((s) => s.status === status);
    }

    // Sort in memory by createdAt desc
    filtered.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

    return res.status(200).json(filtered);
  } catch (e: any) {
    console.error("Error in GET /teacher/submissions:", e);
    return res.status(500).json({ error: e?.message });
  }
});

/**
 * GET /student/submissions
 * Students see all their own submissions across all enrolled courses (optionally filter by status)
 */
app.get("/student/submissions", requireAuth, async (req, res) => {
  try {
    const uid = (req as any).user.uid;
    const role = await getUserRole(uid);
    if (role !== "student" && role !== "admin") {
      return res.status(403).json({ error: "Not authorized - students only" });
    }

    const { status } = req.query;
    const allSubs: any[] = [];

    // Get all courses
    const coursesSnap = await db.collection("courses").get();

    for (const courseDoc of coursesSnap.docs) {
      const courseId = courseDoc.id;
      const courseData = courseDoc.data();
      const modulesSnap = await courseDoc.ref.collection("modules").get();

      for (const moduleDoc of modulesSnap.docs) {
        const moduleId = moduleDoc.id;
        const moduleData = moduleDoc.data();
        const tasksSnap = await moduleDoc.ref.collection("tasks").get();

        for (const taskDoc of tasksSnap.docs) {
          const taskId = taskDoc.id;
          const taskData: any = taskDoc.data() || {};
          const submissionMap: Record<string, any> = taskData.submissions || {};

          for (const [submissionId, sub] of Object.entries(submissionMap)) {
            // Only include submissions by this student
            if ((sub as any).studentId === uid) {
              allSubs.push({
                submissionId,
                ...sub,
                taskId,
                moduleId,
                courseId,
                taskTitle: taskData.title,
                moduleName: moduleData.name || moduleData.title,
                courseName: courseData.name,
              });
            }
          }
        }
      }
    }

    // Optional status filter in-memory
    let filtered = allSubs;
    if (status && typeof status === "string" && SUBMISSION_STATUS.includes(status as any)) {
      filtered = filtered.filter((s) => s.status === status);
    }

    // Sort in memory by createdAt desc
    filtered.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

    return res.status(200).json(filtered);
  } catch (e: any) {
    console.error("Error in GET /student/submissions:", e);
    return res.status(500).json({ error: e?.message });
  }
});

/**
 * PATCH /tasks/:taskId/submissions/:submissionId
 * Teacher/admin can approve/reject/undo with comment
 */
app.patch("/tasks/:taskId/submissions/:submissionId", requireAuth, async (req, res) => {
  try {
    const uid = (req as any).user.uid;
    const role = await getUserRole(uid);
    if (role !== "teacher" && role !== "admin") {
      return res.status(403).json({ error: "Not authorized" });
    }

    const { taskId, submissionId } = req.params;
    const { courseId, moduleId, status, teacherComment } = req.body;

    if (!courseId || !moduleId) {
      return res.status(400).json({ error: "courseId and moduleId are required" });
    }

    if (!status || !SUBMISSION_STATUS.includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }

    const taskRef = db
      .collection("courses")
      .doc(String(courseId))
      .collection("modules")
      .doc(String(moduleId))
      .collection("tasks")
      .doc(taskId);

    const taskSnap = await taskRef.get();
    if (!taskSnap.exists) {
      return res.status(404).json({ error: "Task not found" });
    }

    const taskData: any = taskSnap.data() || {};
    const submissionMap: Record<string, any> = taskData.submissions || {};
    const existing = submissionMap[submissionId];
    if (!existing) {
      return res.status(404).json({ error: "Submission not found" });
    }

    const updatedSubmission = {
      ...existing,
      status,
      teacherComment: teacherComment ?? null,
      updatedAt: Date.now(),
    };

    await taskRef.set(
      {
        latestSubmissionStatus: status,
        submissions: {
          [submissionId]: updatedSubmission,
        },
      },
      { merge: true }
    );

    return res.status(200).json({ submissionId, ...updatedSubmission });
  } catch (e: any) {
    console.error("Error in PATCH /tasks/:taskId/submissions/:submissionId:", e);
    return res.status(500).json({ error: e?.message });
  }
});

/**
 * POST /tasks/:taskId/claim
 * Student claims rewards after an approved submission
 */
app.post("/tasks/:taskId/claim", requireAuth, async (req, res) => {
  try {
    const uid = (req as any).user.uid;
    const { taskId } = req.params;
    const { courseId, moduleId } = req.body;

    if (!courseId || !moduleId) {
      return res.status(400).json({ error: "courseId and moduleId are required" });
    }

    const taskRef = db
      .collection("courses")
      .doc(String(courseId))
      .collection("modules")
      .doc(String(moduleId))
      .collection("tasks")
      .doc(taskId);

    const taskSnap = await taskRef.get();
    if (!taskSnap.exists) {
      return res.status(404).json({ error: "Task not found" });
    }

    const taskData: any = taskSnap.data() || {};
    const submissionMap: Record<string, any> = taskData.submissions || {};

    const approvedSubs = Object.entries(submissionMap)
      .map(([submissionId, value]) => ({ submissionId, ...(value as any) }))
      .filter((s) => s.studentId === uid && s.status === "approved");

    if (approvedSubs.length === 0) {
      return res.status(400).json({ error: "No approved submission to claim" });
    }

    // Prefer the latest approved submission that has not been claimed yet
    approvedSubs.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    const latestApproved = approvedSubs.find((s) => !s.claimedAt) || approvedSubs[0];

    if (latestApproved.claimedAt) {
      return res.status(400).json({ error: "Already claimed" });
    }

    // Load user stats
    const userRef = db.collection("users").doc(uid);
    const userSnap = await userRef.get();
    const user = userSnap.data() || {};

    // Calculate rewards based on difficulty from gameRules
    const difficulty = taskData.difficulty || "medium";
    const rulesSnap = await db.collection("gameRules").doc("main").get();
    const rules = rulesSnap.data() || {};
    
    // Get base rewards from gameRules for this difficulty
    const difficultyRewards = rules.difficultyRewards || {
      easy: { xp: 50, gold: 10 },
      medium: { xp: 100, gold: 25 },
      hard: { xp: 200, gold: 50 },
      extreme: { xp: 500, gold: 125 }
    };
    
    const baseRewards = difficultyRewards[difficulty] || difficultyRewards.medium;
    const baseXP = baseRewards.xp || 100;
    const baseGold = baseRewards.gold || 25;
    
    console.log(`🎯 [Claim Reward] Task: ${taskData.name}, difficulty: ${difficulty}, baseXP: ${baseXP}, baseGold: ${baseGold}`);
    
    const xpGained = baseXP;
    const goldGained = baseGold;
    
    console.log(`💰 [Claim Reward] XP/Gold gained - xpGained: ${xpGained}, goldGained: ${goldGained}`);

    const oldLevel = user.stats?.level || 1;
    const newTotalXP = (user.stats?.totalXP || 0) + xpGained;
    let newGold = (user.stats?.gold || 0) + goldGained;

    const levelData = await calculateLevelFromXP(newTotalXP);
    const leveledUp = levelData.level > oldLevel;

    let levelUpRewards = undefined;
    if (leveledUp && levelData.rewards) {
      newGold += levelData.rewards.gold || 0;
      levelUpRewards = levelData.rewards;
    }

    const statsUpdate = {
      "stats.level": levelData.level,
      "stats.xp": levelData.currentXP,
      "stats.nextLevelXP": levelData.nextLevelXP,
      "stats.totalXP": newTotalXP,
      "stats.gold": newGold,
      updatedAt: Date.now(),
    };

    await userRef.update(statsUpdate);

    // Mark submission claimed inside task map
    const now = Date.now();
    await taskRef.set(
      {
        latestSubmissionStatus: latestApproved.status,
        submissions: {
          [latestApproved.submissionId]: {
            ...latestApproved,
            claimedAt: now,
            updatedAt: now,
          },
        },
      },
      { merge: true }
    );

    // Create or update a task document in user's tasks collection to track this claimed task
    // This allows us to count completed tasks for achievements
    // Use a unique ID that includes courseId and moduleId to avoid conflicts
    const userTaskId = `${courseId}_${moduleId}_${taskId}`;
    const userTaskRef = userRef.collection("tasks").doc(userTaskId);
    const existingUserTask = await userTaskRef.get();
    
    // Only create/update if this task hasn't been tracked yet (to avoid double counting)
    if (!existingUserTask.exists || !existingUserTask.data()?.claimedAt) {
      await userTaskRef.set({
        taskId,
        courseId: String(courseId),
        moduleId: String(moduleId),
        isActive: false, // Mark as completed
        completedAt: now,
        claimedAt: now,
        difficulty: difficulty,
        name: taskData.name || "Task",
      }, { merge: true });
    }

    // Count total completed tasks (from user's tasks collection) and update task achievements
    try {
      const tasksSnapshot = await userRef.collection("tasks").where("isActive", "==", false).get();
      const totalCompletedTasks = tasksSnapshot.size;
      await updateTaskAchievements(uid, totalCompletedTasks);
    } catch (error) {
      console.error("Error updating task achievements on claim:", error);
      // Don't fail the request if achievement update fails
    }

    // Update level achievements if leveled up
    if (leveledUp) {
      await updateLevelAchievements(uid, levelData.level);
    }

    return res.status(200).json({
      success: true,
      xpGained,
      goldGained,
      leveledUp,
      newLevel: levelData.level,
      currentXP: levelData.currentXP,
      nextLevelXP: levelData.nextLevelXP,
      levelUpRewards,
    });
  } catch (e: any) {
    console.error("Error in POST /tasks/:taskId/claim:", e);
    return res.status(500).json({ error: e?.message });
  }
});

/**
 * POST /tasks/{taskId}/complete
 */
app.post("/tasks/:taskId/complete", requireAuth, async (req, res) => {
  try {
    const uid = (req as any).user.uid;
    const { taskId } = req.params;

    const userRef = db.collection("users").doc(uid);
    const taskRef = userRef.collection("tasks").doc(taskId);

    const userSnap = await userRef.get();
    const taskSnap = await taskRef.get();

    if (!taskSnap.exists) {
      return res.status(404).json({ error: "Task not found" });
    }

    const user = userSnap.data() || {};
    const task = taskSnap.data() || {};

    const oldLevel = user.stats?.level || 1;
    // Use totalXP if available, otherwise fallback to xp (for backwards compatibility)
    const currentTotalXP = user.stats?.totalXP ?? user.stats?.xp ?? 0;
    const newTotalXP = currentTotalXP + (task.xp || 0);
    let newGold = (user.stats?.gold || 0) + (task.gold || 0);

    // Calculate new level from total XP
    const levelData = await calculateLevelFromXP(newTotalXP);
    const leveledUp = levelData.level > oldLevel;

    // Add level-up rewards if leveled up
    let levelUpRewards = undefined;
    if (leveledUp && levelData.rewards) {
      newGold += levelData.rewards.gold || 0;
      levelUpRewards = levelData.rewards;
    }

    const statsUpdate = {
      "stats.level": levelData.level,
      "stats.xp": levelData.currentXP,
      "stats.nextLevelXP": levelData.nextLevelXP,
      "stats.totalXP": newTotalXP,
      "stats.gold": newGold,
      updatedAt: Date.now(),
    };

    await userRef.update(statsUpdate);
    await taskRef.update({
      isActive: false,
      completedAt: Date.now(),
    });

    // Count total completed tasks and update task achievements
    const tasksSnapshot = await userRef.collection("tasks").where("isActive", "==", false).get();
    const totalCompletedTasks = tasksSnapshot.size;
    await updateTaskAchievements(uid, totalCompletedTasks);

    // Update level achievements if leveled up
    if (leveledUp) {
      await updateLevelAchievements(uid, levelData.level);
    }

    const response: any = {
      success: true,
      reward: {
        xp: task.xp,
        gold: task.gold,
      },
      leveledUp,
      newLevel: levelData.level,
      currentXP: levelData.currentXP,
      nextLevelXP: levelData.nextLevelXP,
    };
    
    // Only add levelUpRewards if it exists
    if (levelUpRewards) {
      response.levelUpRewards = levelUpRewards;
    }
    
    return res.status(200).json(response);
  } catch (e: any) {
    console.error("Error in POST /tasks/:taskId/complete:", e);
    return res.status(500).json({ error: e?.message });
  }
});

// ============ ACHIEVEMENTS ============

/**
 * POST /users/{uid}/achievements/{achievementId}/claim
 * Claim an achievement and receive rewards
 */
app.post("/users/:uid/achievements/:achievementId/claim", requireAuth, async (req, res) => {
  try {
    const { uid, achievementId } = req.params;
    const requestingUid = (req as any).user.uid;
    
    // Ensure user can only claim their own achievements
    if (uid !== requestingUid) {
      return res.status(403).json({ error: "Forbidden: Cannot claim achievements for other users" });
    }

    const userRef = db.collection("users").doc(uid);
    
    // Use the achievement ID directly (same in both collections)
    const achievementRef = db.collection("users").doc(uid).collection("achievements").doc(achievementId);
    const achievementSnap = await achievementRef.get();

    // Get user data
    const userSnap = await userRef.get();
    if (!userSnap.exists) {
      return res.status(404).json({ error: "User not found" });
    }

    // Get catalog achievement for rewards (needed to get reward amounts)
    const catalogRef = db.collection("achievements").doc(achievementId);
    const catalogSnap = await catalogRef.get();
    
    if (!catalogSnap.exists) {
      return res.status(404).json({ error: "Achievement catalog entry not found" });
    }
    
    const catalogData = catalogSnap.data() || {};
    const target = catalogData.condition?.value || 1;

    const user = userSnap.data() || {};
    
    // If progress document doesn't exist, we need to check user stats to determine progress
    let achievement = achievementSnap.exists ? achievementSnap.data() || {} : {};
    let progress = achievement.progress || 0;
    let isUnlocked = achievement.isUnlocked || false;
    
    // If document doesn't exist, try to determine progress from user stats based on achievement category/ID
    if (!achievementSnap.exists) {
      // Try to get progress from user stats based on achievement type
      const achievementIdLower = achievementId.toLowerCase();
      
      if (achievementIdLower.includes('pomodoro') || achievementIdLower.includes('focus')) {
        progress = user.stats?.focusSessionsCompleted || 0;
      } else if (achievementIdLower.includes('monster')) {
        progress = user.progression?.monstersDefeated || user.stats?.monstersDefeated || 0;
      } else if (achievementIdLower.includes('streak')) {
        progress = user.stats?.streak || 0;
      } else if (achievementIdLower.includes('level')) {
        progress = user.stats?.level || 1;
      } else if (achievementIdLower.includes('task') || achievementIdLower.includes('easy') || 
                 achievementIdLower.includes('medium') || achievementIdLower.includes('hard') || 
                 achievementIdLower.includes('extreme')) {
        // For task achievements, we'd need to count completed tasks
        // For now, set to 0 and let the frontend handle it
        progress = 0;
      }
      
      isUnlocked = progress >= target;
      
      // Create the progress document
      await achievementRef.set({
        achievementId,
        progress,
        isUnlocked,
        claimed: false,
        updatedAt: Date.now(),
      }, { merge: true });
      achievement = { ...achievement, isUnlocked, progress };
    } else {
      // Document exists, but recalculate isUnlocked to ensure it's correct
      isUnlocked = progress >= target;
      if (achievement.isUnlocked !== isUnlocked) {
        await achievementRef.update({
          isUnlocked,
          updatedAt: Date.now(),
        });
      }
    }

    // Check if achievement is unlocked
    if (!isUnlocked) {
      return res.status(400).json({ error: "Achievement is not unlocked yet" });
    }

    // Check if already claimed
    if (achievement.claimed) {
      return res.status(400).json({ error: "Achievement already claimed" });
    }

    // Calculate rewards - use catalog data if available, fallback to progress document
    const xpReward = catalogData.reward?.xp || achievement.reward?.xp || 0;
    const goldReward = catalogData.reward?.gold || achievement.reward?.gold || 0;

    // Update user stats (use totalXP for level calculation)
    const currentTotalXP = user.stats?.totalXP ?? user.stats?.xp ?? 0;
    const newTotalXP = currentTotalXP + xpReward;
    let newGold = (user.stats?.gold || 0) + goldReward;

    // Calculate new level from total XP
    const levelData = await calculateLevelFromXP(newTotalXP);
    const oldLevel = user.stats?.level || 1;
    const leveledUp = levelData.level > oldLevel;

    // Add level-up rewards if leveled up
    if (leveledUp && levelData.rewards) {
      newGold += levelData.rewards.gold || 0;
    }

    // Update user stats
    await userRef.update({
      "stats.level": levelData.level,
      "stats.xp": levelData.currentXP,
      "stats.nextLevelXP": levelData.nextLevelXP,
      "stats.totalXP": newTotalXP,
      "stats.gold": newGold,
      updatedAt: Date.now(),
    });

    // Mark achievement as claimed
    await achievementRef.update({
      claimed: true,
      claimedAt: Date.now(),
    });

    return res.status(200).json({
      success: true,
      rewards: {
        xp: xpReward,
        gold: goldReward,
      },
      leveledUp,
      newLevel: levelData.level,
      levelUpRewards: leveledUp && levelData.rewards ? levelData.rewards : undefined,
    });
  } catch (e: any) {
    console.error("Error in POST /users/:uid/achievements/:achievementId/claim:", e);
    return res.status(500).json({ error: e?.message });
  }
});

/**
 * POST /users/{uid}/battle-rewards
 * Award XP and gold from battle, check for level up
 * Scales rewards based on stage and world level
 */
app.post("/users/:uid/battle-rewards", requireAuth, async (req, res) => {
  try {
    const { uid } = req.params;
    const { xp, gold, worldId, stage, monsterName, battleLogs, monstersDefeated } = req.body;

    if (!uid) {
      return res.status(400).json({ error: "Missing uid" });
    }

    if (xp == null || gold == null) {
      return res.status(400).json({ error: "Missing xp or gold" });
    }

    const userRef = db.collection("users").doc(uid);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      return res.status(404).json({ error: "User not found" });
    }

    const userData = userDoc.data() as any;
    const currentStats = userData.stats || {};
    const currentTotalXP = currentStats.totalXP || 0;
    const currentGold = currentStats.gold || 0;
    const currentLevel = currentStats.level || 1;

    // Calculate stage and world multipliers for rewards
    let stageMultiplier = 1.0;
    let worldLevelMultiplier = 1.0;
    let scaledXp = xp;
    let scaledGold = gold;

    if (worldId && stage) {
      try {
        // Get world level from worldConfig
        const worldConfigSnap = await db.collection("worldConfig").get();
        const worldConfigs = worldConfigSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        // Find world level (usually worlds are numbered 1, 2, 3, etc.)
        const worldNumber = parseInt(worldId.replace(/\D/g, '')) || 1;
        worldLevelMultiplier = 1.0 + (worldNumber - 1) * 0.1; // 10% per world level
        
        // Get stage type multiplier
        const stageTypeSnap = await db.collection("worldConfig").doc("stageTypes").get();
        if (stageTypeSnap.exists) {
          const stageConfig = stageTypeSnap.data() || {};
          
          // Determine stage type
          const stageStructureConfig = worldConfigs.find(c => c.id === "stageStructure");
          const stageStructure = (stageStructureConfig as any) || {};
          const bossStage = stageStructure.bossStage || 10;
          const miniBossStage = stageStructure.miniBossStage || 5;
          const eliteStages = stageStructure.eliteStages || [];
          
          let stageType = "normal";
          if (stage === bossStage) {
            stageType = "boss";
          } else if (stage === miniBossStage) {
            stageType = "miniBoss";
          } else if (eliteStages.includes(stage)) {
            stageType = "elite";
          }
          
          // Get multiplier for this stage type
          const typeConfig = stageConfig[stageType];
          if (typeConfig && typeConfig.rewards) {
            stageMultiplier = (typeConfig.rewards.xpMultiplier || 1.0);
          }
        }

        // Apply multipliers
        scaledXp = Math.floor(xp * stageMultiplier * worldLevelMultiplier);
        scaledGold = Math.floor(gold * stageMultiplier * worldLevelMultiplier);

        console.log(`💰 Rewards Scaling: stage=${stage}, world=${worldNumber}, stageMultiplier=${stageMultiplier}, worldMultiplier=${worldLevelMultiplier}`);
        console.log(`   Original: ${xp} XP, ${gold} Gold → Scaled: ${scaledXp} XP, ${scaledGold} Gold`);
      } catch (scalingErr) {
        console.warn("Failed to apply reward scaling, using base rewards:", scalingErr);
        // Fall back to base rewards if scaling fails
        scaledXp = xp;
        scaledGold = gold;
      }
    }

    // Add scaled XP and gold
    const newTotalXP = currentTotalXP + scaledXp;
    const newGold = currentGold + scaledGold;

    // Calculate new level from total XP
    const levelData = await calculateLevelFromXP(newTotalXP);
    const leveledUp = levelData.level > currentLevel;

    console.log(`🎮 Battle Reward: ${uid} earned ${scaledXp} XP and ${scaledGold} gold`);
    console.log(`📊 Level Check: Current=${currentLevel}, New=${levelData.level}, LeveledUp=${leveledUp}`);

    // Increment monstersDefeated counter (check both progression and stats for backwards compatibility)
    // If monstersDefeated is provided in request (for multi-round battles), use it; otherwise default to 1
    const monstersDefeatedCount = monstersDefeated || 1;
    const fullUserData = userDoc.data() || {};
    const currentMonstersDefeated = fullUserData.progression?.monstersDefeated || currentStats.monstersDefeated || 0;
    const newMonstersDefeated = currentMonstersDefeated + monstersDefeatedCount;

    // Update user stats and progression
    await userRef.update({
      "stats.level": levelData.level,
      "stats.xp": levelData.currentXP,
      "stats.nextLevelXP": levelData.nextLevelXP,
      "stats.totalXP": newTotalXP,
      "stats.gold": newGold,
      "progression.monstersDefeated": newMonstersDefeated, // Update progression.monstersDefeated (primary)
      "stats.monstersDefeated": newMonstersDefeated, // Also update stats.monstersDefeated for backwards compatibility
      updatedAt: Date.now(),
    });

    // Update achievements
    try {
      // Update level achievements if leveled up
      if (leveledUp) {
        await updateLevelAchievements(uid, levelData.level);
      }
      
      // Update monster defeat achievements
      await updateMonsterDefeatAchievements(uid, newMonstersDefeated);
    } catch (achievementError) {
      console.error("Error updating achievements after battle reward:", achievementError);
      // Don't fail the request if achievement update fails
    }

    // Log battle in user's battle history if needed
    if (worldId && stage && monsterName) {
      const battleHistoryRef = db.collection("users").doc(uid).collection("battleHistory");
      await battleHistoryRef.add({
        worldId,
        stage,
        monsterName,
        xpEarned: scaledXp,
        goldEarned: scaledGold,
        leveledUp,
        newLevel: levelData.level,
        stageMultiplier,
        worldLevelMultiplier,
        battleLogs: battleLogs || [], // Store detailed battle logs including crits, blocks, misses
        timestamp: Date.now(),
      });
    }

    return res.status(200).json({
      xpGained: scaledXp,
      newXp: levelData.currentXP,
      newLevel: levelData.level,
      leveledUp,
      levelUpRewards: leveledUp && levelData.rewards ? levelData.rewards : undefined,
      rewardMultipliers: {
        stageMultiplier,
        worldLevelMultiplier,
        totalMultiplier: stageMultiplier * worldLevelMultiplier,
      }
    });
  } catch (e: any) {
    console.error("Error in POST /users/:uid/battle-rewards:", e);
    return res.status(500).json({ error: e?.message });
  }
});

/**
 * GET /users/{uid}/achievements
 */
app.get("/users/:uid/achievements", requireAuth, async (req, res) => {
  try {
    const { uid } = req.params;
    const achievementsRef = db.collection("users").doc(uid).collection("achievements");
    const snap = await achievementsRef.get();

    const achievements = snap.docs.map((doc) => ({
      achievementId: doc.id,
      ...doc.data(),
    }));

    return res.status(200).json(achievements || []);
  } catch (e: any) {
    console.error("Error in GET /users/:uid/achievements:", e);
    // Return empty array instead of error to prevent frontend crashes
    return res.status(200).json([]);
  }
});

/**
 * PATCH /users/{uid}/achievements/{achievementId}
 * Update achievement progress for a user
 */
app.patch("/users/:uid/achievements/:achievementId", requireAuth, async (req, res) => {
  try {
    const { uid, achievementId } = req.params;
    const requestingUid = (req as any).user.uid;
    
    // Ensure user can only update their own achievements
    if (uid !== requestingUid) {
      return res.status(403).json({ error: "Forbidden: Cannot update achievements for other users" });
    }

    const { progress, isUnlocked, unlockedAt } = req.body;
    
    if (progress === undefined && isUnlocked === undefined) {
      return res.status(400).json({ error: "At least one of 'progress' or 'isUnlocked' must be provided" });
    }

    const achievementRef = db.collection("users").doc(uid).collection("achievements").doc(achievementId);
    
    // Check if document exists, if not create it
    const existingDoc = await achievementRef.get();
    const existingData = existingDoc.exists ? existingDoc.data() : {};
    
    const updateData: any = {
      achievementId,
      ...existingData, // Preserve existing data
    };
    
    if (progress !== undefined) updateData.progress = progress;
    if (isUnlocked !== undefined) {
      updateData.isUnlocked = isUnlocked;
      if (isUnlocked && unlockedAt !== undefined) {
        updateData.unlockedAt = unlockedAt;
      } else if (isUnlocked && !unlockedAt && !existingData.unlockedAt) {
        updateData.unlockedAt = Date.now();
      }
    }
    updateData.updatedAt = Date.now();

    await achievementRef.set(updateData, { merge: true });

    const updatedDoc = await achievementRef.get();
    const updatedData = {
      achievementId: updatedDoc.id,
      ...updatedDoc.data(),
    };

    return res.status(200).json(updatedData);
  } catch (e: any) {
    console.error("Error in PATCH /users/:uid/achievements/:achievementId:", e);
    return res.status(500).json({ error: e?.message });
  }
});

/**
 * GET /achievements
 */
app.get("/achievements", async (req, res) => {
  try {
    const snap = await db.collection("achievements").get();

    const achievements = snap.docs.map((doc) => ({
      achievementId: doc.id,
      ...doc.data(),
    }));

    return res.status(200).json({ data: achievements || [] });
  } catch (e: any) {
    console.error("Error in GET /achievements:", e);
    // Return empty array instead of error to prevent frontend crashes
    return res.status(200).json({ data: [] });
  }
});

/**
 * POST /achievements
 */
app.post("/achievements", requireAuth, async (req, res) => {
  try {
    const { title, description, reward, category } = req.body;

    const slug = title.toLowerCase().trim().replace(/\s+/g, '_');
    const customId = `ach_${slug}`;

    const achievementRef = db.collection("achievements").doc(customId);

    const achievement = {
      achievementId: customId,
      title,
      category: category || "general",
      condition: {
        description: description,
        operator: ">=",
        type: "counter",
        value: 10
      },
      reward: {
        gold: reward?.gold || 0,
        xp: reward?.xp || 0
      },
      iconLocked: "lock",
      iconUnlocked: "trophy",
      createdAt: Date.now(),
    };

    await achievementRef.set(achievement);

    return res.status(201).json({
      data: achievement
    });
  } catch (e: any) {
    console.error("Error in POST /achievements:", e);
    return res.status(500).json({ error: e?.message });
  }
});

// ============ INVENTORY ============

/**
 * GET /users/{uid}/inventory
 * Get user's inventory including items and lootboxes from inventory.inventory arrays
 * Fetches full item details from their respective collections
 */
app.get("/users/:uid/inventory", requireAuth, async (req, res) => {
  try {
    const { uid } = req.params;
    // Get user document
    const userSnap = await db.collection("users").doc(uid).get();
    if (!userSnap.exists) {
      return res.status(404).json({ error: "User not found" });
    }
    const user = userSnap.data() || {};

    const rawItems: any[] = user.inventory?.inventory?.items || [];
    // Build a map of collections to unique itemIds
    const colToItemIds: Record<string, Set<string>> = {};
    for (const it of rawItems) {
      const col = (it?.collection || "").toString();
      const id = (it?.itemId || "").toString();
      if (!col || !id) continue;
      if (!colToItemIds[col]) colToItemIds[col] = new Set<string>();
      colToItemIds[col].add(id);
    }

    // Fetch only referenced item docs per collection
    const itemMaps: Record<string, Record<string, any>> = {};
    const fetchCollectionDocs = async (col: string, ids?: string[]) => {
      const map: Record<string, any> = {};
      if (ids && ids.length > 0) {
        for (const id of ids) {
          try {
            const docSnap = await db.collection(col).doc(id).get();
            if (docSnap.exists) {
              const data = docSnap.data() || {};
              map[id] = { itemId: id, ...data };
            }
          } catch (err) {
            console.warn(`Failed to load ${col}/${id}:`, err);
          }
        }
      } else {
        // load full collection as fallback for equipped items missing collection metadata
        try {
          const snap = await db.collection(col).get();
          snap.docs.forEach(docSnap => {
            const data = docSnap.data() || {};
            map[docSnap.id] = { itemId: docSnap.id, ...data };
          });
        } catch (err) {
          console.warn(`Failed to load full collection ${col}:`, err);
        }
      }
      itemMaps[col] = map;
    };

    for (const [col, idSet] of Object.entries(colToItemIds)) {
      await fetchCollectionDocs(col, Array.from(idSet));
    }

    // Ensure default collections are loaded so equipped items without collection info can be resolved
    const defaultCollections = ["items_weapons", "items_armor", "items_pets", "items_accessories", "items_arcane", "items_misc"];
    for (const col of defaultCollections) {
      if (!itemMaps[col]) {
        await fetchCollectionDocs(col);
      }
    }

    const findDetailById = (itemId: string): any | null => {
      for (const map of Object.values(itemMaps)) {
        if (map[itemId]) return map[itemId];
      }
      // Last resort: try per-collection fetch if still missing
      return null;
    };

    const resolveDetail = async (item: any, idx: number, forceEquipped = false) => {
      const base = {
        id: item?.id || `item_${idx}`,
        itemId: item?.itemId || "",
        name: item?.name || item?.title || item?.displayName || item?.itemId || "Unknown Item",
        type: (item?.type || item?.itemType || "misc").toLowerCase(),
        rarity: (item?.rarity || "common").toLowerCase(),
        icon: item?.icon || "📦",
        level: item?.level || 1,
        collection: item?.collection || "",
        addedAt: item?.addedAt || Date.now(),
        isEquipped: forceEquipped ? true : (item?.isEquipped || false),
        description: item?.description || item?.desc || null,
        stats: item?.stats || {},
        buffs: item?.buffs || undefined,
        sellValue: item?.sellValue || item?.price?.sellValue || item?.sell || 0,
        element: item?.element || item?.elemental || undefined,
        bonus: item?.bonus || null,
      } as any;
      const colMap = base.collection ? itemMaps[base.collection] || {} : {};
      let detail = (base.itemId && colMap[base.itemId]) || findDetailById(base.itemId) || {};
      if ((!detail || Object.keys(detail).length === 0) && base.itemId) {
        // fallback: attempt direct doc load across default collections
        const fallbackCols = ["items_weapons", "items_armor", "items_pets", "items_accessories", "items_arcane", "items_misc"];
        for (const col of fallbackCols) {
          try {
            const snap = await db.collection(col).doc(base.itemId).get();
            if (snap.exists) {
              detail = { itemId: base.itemId, ...snap.data() };
              break;
            }
          } catch (err) {
            // ignore
          }
        }
      }
      const merged = { ...base, ...(detail || {}) };
      // Preserve instance-level fields
      merged.bonus = base.bonus;
      merged.sellValue = merged.sellValue || base.sellValue || 0;
      merged.element = merged.element || base.element;
      merged.buffs = merged.buffs || base.buffs;
      return merged;
    };

    // Build detailed items using the maps (with safe fallbacks)
    const itemsWithDetails: any[] = [];
    for (let i = 0; i < rawItems.length; i++) {
      itemsWithDetails.push(await resolveDetail(rawItems[i], i, false));
    }

    // Also include equipped items (so UI can render details even when removed from inventory)
    const equippedObj = user.inventory?.equiped || { armor: {}, pets: {}, accessoiries: {}, weapon: "" };
    const equippedIds: Array<{id: string, slot: string}> = [];
    if (equippedObj.weapon) equippedIds.push({ id: equippedObj.weapon, slot: "weapon" });
    Object.entries(equippedObj.armor || {}).forEach(([slot, id]) => id && equippedIds.push({ id: id as string, slot }));
    Object.entries(equippedObj.pets || {}).forEach(([slot, id]) => id && equippedIds.push({ id: id as string, slot }));
    Object.entries(equippedObj.accessoiries || {}).forEach(([slot, id]) => id && equippedIds.push({ id: id as string, slot }));

    for (let i = 0; i < equippedIds.length; i++) {
      const eq = equippedIds[i];
      const already = itemsWithDetails.find((it) => it.itemId === eq.id);
      if (already) {
        already.isEquipped = true;
        continue;
      }
      // Try to find the original item data in user inventory store (if present elsewhere)
      const original = rawItems.find((it) => it.itemId === eq.id) || { itemId: eq.id, collection: undefined, type: eq.slot };
      const resolved = await resolveDetail(original, 10000 + i, true);
      resolved.slot = eq.slot;
      itemsWithDetails.push(resolved);
    }

    // Lootboxes
    const lootboxArray = user.inventory?.inventory?.lootboxes || [];
    const lootboxCount: Record<string, number> = {};
    lootboxArray.forEach((lb: any) => {
      const lootboxId = lb.lootboxId || lb;
      lootboxCount[lootboxId] = (lootboxCount[lootboxId] || 0) + 1;
    });

    const normalizedInventory = {
      gold: user.stats?.gold || user.inventory?.gold || 0,
      items: itemsWithDetails,
      materials: user.inventory?.materials || {},
      lootboxes: lootboxCount,
      equippedStats: user.inventory?.equippedStats || {},
      lastUpdatedAt: user.inventory?.lastUpdatedAt || Date.now()
    };

    console.log(`📦 [GET /users/${uid}/inventory] ${itemsWithDetails.length} items with details, lootboxes:`, Object.entries(lootboxCount).map(([id, count]) => `${id}:${count}`).join(", "));
    return res.status(200).json(normalizedInventory);
  } catch (e: any) {
    console.error("Error in GET /users/:uid/inventory:", e);
    try {
      // Return a safe fallback to avoid breaking the UI
      const { uid } = req.params;
      const userSnap = await db.collection("users").doc(uid).get();
      const user = userSnap.data() || {};
      const fallback = {
        gold: user.stats?.gold || user.inventory?.gold || 0,
        items: [],
        materials: user.inventory?.materials || {},
        lootboxes: {},
        lastUpdatedAt: user.inventory?.lastUpdatedAt || Date.now(),
        error: String(e?.message || e),
      };
      return res.status(200).json(fallback);
    } catch (inner: any) {
      console.error("Fallback failed in /users/:uid/inventory:", inner);
      return res.status(500).json({ error: inner?.message || String(inner) });
    }
  }
});

/**
 * PATCH /users/{uid}/inventory
 */
app.patch("/users/:uid/inventory", requireAuth, async (req, res) => {
  try {
    const { uid } = req.params;
    const userRef = db.collection("users").doc(uid);

    await userRef.update({
      inventory: req.body,
      updatedAt: Date.now(),
    });

    return res.status(200).json(req.body);
  } catch (e: any) {
    console.error("Error in PATCH /users/:uid/inventory:", e);
    return res.status(500).json({ error: e?.message });
  }
});

// ============ EQUIPMENT ============

/**
 * POST /users/{uid}/equip
 * Equip an item from inventory
 */
app.post("/users/:uid/equip", requireAuth, async (req, res) => {
  try {
    const { uid } = req.params;
    const { itemId, slot: slotParam } = req.body; // slot is optional; will be determined from item's slot field

    if (!itemId) {
      return res.status(400).json({ error: "itemId is required" });
    }

    const userRef = db.collection("users").doc(uid);
    const userSnap = await userRef.get();

    if (!userSnap.exists) {
      return res.status(404).json({ error: "User not found" });
    }

    const user = userSnap.data() as any;
    const inventory = user.inventory || {};
    const equipped = inventory.equiped || { armor: {}, pets: {}, accessoiries: {}, weapon: "" };
    const items = inventory.inventory?.items || [];

    // Check if item exists in inventory
    const itemInInventory = items.find((i: any) => i.itemId === itemId);
    if (!itemInInventory) {
      return res.status(404).json({ error: "Item not found in inventory" });
    }

    // Preserve bonus stats if they exist
    const itemBonus = itemInInventory.bonus || null;

    // Fetch item data from database to get its slot field
    let itemData: any = null;
    
    for (const col of ITEM_COLLECTIONS) {
      try {
        const snap = await db.collection(col).doc(itemId).get();
        if (snap.exists) {
          itemData = snap.data();
          break;
        }
      } catch {}
    }

    if (!itemData) {
      return res.status(404).json({ error: "Item not found in database" });
    }

    // Determine slot: use item's slot field (for armor/accessories), or derive from collection type
    let slot = slotParam; // If provided, use it
    
    if (!slot) {
      // Auto-determine slot from item data
      const itemSlot = itemData.slot || "";
      const collectionName = (itemInInventory.collection || "").toLowerCase();
      
      if (collectionName.includes("items_weapons")) {
        slot = "weapon";
      } else if (collectionName.includes("items_armor")) {
        // Use the item's slot field (e.g., "chestplate", "helmet", "pants", "boots")
        if (["helmet", "chestplate", "pants", "boots"].includes(itemSlot)) {
          slot = itemSlot;
        } else {
          return res.status(400).json({ error: "Unknown armor slot: " + itemSlot });
        }
      } else if (collectionName.includes("items_pets")) {
        // Find first available pet slot
        slot = equipped.pets?.pet1 ? "pet2" : "pet1";
      } else if (collectionName.includes("items_accessories")) {
        // Find first available accessory slot
        slot = equipped.accessoiries?.accessory1 ? "accessory2" : "accessory1";
      } else {
        return res.status(400).json({ error: "Cannot determine slot for item" });
      }
    }

    // Validate slot is legal
    const validSlots = ["weapon", "helmet", "chestplate", "pants", "boots", "pet1", "pet2", "accessory1", "accessory2"];
    if (!validSlots.includes(slot)) {
      return res.status(400).json({ error: `Invalid slot: ${slot}` });
    }

    // Initialize bonuses structure
    const equippedBonuses = inventory.equippedBonuses || {};

    // Unequip current item in slot if exists
    let unequippedItem = null;
    if (slot === "weapon") {
      if (equipped.weapon) {
        unequippedItem = equipped.weapon;
        // Add back to inventory with bonus if it had one
        const oldBonus = equippedBonuses.weapon || null;
        items.push({ itemId: equipped.weapon, ...(oldBonus ? { bonus: oldBonus } : {}) });
        delete equippedBonuses.weapon;
      }
      equipped.weapon = itemId;
      if (itemBonus) equippedBonuses.weapon = itemBonus;
    } else if (["helmet", "chestplate", "pants", "boots"].includes(slot)) {
      if (equipped.armor[slot]) {
        unequippedItem = equipped.armor[slot];
        const oldBonus = equippedBonuses[slot] || null;
        items.push({ itemId: equipped.armor[slot], ...(oldBonus ? { bonus: oldBonus } : {}) });
        delete equippedBonuses[slot];
      }
      equipped.armor[slot] = itemId;
      if (itemBonus) equippedBonuses[slot] = itemBonus;
    } else if (slot === "pet1" || slot === "pet2") {
      if (equipped.pets[slot]) {
        unequippedItem = equipped.pets[slot];
        const oldBonus = equippedBonuses[slot] || null;
        items.push({ itemId: equipped.pets[slot], ...(oldBonus ? { bonus: oldBonus } : {}) });
        delete equippedBonuses[slot];
      }
      equipped.pets[slot] = itemId;
      if (itemBonus) equippedBonuses[slot] = itemBonus;
    } else if (slot === "accessory1" || slot === "accessory2") {
      if (equipped.accessoiries[slot]) {
        unequippedItem = equipped.accessoiries[slot];
        const oldBonus = equippedBonuses[slot] || null;
        items.push({ itemId: equipped.accessoiries[slot], ...(oldBonus ? { bonus: oldBonus } : {}) });
        delete equippedBonuses[slot];
      }
      equipped.accessoiries[slot] = itemId;
      if (itemBonus) equippedBonuses[slot] = itemBonus;
    }

    // Remove equipped item from inventory
    const updatedItems = items.filter((i: any) => i.itemId !== itemId);

    // Compute aggregated stats from currently equipped items
    const aggregateKeys = ["attack","magicAttack","hp","defense","magicResist","speed","critChance","critDamage","goldBonus","xpBonus"];
    const totals: Record<string, number> = Object.fromEntries(aggregateKeys.map(k => [k, 0]));

    const resolveVal = (key: string, statsObj: any, buffsObj: any) => {
      const s = statsObj || {};
      const b = buffsObj || {};
      if (key === "critChance") return Number(s.crit ?? b.crit ?? s.critChance ?? b.critChance ?? 0);
      if (key === "magicAttack") return Number(s.magic ?? b.magic ?? s.magicAttack ?? b.magicAttack ?? 0);
      if (key === "magicResist") return Number(s.magicRes ?? b.magicRes ?? s.magicResist ?? b.magicResist ?? 0);
      if (key === "goldBonus") return Number(s.gold ?? b.gold ?? s.goldBonus ?? b.goldBonus ?? 0);
      if (key === "xpBonus") return Number(s.xp ?? b.xp ?? s.xpBonus ?? b.xpBonus ?? 0);
      return Number(s[key] ?? b[key] ?? 0);
    };

    const resolveFromInventory = (eqId: string) => {
      // try matching against itemId, id, instanceId in the current items array
      const match = items.find((i: any) => i.itemId === eqId || i.id === eqId || i.instanceId === eqId);
      return match || null;
    };

    const equippedIds: string[] = [
      ...(equipped.weapon ? [equipped.weapon] : []),
      ...Object.values(equipped.armor || {}),
      ...Object.values(equipped.pets || {}),
      ...Object.values(equipped.accessoiries || {}),
    ].filter(Boolean) as string[];

    for (const eqId of equippedIds) {
      let found: any = null;
      for (const col of ITEM_COLLECTIONS) {
        try {
          const snap = await db.collection(col).doc(eqId).get();
          if (snap.exists) {
            found = snap.data();
            break;
          }
        } catch {}
      }
      if (!found) continue;
      const statsObj: any = found.stats || {};
      const buffsObj: any = found.buffs || {};
      for (const key of aggregateKeys) {
        const val = resolveVal(key, statsObj, buffsObj);
        if (!isNaN(val)) totals[key] += val;
      }
    }

    // Add bonus stats from equippedBonuses
    for (const [bonusSlot, bonusData] of Object.entries(equippedBonuses)) {
      if (bonusData && typeof bonusData === 'object') {
        for (const key of aggregateKeys) {
          const val = resolveVal(key, bonusData, {});
          if (!isNaN(val)) totals[key] += val;
        }
      }
    }

    await userRef.update({
      "inventory.equiped": equipped,
      "inventory.inventory.items": updatedItems,
      "inventory.equippedBonuses": equippedBonuses,
      "inventory.equippedStats": totals,
      updatedAt: Date.now(),
    });

    // Recalculate and save total stats
    const totalStats = await calculateTotalStatsForUser(user);
    await userRef.update({
      "stats.totalStats": totalStats,
    });

    return res.status(200).json({
      success: true,
      equipped: itemId,
      slot,
      unequipped: unequippedItem,
      equiped: equipped,
      equippedStats: totals,
    });
  } catch (e: any) {
    console.error("Error in POST /users/:uid/equip:", e);
    return res.status(500).json({ error: e?.message });
  }
});

/**
 * POST /users/{uid}/unequip
 * Unequip an item and move it back to inventory
 */
app.post("/users/:uid/unequip", requireAuth, async (req, res) => {
  try {
    const { uid } = req.params;
    const { slot } = req.body; // slot: 'weapon', 'helmet', 'chestplate', 'pants', 'boots', 'pet1', 'pet2', 'accessory1', 'accessory2'

    if (!slot) {
      return res.status(400).json({ error: "slot is required" });
    }

    const userRef = db.collection("users").doc(uid);
    const userSnap = await userRef.get();

    if (!userSnap.exists) {
      return res.status(404).json({ error: "User not found" });
    }

    const user = userSnap.data() as any;
    const inventory = user.inventory || {};
    const equipped = inventory.equiped || { armor: {}, pets: {}, accessoiries: {}, weapon: "" };
    const equippedBonuses = inventory.equippedBonuses || {};
    const items = inventory.inventory?.items || [];

    let unequippedItemId = null;
    let unequippedBonus = null;

    // Find and remove item from equipped slot
    if (slot === "weapon") {
      if (!equipped.weapon) {
        return res.status(400).json({ error: "No weapon equipped" });
      }
      unequippedItemId = equipped.weapon;
      unequippedBonus = equippedBonuses.weapon || null;
      equipped.weapon = "";
      delete equippedBonuses.weapon;
    } else if (["helmet", "chestplate", "pants", "boots"].includes(slot)) {
      if (!equipped.armor[slot]) {
        return res.status(400).json({ error: `No armor equipped in ${slot}` });
      }
      unequippedItemId = equipped.armor[slot];
      unequippedBonus = equippedBonuses[slot] || null;
      delete equipped.armor[slot];
      delete equippedBonuses[slot];
    } else if (slot === "pet1" || slot === "pet2") {
      if (!equipped.pets[slot]) {
        return res.status(400).json({ error: `No pet equipped in ${slot}` });
      }
      unequippedItemId = equipped.pets[slot];
      unequippedBonus = equippedBonuses[slot] || null;
      delete equipped.pets[slot];
      delete equippedBonuses[slot];
    } else if (slot === "accessory1" || slot === "accessory2") {
      if (!equipped.accessoiries[slot]) {
        return res.status(400).json({ error: `No accessory equipped in ${slot}` });
      }
      unequippedItemId = equipped.accessoiries[slot];
      unequippedBonus = equippedBonuses[slot] || null;
      delete equipped.accessoiries[slot];
      delete equippedBonuses[slot];
    } else {
      return res.status(400).json({ error: `Invalid slot: ${slot}` });
    }

    // Add item back to inventory with bonus if it had one
    items.push({ itemId: unequippedItemId, ...(unequippedBonus ? { bonus: unequippedBonus } : {}) });

    // Compute aggregated stats from currently equipped items
    const aggregateKeys = ["attack","magicAttack","hp","defense","magicResist","speed","critChance","critDamage","goldBonus","xpBonus"];
    const totals: Record<string, number> = Object.fromEntries(aggregateKeys.map(k => [k, 0]));

    const resolveVal = (key: string, statsObj: any, buffsObj: any) => {
      const s = statsObj || {};
      const b = buffsObj || {};
      if (key === "critChance") return Number(s.crit ?? b.crit ?? s.critChance ?? b.critChance ?? 0);
      if (key === "magicAttack") return Number(s.magic ?? b.magic ?? s.magicAttack ?? b.magicAttack ?? 0);
      if (key === "magicResist") return Number(s.magicRes ?? b.magicRes ?? s.magicResist ?? b.magicResist ?? 0);
      if (key === "goldBonus") return Number(s.gold ?? b.gold ?? s.goldBonus ?? b.goldBonus ?? 0);
      if (key === "xpBonus") return Number(s.xp ?? b.xp ?? s.xpBonus ?? b.xpBonus ?? 0);
      return Number(s[key] ?? b[key] ?? 0);
    };

    const resolveFromInventory = (eqId: string) => {
      const match = items.find((i: any) => i.itemId === eqId || i.id === eqId || i.instanceId === eqId);
      return match || null;
    };

    const equippedIds: string[] = [
      ...(equipped.weapon ? [equipped.weapon] : []),
      ...Object.values(equipped.armor || {}),
      ...Object.values(equipped.pets || {}),
      ...Object.values(equipped.accessoiries || {}),
    ].filter(Boolean) as string[];

    const collections = ["items_weapons","items_armor","items_arcane","items_pets","items_accessories"];

    for (const eqId of equippedIds) {
      let found: any = null;
      for (const col of collections) {
        try {
          const snap = await db.collection(col).doc(eqId).get();
          if (snap.exists) {
            found = snap.data();
            break;
          }
        } catch {}
      }
      if (!found) {
        found = resolveFromInventory(eqId);
      }
      if (!found) continue;
      const statsObj: any = found.stats || {};
      const buffsObj: any = found.buffs || {};
      for (const key of aggregateKeys) {
        const val = resolveVal(key, statsObj, buffsObj);
        if (!isNaN(val)) totals[key] += val;
      }
    }

    // Add bonus stats from equippedBonuses
    for (const [bonusSlot, bonusData] of Object.entries(equippedBonuses)) {
      if (bonusData && typeof bonusData === 'object') {
        for (const key of aggregateKeys) {
          const val = resolveVal(key, bonusData, {});
          if (!isNaN(val)) totals[key] += val;
        }
      }
    }

    await userRef.update({
      "inventory.equiped": equipped,
      "inventory.inventory.items": items,
      "inventory.equippedBonuses": equippedBonuses,
      "inventory.equippedStats": totals,
      updatedAt: Date.now(),
    });

    // Recalculate and save total stats
    const totalStats = await calculateTotalStatsForUser(user);
    await userRef.update({
      "stats.totalStats": totalStats,
    });

    return res.status(200).json({
      success: true,
      unequipped: unequippedItemId,
      slot,
      equiped: equipped,
      equippedStats: totals,
    });
  } catch (e: any) {
    console.error("Error in POST /users/:uid/unequip:", e);
    return res.status(500).json({ error: e?.message });
  }
});

// Sell an item (remove one instance and grant gold)
app.post("/users/:uid/inventory/sell", requireAuth, async (req, res) => {
  try {
    const { uid } = req.params;
    const { itemId, bonus } = req.body || {};
    if (!itemId) return res.status(400).json({ error: "itemId is required" });

    const userRef = db.collection("users").doc(uid);
    const snap = await userRef.get();
    if (!snap.exists) return res.status(404).json({ error: "User not found" });
    const user = snap.data() || {};

    const items: any[] = user.inventory?.inventory?.items || [];
    const eqBonus = (a: any, b: any) => JSON.stringify(a || {}) === JSON.stringify(b || {});
    const idx = items.findIndex((it) => (it?.itemId === itemId) && eqBonus(it?.bonus, bonus));
    if (idx < 0) return res.status(404).json({ error: "Item not found" });

    const removed = items.splice(idx, 1)[0] || {};

    // Determine sell value
    let sellValue = removed.sellValue || removed.price?.sellValue || removed.sell || 0;
    // Try to load detail for fallback sellValue
    if (!sellValue) {
      const collection = removed.collection || "items_pets";
      try {
        const doc = await db.collection(collection).doc(itemId).get();
        if (doc.exists) {
          const data = doc.data() || {};
          sellValue = data.sellValue || data.price?.sellValue || data.sell || sellValue;
        }
      } catch (err) {
        // ignore
      }
    }

    const currentGold = user.stats?.gold || user.inventory?.gold || 0;
    const newGold = currentGold + (sellValue || 0);

    const newInventory = {
      ...(user.inventory || {}),
      inventory: {
        ...(user.inventory?.inventory || {}),
        items,
      },
    };

    const updates: any = {
      inventory: newInventory,
      "stats.gold": newGold,
    };

    await userRef.update(updates);

    return res.status(200).json({ success: true, gold: newGold, sold: itemId, sellValue: sellValue || 0 });
  } catch (e: any) {
    console.error("Error in sell:", e);
    return res.status(500).json({ error: e?.message || "Failed to sell item" });
  }
});

/**
 * GET /users/{uid}/equipped
 * Get all equipped items
 */
app.get("/users/:uid/equipped", requireAuth, async (req, res) => {
  try {
    const { uid } = req.params;
    const userSnap = await db.collection("users").doc(uid).get();

    if (!userSnap.exists) {
      return res.status(404).json({ error: "User not found" });
    }

    const user = userSnap.data() || {};
    const userLevel = user.stats?.level || 1;
    const equipped = user.inventory?.equiped || { armor: {}, pets: {}, accessoiries: {}, weapon: "" };
    const equippedBonuses = user.inventory?.equippedBonuses || {};
    const items = user.inventory?.inventory?.items || [];

    // Step 1: Get playerScaling and compute base stats for user level
    const configSnap = await db.collection("worldConfig").doc("playerScaling").get();
    const configData = configSnap.exists ? (configSnap.data() || {}) : {};
    
    console.log("DEBUG - configData from Firestore:", configData);
    
    // Extract baseStats with proper field mapping (health -> hp)
    const configBaseStats = configData.baseStats || {};
    const baseStats = { 
      attack: configBaseStats.attack || 10, 
      defense: configBaseStats.defense || 6, 
      health: configBaseStats.health || 100,  // This maps to hp in userBaseStats
      magic: configBaseStats.magic || 8, 
      magicResist: configBaseStats.magicResist || 5 
    };
    
    const configPerLevel = configData.perLevel || {};
    const perLevel = { 
      attack: configPerLevel.attack ?? 2, 
      defense: configPerLevel.defense ?? 1.5, 
      health: configPerLevel.health ?? 12, 
      magic: configPerLevel.magic ?? 2, 
      magicResist: configPerLevel.magicResist ?? 1.5 
    };
    
    console.log("DEBUG - baseStats resolved:", baseStats);
    console.log("DEBUG - perLevel resolved:", perLevel);
    console.log("DEBUG - userLevel:", userLevel);
    
    const levelFactor = Math.max(0, userLevel - 1);
    console.log("DEBUG - levelFactor:", levelFactor);
    
    const userBaseStats: Record<string, number> = {
      attack: Math.round((baseStats.attack) + (perLevel.attack) * levelFactor),
      defense: Math.round((baseStats.defense) + (perLevel.defense) * levelFactor),
      hp: Math.round((baseStats.health) + (perLevel.health) * levelFactor),
      magicAttack: Math.round((baseStats.magic) + (perLevel.magic) * levelFactor),
      magicResist: Math.round((baseStats.magicResist) + (perLevel.magicResist) * levelFactor),
      speed: 0,
      critChance: 0,
      critDamage: 0,
      goldBonus: 0,
      xpBonus: 0,
    };
    
    console.log("DEBUG - FINAL userBaseStats:", userBaseStats);

    // Step 2: Aggregate equipped item stats
    const aggregateKeys = ["attack","magicAttack","hp","defense","magicResist","speed","critChance","critDamage","goldBonus","xpBonus"];
    const equippedTotals: Record<string, number> = Object.fromEntries(aggregateKeys.map(k => [k, 0]));

    const resolveVal = (key: string, statsObj: any, buffsObj: any) => {
      const s = statsObj || {};
      const b = buffsObj || {};
      if (key === "critChance") return Number(s.crit ?? b.crit ?? s.critChance ?? b.critChance ?? 0);
      if (key === "magicAttack") return Number(s.magic ?? b.magic ?? s.magicAttack ?? b.magicAttack ?? 0);
      if (key === "magicResist") return Number(s.magicRes ?? b.magicRes ?? s.magicResist ?? b.magicResist ?? 0);
      if (key === "goldBonus") return Number(s.gold ?? b.gold ?? s.goldBonus ?? b.goldBonus ?? 0);
      if (key === "xpBonus") return Number(s.xp ?? b.xp ?? s.xpBonus ?? b.xpBonus ?? 0);
      return Number(s[key] ?? b[key] ?? 0);
    };

    const resolveFromInventory = (eqId: string) => {
      const match = items.find((i: any) => i.itemId === eqId || i.id === eqId || i.instanceId === eqId);
      return match || null;
    };

    const equippedIds: string[] = [
      ...(equipped.weapon ? [equipped.weapon] : []),
      ...Object.values(equipped.armor || {}),
      ...Object.values(equipped.pets || {}),
      ...Object.values(equipped.accessoiries || {}),
    ].filter(Boolean) as string[];

    console.log("DEBUG - equipped object:", JSON.stringify(equipped, null, 2));
    console.log("DEBUG - equippedIds extracted:", equippedIds);
    console.log("DEBUG - equippedIds count:", equippedIds.length);

    const collections = ["items_weapons","items_armor","items_arcane","items_pets","items_accessories"];

    let itemsFoundCount = 0;
    for (const eqId of equippedIds) {
      let found: any = null;
      console.log("DEBUG - looking for item:", eqId);
      for (const col of collections) {
        try {
          const snap = await db.collection(col).doc(eqId).get();
          if (snap.exists) {
            found = snap.data();
            console.log("DEBUG - FOUND item in collection", col, "- data:", found);
            itemsFoundCount++;
            break;
          }
        } catch (e) {
          console.log("DEBUG - error searching", col, ":", e);
        }
      }
      if (!found) {
        found = resolveFromInventory(eqId);
        if (found) {
          console.log("DEBUG - FOUND item in inventory array - data:", found);
          itemsFoundCount++;
        }
      }
      if (!found) {
        console.log("DEBUG - ITEM NOT FOUND:", eqId);
        continue;
      }
      const statsObj: any = found.stats || {};
      const buffsObj: any = found.buffs || {};
      console.log("DEBUG - item:", eqId, "- stats:", statsObj, "- buffs:", buffsObj);
      for (const key of aggregateKeys) {
        const val = resolveVal(key, statsObj, buffsObj);
        if (!isNaN(val)) {
          equippedTotals[key] += val;
          console.log("DEBUG - aggregated", key, "+=", val, "-> total now", equippedTotals[key]);
        }
      }
    }

    console.log("DEBUG - items found and aggregated:", itemsFoundCount, "out of", equippedIds.length);
    console.log("DEBUG - equippedTotals after items:", equippedTotals);
    console.log("DEBUG - equippedBonuses object:", equippedBonuses);

    // Add bonus stats from equippedBonuses
    for (const [bonusSlot, bonusData] of Object.entries(equippedBonuses)) {
      if (bonusData && typeof bonusData === 'object') {
        console.log("DEBUG - adding bonus from slot", bonusSlot, bonusData);
        for (const key of aggregateKeys) {
          const val = resolveVal(key, bonusData, {});
          if (!isNaN(val)) equippedTotals[key] += val;
        }
      }
    }

    console.log("DEBUG - equippedTotals final:", equippedTotals);

    // Step 3: Combine base stats + equipped stats = total stats
    const totalStats: Record<string, number> = {};
    for (const key of aggregateKeys) {
      totalStats[key] = (userBaseStats[key] || 0) + (equippedTotals[key] || 0);
    }

    console.log("DEBUG - totalStats final:", totalStats);

    return res.status(200).json({ 
      equipped, 
      equippedBonuses,
      userBaseStats,
      equippedStats: equippedTotals,
      totalStats
    });
  } catch (e: any) {
    console.error("Error in GET /users/:uid/equipped:", e);
    return res.status(500).json({ error: e?.message });
  }
});

/**
 * POST /users/{uid}/recalc-stats
 * Recalculate and save total stats to database
 * Called after equipping/unequipping items
 */
app.post("/users/:uid/recalc-stats", requireAuth, async (req, res) => {
  try {
    const { uid } = req.params;
    const userRef = db.collection("users").doc(uid);
    const userSnap = await userRef.get();

    if (!userSnap.exists) {
      return res.status(404).json({ error: "User not found" });
    }

    const user = userSnap.data() || {};
    const userLevel = user.stats?.level || 1;
    const equipped = user.inventory?.equiped || { armor: {}, pets: {}, accessoiries: {}, weapon: "" };
    const equippedBonuses = user.inventory?.equippedBonuses || {};
    const items = user.inventory?.inventory?.items || [];

    // Step 1: Compute base stats from playerScaling
    const configSnap = await db.collection("worldConfig").doc("playerScaling").get();
    const configData = configSnap.exists ? (configSnap.data() || {}) : {};
    
    const configBaseStats = configData.baseStats || {};
    const baseStats = { 
      attack: configBaseStats.attack || 10, 
      defense: configBaseStats.defense || 6, 
      health: configBaseStats.health || 100,
      magic: configBaseStats.magic || 8, 
      magicResist: configBaseStats.magicResist || 5 
    };
    
    const configPerLevel = configData.perLevel || {};
    const perLevel = { 
      attack: configPerLevel.attack ?? 2, 
      defense: configPerLevel.defense ?? 1.5, 
      health: configPerLevel.health ?? 12, 
      magic: configPerLevel.magic ?? 2, 
      magicResist: configPerLevel.magicResist ?? 1.5 
    };
    
    const levelFactor = Math.max(0, userLevel - 1);
    const userBaseStats: Record<string, number> = {
      attack: Math.round((baseStats.attack) + (perLevel.attack) * levelFactor),
      defense: Math.round((baseStats.defense) + (perLevel.defense) * levelFactor),
      hp: Math.round((baseStats.health) + (perLevel.health) * levelFactor),
      magicAttack: Math.round((baseStats.magic) + (perLevel.magic) * levelFactor),
      magicResist: Math.round((baseStats.magicResist) + (perLevel.magicResist) * levelFactor),
      speed: 0,
      critChance: 0,
      critDamage: 0,
      goldBonus: 0,
      xpBonus: 0,
    };

    // Step 2: Aggregate equipped item stats
    const aggregateKeys = ["attack","magicAttack","hp","defense","magicResist","speed","critChance","critDamage","goldBonus","xpBonus"];
    const equippedTotals: Record<string, number> = Object.fromEntries(aggregateKeys.map(k => [k, 0]));

    const resolveVal = (key: string, statsObj: any, buffsObj: any) => {
      const s = statsObj || {};
      const b = buffsObj || {};
      if (key === "critChance") return Number(s.crit ?? b.crit ?? s.critChance ?? b.critChance ?? 0);
      if (key === "magicAttack") return Number(s.magic ?? b.magic ?? s.magicAttack ?? b.magicAttack ?? 0);
      if (key === "magicResist") return Number(s.magicRes ?? b.magicRes ?? s.magicResist ?? b.magicResist ?? 0);
      if (key === "goldBonus") return Number(s.gold ?? b.gold ?? s.goldBonus ?? b.goldBonus ?? 0);
      if (key === "xpBonus") return Number(s.xp ?? b.xp ?? s.xpBonus ?? b.xpBonus ?? 0);
      return Number(s[key] ?? b[key] ?? 0);
    };

    const resolveFromInventory = (eqId: string) => {
      const match = items.find((i: any) => i.itemId === eqId || i.id === eqId || i.instanceId === eqId);
      return match || null;
    };

    const equippedIds: string[] = [
      ...(equipped.weapon ? [equipped.weapon] : []),
      ...Object.values(equipped.armor || {}),
      ...Object.values(equipped.pets || {}),
      ...Object.values(equipped.accessoiries || {}),
    ].filter(Boolean) as string[];

    const collections = ["items_weapons","items_armor","items_arcane","items_pets","items_accessories"];

    for (const eqId of equippedIds) {
      let found: any = null;
      for (const col of collections) {
        try {
          const snap = await db.collection(col).doc(eqId).get();
          if (snap.exists) {
            found = snap.data();
            break;
          }
        } catch {}
      }
      if (!found) {
        found = resolveFromInventory(eqId);
      }
      if (!found) continue;
      const statsObj: any = found.stats || {};
      const buffsObj: any = found.buffs || {};
      for (const key of aggregateKeys) {
        const val = resolveVal(key, statsObj, buffsObj);
        if (!isNaN(val)) equippedTotals[key] += val;
      }
    }

    // Add bonus stats from equippedBonuses
    for (const [bonusSlot, bonusData] of Object.entries(equippedBonuses)) {
      if (bonusData && typeof bonusData === 'object') {
        for (const key of aggregateKeys) {
          const val = resolveVal(key, bonusData, {});
          if (!isNaN(val)) equippedTotals[key] += val;
        }
      }
    }

    // Step 3: Combine to get total stats
    const totalStats: Record<string, number> = {};
    for (const key of aggregateKeys) {
      totalStats[key] = (userBaseStats[key] || 0) + (equippedTotals[key] || 0);
    }

    // Step 4: Save to database under stats.totalStats
    await userRef.update({
      "stats.totalStats": totalStats
    });

    console.log(`Recalculated stats for user ${uid}:`, totalStats);

    return res.status(200).json({ 
      success: true,
      totalStats,
      userBaseStats,
      equippedTotals
    });
  } catch (e: any) {
    console.error("Error in POST /users/:uid/recalc-stats:", e);
    return res.status(500).json({ error: e?.message });
  }
});

/**
 * GET /users/{uid}/stats
 * Get user's total stats (from database)
 */
app.get("/users/:uid/stats", requireAuth, async (req, res) => {
  try {
    const { uid } = req.params;
    const userRef = db.collection("users").doc(uid);
    const userSnap = await userRef.get();

    if (!userSnap.exists) {
      return res.status(404).json({ error: "User not found" });
    }

    const user = userSnap.data() || {};
    const totalStats = user.stats?.totalStats || {};

    // If totalStats not in database, recalculate and save
    if (!totalStats || Object.keys(totalStats).length === 0) {
      const userLevel = user.stats?.level || 1;
      const equipped = user.inventory?.equiped || { armor: {}, pets: {}, accessoiries: {}, weapon: "" };
      const equippedBonuses = user.inventory?.equippedBonuses || {};
      const items = user.inventory?.inventory?.items || [];

      const configSnap = await db.collection("worldConfig").doc("playerScaling").get();
      const configData = configSnap.exists ? (configSnap.data() || {}) : {};
      
      const configBaseStats = configData.baseStats || {};
      const baseStats = { 
        attack: configBaseStats.attack || 10, 
        defense: configBaseStats.defense || 6, 
        health: configBaseStats.health || 100,
        magic: configBaseStats.magic || 8, 
        magicResist: configBaseStats.magicResist || 5 
      };
      
      const configPerLevel = configData.perLevel || {};
      const perLevel = { 
        attack: configPerLevel.attack ?? 2, 
        defense: configPerLevel.defense ?? 1.5, 
        health: configPerLevel.health ?? 12, 
        magic: configPerLevel.magic ?? 2, 
        magicResist: configPerLevel.magicResist ?? 1.5 
      };
      
      const levelFactor = Math.max(0, userLevel - 1);
      const userBaseStats: Record<string, number> = {
        attack: Math.round((baseStats.attack) + (perLevel.attack) * levelFactor),
        defense: Math.round((baseStats.defense) + (perLevel.defense) * levelFactor),
        hp: Math.round((baseStats.health) + (perLevel.health) * levelFactor),
        magicAttack: Math.round((baseStats.magic) + (perLevel.magic) * levelFactor),
        magicResist: Math.round((baseStats.magicResist) + (perLevel.magicResist) * levelFactor),
        speed: 0,
        critChance: 0,
        critDamage: 0,
        goldBonus: 0,
        xpBonus: 0,
      };

      const aggregateKeys = ["attack","magicAttack","hp","defense","magicResist","speed","critChance","critDamage","goldBonus","xpBonus"];
      const equippedTotals: Record<string, number> = Object.fromEntries(aggregateKeys.map(k => [k, 0]));

      const resolveVal = (key: string, statsObj: any, buffsObj: any) => {
        const s = statsObj || {};
        const b = buffsObj || {};
        if (key === "critChance") return Number(s.crit ?? b.crit ?? s.critChance ?? b.critChance ?? 0);
        if (key === "magicAttack") return Number(s.magic ?? b.magic ?? s.magicAttack ?? b.magicAttack ?? 0);
        if (key === "magicResist") return Number(s.magicRes ?? b.magicRes ?? s.magicResist ?? b.magicResist ?? 0);
        if (key === "goldBonus") return Number(s.gold ?? b.gold ?? s.goldBonus ?? b.goldBonus ?? 0);
        if (key === "xpBonus") return Number(s.xp ?? b.xp ?? s.xpBonus ?? b.xpBonus ?? 0);
        return Number(s[key] ?? b[key] ?? 0);
      };

      const resolveFromInventory = (eqId: string) => {
        const match = items.find((i: any) => i.itemId === eqId || i.id === eqId || i.instanceId === eqId);
        return match || null;
      };

      const equippedIds: string[] = [
        ...(equipped.weapon ? [equipped.weapon] : []),
        ...Object.values(equipped.armor || {}),
        ...Object.values(equipped.pets || {}),
        ...Object.values(equipped.accessoiries || {}),
      ].filter(Boolean) as string[];

      const collections = ["items_weapons","items_armor","items_arcane","items_pets","items_accessories"];

      for (const eqId of equippedIds) {
        let found: any = null;
        for (const col of collections) {
          try {
            const snap = await db.collection(col).doc(eqId).get();
            if (snap.exists) {
              found = snap.data();
              break;
            }
          } catch {}
        }
        if (!found) {
          found = resolveFromInventory(eqId);
        }
        if (!found) continue;
        const statsObj: any = found.stats || {};
        const buffsObj: any = found.buffs || {};
        for (const key of aggregateKeys) {
          const val = resolveVal(key, statsObj, buffsObj);
          if (!isNaN(val)) equippedTotals[key] += val;
        }
      }

      for (const [bonusSlot, bonusData] of Object.entries(equippedBonuses)) {
        if (bonusData && typeof bonusData === 'object') {
          for (const key of aggregateKeys) {
            const val = resolveVal(key, bonusData, {});
            if (!isNaN(val)) equippedTotals[key] += val;
          }
        }
      }

      const newTotalStats: Record<string, number> = {};
      for (const key of aggregateKeys) {
        newTotalStats[key] = (userBaseStats[key] || 0) + (equippedTotals[key] || 0);
      }

      await userRef.update({
        "stats.totalStats": newTotalStats
      });

      return res.status(200).json({ 
        totalStats: newTotalStats,
        calculated: true
      });
    }

    return res.status(200).json({ 
      totalStats,
      calculated: false
    });
  } catch (e: any) {
    console.error("Error in GET /users/:uid/stats:", e);
    return res.status(500).json({ error: e?.message });
  }
});

/**
 * GET /users/{uid}/stamina
 * Get current stamina with regeneration calculated
 */
app.get("/users/:uid/stamina", requireAuth, async (req, res) => {
  try {
    const { uid } = req.params;
    const userRef = db.collection("users").doc(uid);
    const userSnap = await userRef.get();

    if (!userSnap.exists) {
      return res.status(404).json({ error: "User not found" });
    }

    // Get stamina system config
    const { maxStamina, regenRateMinutes } = await getStaminaConfig();

    const user = userSnap.data() || {};
    const currentStamina = user.stats?.stamina ?? maxStamina;
    const lastRegen = user.stats?.lastStaminaRegen;

    // Calculate current stamina with regeneration
    const { stamina, lastRegen: newLastRegen } = await calculateCurrentStamina(
      currentStamina,
      maxStamina,
      lastRegen,
      regenRateMinutes
    );

    // Update lastRegen if stamina changed
    if (stamina !== currentStamina) {
      await userRef.update({
        "stats.stamina": stamina,
        "stats.lastStaminaRegen": newLastRegen,
        "stats.maxStamina": maxStamina
      });
    } else if (!user.stats?.maxStamina) {
      // Ensure maxStamina is set
      await userRef.update({
        "stats.maxStamina": maxStamina
      });
    }

    // Calculate time until next regeneration
    const now = Date.now();
    const minutesUntilNext = regenRateMinutes - ((now - newLastRegen) / 60000) % regenRateMinutes;
    const nextRegenIn = Math.ceil(minutesUntilNext * 60000);

    // Calculate time until full stamina
    const pointsNeeded = maxStamina - stamina;
    const timeUntilFull = pointsNeeded * regenRateMinutes * 60000;

    return res.status(200).json({
      currentStamina: stamina,
      maxStamina,
      regenerationRate: regenRateMinutes,
      nextRegenIn,
      timeUntilFull: stamina >= maxStamina ? 0 : timeUntilFull,
      canBattle: stamina > 0
    });
  } catch (e: any) {
    console.error("Error in GET /users/:uid/stamina:", e);
    return res.status(500).json({ error: e?.message });
  }
});

/**
 * POST /users/{uid}/stamina/consume
 * Consume stamina (called internally by combat/start)
 */
app.post("/users/:uid/stamina/consume", requireAuth, async (req, res) => {
  try {
    const { uid } = req.params;
    const { amount } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: "Amount must be a positive number" });
    }

    const userRef = db.collection("users").doc(uid);
    const userSnap = await userRef.get();

    if (!userSnap.exists) {
      return res.status(404).json({ error: "User not found" });
    }

    // Get stamina system config
    const { maxStamina, regenRateMinutes } = await getStaminaConfig();

    const user = userSnap.data() || {};
    const currentStamina = user.stats?.stamina ?? maxStamina;
    const lastRegen = user.stats?.lastStaminaRegen;

    // Calculate current stamina with regeneration
    const { stamina: staminaBefore, lastRegen: newLastRegen } = await calculateCurrentStamina(
      currentStamina,
      maxStamina,
      lastRegen,
      regenRateMinutes
    );

    // Check if user has enough stamina
    if (staminaBefore < amount) {
      return res.status(403).json({
        error: "Insufficient stamina",
        currentStamina: staminaBefore,
        required: amount,
        deficit: amount - staminaBefore
      });
    }

    // Consume stamina
    const staminaAfter = staminaBefore - amount;

    await userRef.update({
      "stats.stamina": staminaAfter,
      "stats.lastStaminaRegen": newLastRegen,
      "stats.maxStamina": maxStamina
    });

    return res.status(200).json({
      success: true,
      staminaBefore,
      staminaAfter,
      currentStamina: staminaAfter
    });
  } catch (e: any) {
    console.error("Error in POST /users/:uid/stamina/consume:", e);
    return res.status(500).json({ error: e?.message });
  }
});

/**
 * POST /users/{uid}/inventory/add-item
 * Add item to inventory (from lootbox, quest reward, etc)
 */
app.post("/users/:uid/inventory/add-item", requireAuth, async (req, res) => {
  try {
    const { uid } = req.params;
    const { itemId, quantity = 1 } = req.body;

    if (!itemId) {
      return res.status(400).json({ error: "itemId is required" });
    }

    const userRef = db.collection("users").doc(uid);
    const userSnap = await userRef.get();

    if (!userSnap.exists) {
      return res.status(404).json({ error: "User not found" });
    }

    const user = userSnap.data() as any;
    const inventory = user.inventory || {};
    const items = inventory.inventory?.items || [];

    // Add item(s) to inventory
    for (let i = 0; i < quantity; i++) {
      items.push({ itemId, addedAt: Date.now() });
    }

    await userRef.update({
      "inventory.inventory.items": items,
      updatedAt: Date.now(),
    });

    return res.status(200).json({
      success: true,
      itemId,
      quantity,
      totalItems: items.length,
    });
  } catch (e: any) {
    console.error("Error in POST /users/:uid/inventory/add-item:", e);
    return res.status(500).json({ error: e?.message });
  }
});

/**
 * POST /users/{uid}/inventory/add-lootbox
 * Add lootbox to inventory (from level-up reward, quest, etc)
 */
app.post("/users/:uid/inventory/add-lootbox", requireAuth, async (req, res) => {
  try {
    const { uid } = req.params;
    const { lootboxId, quantity = 1 } = req.body;

    if (!lootboxId) {
      return res.status(400).json({ error: "lootboxId is required" });
    }

    const userRef = db.collection("users").doc(uid);
    const userSnap = await userRef.get();

    if (!userSnap.exists) {
      return res.status(404).json({ error: "User not found" });
    }

    const user = userSnap.data() as any;
    const inventory = user.inventory || {};
    const lootboxes = inventory.inventory?.lootboxes || [];

    // Add lootbox(es) to inventory
    for (let i = 0; i < quantity; i++) {
      lootboxes.push({ lootboxId, addedAt: Date.now() });
    }

    await userRef.update({
      "inventory.inventory.lootboxes": lootboxes,
      updatedAt: Date.now(),
    });

    return res.status(200).json({
      success: true,
      lootboxId,
      quantity,
      totalLootboxes: lootboxes.length,
    });
  } catch (e: any) {
    console.error("Error in POST /users/:uid/inventory/add-lootbox:", e);
    return res.status(500).json({ error: e?.message });
  }
});

/**
 * DELETE /users/{uid}/inventory/item/:itemId
 * Remove item from inventory (consumed, sold, etc)
 */
app.delete("/users/:uid/inventory/item/:itemId", requireAuth, async (req, res) => {
  try {
    const { uid, itemId } = req.params;

    const userRef = db.collection("users").doc(uid);
    const userSnap = await userRef.get();

    if (!userSnap.exists) {
      return res.status(404).json({ error: "User not found" });
    }

    const user = userSnap.data() as any;
    const inventory = user.inventory || {};
    const items = inventory.inventory?.items || [];

    // Find and remove first occurrence of item
    const itemIndex = items.findIndex((i: any) => i.itemId === itemId);
    if (itemIndex === -1) {
      return res.status(404).json({ error: "Item not found in inventory" });
    }

    items.splice(itemIndex, 1);

    await userRef.update({
      "inventory.inventory.items": items,
      updatedAt: Date.now(),
    });

    return res.status(200).json({
      success: true,
      removed: itemId,
      remainingItems: items.length,
    });
  } catch (e: any) {
    console.error("Error in DELETE /users/:uid/inventory/item/:itemId:", e);
    return res.status(500).json({ error: e?.message });
  }
});

/**
 * POST /users/{uid}/reroll
 * Reroll 3 items of same rarity + gold for chance at better item
 */
app.post("/users/:uid/reroll", requireAuth, async (req, res) => {
  try {
    const { uid } = req.params;
    const { itemIds } = req.body; // Array of 3 itemIds

    // Validate input
    if (!itemIds || !Array.isArray(itemIds) || itemIds.length !== 3) {
      return res.status(400).json({ error: "Must provide exactly 3 items to reroll" });
    }

    const userRef = db.collection("users").doc(uid);
    const userSnap = await userRef.get();

    if (!userSnap.exists) {
      return res.status(404).json({ error: "User not found" });
    }

    const user = userSnap.data() as any;
    const inventory = user.inventory || {};
    const items = inventory.inventory?.items || [];
    const currentGold = user.stats?.gold || 0;

    // Find the 3 items in inventory
    const itemsToReroll: any[] = [];
    const rarities = new Set();

    for (const itemId of itemIds) {
      const item = items.find((i: any) => i.itemId === itemId);
      if (!item) {
        return res.status(404).json({ error: `Item ${itemId} not found in inventory` });
      }
      itemsToReroll.push(item);
      rarities.add(item.rarity);
    }

    // Validate all items have same rarity
    if (rarities.size !== 1) {
      return res.status(400).json({ 
        error: "All 3 items must have the same rarity",
        rarities: Array.from(rarities)
      });
    }

    const baseRarity = itemsToReroll[0].rarity;

    // Get reroll rules
    const rerollRulesSnap = await db.collection("rerollRules").get();
    const rerollRules: any = {};
    rerollRulesSnap.docs.forEach((doc) => {
      rerollRules[doc.id] = doc.data();
    });

    const goldCosts = rerollRules.goldCosts || {};
    const rarityOrder = rerollRules.rarityOrder?.value || ["common", "uncommon", "rare", "epic", "legendary"];
    const rarityMultipliers = rerollRules.rarityMultipliers || {};
    const bonusSystem = rerollRules.bonusSystem || {};

    // Determine gold cost based on rarity
    const goldCostKey = `${baseRarity}_to_${rarityOrder[rarityOrder.indexOf(baseRarity) + 1] || "legendary"}`;
    const goldCost = goldCosts[goldCostKey] || 500;

    // Check if user has enough gold
    if (currentGold < goldCost) {
      return res.status(400).json({ 
        error: `Not enough gold. Need ${goldCost}, have ${currentGold}`,
        required: goldCost,
        current: currentGold
      });
    }

    // Get failure protection (pity counter)
    const failureProtection = rerollRules.failureProtection || {};
    const pityEnabled = failureProtection.enabled || false;
    const pityCounter = failureProtection.pityCounter || {};
    const maxFails = pityCounter.maxFails || 5;
    const guaranteedBonusOnNext = pityCounter.guaranteedBonusOnNext || false;

    // Get user's current pity counter
    const userPityCount = user.stats?.rerollPityCount || 0;

    // Determine new rarity based on multipliers
    const baseRarityIndex = rarityOrder.indexOf(baseRarity);
    let newRarity = baseRarity;
    let guaranteedUpgrade = false;

    // Check if pity system triggers
    if (pityEnabled && userPityCount >= maxFails) {
      guaranteedUpgrade = true;
      // Guaranteed upgrade to at least next tier
      if (baseRarityIndex < rarityOrder.length - 1) {
        newRarity = rarityOrder[baseRarityIndex + 1];
      }
    } else {
      // Roll for rarity upgrade
      const roll = Math.random();
      let cumulativeChance = 0;

      // Check from highest to lowest
      for (let i = rarityOrder.length - 1; i > baseRarityIndex; i--) {
        const targetRarity = rarityOrder[i];
        const multiplier = rarityMultipliers[targetRarity] || 1;
        const chance = 1 / multiplier; // Higher multiplier = lower chance
        
        cumulativeChance += chance;
        if (roll <= cumulativeChance) {
          newRarity = targetRarity;
          break;
        }
      }

      // If no upgrade, stay at same rarity
      if (newRarity === baseRarity && baseRarityIndex < rarityOrder.length - 1) {
        // Small chance to upgrade by 1 tier
        if (Math.random() < 0.3) {
          newRarity = rarityOrder[baseRarityIndex + 1];
        }
      }
    }

    // Get random item of new rarity from allowed item types
    const allowedTypes = rerollRules.allowedItemTypes || { weapon: true, armor: true, pet: true, accessory: true };
    const collections = [];
    if (allowedTypes.weapon) collections.push("items_weapons");
    if (allowedTypes.armor) collections.push("items_armor");
    if (allowedTypes.pet) collections.push("items_pets");
    if (allowedTypes.accessory) collections.push("items_arcane");

    const randomCollection = collections[Math.floor(Math.random() * collections.length)];
    const itemsSnap = await db.collection(randomCollection).get();
    const availableItems = itemsSnap.docs
      .map(doc => ({ itemId: doc.id, ...doc.data() }))
      .filter((item: any) => item.rarity === newRarity && item.isActive !== false);

    let newItem: any = null;

    if (availableItems.length > 0) {
      newItem = availableItems[Math.floor(Math.random() * availableItems.length)];
    } else {
      // Fallback: create generic item
      newItem = {
        itemId: `rerolled_${newRarity}_${Date.now()}`,
        name: `Rerolled ${newRarity.charAt(0).toUpperCase() + newRarity.slice(1)} Item`,
        rarity: newRarity,
        type: "weapon",
      };
    }

    // Determine if reroll was successful (upgraded)
    const upgraded = newRarity !== baseRarity;
    
    // Update pity counter
    let newPityCount = userPityCount;
    if (pityEnabled) {
      if (upgraded) {
        newPityCount = 0; // Reset on success
      } else {
        newPityCount = userPityCount + 1; // Increment on fail
      }
    }

    // Roll for bonus stats (higher chance on reroll)
    let bonusStats = null;
    let bonusChance = (bonusSystem.bonusChance || 0) * 2; // 2x chance on reroll
    
    // Guaranteed bonus if pity triggered
    if (guaranteedUpgrade && guaranteedBonusOnNext) {
      bonusChance = 1; // 100% bonus chance
    }
    
    if (bonusSystem.enabled && Math.random() <= bonusChance) {
      bonusStats = {};
      const possibleBonuses = bonusSystem.possibleBonuses || {};
      const bonusTypes = Object.keys(possibleBonuses);
      
      if (bonusTypes.length > 0) {
        // Higher rarity = more bonus stats
        const rarityIndex = rarityOrder.indexOf(newRarity);
        const numBonuses = Math.min(rarityIndex + 1, 3); // 1-3 bonuses
        
        for (let b = 0; b < numBonuses && bonusTypes.length > 0; b++) {
          const randomIndex = Math.floor(Math.random() * bonusTypes.length);
          const bonusType = bonusTypes.splice(randomIndex, 1)[0];
          
          const bonusRange = possibleBonuses[bonusType];
          const min = bonusRange?.min || 0;
          const max = bonusRange?.max || 0;
          const bonusValue = min + Math.random() * (max - min);
          
          if (bonusType === "critChance" || bonusType === "critDamage") {
            bonusStats[bonusType] = Math.round(bonusValue * 1000) / 1000;
          } else {
            bonusStats[bonusType] = Math.round(bonusValue);
          }
        }
      }
    }

    // Remove the 3 items from inventory
    const updatedItems = items.filter((i: any) => !itemIds.includes(i.itemId));

    // Add new item to inventory
    updatedItems.push({
      itemId: newItem.itemId,
      rarity: newRarity,
      type: newItem.type,
      collection: randomCollection,
      bonus: bonusStats,
      rerolled: true,
      addedAt: Date.now(),
    });

    // Update user
    const updateData: any = {
      "inventory.inventory.items": updatedItems,
      "stats.gold": currentGold - goldCost,
      updatedAt: Date.now(),
    };

    // Update pity counter if enabled
    if (pityEnabled) {
      updateData["stats.rerollPityCount"] = newPityCount;
    }

    await userRef.update(updateData);

    return res.status(200).json({
      success: true,
      consumed: {
        items: itemIds,
        rarity: baseRarity,
        gold: goldCost,
      },
      result: {
        itemId: newItem.itemId,
        name: newItem.name,
        rarity: newRarity,
        upgraded,
        guaranteedUpgrade,
        bonus: bonusStats,
        ...newItem,
      },
      pitySystem: pityEnabled ? {
        previousCount: userPityCount,
        newCount: newPityCount,
        maxFails,
        nextIsGuaranteed: newPityCount >= maxFails,
      } : null,
      remainingGold: currentGold - goldCost,
    });
  } catch (e: any) {
    console.error("Error in POST /users/:uid/reroll:", e);
    return res.status(500).json({ error: e?.message });
  }
});

// ============ GAME CONFIG & RULES ============

/**
 * GET /game-config
 * Get game configuration (economy, stamina, leaderboards, etc)
 */
app.get("/game-config", async (req, res) => {
  try {
    const configSnap = await db.collection("gameConfig").get();
    
    const configs: any = {};
    configSnap.docs.forEach((doc) => {
      configs[doc.id] = doc.data();
    });

    return res.status(200).json(configs);
  } catch (e: any) {
    console.error("Error in GET /game-config:", e);
    return res.status(500).json({ error: e?.message });
  }
});

/**
 * GET /world-config
 * Get world configuration (monster scaling, player scaling, stage structure, etc)
 */
app.get("/world-config", async (req, res) => {
  try {
    const configSnap = await db.collection("worldConfig").get();
    
    const configs: any = {};
    configSnap.docs.forEach((doc) => {
      configs[doc.id] = doc.data();
    });

    return res.status(200).json(configs);
  } catch (e: any) {
    console.error("Error in GET /world-config:", e);
    return res.status(500).json({ error: e?.message });
  }
});

/**
 * GET /templates/:templateId
 * Get template data
 */
app.get("/templates/:templateId", async (req, res) => {
  try {
    const { templateId } = req.params;
    const templateSnap = await db.collection("templates").doc(templateId).get();
    
    if (!templateSnap.exists) {
      return res.status(404).json({ error: "Template not found" });
    }

    return res.status(200).json(templateSnap.data());
  } catch (e: any) {
    console.error("Error in GET /templates/:templateId:", e);
    return res.status(500).json({ error: e?.message });
  }
});

/**
 * GET /game-rules
 * Get all game rules (combat, elements, scaling, etc)
 */
app.get("/game-rules", async (req, res) => {
  try {
    const rulesSnap = await db.collection("gameRules").doc("main").get();
    
    if (!rulesSnap.exists) {
      return res.status(404).json({ error: "Game rules not found" });
    }

    return res.status(200).json(rulesSnap.data());
  } catch (e: any) {
    console.error("Error in GET /game-rules:", e);
    return res.status(500).json({ error: e?.message });
  }
});

/**
 * GET /game-rules/combat
 * Get combat-specific rules
 */
app.get("/game-rules/combat", async (req, res) => {
  try {
    const rulesSnap = await db.collection("gameRules").doc("main").get();
    
    if (!rulesSnap.exists) {
      return res.status(404).json({ error: "Game rules not found" });
    }

    const rules = rulesSnap.data() || {};
    
    return res.status(200).json({
      combatRules: rules.combatRules || {},
      caps: rules.caps || {},
      difficultyMultipliers: rules.difficultyMultipliers || {},
    });
  } catch (e: any) {
    console.error("Error in GET /game-rules/combat:", e);
    return res.status(500).json({ error: e?.message });
  }
});

/**
 * GET /game-rules/elements
 * Get element effectiveness matrix and properties
 */
app.get("/game-rules/elements", async (req, res) => {
  try {
    const rulesSnap = await db.collection("gameRules").doc("main").get();
    
    if (!rulesSnap.exists) {
      return res.status(404).json({ error: "Game rules not found" });
    }

    const rules = rulesSnap.data() || {};
    
    return res.status(200).json(rules.elements || {});
  } catch (e: any) {
    console.error("Error in GET /game-rules/elements:", e);
    return res.status(500).json({ error: e?.message });
  }
});

/**
 * GET /levels/definitions
 * Get all level definitions with XP requirements and rewards
 */
app.get("/levels/definitions", async (req, res) => {
  try {
    const levelsSnap = await db.collection("levels").doc("definitions").get();
    
    if (!levelsSnap.exists) {
      return res.status(404).json({ error: "Level definitions not found" });
    }

    return res.status(200).json(levelsSnap.data());
  } catch (e: any) {
    console.error("Error in GET /levels/definitions:", e);
    return res.status(500).json({ error: e?.message });
  }
});

/**
 * GET /levels/:level
 * Get specific level definition
 */
app.get("/levels/:level", async (req, res) => {
  try {
    const { level } = req.params;
    const levelNum = parseInt(level);
    
    const levelsSnap = await db.collection("levels").doc("definitions").get();
    
    if (!levelsSnap.exists) {
      return res.status(404).json({ error: "Level definitions not found" });
    }

    const levelsData = levelsSnap.data() || {};
    const levels = levelsData.levels || [];
    const levelDef = levels.find((l: any) => l.level === levelNum);

    if (!levelDef) {
      return res.status(404).json({ error: `Level ${levelNum} not found` });
    }

    return res.status(200).json(levelDef);
  } catch (e: any) {
    console.error("Error in GET /levels/:level:", e);
    return res.status(500).json({ error: e?.message });
  }
});

/**
 * POST /levels/definitions/init
 * Initialize level definitions in Firestore (creates if not exists)
 * Uses the same exponential curve as the fallback (baseXP=100, growthFactor=1.18)
 */
app.post("/levels/definitions/init", async (req, res) => {
  try {
    const BASE_XP = 100;
    const GROWTH_FACTOR = 1.18;
    const MAX_LEVEL = 100;

    const levels = [];
    let cumulativeXP = 0;

    for (let level = 1; level <= MAX_LEVEL; level++) {
      // Calculate XP needed for this level
      const xpForThisLevel = Math.floor(BASE_XP * Math.pow(GROWTH_FACTOR, level - 1));
      cumulativeXP += xpForThisLevel;

      // Add rewards every 5 levels
      const rewards = level % 5 === 0 ? {
        gold: level * 10,
      } : undefined;

      levels.push({
        level: level,
        xpRequiredTotal: cumulativeXP - xpForThisLevel, // XP needed BEFORE starting this level
        xpForLevel: xpForThisLevel, // XP needed to complete this level
        rewards: rewards
      });
    }

    const definitions = {
      levels: levels,
      baseXP: BASE_XP,
      growthFactor: GROWTH_FACTOR,
      maxLevel: MAX_LEVEL,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    // Create or update the document
    await db.collection("levels").doc("definitions").set(definitions, { merge: false });

    return res.status(200).json({
      success: true,
      message: `Created ${levels.length} level definitions`,
      levelsCreated: levels.length
    });
  } catch (e: any) {
    console.error("Error in POST /levels/definitions/init:", e);
    return res.status(500).json({ error: e?.message });
  }
});

/**
 * GET /reroll-rules
 * Get reroll system configuration (bonus system, gold costs, rarity multipliers, etc)
 */
app.get("/reroll-rules", async (req, res) => {
  try {
    const rerollSnap = await db.collection("rerollRules").get();
    
    const rules: any = {};
    rerollSnap.docs.forEach((doc) => {
      rules[doc.id] = doc.data();
    });

    return res.status(200).json(rules);
  } catch (e: any) {
    console.error("Error in GET /reroll-rules:", e);
    return res.status(500).json({ error: e?.message });
  }
});

/**
 * GET /reroll-rules/bonus-system
 * Get item bonus system configuration
 */
app.get("/reroll-rules/bonus-system", async (req, res) => {
  try {
    const bonusSnap = await db.collection("rerollRules").doc("bonusSystem").get();
    
    if (!bonusSnap.exists) {
      return res.status(404).json({ error: "Bonus system config not found" });
    }

    return res.status(200).json(bonusSnap.data());
  } catch (e: any) {
    console.error("Error in GET /reroll-rules/bonus-system:", e);
    return res.status(500).json({ error: e?.message });
  }
});

// ============ USERS ============

/**
 * POST /users
 * Maakeen nieuwe gebruiker aan in Auth en Firestore
 */
app.post("/users", requireAuth, async (req, res) => {
  try {
    // Check if the requester is an admin
    const requesterSnap = await db.collection("users").doc((req as any).user.uid).get();
    if (!requesterSnap.exists || requesterSnap.data()?.role !== 'admin') {
      return res.status(403).json({ error: "Forbidden: Only admins can create users" });
    }

    const { email, displayName, role } = req.body;
    const defaultPassword = "ehbleerkracht.123";

    //Maak de gebruiker aan in Firebase Authentication
    const userRecord = await admin.auth().createUser({
      email,
      password: defaultPassword,
      displayName,
    });

    //Sla de aanvullende gegevens op in Firestore
    const userData = {
      uid: userRecord.uid,
      email,
      displayName,
      role: role || 'student',
      status: 'active',
      mustChangePassword: true, //Gebruiker moet wachtwoord wijzigen bij eerste login
      createdAt: Date.now(),
      updatedAt: Date.now(),
      stats: { hp: 100, gold: 0, level: 1, xp: 0 },
      inventory: { gold: 0, items: [], materials: {} },
      settings: { theme: 'light', language: 'nl', notificationsEnabled: true }
    };

    await admin.firestore().collection("users").doc(userRecord.uid).set(userData);

    return res.status(201).json(userData);
  } catch (e: any) {
    console.error("Error creating user:", e);
    return res.status(500).json({ error: e?.message });
  }
});

/**
 * GET /users/{uid}
 */
app.get("/users/:uid", async (req, res) => {
  try {
    const { uid } = req.params;
    const userSnap = await db.collection("users").doc(uid).get();

    if (!userSnap.exists) {
      return res.status(404).json({ error: "User not found" });
    }

    return res.status(200).json({
      uid: userSnap.id,
      ...userSnap.data(),
    });
  } catch (e: any) {
    console.error("Error in GET /users/:uid:", e);
    return res.status(500).json({ error: e?.message });
  }
});

/**
 * PATCH /users/{uid}
 */
app.patch("/users/:uid", requireAuth, async (req, res) => {
  try {
    const { uid } = req.params;
    const userRef = db.collection("users").doc(uid);

    await userRef.update({
      ...req.body,
      updatedAt: Date.now(),
    });
    const updated = await userRef.get();
    return res.status(200).json({
      uid: updated.id,
      ...updated.data(),
    });
  } catch (e: any) {
    console.error("Error in PATCH /users/:uid:", e);
    return res.status(500).json({ error: e?.message });
  }
});

/**
 * GET /users
 */
app.get("/users", requireAuth, async (req, res) => {
    try {
        const { role, status, limit = 50 } = req.query;
        let query: any = db.collection("users");

        if (role) {
            query = query.where("role", "==", role);
        }

        if (status) {
            query = query.where("status", "==", status);
        }

        // We halen de data op zonder de complexe sortering die indexen vereist
        const snap = await query.limit(parseInt(limit as string, 10) || 50).get();

        const users = snap.docs.map((doc: any) => ({
            uid: doc.id,
            ...doc.data(),
        }));

        return res.status(200).json({
            data: users,
            pagination: {
                total: snap.size,
                limit: parseInt(limit as string, 10) || 50
            },
        });
    } catch (e: any) {
        console.error("Error in GET /users:", e);
    return res.status(500).json({ error: e?.message });
  }
});

/**
 * GET /users/{uid}/settings
 */
app.get("/users/:uid/settings", requireAuth, async (req, res) => {
  try {
    const { uid } = req.params;
    const userSnap = await db.collection("users").doc(uid).get();
    const user = userSnap.data() || {};

    return res.status(200).json(user.settings || {});
  } catch (e: any) {
    console.error("Error in GET /users/:uid/settings:", e);
    return res.status(500).json({ error: e?.message });
  }
});

/**
 * PATCH /users/{uid}/settings
 */
app.patch("/users/:uid/settings", requireAuth, async (req, res) => {
  try {
    const { uid } = req.params;
    const userRef = db.collection("users").doc(uid);

    await userRef.update({
      settings: req.body,
      updatedAt: Date.now(),
    });

    return res.status(200).json(req.body);
  } catch (e: any) {
    console.error("Error in PATCH /users/:uid/settings:", e);
    return res.status(500).json({ error: e?.message });
  }
});

// ============ NOTIFICATIONS ============

/**
 * GET /users/{uid}/notifications
 */
app.get("/users/:uid/notifications", requireAuth, async (req, res) => {
  try {
    const { uid } = req.params;
    const notifRef = db.collection("users").doc(uid).collection("notifications");
    const snap = await notifRef.orderBy("createdAt", "desc").get();

    const notifications = snap.docs.map((doc) => ({
      notificationId: doc.id,
      ...doc.data(),
    }));

    return res.status(200).json(notifications);
  } catch (e: any) {
    console.error("Error in GET /users/:uid/notifications:", e);
    return res.status(500).json({ error: e?.message });
  }
});

/**
 * POST /users/{uid}/notifications
 */
app.post("/users/:uid/notifications", requireAuth, async (req, res) => {
  try {
    const { uid } = req.params;
    const { title, message, type } = req.body;

    const notifRef = db.collection("users").doc(uid).collection("notifications").doc();
    await notifRef.set({
      title,
      message,
      type,
      read: false,
      createdAt: Date.now(),
    });

    return res.status(201).json({
      notificationId: notifRef.id,
      title,
      message,
      type,
      read: false,
      createdAt: Date.now(),
    });
  } catch (e: any) {
    console.error("Error in POST /users/:uid/notifications:", e);
    return res.status(500).json({ error: e?.message });
  }
});

// ============ LEADERBOARDS ============

/**
 * GET /leaderboards/global
 */
app.get("/leaderboards/global", async (req, res) => {
  try {
    const snap = await db
      .collection("users")
      .orderBy("stats.totalXP", "desc")
      .limit(100)
      .get();

    const leaderboard = snap.docs.map((doc, index) => ({
      rank: index + 1,
      uid: doc.id,
      displayName: doc.data().displayName,
      totalXP: doc.data().stats?.totalXP || 0,
      level: doc.data().stats?.level || 1,
    }));

    return res.status(200).json(leaderboard);
  } catch (e: any) {
    console.error("Error in GET /leaderboards/global:", e);
    return res.status(500).json({ error: e?.message });
  }
});

// ============ COURSES ============

/**
 * GET /courses
 * Teachers can only see their own courses (createdBy = uid)
 * Students can only see their enrolled courses
 * Admins can see all courses
 */
app.get("/courses", requireAuth, async (req, res) => {
  try {
    const uid = (req as any).user.uid;
    const activeOnly = req.query.activeOnly === "true";
    
    // Get user role
    const userSnap = await db.collection("users").doc(uid).get();
    const userData = userSnap.data();
    const userRole = userData?.role || "student";
    
    let courses: any[] = [];
    
    if (userRole === "teacher") {
      // Teachers can only see their own courses
      const coursesRef = db.collection("courses");
      let query: any = coursesRef.where("createdBy", "==", uid);
      
      if (activeOnly) {
        query = query.where("isActive", "==", true);
      }

      const snap = await query.get();
      courses = snap.docs.map((doc) => ({
        courseId: doc.id,
        ...doc.data(),
      }));
    } else if (userRole === "student") {
      // Students can only see their enrolled courses
      const coursesRef = db.collection("courses");
      const allCoursesSnap = await coursesRef.get();
      
      for (const courseDoc of allCoursesSnap.docs) {
        const courseData = courseDoc.data();
        
        // Skip inactive courses if activeOnly is true
        if (activeOnly && !courseData.isActive) {
          continue;
        }
        
        // Check if student is enrolled in this course
        const enrollmentSnap = await db
          .collection("courses")
          .doc(courseDoc.id)
          .collection("students")
          .doc(uid)
          .get();
        
        if (enrollmentSnap.exists) {
          courses.push({
            courseId: courseDoc.id,
            ...courseData,
          });
        }
      }
    } else if (userRole === "admin") {
      // Admins can see all courses
      const coursesRef = db.collection("courses");
      let query: any = coursesRef;
      
      if (activeOnly) {
        query = query.where("isActive", "==", true);
      }

      const snap = await query.get();
      courses = snap.docs.map((doc) => ({
        courseId: doc.id,
        ...doc.data(),
      }));
    }

    return res.status(200).json(courses);
  } catch (e: any) {
    console.error("Error in GET /courses:", e);
    return res.status(500).json({ error: e?.message });
  }
});

/**
 * POST /courses
 * Automatically set createdBy to the authenticated user's uid
 */
app.post("/courses", requireAuth, async (req, res) => {
  try {
    const uid = (req as any).user.uid;
    const newCourseRef = db.collection("courses").doc();
    const course = {
      ...req.body,
      createdBy: uid,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    await newCourseRef.set(course);

    return res.status(201).json({
      courseId: newCourseRef.id,
      ...course,
    });
  } catch (e: any) {
    console.error("Error in POST /courses:", e);
    return res.status(500).json({ error: e?.message });
  }
});

/**
 * GET /courses/:courseId
 */
app.get("/courses/:courseId", async (req, res) => {
  try {
    const { courseId } = req.params;
    const courseSnap = await db.collection("courses").doc(courseId).get();

    if (!courseSnap.exists) {
      return res.status(404).json({ error: "Course not found" });
    }

    return res.status(200).json({
      courseId: courseSnap.id,
      ...courseSnap.data(),
    });
  } catch (e: any) {
    console.error("Error in GET /courses/:courseId:", e);
    return res.status(500).json({ error: e?.message });
  }
});

/**
 * PUT /courses/:courseId
 * Teachers can only modify their own courses
 */
app.put("/courses/:courseId", requireAuth, async (req, res) => {
  try {
    const uid = (req as any).user.uid;
    const { courseId } = req.params;
    const courseRef = db.collection("courses").doc(courseId);
    
    // Check if course exists and user has permission
    const courseSnap = await courseRef.get();
    if (!courseSnap.exists) {
      return res.status(404).json({ error: "Course not found" });
    }
    
    const courseData = courseSnap.data();
    const userSnap = await db.collection("users").doc(uid).get();
    const userRole = userSnap.data()?.role || "student";
    
    // Only creator or admin can modify
    if (userRole !== "admin" && courseData?.createdBy !== uid) {
      return res.status(403).json({ error: "Not authorized to modify this course" });
    }
    
    const course = {
      ...req.body,
      createdBy: courseData?.createdBy || uid,
      updatedAt: Date.now(),
    };
    await courseRef.set(course, { merge: false });

    return res.status(200).json({
      courseId,
      ...course,
    });
  } catch (e: any) {
    console.error("Error in PUT /courses/:courseId:", e);
    return res.status(500).json({ error: e?.message });
  }
});

/**
 * PATCH /courses/:courseId
 * Teachers can only modify their own courses
 */
app.patch("/courses/:courseId", requireAuth, async (req, res) => {
  try {
    const uid = (req as any).user.uid;
    const { courseId } = req.params;
    const courseRef = db.collection("courses").doc(courseId);
    
    // Check if course exists and user has permission
    const courseSnap = await courseRef.get();
    if (!courseSnap.exists) {
      return res.status(404).json({ error: "Course not found" });
    }
    
    const courseData = courseSnap.data();
    const userSnap = await db.collection("users").doc(uid).get();
    const userRole = userSnap.data()?.role || "student";
    
    // Only creator or admin can modify
    if (userRole !== "admin" && courseData?.createdBy !== uid) {
      return res.status(403).json({ error: "Not authorized to modify this course" });
    }
    
    await courseRef.update({
      ...req.body,
      updatedAt: Date.now(),
    });

    const updated = await courseRef.get();
    return res.status(200).json({
      courseId: updated.id,
      ...updated.data(),
    });
  } catch (e: any) {
    console.error("Error in PATCH /courses/:courseId:", e);
    return res.status(500).json({ error: e?.message });
  }
});

/**
 * DELETE /courses/:courseId
 * Teachers can only delete their own courses
 */
app.delete("/courses/:courseId", requireAuth, async (req, res) => {
  try {
    const uid = (req as any).user.uid;
    const { courseId } = req.params;
    const courseRef = db.collection("courses").doc(courseId);
    
    // Check if course exists and user has permission
    const courseSnap = await courseRef.get();
    if (!courseSnap.exists) {
      return res.status(404).json({ error: "Course not found" });
    }
    
    const courseData = courseSnap.data();
    const userSnap = await db.collection("users").doc(uid).get();
    const userRole = userSnap.data()?.role || "student";
    
    // Only creator or admin can delete
    if (userRole !== "admin" && courseData?.createdBy !== uid) {
      return res.status(403).json({ error: "Not authorized to delete this course" });
    }
    
    await courseRef.delete();
    return res.status(200).json({ success: true });
  } catch (e: any) {
    console.error("Error in DELETE /courses/:courseId:", e);
    return res.status(500).json({ error: e?.message });
  }
});

/**
 * GET /courses/:courseId/students
 */
app.get("/courses/:courseId/students", requireAuth, async (req, res) => {
  try {
    const { courseId } = req.params;
    const studentsSnap = await db
      .collection("courses")
      .doc(courseId)
      .collection("students")
      .get();

    const students = await Promise.all(
      studentsSnap.docs.map(async (doc) => {
        const studentData = doc.data();
        
        // Fetch displayName from users collection
        let displayName = doc.id;
        try {
          const userSnap = await db.collection("users").doc(doc.id).get();
          if (userSnap.exists) {
            const userData = userSnap.data();
            displayName = userData?.displayName || userData?.email?.split('@')[0] || doc.id;
          }
        } catch (err) {
          console.error(`Error fetching user data for ${doc.id}:`, err);
        }

        return {
          uid: doc.id,
          ...studentData,
          displayName,
        };
      })
    );

    return res.status(200).json(students);
  } catch (e: any) {
    console.error("Error in GET /courses/:courseId/students:", e);
    return res.status(500).json({ error: e?.message });
  }
});

/**
 * POST /courses/:courseId/students
 */
app.post("/courses/:courseId/students", requireAuth, async (req, res) => {
  try {
    const { courseId } = req.params;
    const { uid } = req.body;
    await db
      .collection("courses")
      .doc(courseId)
      .collection("students")
      .doc(uid)
      .set({
        ...req.body,
        enrolledAt: Date.now(),
      });

    return res.status(200).json({ success: true });
  } catch (e: any) {
    console.error("Error in POST /courses/:courseId/students:", e);
    return res.status(500).json({ error: e?.message });
  }
});

/**
 * DELETE /courses/:courseId/students
 */
app.delete("/courses/:courseId/students", requireAuth, async (req, res) => {
  try {
    const { courseId } = req.params;
    const { uid } = req.body;
    await db
      .collection("courses")
      .doc(courseId)
      .collection("students")
      .doc(uid)
      .delete();

    return res.status(200).json({ success: true });
  } catch (e: any) {
    console.error("Error in DELETE /courses/:courseId/students:", e);
    return res.status(500).json({ error: e?.message });
  }
});

/**
 * GET /courses/:courseId/modules
 */
app.get("/courses/:courseId/modules", async (req, res) => {
  try {
    const { courseId } = req.params;
    const modulesSnap = await db
      .collection("courses")
      .doc(courseId)
      .collection("modules")
      .get();

    const modules = modulesSnap.docs.map((doc) => ({
      moduleId: doc.id,
      ...doc.data(),
    }));

    return res.status(200).json(modules);
  } catch (e: any) {
    console.error("Error in GET /courses/:courseId/modules:", e);
    return res.status(500).json({ error: e?.message });
  }
});

/**
 * POST /courses/:courseId/modules
 */
app.post("/courses/:courseId/modules", requireAuth, async (req, res) => {
  try {
    const { courseId } = req.params;
    const newModuleRef = db
      .collection("courses")
      .doc(courseId)
      .collection("modules")
      .doc();

    const module = {
      ...req.body,
      createdAt: Date.now(),
    };
    await newModuleRef.set(module);

    return res.status(201).json({
      moduleId: newModuleRef.id,
      ...module,
    });
  } catch (e: any) {
    console.error("Error in POST /courses/:courseId/modules:", e);
    return res.status(500).json({ error: e?.message });
  }
});

/**
 * GET /modules/:moduleId
 */
app.get("/modules/:moduleId", async (req, res) => {
  try {
    const { moduleId } = req.params;
    // We need to search across all courses - simplified approach
    const coursesSnap = await db.collection("courses").get();
    
    for (const courseDoc of coursesSnap.docs) {
      const moduleSnap = await courseDoc.ref.collection("modules").doc(moduleId).get();
      if (moduleSnap.exists) {
        return res.status(200).json({
          moduleId: moduleSnap.id,
          ...moduleSnap.data(),
        });
      }
    }

    return res.status(404).json({ error: "Module not found" });
  } catch (e: any) {
    console.error("Error in GET /modules/:moduleId:", e);
    return res.status(500).json({ error: e?.message });
  }
});

/**
 * PUT /modules/:moduleId
 */
app.put("/modules/:moduleId", requireAuth, async (req, res) => {
  try {
    const { moduleId } = req.params;
    const coursesSnap = await db.collection("courses").get();
    
    for (const courseDoc of coursesSnap.docs) {
      const moduleRef = courseDoc.ref.collection("modules").doc(moduleId);
      const moduleSnap = await moduleRef.get();
      if (moduleSnap.exists) {
        const module = {
          ...req.body,
          updatedAt: Date.now(),
        };
        await moduleRef.set(module, { merge: false });
        return res.status(200).json({
          moduleId,
          ...module,
        });
      }
    }

    return res.status(404).json({ error: "Module not found" });
  } catch (e: any) {
    console.error("Error in PUT /modules/:moduleId:", e);
    return res.status(500).json({ error: e?.message });
  }
});

/**
 * PATCH /modules/:moduleId
 */
app.patch("/modules/:moduleId", requireAuth, async (req, res) => {
  try {
    const { moduleId } = req.params;
    const coursesSnap = await db.collection("courses").get();
    
    for (const courseDoc of coursesSnap.docs) {
      const moduleRef = courseDoc.ref.collection("modules").doc(moduleId);
      const moduleSnap = await moduleRef.get();
      if (moduleSnap.exists) {
        await moduleRef.update({
          ...req.body,
          updatedAt: Date.now(),
        });
        const updated = await moduleRef.get();
        return res.status(200).json({
          moduleId: updated.id,
          ...updated.data(),
        });
      }
    }

    return res.status(404).json({ error: "Module not found" });
  } catch (e: any) {
    console.error("Error in PATCH /modules/:moduleId:", e);
    return res.status(500).json({ error: e?.message });
  }
});

/**
 * DELETE /modules/:moduleId
 */
app.delete("/modules/:moduleId", requireAuth, async (req, res) => {
  try {
    const { moduleId } = req.params;
    const coursesSnap = await db.collection("courses").get();
    
    for (const courseDoc of coursesSnap.docs) {
      const moduleRef = courseDoc.ref.collection("modules").doc(moduleId);
      const moduleSnap = await moduleRef.get();
      if (moduleSnap.exists) {
        await moduleRef.delete();
        return res.status(200).json({ success: true });
      }
    }

    return res.status(404).json({ error: "Module not found" });
  } catch (e: any) {
    console.error("Error in DELETE /modules/:moduleId:", e);
    return res.status(500).json({ error: e?.message });
  }
});

// ============ COMBAT ============

/**
 * GET /combat/player-stats/:level
 * Calculate player stats based on level from worldConfig
 */
app.get("/combat/player-stats/:level", requireAuth, async (req, res) => {
  try {
    const { level } = req.params;
    const playerLevel = parseInt(level);

    // Get worldConfig
    const configSnap = await db.collection("worldConfig").doc("playerScaling").get();
    if (!configSnap.exists) {
      return res.status(404).json({ error: "Player scaling config not found" });
    }

    const config = configSnap.data() || {};
    const baseStats = config.baseStats || {};
    const perLevel = config.perLevel || {};

    // Calculate stats: baseStats + (perLevel × (level - 1))
    const playerStats = {
      level: playerLevel,
      attack: Math.round(baseStats.attack + (perLevel.attack * (playerLevel - 1))),
      defense: Math.round(baseStats.defense + (perLevel.defense * (playerLevel - 1))),
      health: Math.round(baseStats.health + (perLevel.health * (playerLevel - 1))),
      magic: Math.round(baseStats.magic + (perLevel.magic * (playerLevel - 1))),
      magicResist: Math.round(baseStats.magicResist + (perLevel.magicResist * (playerLevel - 1))),
    };

    return res.status(200).json(playerStats);
  } catch (e: any) {
    console.error("Error in GET /combat/player-stats:", e);
    return res.status(500).json({ error: e?.message });
  }
});

/**
 * GET /combat/stage-multipliers/:stageType
 * Get enemy and reward multipliers for a stage type
 */
app.get("/combat/stage-multipliers/:stageType", async (req, res) => {
  try {
    const { stageType } = req.params;

    // Get worldConfig
    const configSnap = await db.collection("worldConfig").doc("stageTypes").get();
    if (!configSnap.exists) {
      return res.status(404).json({ error: "Stage types config not found" });
    }

    const config = configSnap.data() || {};
    const typeConfig = config[stageType];

    if (!typeConfig) {
      return res.status(404).json({ error: `Stage type '${stageType}' not found` });
    }

    return res.status(200).json({
      stageType,
      enemy: {
        damageMultiplier: typeConfig.enemy?.damageMultiplier || 1,
        hpMultiplier: typeConfig.enemy?.hpMultiplier || 1,
      },
      rewards: {
        goldMultiplier: typeConfig.rewards?.goldMultiplier || 1,
        xpMultiplier: typeConfig.rewards?.xpMultiplier || 1,
      },
    });
  } catch (e: any) {
    console.error("Error in GET /combat/stage-multipliers:", e);
    return res.status(500).json({ error: e?.message });
  }
});

/**
 * GET /combat/stage-type/:stage
 * Determine stage type based on stageStructure config
 */
app.get("/combat/stage-type/:stage", async (req, res) => {
  try {
    const { stage } = req.params;
    const stageNum = parseInt(stage);

    // Get worldConfig
    const configSnap = await db.collection("worldConfig").doc("stageStructure").get();
    if (!configSnap.exists) {
      return res.status(404).json({ error: "Stage structure config not found" });
    }

    const config = configSnap.data() || {};
    const bossStage = config.bossStage || 10;
    const miniBossStage = config.miniBossStage || 5;
    const eliteStages = config.eliteStages || [];

    let stageType = "normal";
    
    if (stageNum === bossStage) {
      stageType = "boss";
    } else if (stageNum === miniBossStage) {
      stageType = "miniBoss";
    } else if (eliteStages.includes(stageNum)) {
      stageType = "elite";
    }

    return res.status(200).json({
      stage: stageNum,
      type: stageType,
      bossStage,
      miniBossStage,
      eliteStages,
    });
  } catch (e: any) {
    console.error("Error in GET /combat/stage-type:", e);
    return res.status(500).json({ error: e?.message });
  }
});

/**
 * POST /combat/start
 */
app.post("/combat/start", requireAuth, async (req, res) => {
  try {
    const uid = (req as any).user.uid;
    const { worldId, stage, seed, monsterId } = req.body;

    const userRef = db.collection("users").doc(uid);
    const userSnap = await userRef.get();

    if (!userSnap.exists) {
      return res.status(404).json({ error: "User not found" });
    }

    // Get stamina config including tier-based battle costs
    const { maxStamina, regenRateMinutes, battleCosts } = await getStaminaConfig();
    
    // Determine monster tier to get the correct stamina cost
    const monsterTier = await getMonsterTier(worldId, stage, monsterId);
    const STAMINA_COST = battleCosts[monsterTier];
    
    const user = userSnap.data() || {};
    const currentStamina = user.stats?.stamina ?? maxStamina;
    const lastRegen = user.stats?.lastStaminaRegen;

    // Calculate current stamina with regeneration
    const { stamina, lastRegen: newLastRegen } = await calculateCurrentStamina(
      currentStamina,
      maxStamina,
      lastRegen,
      regenRateMinutes
    );

    // Check if user has enough stamina
    if (stamina < STAMINA_COST) {
      return res.status(403).json({
        error: "Insufficient stamina",
        message: `You need at least ${STAMINA_COST} stamina to fight this ${monsterTier} monster. Treat this like a test — review before retrying.`,
        currentStamina: stamina,
        required: STAMINA_COST,
        deficit: STAMINA_COST - stamina,
        monsterTier: monsterTier
      });
    }

    // Create combat session FIRST (before consuming stamina)
    // This ensures we only consume stamina if the combat session is successfully created
    const combatRef = db.collection("combats").doc();
    const combat = {
      combatId: combatRef.id,
      uid,
      worldId,
      stage,
      monsterId: monsterId || null,
      seed: seed || Math.random().toString(36).substring(2),
      status: "in-progress",
      startedAt: Date.now(),
      completedAt: null,
    };

    try {
    await combatRef.set(combat);
      
      // Only consume stamina AFTER successfully creating combat session
      const staminaAfter = stamina - STAMINA_COST;
      await userRef.update({
        "stats.stamina": staminaAfter,
        "stats.lastStaminaRegen": newLastRegen,
        "stats.maxStamina": maxStamina
      });
      
    return res.status(201).json(combat);
    } catch (combatError: any) {
      // If combat creation fails, don't consume stamina
      console.error("Failed to create combat session:", combatError);
      throw combatError;
    }
  } catch (e: any) {
    console.error("Error in POST /combat/start:", e);
    return res.status(500).json({ error: e?.message });
  }
});

/**
 * PATCH /combat/:combatId
 */
app.patch("/combat/:combatId", requireAuth, async (req, res) => {
  try {
    const { combatId } = req.params;
    const combatRef = db.collection("combats").doc(combatId);
    const combatSnap = await combatRef.get();

    if (!combatSnap.exists) {
      return res.status(404).json({ error: "Combat not found" });
    }

    await combatRef.update({
      ...req.body,
      updatedAt: Date.now(),
    });

    const updated = await combatRef.get();
    return res.status(200).json({
      combatId: updated.id,
      ...updated.data(),
    });
  } catch (e: any) {
    console.error("Error in PATCH /combat/:combatId:", e);
    return res.status(500).json({ error: e?.message });
  }
});

/**
 * GET /combat/:combatId
 */
app.get("/combat/:combatId", requireAuth, async (req, res) => {
  try {
    const { combatId } = req.params;
    const combatSnap = await db.collection("combats").doc(combatId).get();

    if (!combatSnap.exists) {
      return res.status(404).json({ error: "Combat not found" });
    }

    return res.status(200).json({
      combatId: combatSnap.id,
      ...combatSnap.data(),
    });
  } catch (e: any) {
    console.error("Error in GET /combat/:combatId:", e);
    return res.status(500).json({ error: e?.message });
  }
});

/**
 * GET /combat/monster-stats/:worldId/:stage/:userLevel
 * Calculate monster stats based on monster's baseStats, tier, stage, user level, and equipped items
 * Applies: monster tier multiplier × stage multiplier × user level × items × stage difficulty
 */
app.get("/combat/monster-stats/:worldId/:stage/:userLevel", async (req, res) => {
  try {
    const { worldId, stage, userLevel } = req.params;
    const { monsterId, equippedItemsCount } = req.query;
    const stageNum = parseInt(stage);
    const userLvl = parseInt(userLevel);
    const itemsCount = equippedItemsCount ? parseInt(equippedItemsCount as string) : 0;

    // Get worldConfig for stage multipliers and tier multipliers
    const configSnap = await db.collection("worldConfig").doc("monsterScaling").get();
    if (!configSnap.exists) {
      return res.status(404).json({ error: "Monster scaling config not found" });
    }

    const config = configSnap.data() || {};
    const multipliers = config.perStageMultiplier || [];

    // Get stage multiplier (array is 0-indexed, stage 1 = index 1)
    const stageMultiplier = multipliers[stageNum] || 1;
    
    // User level scaling: exponential growth (harder)
    // Level 1: 1.0x, Level 10: 1.79x, Level 20: 3.21x, Level 50: 18.68x
    const userLevelMultiplier = Math.pow(1.06, Math.max(0, userLvl - 1));

    // Item scaling: each equipped item makes monster 22% stronger (harder)
    // 0 items: 1.0x, 1 item: 1.22x, 3 items: 1.82x, 5 items: 2.93x
    const itemScalingMultiplier = Math.pow(1.22, Math.max(0, itemsCount));
    
    // Stage difficulty bonus: later stages get extra multiplier (harder)
    // Stage 1-5: 1.2x, Stage 6-10: 1.5x, Stage 11+: 2.0x
    const stageDifficultyBonus = stageNum <= 5 ? 1.2 : stageNum <= 10 ? 1.5 : 2.0;

    // Get monster template from database to use its baseStats and tier
    let monsterData: any = null;
    let monsterTier: string = "normal";
    
    // Try to find monster in world-specific collection or general monsters collection
    const worldMonstersSnap = await db.collection(`worlds/${worldId}/monsters`).doc(monsterId as string).get();
    if (worldMonstersSnap.exists) {
      monsterData = worldMonstersSnap.data();
    } else {
      // Fallback: try general monsters collection
      const generalMonsterSnap = await db.collection("monsters").doc(monsterId as string).get();
      if (generalMonsterSnap.exists) {
        monsterData = generalMonsterSnap.data();
      }
    }

    // Extract tier and baseStats
    if (monsterData) {
      monsterTier = monsterData.tier || "normal";
    }

    const monsterBaseStats = monsterData?.baseStats || {
      attack: 10,
      defense: 6,
      hp: 100,
      magic: 8,
      magicResist: 5,
      speed: 5,
    };

    // Get tier multipliers from stageTypes config
    const stageTypesSnap = await db.collection("worldConfig").doc("stageTypes").get();
    const tierData = stageTypesSnap.exists ? stageTypesSnap.data()?.[monsterTier] : null;
    
    const tierDamageMultiplier = tierData?.enemy?.damageMultiplier || 1.0;
    const tierHpMultiplier = tierData?.enemy?.hpMultiplier || 1.0;
    const tierGoldMultiplier = tierData?.rewards?.goldMultiplier || 1.0;
    const tierXpMultiplier = tierData?.rewards?.xpMultiplier || 1.0;

    // Combined multiplier applied to all stats (excludes tier-specific multipliers for now, applied separately)
    const baseMultiplier = stageMultiplier * userLevelMultiplier * itemScalingMultiplier * stageDifficultyBonus;

    // Apply tier multipliers to damage stats and HP separately
    const damageMultiplier = baseMultiplier * tierDamageMultiplier;
    const hpMultiplier = baseMultiplier * tierHpMultiplier;

    // Scale all monster stats
    const scaledStats = {
      attack: Math.round((monsterBaseStats.attack || 10) * damageMultiplier),
      defense: Math.round((monsterBaseStats.defense || 6) * damageMultiplier),
      hp: Math.round((monsterBaseStats.hp || 100) * hpMultiplier),
      magic: Math.round((monsterBaseStats.magic || 8) * damageMultiplier),
      magicResist: Math.round((monsterBaseStats.magicResist || 5) * damageMultiplier),
      speed: Math.round((monsterBaseStats.speed || 5) * baseMultiplier), // Speed uses base multiplier
    };

    const monsterStats = {
      monsterId: monsterId || "unknown",
      worldId,
      stage: stageNum,
      userLevel: userLvl,
      equippedItemsCount: itemsCount,
      monsterTier: monsterTier,
      // Base stats from monster document
      baseStats: monsterBaseStats,
      // Scaling multipliers
      stageMultiplier: stageMultiplier,
      userLevelMultiplier: userLevelMultiplier,
      itemScalingMultiplier: itemScalingMultiplier,
      stageDifficultyBonus: stageDifficultyBonus,
      baseMultiplier: baseMultiplier,
      tierDamageMultiplier: tierDamageMultiplier,
      tierHpMultiplier: tierHpMultiplier,
      tierGoldMultiplier: tierGoldMultiplier,
      tierXpMultiplier: tierXpMultiplier,
      // Scaled stats
      ...scaledStats,
    };

    console.log(`⚔️ Monster Stats [${worldId}:${stageNum} - ${monsterId}] Tier=${monsterTier} Level=${userLvl}, Items=${itemsCount}:`, {
      baseStats: monsterBaseStats,
      multipliers: {
        stage: stageMultiplier.toFixed(3),
        userLevel: userLevelMultiplier.toFixed(3),
        items: itemScalingMultiplier.toFixed(3),
        difficulty: stageDifficultyBonus.toFixed(3),
        base: baseMultiplier.toFixed(3),
        tierDamage: tierDamageMultiplier.toFixed(3),
        tierHp: tierHpMultiplier.toFixed(3),
      },
      scaledStats: scaledStats,
    });

    return res.status(200).json(monsterStats);
  } catch (e: any) {
    console.error("Error in GET /combat/monster-stats:", e);
    return res.status(500).json({ error: e?.message });
  }
});

/**
 * POST /combat/results
 * Save combat results with full battle data, rewards, and achievement triggers
 */
app.post("/combat/results", requireAuth, async (req, res) => {
  try {
    const uid = (req as any).user.uid;
    const {
      battle,
      context,
      rewards,
      progressUpdate,
      achievementTriggers,
    } = req.body;

    // Update user stats if victory
    let leveledUp = false;
    let newLevel = 1;
    let levelUpRewards = undefined;
    let updatedProgressUpdate = { ...progressUpdate };

    if (battle.result === "win") {
      const userRef = db.collection("users").doc(uid);
      const userSnap = await userRef.get();
      const user = userSnap.data() || {};

      const oldLevel = user.stats?.level || 1;
      // Use totalXP if available, otherwise fallback to xp (for backwards compatibility)
      const currentTotalXP = user.stats?.totalXP ?? user.stats?.xp ?? 0;
      const newTotalXP = currentTotalXP + (rewards?.xpGained || 0);
      let newGold = (user.stats?.gold || 0) + (rewards?.goldGained || 0);

      // Calculate new level from total XP
      const levelData = await calculateLevelFromXP(newTotalXP);
      leveledUp = levelData.level > oldLevel;
      newLevel = levelData.level;

      // Add level-up rewards if leveled up
      if (leveledUp && levelData.rewards) {
        newGold += levelData.rewards.gold || 0;
        levelUpRewards = levelData.rewards;
      }

      // Update user stats with level data
      await userRef.update({
        "stats.level": levelData.level,
        "stats.xp": levelData.currentXP,
        "stats.nextLevelXP": levelData.nextLevelXP,
        "stats.totalXP": newTotalXP,
        "stats.gold": newGold,
        updatedAt: Date.now(),
      });

      // Update progress update with level-up info
      updatedProgressUpdate = {
        ...progressUpdate,
        totalXPAfter: newTotalXP,
        totalGoldAfter: newGold,
        leveledUp,
        newLevel: levelData.level,
        ...(levelUpRewards && { levelUpRewards }), // Only add if not undefined
      };
    }

    // Create combat result document
    const resultRef = db.collection("combat_results").doc();
    const combatResult = {
      userId: uid,
      timestamp: new Date().toISOString(),
      battle: {
        worldId: battle.worldId,
        stage: battle.stage,
        monsterId: battle.monsterId,
        monsterType: battle.monsterType || "normal",
        result: battle.result, // "win" or "loss"
        turns: battle.turns || 0,
      },
      context: {
        source: context?.source || "combat",
        courseId: context?.courseId || null,
        moduleId: context?.moduleId || null,
        taskId: context?.taskId || null,
      },
      rewards: {
        xpGained: rewards?.xpGained || 0,
        goldGained: rewards?.goldGained || 0,
        loot: {
          items: rewards?.loot?.items || [],
        },
      },
      progressUpdate: updatedProgressUpdate,
      achievementTriggers: {
        monstersDefeated: achievementTriggers?.monstersDefeated || 0,
        tasksCompleted: achievementTriggers?.tasksCompleted || 0,
        moduleProgress: achievementTriggers?.moduleProgress || {},
      },
    };

    await resultRef.set(combatResult);

    return res.status(201).json({
      resultId: resultRef.id,
      ...combatResult,
    });
  } catch (e: any) {
    console.error("Error in POST /combat/results:", e);
    return res.status(500).json({ error: e?.message });
  }
});

/**
 * POST /combat/:combatId/resolve
 */
app.post("/combat/:combatId/resolve", requireAuth, async (req, res) => {
  try {
    const uid = (req as any).user.uid;
    const { combatId } = req.params;

    const combatRef = db.collection("combats").doc(combatId);
    const combatSnap = await combatRef.get();

    if (!combatSnap.exists) {
      return res.status(404).json({ error: "Combat not found" });
    }

    // Simple resolution logic - can be expanded
    const victory = Math.random() > 0.3;
    const xpGained = victory ? 50 : 10;
    const goldGained = victory ? 25 : 5;

    if (victory) {
      const userRef = db.collection("users").doc(uid);
      const userSnap = await userRef.get();
      const user = userSnap.data() || {};

      const oldLevel = user.stats?.level || 1;
      // Use totalXP if available, otherwise fallback to xp (for backwards compatibility)
      const currentTotalXP = user.stats?.totalXP ?? user.stats?.xp ?? 0;
      const newTotalXP = currentTotalXP + xpGained;
      let newGold = (user.stats?.gold || 0) + goldGained;

      // Calculate new level from total XP
      const levelData = await calculateLevelFromXP(newTotalXP);
      const leveledUp = levelData.level > oldLevel;

      console.log(`📊 [Combat Resolve] Level calculation:`, {
        uid,
        oldLevel,
        newTotalXP,
        calculatedLevel: levelData.level,
        leveledUp,
        currentXP: levelData.currentXP,
        nextLevelXP: levelData.nextLevelXP,
      });

      // Add level-up rewards if leveled up
      if (leveledUp && levelData.rewards) {
        newGold += levelData.rewards.gold || 0;
        if (levelData.rewards.gems) {
          await userRef.update({
            "stats.gems": (user.stats?.gems || 0) + levelData.rewards.gems,
          });
        }
      }

      // Update user stats with level data
      await userRef.update({
        "stats.level": levelData.level,
        "stats.xp": levelData.currentXP,
        "stats.nextLevelXP": levelData.nextLevelXP,
        "stats.totalXP": newTotalXP,
        "stats.gold": newGold,
        updatedAt: Date.now(),
      });

      console.log(`✅ [Combat Resolve] Updated user stats in Firebase:`, {
        level: levelData.level,
        xp: levelData.currentXP,
        totalXP: newTotalXP,
        gold: newGold,
      });

      // Update worldMapProgress to unlock next monster
      const combatData = combatSnap.data();
      const worldId = combatData?.worldId;
      const monsterId = combatData?.monsterId;
      
      if (worldId && monsterId) {
        try {
          // Get world to find monster position
          const worldSnap = await db.collection("worlds").doc(worldId).get();
          if (worldSnap.exists) {
            const world = worldSnap.data();
            const stages = world?.stages || [];
            
            // Find monster index in world (first appearance in stages)
            let monsterIndex = -1;
            for (let stageIndex = 0; stageIndex < stages.length; stageIndex++) {
              const stage = stages[stageIndex];
              if (stage && stage.values && Array.isArray(stage.values)) {
                const indexInStage = stage.values.indexOf(monsterId);
                if (indexInStage !== -1) {
                  // Count unique monsters before this one
                  const seenMonsters = new Set<string>();
                  for (let i = 0; i <= stageIndex; i++) {
                    const s = stages[i];
                    if (s && s.values && Array.isArray(s.values)) {
                      for (let j = 0; j < s.values.length; j++) {
                        const mid = s.values[j];
                        if (mid && !seenMonsters.has(mid)) {
                          if (mid === monsterId) {
                            monsterIndex = seenMonsters.size;
                            break;
                          }
                          seenMonsters.add(mid);
                        }
                      }
                    }
                    if (monsterIndex !== -1) break;
                  }
                  break;
                }
              }
            }

            if (monsterIndex !== -1) {
              // Update worldMapProgress
              const currentProgress = user.worldMapProgress || {};
              const worldProgress = currentProgress[worldId] || { completedLevels: [] };
              const completedLevels = worldProgress.completedLevels || [];
              
              console.log(`🔓 [Combat Resolve] Monster unlock check:`, {
                worldId,
                monsterId,
                monsterIndex,
                currentCompletedLevels: completedLevels,
              });
              
              // Add this monster index if not already completed
              if (!completedLevels.includes(monsterIndex)) {
                const updatedCompletedLevels = [...completedLevels, monsterIndex];
                
                console.log(`✅ [Combat Resolve] Unlocking monster:`, {
                  worldId,
                  monsterIndex,
                  oldCompletedLevels: completedLevels,
                  newCompletedLevels: updatedCompletedLevels,
                  nextMonsterWillUnlock: monsterIndex + 1,
                });
                
                await userRef.update({
                  [`worldMapProgress.${worldId}.completedLevels`]: updatedCompletedLevels,
                  updatedAt: Date.now(),
                });
              } else {
                console.log(`ℹ️ [Combat Resolve] Monster ${monsterIndex} already completed`);
              }
            } else {
              console.warn(`⚠️ [Combat Resolve] Could not find monster index for ${monsterId} in world ${worldId}`);
            }
          }
        } catch (progressErr) {
          console.warn("Could not update worldMapProgress:", progressErr);
        }
      }

      // Update combat with reward info including level up
      // Build reward object conditionally to avoid undefined values
      const rewardUpdate: any = {
        xp: xpGained,
        gold: goldGained,
        leveledUp,
        newLevel: levelData.level,
      };
      
      // Only add levelUpRewards if it exists (not undefined)
      if (leveledUp && levelData.rewards) {
        rewardUpdate.levelUpRewards = levelData.rewards;
      }
      
      await combatRef.update({
        status: "victory",
        completedAt: Date.now(),
        reward: rewardUpdate,
      });
    } else {
      await combatRef.update({
        status: "defeat",
        completedAt: Date.now(),
        reward: {
          xp: xpGained,
          gold: goldGained,
        },
      });
    }

    const updated = await combatRef.get();
    return res.status(200).json({
      combatId: updated.id,
      ...updated.data(),
    });
  } catch (e: any) {
    console.error("Error in POST /combat/:combatId/resolve:", e);
    return res.status(500).json({ error: e?.message });
  }
});

// ============ WORLDS ============

/**
 * GET /worlds
 * Optional query param: ?uid={userId} - Returns worlds with unlock status based on user level
 */
app.get("/worlds", async (req, res) => {
  try {
    const { uid } = req.query;
    const worldsSnap = await db.collection("worlds").get();
    const worlds = worldsSnap.docs.map((doc) => ({
      worldId: doc.id,
      ...doc.data(),
    }));

    // If uid is provided, add unlock status based on user level
    if (uid && typeof uid === 'string') {
      try {
        const userSnap = await db.collection("users").doc(uid).get();
        if (userSnap.exists) {
          const user = userSnap.data() || {};
          const userLevel = user.stats?.level || 1;
          
          const worldsWithUnlockStatus = worlds.map((world: any) => {
            try {
              const requiredLevel = world.requiredLevel || 1;
              const isUnlocked = userLevel >= requiredLevel;
              return {
                ...world,
                isUnlocked,
                requiredLevel,
                userLevel,
              };
            } catch (worldErr) {
              console.warn(`Error processing world ${world.worldId}:`, worldErr);
              // Return world without unlock status if processing fails
              return {
                ...world,
                isUnlocked: true,
                requiredLevel: 1,
                userLevel,
              };
            }
          });
          
          return res.status(200).json(worldsWithUnlockStatus);
        } else {
          // User doesn't exist, return worlds without unlock status
          console.warn(`User ${uid} not found, returning worlds without unlock status`);
          return res.status(200).json(worlds);
        }
      } catch (userErr: any) {
        console.error("Error fetching user for unlock status:", userErr);
        // Return worlds without unlock status if user fetch fails
        return res.status(200).json(worlds);
      }
    }

    return res.status(200).json(worlds);
  } catch (e: any) {
    console.error("Error in GET /worlds:", e);
    return res.status(500).json({ error: e?.message || "Internal server error" });
  }
});

/**
 * POST /worlds
 */
app.post("/worlds", requireAuth, async (req, res) => {
  try {
    const worldData = req.body;

    if (!worldData.name) {
      return res.status(400).json({ error: "World name is required" });
    }

    const slug = worldData.name.toLowerCase().trim().replace(/\s+/g, '_');
    const customId = `world_${slug}`;

    const worldRef = db.collection("worlds").doc(customId);
    
    const newWorld = {
      ...worldData,
      worldId: customId,
      description: worldData.description || "",
      element: worldData.element || "neutral",
      requiredLevel: worldData.requiredLevel || 1, // Default to level 1 if not specified
      stages: worldData.stages || [null],
      createdAt: Date.now()
    };

    await worldRef.set(newWorld);

    return res.status(201).json({
      data: newWorld
    });
  } catch (e: any) {
    console.error("Error in POST /worlds:", e);
    return res.status(500).json({ error: e?.message });
  }
});

/**
 * GET /worlds/:worldId
 */
app.get("/worlds/:worldId", async (req, res) => {
  try {
    const { worldId } = req.params;
    const worldSnap = await db.collection("worlds").doc(worldId).get();

    if (!worldSnap.exists) {
      return res.status(404).json({ error: "World not found" });
    }

    return res.status(200).json({
      worldId: worldSnap.id,
      ...worldSnap.data(),
    });
  } catch (e: any) {
    console.error("Error in GET /worlds/:worldId:", e);
    return res.status(500).json({ error: e?.message });
  }
});

/**
 * PUT /worlds/:worldId
 */
app.put("/worlds/:worldId", requireAuth, async (req, res) => {
  try {
    const { worldId } = req.params;
    const worldRef = db.collection("worlds").doc(worldId);
    const world = {
      ...req.body,
      updatedAt: Date.now(),
    };
    await worldRef.set(world, { merge: false });

    return res.status(200).json({
      worldId,
      ...world,
    });
  } catch (e: any) {
    console.error("Error in PUT /worlds/:worldId:", e);
    return res.status(500).json({ error: e?.message });
  }
});

/**
 * PATCH /worlds/:worldId
 */
app.patch("/worlds/:worldId", requireAuth, async (req, res) => {
  try {
    const { worldId } = req.params;
    const worldRef = db.collection("worlds").doc(worldId);
    await worldRef.update({
      ...req.body,
      updatedAt: Date.now(),
    });

    const updated = await worldRef.get();
    return res.status(200).json({
      worldId: updated.id,
      ...updated.data(),
    });
  } catch (e: any) {
    console.error("Error in PATCH /worlds/:worldId:", e);
    return res.status(500).json({ error: e?.message });
  }
});

/**
 * DELETE /worlds/:worldId
 */
app.delete("/worlds/:worldId", requireAuth, async (req, res) => {
  try {
    const { worldId } = req.params;
    
    await db.collection("worlds").doc(worldId).delete();

    return res.status(200).json({ 
      message: `World ${worldId} has been destroyed` 
    });
  } catch (e: any) {
    console.error("Error in DELETE /worlds:", e);
    return res.status(500).json({ error: e?.message });
  }
});

/**
 * GET /worlds/:worldId/stages
 */
app.get("/worlds/:worldId/stages", async (req, res) => {
  try {
    const { worldId } = req.params;
    const stagesSnap = await db
      .collection("worlds")
      .doc(worldId)
      .collection("stages")
      .get();

    const stages = stagesSnap.docs.map((doc) => ({
      stageId: doc.id,
      ...doc.data(),
    }));

    return res.status(200).json(stages);
  } catch (e: any) {
    console.error("Error in GET /worlds/:worldId/stages:", e);
    return res.status(500).json({ error: e?.message });
  }
});

// ============ PETS ============

/**
 * GET /pets
 */
app.get("/pets", async (req, res) => {
  try {
    const petsSnap = await db.collection("pets").get();
    const pets = petsSnap.docs.map((doc) => ({
      petId: doc.id,
      ...doc.data(),
    }));

    return res.status(200).json(pets);
  } catch (e: any) {
    console.error("Error in GET /pets:", e);
    return res.status(500).json({ error: e?.message });
  }
});

/**
 * POST /pets
 */
app.post("/pets", requireAuth, async (req, res) => {
  try {
    const petRef = db.collection("pets").doc();
    const pet = {
      ...req.body,
      createdAt: Date.now(),
    };
    await petRef.set(pet);

    return res.status(201).json({
      petId: petRef.id,
      ...pet,
    });
  } catch (e: any) {
    console.error("Error in POST /pets:", e);
    return res.status(500).json({ error: e?.message });
  }
});

/**
 * GET /pets/:petId
 */
app.get("/pets/:petId", async (req, res) => {
  try {
    const { petId } = req.params;
    const petSnap = await db.collection("pets").doc(petId).get();

    if (!petSnap.exists) {
      return res.status(404).json({ error: "Pet not found" });
    }

    return res.status(200).json({
      petId: petSnap.id,
      ...petSnap.data(),
    });
  } catch (e: any) {
    console.error("Error in GET /pets/:petId:", e);
    return res.status(500).json({ error: e?.message });
  }
});

/**
 * PUT /pets/:petId
 */
app.put("/pets/:petId", requireAuth, async (req, res) => {
  try {
    const { petId } = req.params;
    const petRef = db.collection("pets").doc(petId);
    const pet = {
      ...req.body,
      updatedAt: Date.now(),
    };
    await petRef.set(pet, { merge: false });

    return res.status(200).json({
      petId,
      ...pet,
    });
  } catch (e: any) {
    console.error("Error in PUT /pets/:petId:", e);
    return res.status(500).json({ error: e?.message });
  }
});

/**
 * PATCH /pets/:petId
 */
app.patch("/pets/:petId", requireAuth, async (req, res) => {
  try {
    const { petId } = req.params;
    const petRef = db.collection("pets").doc(petId);
    await petRef.update({
      ...req.body,
      updatedAt: Date.now(),
    });

    const updated = await petRef.get();
    return res.status(200).json({
      petId: updated.id,
      ...updated.data(),
    });
  } catch (e: any) {
    console.error("Error in PATCH /pets/:petId:", e);
    return res.status(500).json({ error: e?.message });
  }
});

/**
 * DELETE /pets/:petId
 */
app.delete("/pets/:petId", requireAuth, async (req, res) => {
  try {
    const { petId } = req.params;
    await db.collection("pets").doc(petId).delete();
    return res.status(200).json({ success: true });
  } catch (e: any) {
    console.error("Error in DELETE /pets/:petId:", e);
    return res.status(500).json({ error: e?.message });
  }
});

// ============ MONSTERS ============

/**
 * GET /monsters
 */
app.get("/monsters", async (req, res) => {
  try {
    let query = db.collection("monsters");
    
    if (req.query.worldId) {
      query = query.where("worldId", "==", req.query.worldId) as any;
    }
    if (req.query.tier) {
      query = query.where("tier", "==", req.query.tier) as any;
    }

    const monstersSnap = await query.get();
    const monsters = monstersSnap.docs.map((doc) => ({
      monsterId: doc.id,
      ...doc.data(),
    }));

    return res.status(200).json(monsters);
  } catch (e: any) {
    console.error("Error in GET /monsters:", e);
    return res.status(500).json({ error: e?.message });
  }
});

/**
 * POST /monsters
 */
app.post("/monsters", requireAuth, async (req, res) => {
  try {
    const monsterData = req.body;

    if (!monsterData.name) {
      return res.status(400).json({ error: "Name is required" });
    }

    const slug = monsterData.name.toLowerCase().trim().replace(/\s+/g, '_');
    const customId = `mon_${slug}`;

    const monsterRef = db.collection("monsters").doc(customId);
    
    const newMonster = {
      ...monsterData,
      monsterId: customId,
      isActive: monsterData.isActive || false,
      tier: monsterData.tier || 'normal',
      elementType: monsterData.elementType || 'physical',
      baseStats: {
        hp: monsterData.baseStats?.hp || 100,
        attack: monsterData.baseStats?.attack || 10,
        defense: monsterData.baseStats?.defense || 5,
        magic: monsterData.baseStats?.magic || 0,
        magicResist: monsterData.baseStats?.magicResist || 0,
        speed: monsterData.baseStats?.speed || 5
      },
      attacks: monsterData.attacks || [],
      behaviour: monsterData.behaviour || { fleeBelowHpPct: 0, pattern: [], style: "patterned" },
      skills: monsterData.skills || [],
      createdAt: Date.now(),
    };

    await monsterRef.set(newMonster);

    return res.status(201).json({
      data: newMonster
    });
  } catch (e: any) {
    console.error("Error in POST /monsters:", e);
    return res.status(500).json({ error: e?.message });
  }
});

/**
 * GET /monsters/:monsterId
 */
app.get("/monsters/:monsterId", async (req, res) => {
  try {
    const { monsterId } = req.params;
    const monsterSnap = await db.collection("monsters").doc(monsterId).get();

    if (!monsterSnap.exists) {
      return res.status(404).json({ error: "Monster not found" });
    }

    return res.status(200).json({
      monsterId: monsterSnap.id,
      ...monsterSnap.data(),
    });
  } catch (e: any) {
    console.error("Error in GET /monsters/:monsterId:", e);
    return res.status(500).json({ error: e?.message });
  }
});

/**
 * PUT /monsters/:monsterId
 */
app.put("/monsters/:monsterId", requireAuth, async (req, res) => {
  try {
    const { monsterId } = req.params;
    const monsterRef = db.collection("monsters").doc(monsterId);
    const monster = {
      ...req.body,
      updatedAt: Date.now(),
    };
    await monsterRef.set(monster, { merge: false });

    return res.status(200).json({
      monsterId,
      ...monster,
    });
  } catch (e: any) {
    console.error("Error in PUT /monsters/:monsterId:", e);
    return res.status(500).json({ error: e?.message });
  }
});

/**
 * PATCH /monsters/:monsterId
 */
app.patch("/monsters/:monsterId", requireAuth, async (req, res) => {
  try {
    const { monsterId } = req.params;
    const monsterRef = db.collection("monsters").doc(monsterId);
    await monsterRef.update({
      ...req.body,
      updatedAt: Date.now(),
    });

    const updated = await monsterRef.get();
    return res.status(200).json({
      monsterId: updated.id,
      ...updated.data(),
    });
  } catch (e: any) {
    console.error("Error in PATCH /monsters/:monsterId:", e);
    return res.status(500).json({ error: e?.message });
  }
});

/**
 * DELETE /monsters/:monsterId
 */
app.delete("/monsters/:monsterId", requireAuth, async (req, res) => {
  try {
    const { monsterId } = req.params;
    
    await db.collection("monsters").doc(monsterId).delete();

    return res.status(200).json({ 
      message: `Entity ${monsterId} successfully banished from the bestiary` 
    });
  } catch (e: any) {
    console.error("Error in DELETE /monsters:", e);
    return res.status(500).json({ error: e?.message });
  }
});

// ============ LOOTBOXES ============

/**
 * GET /lootboxes
 */
app.get("/lootboxes", async (req, res) => {
  try {
    const lootboxesSnap = await db.collection("lootboxes").get();
    const lootboxes = lootboxesSnap.docs
      .map((doc) => ({
        lootboxId: doc.id,
        ...doc.data(),
      }))
      .filter((box: any) => box.enable !== false);

    return res.status(200).json(lootboxes);
  } catch (e: any) {
    console.error("Error in GET /lootboxes:", e);
    return res.status(500).json({ error: e?.message });
  }
});

/**
 * POST /lootboxes
 */
app.post("/lootboxes", requireAuth, async (req, res) => {
  try {
    const lootboxRef = db.collection("lootboxes").doc();
    const lootbox = {
      ...req.body,
      createdAt: Date.now(),
    };
    await lootboxRef.set(lootbox);

    return res.status(201).json({
      lootboxId: lootboxRef.id,
      ...lootbox,
    });
  } catch (e: any) {
    console.error("Error in POST /lootboxes:", e);
    return res.status(500).json({ error: e?.message });
  }
});

/**
 * GET /lootboxes/:lootboxId
 */
app.get("/lootboxes/:lootboxId", async (req, res) => {
  try {
    const { lootboxId } = req.params;
    const lootboxSnap = await db.collection("lootboxes").doc(lootboxId).get();

    if (!lootboxSnap.exists) {
      return res.status(404).json({ error: "Lootbox not found" });
    }

    return res.status(200).json({
      lootboxId: lootboxSnap.id,
      ...lootboxSnap.data(),
    });
  } catch (e: any) {
    console.error("Error in GET /lootboxes/:lootboxId:", e);
    return res.status(500).json({ error: e?.message });
  }
});

/**
 * PUT /lootboxes/:lootboxId
 */
app.put("/lootboxes/:lootboxId", requireAuth, async (req, res) => {
  try {
    const { lootboxId } = req.params;
    const lootboxRef = db.collection("lootboxes").doc(lootboxId);
    const lootbox = {
      ...req.body,
      updatedAt: Date.now(),
    };
    await lootboxRef.set(lootbox, { merge: false });

    return res.status(200).json({
      lootboxId,
      ...lootbox,
    });
  } catch (e: any) {
    console.error("Error in PUT /lootboxes/:lootboxId:", e);
    return res.status(500).json({ error: e?.message });
  }
});

/**
 * PATCH /lootboxes/:lootboxId
 */
app.patch("/lootboxes/:lootboxId", requireAuth, async (req, res) => {
  try {
    const { lootboxId } = req.params;
    const lootboxRef = db.collection("lootboxes").doc(lootboxId);
    await lootboxRef.update({
      ...req.body,
      updatedAt: Date.now(),
    });

    const updated = await lootboxRef.get();
    return res.status(200).json({
      lootboxId: updated.id,
      ...updated.data(),
    });
  } catch (e: any) {
    console.error("Error in PATCH /lootboxes/:lootboxId:", e);
    return res.status(500).json({ error: e?.message });
  }
});

/**
 * DELETE /lootboxes/:lootboxId
 */
app.delete("/lootboxes/:lootboxId", requireAuth, async (req, res) => {
  try {
    const { lootboxId } = req.params;
    await db.collection("lootboxes").doc(lootboxId).delete();
    return res.status(200).json({ success: true });
  } catch (e: any) {
    console.error("Error in DELETE /lootboxes/:lootboxId:", e);
    return res.status(500).json({ error: e?.message });
  }
});

/**
 * POST /lootboxes/:lootboxId/open
 */
app.post("/lootboxes/:lootboxId/open", requireAuth, async (req, res) => {
  try {
    const uid = (req as any).user.uid;
    const { lootboxId } = req.params;
    const { count = 1 } = req.body;

    // 1. Get lootbox config
    const lootboxSnap = await db.collection("lootboxes").doc(lootboxId).get();
    if (!lootboxSnap.exists) {
      return res.status(404).json({ error: "Lootbox not found" });
    }
    const lootbox = lootboxSnap.data() as any;

    // 2. Get user and check gold
    const userRef = db.collection("users").doc(uid);
    const userSnap = await userRef.get();
    if (!userSnap.exists) {
      return res.status(404).json({ error: "User not found" });
    }
    const user = userSnap.data() as any;
    const totalCost = (lootbox.priceGold || 0) * count;
    const currentGold = user.stats?.gold || 0;

    if (currentGold < totalCost) {
      return res.status(400).json({ error: `Not enough gold. Need ${totalCost}, have ${currentGold}` });
    }

    // 3. Determine minimum items from lootbox config (or derive from id as fallback)
    let minItems = lootbox.count || 1; // Use count from DB first
    
    // Fallback: if count not set, derive from id
    if (!lootbox.count) {
      if (lootboxId.includes("legendary")) {
        minItems = 3;
      } else if (lootboxId.includes("epic")) {
        minItems = 3;
      } else if (lootboxId.includes("advanced")) {
        minItems = 2;
      }
    }
    
    // Determine guaranteed rarity floor based on box type
    let guaranteedRarityFloor = "common"; // basic boxes: common items
    
    if (lootboxId.includes("legendary")) {
      guaranteedRarityFloor = "epic";
    } else if (lootboxId.includes("epic")) {
      guaranteedRarityFloor = "epic";
    } else if (lootboxId.includes("advanced")) {
      guaranteedRarityFloor = "rare";
    }

    // 4. Roll loot for each box
    const results: any[] = [];
    
    // Get bonus system config
    const bonusSystemSnap = await db.collection("rerollRules").doc("bonusSystem").get();
    const bonusSystem = bonusSystemSnap.exists ? bonusSystemSnap.data() : null;
    const bonusEnabled = bonusSystem?.enabled !== false; // Default true if not explicitly disabled
    const bonusChance = bonusSystem?.bonusChance ?? 0.3; // Default 30% chance if not set
    const possibleBonuses = bonusSystem?.possibleBonuses || {
        damage: { min: 1, max: 5 },
        critDamage: { min: 0.5, max: 2 },
        speed: { min: 1, max: 3 }
    }; // Default bonuses if not configured

    // Get arcane tweaks config
    const arcaneTweaksSnap = await db.collection("lootboxesArcaneTweaks").doc("arcaneBonus").get();
    const arcaneTweaks = arcaneTweaksSnap.exists ? arcaneTweaksSnap.data() : null;
    const arcaneEnabled = arcaneTweaks?.enabled || false;
    const extraArcaneChance = arcaneTweaks?.extraArcaneItemChance || 0;
    
    for (let i = 0; i < count; i++) {
      // Roll minimum guaranteed items
      for (let itemSlot = 0; itemSlot < minItems; itemSlot++) {
        // FIRST ITEM: Enforce guaranteed minimum rarity
        let selectedRarity = "common";
        
        if (itemSlot === 0) {
          // First item is GUARANTEED at floor rarity
          selectedRarity = guaranteedRarityFloor;
          console.log(`Item ${itemSlot + 1}: GUARANTEED ${selectedRarity}`);
        } else {
          // Other items: Roll normally based on dropChances
          const rarityRoll = Math.random();
          let cumulativeChance = 0;
          
          const dropChances = lootbox.dropChances || {};
          console.log(`Item ${itemSlot + 1}: Rolling with dropChances:`, dropChances, `Roll value: ${rarityRoll}`);
          
          const rarities = ["common", "uncommon", "rare", "epic", "legendary"]; // Start from common to build cumulative
          
          for (const rarity of rarities) {
            const chance = dropChances[rarity] || 0;
            cumulativeChance += chance;
            
            if (rarityRoll < cumulativeChance) {
              selectedRarity = rarity;
              console.log(`  -> Selected: ${rarity} (cumulative: ${cumulativeChance})`);
              break;
            }
          }
          
          // Fallback to common if nothing selected
          if (rarityRoll >= cumulativeChance && selectedRarity === "common") {
            console.log(`  -> Defaulted to common (roll ${rarityRoll} >= cumulative ${cumulativeChance})`);
          }
        }

        // Dynamically query all item collections and filter by rarity
        const itemCollections = ["items_weapons", "items_armor", "items_arcane", "items_pets"];
        const allItemsOfRarity: any[] = [];
        let sourceCollection = "";

        for (const collectionName of itemCollections) {
          try {
            const itemsSnap = await db.collection(collectionName).get();
            const items = itemsSnap.docs
              .map(doc => ({ itemId: doc.id, ...doc.data() }))
              .filter((item: any) => item.isActive !== false && item.rarity === selectedRarity);
            
            if (items.length > 0) {
              allItemsOfRarity.push(...items.map(item => ({ ...item, collection: collectionName })));
            }
          } catch (e) {
            // Collection may not exist, skip
          }
        }

        // If no items found at selected rarity, try fallback rarities
        if (allItemsOfRarity.length === 0) {
          const fallbackRarities = [selectedRarity, "rare", "uncommon", "common"];
          for (const fallbackRarity of fallbackRarities) {
            if (allItemsOfRarity.length > 0) break;
            
            for (const collectionName of itemCollections) {
              try {
                const itemsSnap = await db.collection(collectionName).get();
                const items = itemsSnap.docs
                  .map(doc => ({ itemId: doc.id, ...doc.data() }))
                  .filter((item: any) => item.isActive !== false && item.rarity === fallbackRarity);
                
                if (items.length > 0) {
                  allItemsOfRarity.push(...items.map(item => ({ ...item, collection: collectionName })));
                }
              } catch (e) {
                // Collection may not exist, skip
              }
            }
          }
        }

        // Pick random item if any found
        if (allItemsOfRarity.length > 0) {
          const randomItem = allItemsOfRarity[Math.floor(Math.random() * allItemsOfRarity.length)];
          sourceCollection = randomItem.collection;
          
          // Roll for bonus stats
          let bonusStats = null;
          if (bonusEnabled && Math.random() <= bonusChance) {
            bonusStats = {};
            // Roll random bonus type(s)
            const bonusTypes = Object.keys(possibleBonuses);
            if (bonusTypes.length > 0) {
              // Pick 1-2 random bonus types
              const numBonuses = Math.random() > 0.7 ? 2 : 1;
              const selectedBonusTypes = [];
              
              for (let b = 0; b < numBonuses && bonusTypes.length > 0; b++) {
                const randomIndex = Math.floor(Math.random() * bonusTypes.length);
                const bonusType = bonusTypes.splice(randomIndex, 1)[0];
                selectedBonusTypes.push(bonusType);
                
                const bonusRange = possibleBonuses[bonusType];
                const min = bonusRange?.min || 0;
                const max = bonusRange?.max || 0;
                const bonusValue = min + Math.random() * (max - min);
                
                // Round based on type with minimum values
                if (bonusType === "critChance" || bonusType === "critDamage") {
                  // For crit percentages, ensure minimum of 1% and round to 1 decimal
                  const rounded = Math.max(1, Math.round(bonusValue * 10) / 10);
                  bonusStats[bonusType] = rounded;
                } else if (bonusType.includes("Chance") || bonusType.includes("chance")) {
                  // Other chance stats: minimum 1%, round to 1 decimal
                  const rounded = Math.max(1, Math.round(bonusValue * 10) / 10);
                  bonusStats[bonusType] = rounded;
                } else {
                  // Whole numbers for attack, defense, health, etc. - minimum 1
                  bonusStats[bonusType] = Math.max(1, Math.round(bonusValue));
                }
              }
              console.log(`  -> Rolled bonus stats:`, bonusStats);
            }
          }
          
          const itemResult = {
            ...randomItem,
            type: "item",
            rarity: randomItem.rarity,
            collection: sourceCollection,
            bonus: bonusStats,
          };
          
          console.log(`  -> Adding item to results:`, itemResult.name, `with bonus:`, itemResult.bonus);
          results.push(itemResult);
        }
      }

      // BONUS: Check for pet drop (extra, not part of minimum items)
      const petChance = lootbox.petChance || 0;
      if (Math.random() <= petChance) {
        // Determine pet rarity
        const petRarityRoll = Math.random();
        let petCumulativeChance = 0;
        let selectedPetRarity = "common";
        
        const petRarityChances = lootbox.petRarityChances || {};
        const petRarities = ["legendary", "epic", "rare", "uncommon", "common"];
        for (const rarity of petRarities) {
          petCumulativeChance += petRarityChances[rarity] || 0;
          if (petRarityRoll <= petCumulativeChance) {
            selectedPetRarity = rarity;
            break;
          }
        }

        // Get pet from items_pets or pets_arcane
        const petCollection = selectedPetRarity === "legendary" || selectedPetRarity === "epic" 
          ? "pets_arcane" 
          : "items_pets";
        
        const petsSnap = await db.collection(petCollection).get();
        const availablePets = petsSnap.docs
          .map(doc => ({ itemId: doc.id, ...doc.data() }))
          .filter((pet: any) => pet.isActive !== false && pet.rarity === selectedPetRarity);

        if (availablePets.length > 0) {
          const randomPet = availablePets[Math.floor(Math.random() * availablePets.length)];
          results.push({
            type: "pet",
            rarity: selectedPetRarity,
            collection: petCollection,
            ...randomPet,
          });
        }
      }
    }

    // 5. Deduct gold from user
    await userRef.update({
      "stats.gold": currentGold - totalCost,
      updatedAt: Date.now(),
    });

    // Log final results before sending to frontend
    console.log("Final results being sent to frontend:");
    results.forEach((item: any, idx: number) => {
      console.log(`  ${idx + 1}. ${item.name} - bonus:`, item.bonus);
    });

    // 6. Add items to user inventory
    const inventory = user.inventory || {};
    const inventoryItems = inventory.inventory?.items || [];
    const lootboxes = inventory.inventory?.lootboxes || [];

    // Add all dropped items to inventory (filter undefined properties)
    results.forEach((item: any) => {
      const inventoryItem: any = {
        itemId: item.itemId,
        type: item.type,
        rarity: item.rarity,
        addedAt: Date.now(),
      };
      // Only add collection if it's defined
      if (item.collection !== undefined) {
        inventoryItem.collection = item.collection;
      }
      // Include bonus stats in inventory
      if (item.bonus !== undefined && item.bonus !== null) {
        inventoryItem.bonus = item.bonus;
      }
      inventoryItems.push(inventoryItem);
    });

    // Remove used lootbox(es) from inventory
    for (let i = 0; i < count; i++) {
      const lootboxIndex = lootboxes.findIndex((lb: any) => lb.lootboxId === lootboxId);
      if (lootboxIndex !== -1) {
        lootboxes.splice(lootboxIndex, 1);
      }
    }

    await userRef.update({
      "inventory.inventory.items": inventoryItems,
      "inventory.inventory.lootboxes": lootboxes,
      updatedAt: Date.now(),
    });

    return res.status(200).json({
      lootboxId,
      opened: count,
      cost: totalCost,
      remainingGold: currentGold - totalCost,
      minItemsPerBox: minItems,
      results,
      openedAt: Date.now(),
    });
  } catch (e: any) {
    console.error("Error in POST /lootboxes/:lootboxId/open:", e);
    return res.status(500).json({ error: e?.message });
  }
});

// ============ ITEMS ============

/**
 * GET /items
 */
app.get("/items", async (req, res) => {
  try {
    const { collection = "items_weapons", type, rarity, activeOnly } = req.query;
    const collectionName = collection as string;

    const snapshot = await db.collection(collectionName).get();
    let items: any[] = [];

    snapshot.docs.forEach(doc => {
      const data = doc.data();
      const fieldValues = Object.values(data);
      
      const isBundleDoc = fieldValues.some(val => 
        typeof val === 'object' && val !== null && (val as any).name
      );

      if (isBundleDoc) {
        Object.entries(data).forEach(([key, value]: [string, any]) => {
          items.push({ itemId: key, ...value });
        });
      } else {
        items.push({ itemId: doc.id, ...data });
      }
    });

    if (type) items = items.filter(i => i.type === type || i.itemType === type);
    if (rarity) items = items.filter(i => i.rarity === rarity);
    if (activeOnly === "true") items = items.filter(i => i.isActive !== false);

    return res.status(200).json({ data: items });
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

/**
 * POST /items
 */
app.post("/items", requireAuth, async (req, res) => {
  try {
    const { collection, ...itemData } = req.body;
    
    if (!collection) {
      return res.status(400).json({ error: "Collection is required in body" });
    }

    const slug = itemData.name.toLowerCase().trim().replace(/\s+/g, '_');
    const prefix = collection.includes('pets') ? 'pet_' : (collection.includes('lootboxes') ? '' : 'item_');
    const customId = `${prefix}${slug}`;

    const itemRef = db.collection(collection).doc(customId);
    
    const item = {
      ...itemData,
      id: customId,
      createdAt: Date.now(),
    };

    await itemRef.set(item);

    return res.status(201).json({
      data: {
        itemId: customId,
      ...item,
      }
    });
  } catch (e: any) {
    console.error("Error in POST /items:", e);
    return res.status(500).json({ error: e?.message });
  }
});

/**
 * GET /items/:itemId
 */
app.get("/items/:itemId", async (req, res) => {
  try {
    const { itemId } = req.params;
    const itemSnap = await db.collection("items").doc(itemId).get();

    if (!itemSnap.exists) {
      return res.status(404).json({ error: "Item not found" });
    }

    return res.status(200).json({
      itemId: itemSnap.id,
      ...itemSnap.data(),
    });
  } catch (e: any) {
    console.error("Error in GET /items/:itemId:", e);
    return res.status(500).json({ error: e?.message });
  }
});

/**
 * PUT /items/:itemId
 */
app.put("/items/:itemId", requireAuth, async (req, res) => {
  try {
    const { itemId } = req.params;
    const itemRef = db.collection("items").doc(itemId);
    const item = {
      ...req.body,
      updatedAt: Date.now(),
    };
    await itemRef.set(item, { merge: false });

    return res.status(200).json({
      itemId,
      ...item,
    });
  } catch (e: any) {
    console.error("Error in PUT /items/:itemId:", e);
    return res.status(500).json({ error: e?.message });
  }
});

/**
 * PATCH /items/:itemId
 */
app.patch("/items/:itemId", requireAuth, async (req, res) => {
  try {
    const { itemId } = req.params;
    const itemRef = db.collection("items").doc(itemId);
    await itemRef.update({
      ...req.body,
      updatedAt: Date.now(),
    });

    const updated = await itemRef.get();
    return res.status(200).json({
      itemId: updated.id,
      ...updated.data(),
    });
  } catch (e: any) {
    console.error("Error in PATCH /items/:itemId:", e);
    return res.status(500).json({ error: e?.message });
  }
});

/**
 * DELETE /items/:itemId
 */
app.delete("/items/:itemId", requireAuth, async (req, res) => {
  try {
    const { itemId } = req.params;
    await db.collection("items").doc(itemId).delete();
    return res.status(200).json({ success: true });
  } catch (e: any) {
    console.error("Error in DELETE /items/:itemId:", e);
    return res.status(500).json({ error: e?.message });
  }
});

/**
 * GET /combat/player-stats/:level
 * Calculate player stats based on level from worldConfig + equipped items
 */
app.get("/combat/player-stats-total/:uid", requireAuth, async (req, res) => {
  try {
    const { uid } = req.params;
    const userRef = db.collection("users").doc(uid);
    const userSnap = await userRef.get();

    if (!userSnap.exists) {
      return res.status(404).json({ error: "User not found" });
    }

    const user = userSnap.data() || {};
    const totalStats = user.stats?.totalStats || {};

    // If missing, calculate AND persist before returning
    if (!totalStats || Object.keys(totalStats).length === 0) {
      const calculated = await calculateTotalStatsForUser(user);
      await userRef.update({ "stats.totalStats": calculated });
      return res.status(200).json(calculated);
    }

    return res.status(200).json(totalStats);
  } catch (e: any) {
    console.error("Error in GET /combat/player-stats-total:", e);
    return res.status(500).json({ error: e?.message });
  }
});
app.delete("/items/:collection/:id", requireAuth, async (req, res) => {
  try {
    const { collection, id } = req.params;
    await db.collection(collection).doc(id).delete();
    return res.status(200).json({ message: "Deleted successfully" });
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

// ============ POMODORO ============

/**
 * POST /pomodoro/session-completed
 * Record a completed pomodoro session in the database
 * Auto-resets daily stats if needed
 */
app.post("/pomodoro/session-completed", requireAuth, async (req, res) => {
  try {
    const uid = (req as any).user.uid;
    const { sessionsCount = 1, focusSeconds = 0 } = req.body;

    if (sessionsCount < 1 || focusSeconds < 0) {
      return res.status(400).json({ error: "Invalid session data" });
    }

    const userRef = db.collection("users").doc(uid);
    const userSnap = await userRef.get();

    if (!userSnap.exists) {
      return res.status(404).json({ error: "User not found" });
    }

    const user = userSnap.data() || {};
    const stats = user.stats || {};

    // Get today's date in "YYYY-MM-DD" format
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const todayDateString = `${year}-${month}-${day}`;

    // Check if we need to reset daily stats (new day)
    const lastPomodoroDayKey = stats.lastPomodoroDayKey || "";
    const needsReset = lastPomodoroDayKey !== todayDateString;

    // Calculate new totals
    let todaysSessions = 0;
    let todaysFocusSeconds = 0;

    if (needsReset) {
      // New day: start fresh
      todaysSessions = sessionsCount;
      todaysFocusSeconds = focusSeconds;
    } else {
      // Same day: add to existing
      todaysSessions = (stats.todaysSessions || 0) + sessionsCount;
      todaysFocusSeconds = (stats.todaysFocusSeconds || 0) + focusSeconds;
    }

    // Update user stats with today's data
    await userRef.update({
      "stats.todaysSessions": todaysSessions,
      "stats.todaysFocusSeconds": todaysFocusSeconds,
      "stats.lastPomodoroDayKey": todayDateString,
      updatedAt: Date.now(),
    });

    console.log(`✅ [Pomodoro] User ${uid} completed session. Today: ${todaysSessions} sessions, ${todaysFocusSeconds}s focus`);

    return res.status(200).json({
      success: true,
      userId: uid,
      today: {
        sessions: todaysSessions,
        focusSeconds: todaysFocusSeconds,
        date: todayDateString,
      },
      wasReset: needsReset,
    });
  } catch (e: any) {
    console.error("Error in POST /pomodoro/session-completed:", e);
    return res.status(500).json({ error: e?.message });
  }
});

// ============ HEALTH ============

app.get("/health", (_req, res) => {
  res.status(200).json({ ok: true, timestamp: Date.now() });
});

// ============ ERROR HANDLER ============

app.use((_req, res) => {
  res.status(404).json({ error: "Not found" });
});

// ============ EXPORT ============

export const api = onRequest(app);