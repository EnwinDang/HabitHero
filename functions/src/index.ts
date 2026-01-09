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

// Middleware
app.use(
  cors({
    origin: true,
  })
);
app.use(express.json());

/**
 * Auth middleware
 */
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

// Level calculation helper using levels definitions stored in Firestore
async function calculateLevelFromXP(totalXP: number): Promise<{
  level: number;
  currentXP: number;
  nextLevelXP: number;
  rewards?: any;
}> {
  try {
    const levelsSnap = await db.collection("levels").doc("definitions").get();
    const levelsData = levelsSnap.data() || {};
    const levels = (levelsData as any).levels || [];

    let currentLevel = 1;
    let currentXP = totalXP;
    let nextLevelXP = 100;
    let rewards = undefined;

    if (levels.length === 0) {
      return { level: currentLevel, currentXP, nextLevelXP, rewards };
    }

    for (let i = 0; i < levels.length; i++) {
      const levelDef = levels[i];
      if (totalXP >= levelDef.xpRequiredTotal) {
        currentLevel = levelDef.level;
        currentXP = totalXP - levelDef.xpRequiredTotal;

        if (i + 1 < levels.length) {
          nextLevelXP = levels[i + 1].xpRequiredTotal - levelDef.xpRequiredTotal;
          rewards = levels[i + 1].rewards;
        } else {
          nextLevelXP = levelDef.nextLevelXP || nextLevelXP;
          rewards = levelDef.rewards;
        }
      } else {
        break;
      }
    }

    return { level: currentLevel, currentXP, nextLevelXP, rewards };
  } catch (error) {
    console.error("Error calculating level from XP:", error);
    return { level: 1, currentXP: totalXP, nextLevelXP: 100 };
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
          loginStreak: 1,
          maxLoginStreak: 1,
          lastLoginDate: todayDateString, // Same format for consistency
        },
      };
      await userRef.set(newUser);
      return res.status(200).json(newUser);
    }

    const user = snap.data();
    const lastLoginDate = user.stats?.lastLoginDate;
    
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
    await userRef.update({
      updatedAt: Date.now(),
      lastLoginAt: todayDateString, // "2026-01-08"
      "stats.loginStreak": loginStreak,
      "stats.maxLoginStreak": maxLoginStreak,
      "stats.lastLoginDate": todayDateString,
    });

    // Return updated user data
    const updatedSnap = await userRef.get();
    const userData = updatedSnap.data() || {};
    
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

    const submissionId = db.collection("__ids").doc().id;
    const now = Date.now();
    const submission = {
      studentId: uid,
      imageUrl: imageUrl || null,
      status: "pending" as (typeof SUBMISSION_STATUS)[number],
      teacherComment: null as string | null,
      createdAt: now,
      updatedAt: now,
      courseId,
      moduleId,
      taskId,
      // attach owning teacher; do NOT default to student uid
      teacherId: courseData.createdBy || courseData.teacherId || null,
    };

    // Store submission inside task document map
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

    const oldLevel = user.stats?.level || 1;
    const newTotalXP = (user.stats?.totalXP || 0) + (taskData.xp || 0);
    let newGold = (user.stats?.gold || 0) + (taskData.gold || 0);

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

    return res.status(200).json({
      success: true,
      reward: { xp: taskData.xp, gold: taskData.gold },
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
    const newTotalXP = (user.stats?.totalXP || 0) + (task.xp || 0);
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

    return res.status(200).json({
      success: true,
      reward: {
        xp: task.xp,
        gold: task.gold,
      },
      leveledUp,
      newLevel: levelData.level,
      currentXP: levelData.currentXP,
      nextLevelXP: levelData.nextLevelXP,
      levelUpRewards,
    });
  } catch (e: any) {
    console.error("Error in POST /tasks/:taskId/complete:", e);
    return res.status(500).json({ error: e?.message });
  }
});

// ============ ACHIEVEMENTS ============

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

    return res.status(200).json(achievements);
  } catch (e: any) {
    console.error("Error in GET /users/:uid/achievements:", e);
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

    return res.status(200).json({ data: achievements });
  } catch (e: any) {
    console.error("Error in GET /achievements:", e);
    return res.status(500).json({ error: e?.message });
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
 */
app.get("/users/:uid/inventory", requireAuth, async (req, res) => {
  try {
    const { uid } = req.params;
    
    // Get user document for gold and other data
    const userSnap = await db.collection("users").doc(uid).get();
    const user = userSnap.data() || {};
    
    // Get inventory subcollection
    const inventorySnapshot = await db.collection("users").doc(uid).collection("inventory").get();
    const items = inventorySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    // Normalize the inventory structure
    const normalizedInventory = {
      gold: user.stats?.gold || user.inventory?.gold || 0,
      items: items,
      materials: user.inventory?.materials || {},
      lastUpdatedAt: user.inventory?.lastUpdatedAt || Date.now()
    };
    
    return res.status(200).json(normalizedInventory);
  } catch (e: any) {
    console.error("Error in GET /users/:uid/inventory:", e);
    return res.status(500).json({ error: e?.message });
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
    const { itemId, slot } = req.body; // slot: 'weapon', 'helmet', 'chestplate', 'pants', 'boots', 'pet1', 'pet2', 'accessory1', 'accessory2'

    if (!itemId || !slot) {
      return res.status(400).json({ error: "itemId and slot are required" });
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

    // Validate slot based on item type
    const itemType = itemInInventory.type || itemInInventory.itemType;
    const validSlots: Record<string, string[]> = {
      weapon: ["weapon"],
      helmet: ["helmet"],
      chestplate: ["chestplate"],
      pants: ["pants"],
      boots: ["boots"],
      pet: ["pet1", "pet2"],
      accessory: ["accessory1", "accessory2"],
    };

    const allowedSlots = validSlots[itemType] || [];
    if (!allowedSlots.includes(slot)) {
      return res.status(400).json({ 
        error: `Item type '${itemType}' cannot be equipped in slot '${slot}'`,
        allowedSlots 
      });
    }

    // Unequip current item in slot if exists
    let unequippedItem = null;
    if (slot === "weapon") {
      if (equipped.weapon) {
        unequippedItem = equipped.weapon;
        // Add back to inventory
        items.push({ itemId: equipped.weapon });
      }
      equipped.weapon = itemId;
    } else if (["helmet", "chestplate", "pants", "boots"].includes(slot)) {
      if (equipped.armor[slot]) {
        unequippedItem = equipped.armor[slot];
        items.push({ itemId: equipped.armor[slot] });
      }
      equipped.armor[slot] = itemId;
    } else if (slot === "pet1" || slot === "pet2") {
      if (equipped.pets[slot]) {
        unequippedItem = equipped.pets[slot];
        items.push({ itemId: equipped.pets[slot] });
      }
      equipped.pets[slot] = itemId;
    } else if (slot === "accessory1" || slot === "accessory2") {
      if (equipped.accessoiries[slot]) {
        unequippedItem = equipped.accessoiries[slot];
        items.push({ itemId: equipped.accessoiries[slot] });
      }
      equipped.accessoiries[slot] = itemId;
    }

    // Remove equipped item from inventory
    const updatedItems = items.filter((i: any) => i.itemId !== itemId);

    await userRef.update({
      "inventory.equiped": equipped,
      "inventory.inventory.items": updatedItems,
      updatedAt: Date.now(),
    });

    return res.status(200).json({
      success: true,
      equipped: itemId,
      slot,
      unequipped: unequippedItem,
      equiped: equipped,
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
    const items = inventory.inventory?.items || [];

    let unequippedItemId = null;

    // Find and remove item from equipped slot
    if (slot === "weapon") {
      if (!equipped.weapon) {
        return res.status(400).json({ error: "No weapon equipped" });
      }
      unequippedItemId = equipped.weapon;
      equipped.weapon = "";
    } else if (["helmet", "chestplate", "pants", "boots"].includes(slot)) {
      if (!equipped.armor[slot]) {
        return res.status(400).json({ error: `No armor equipped in ${slot}` });
      }
      unequippedItemId = equipped.armor[slot];
      delete equipped.armor[slot];
    } else if (slot === "pet1" || slot === "pet2") {
      if (!equipped.pets[slot]) {
        return res.status(400).json({ error: `No pet equipped in ${slot}` });
      }
      unequippedItemId = equipped.pets[slot];
      delete equipped.pets[slot];
    } else if (slot === "accessory1" || slot === "accessory2") {
      if (!equipped.accessoiries[slot]) {
        return res.status(400).json({ error: `No accessory equipped in ${slot}` });
      }
      unequippedItemId = equipped.accessoiries[slot];
      delete equipped.accessoiries[slot];
    } else {
      return res.status(400).json({ error: `Invalid slot: ${slot}` });
    }

    // Add item back to inventory
    items.push({ itemId: unequippedItemId });

    await userRef.update({
      "inventory.equiped": equipped,
      "inventory.inventory.items": items,
      updatedAt: Date.now(),
    });

    return res.status(200).json({
      success: true,
      unequipped: unequippedItemId,
      slot,
      equiped: equipped,
    });
  } catch (e: any) {
    console.error("Error in POST /users/:uid/unequip:", e);
    return res.status(500).json({ error: e?.message });
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
    const equipped = user.inventory?.equiped || { armor: {}, pets: {}, accessoiries: {}, weapon: "" };

    return res.status(200).json(equipped);
  } catch (e: any) {
    console.error("Error in GET /users/:uid/equipped:", e);
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
 * Students and admins can see all courses
 */
app.get("/courses", requireAuth, async (req, res) => {
  try {
    const uid = (req as any).user.uid;
    const activeOnly = req.query.activeOnly === "true";
    
    // Get user role
    const userSnap = await db.collection("users").doc(uid).get();
    const userData = userSnap.data();
    const userRole = userData?.role || "student";
    
    const coursesRef = db.collection("courses");
    let query: any = coursesRef;
    
    // Teachers can only see their own courses
    if (userRole === "teacher") {
      query = query.where("createdBy", "==", uid);
    }
    
    if (activeOnly) {
      query = query.where("isActive", "==", true);
    }

    const snap = await query.get();
    const courses = snap.docs.map((doc) => ({
      courseId: doc.id,
      ...doc.data(),
    }));

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

    const students = studentsSnap.docs.map((doc) => ({
      uid: doc.id,
      ...doc.data(),
    }));

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
    const { worldId, stage, seed } = req.body;

    const combatRef = db.collection("combats").doc();
    const combat = {
      combatId: combatRef.id,
      uid,
      worldId,
      stage,
      seed: seed || Math.random().toString(36).substring(2),
      status: "in-progress",
      startedAt: Date.now(),
      completedAt: null,
    };

    await combatRef.set(combat);
    return res.status(201).json(combat);
  } catch (e: any) {
    console.error("Error in POST /combat/start:", e);
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
 * GET /combat/monster-stats/:worldId/:stage
 * Calculate monster stats based on worldConfig
 */
app.get("/combat/monster-stats/:worldId/:stage", async (req, res) => {
  try {
    const { worldId, stage } = req.params;
    const stageNum = parseInt(stage);

    // Get worldConfig
    const configSnap = await db.collection("worldConfig").doc("monsterScaling").get();
    if (!configSnap.exists) {
      return res.status(404).json({ error: "Monster scaling config not found" });
    }

    const config = configSnap.data() || {};
    const baseStats = config.basePerWorld?.[worldId];
    const multipliers = config.perStageMultiplier || [];

    if (!baseStats) {
      return res.status(404).json({ error: `No base stats found for ${worldId}` });
    }

    // Get stage multiplier (array is 0-indexed, stage 1 = index 1)
    const stageMultiplier = multipliers[stageNum] || 1;

    const monsterStats = {
      worldId,
      stage: stageNum,
      baseAttack: baseStats.attack,
      baseHp: baseStats.hp,
      multiplier: stageMultiplier,
      attack: Math.round(baseStats.attack * stageMultiplier),
      hp: Math.round(baseStats.hp * stageMultiplier),
    };

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
      const newTotalXP = (user.stats?.totalXP || 0) + (rewards?.xpGained || 0);
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
        levelUpRewards,
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

    await combatRef.update({
      status: victory ? "victory" : "defeat",
      completedAt: Date.now(),
      reward: {
        xp: xpGained,
        gold: goldGained,
      },
    });

    if (victory) {
      const userRef = db.collection("users").doc(uid);
      const userSnap = await userRef.get();
      const user = userSnap.data() || {};

      const oldLevel = user.stats?.level || 1;
      const newTotalXP = (user.stats?.totalXP || 0) + xpGained;
      let newGold = (user.stats?.gold || 0) + goldGained;

      // Calculate new level from total XP
      const levelData = await calculateLevelFromXP(newTotalXP);
      const leveledUp = levelData.level > oldLevel;

      // Add level-up rewards if leveled up
      if (leveledUp && levelData.rewards) {
        newGold += levelData.rewards.gold || 0;
        if (levelData.rewards.gems) {
          await userRef.update({
            "stats.gems": (user.stats?.gems || 0) + levelData.rewards.gems,
          });
        }
      }

      await userRef.update({
        "stats.level": levelData.level,
        "stats.xp": levelData.currentXP,
        "stats.nextLevelXP": levelData.nextLevelXP,
        "stats.totalXP": newTotalXP,
        "stats.gold": newGold,
        updatedAt: Date.now(),
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
 */
app.get("/worlds", async (req, res) => {
  try {
    const worldsSnap = await db.collection("worlds").get();
    const worlds = worldsSnap.docs.map((doc) => ({
      worldId: doc.id,
      ...doc.data(),
    }));

    return res.status(200).json(worlds);
  } catch (e: any) {
    console.error("Error in GET /worlds:", e);
    return res.status(500).json({ error: e?.message });
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
    const bonusEnabled = bonusSystem?.enabled || false;
    const bonusChance = bonusSystem?.bonusChance || 0;
    const possibleBonuses = bonusSystem?.possibleBonuses || {};

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


app.delete("/items/:collection/:id", requireAuth, async (req, res) => {
  try {
    const { collection, id } = req.params;
    await db.collection(collection).doc(id).delete();
    return res.status(200).json({ message: "Deleted successfully" });
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
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