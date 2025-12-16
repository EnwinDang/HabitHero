import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import express from "express";
import cors from "cors";

// Initialize Admin SDK
admin.initializeApp();

const app = express();
const db = admin.firestore();

// CORS
app.use(
  cors({
    origin: true,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.options("*", cors());
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

// ============ AUTH ============

/**
 * GET /auth/me
 */
app.get("/auth/me", requireAuth, async (req, res) => {
  try {
    const uid = (req as any).user.uid;
    const decoded = (req as any).user as admin.auth.DecodedIdToken;

    const userRef = db.collection("users").doc(uid);
    const snap = await userRef.get();

    if (!snap.exists) {
      const newUser = {
        uid,
        email: decoded.email,
        displayName: decoded.name || decoded.email?.split("@")[0] || "Hero",
        photoURL: decoded.picture || null,
        role: "student",
        status: "active",
        createdAt: Date.now(),
        updatedAt: Date.now(),
        lastLoginAt: Date.now(),
        stats: {
          level: 1,
          xp: 0,
          nextLevelXP: 100,
          totalXP: 0,
          gold: 0,
          gems: 0,
          streak: 0,
          maxStreak: 0,
        },
        settings: {
          notificationsEnabled: true,
          theme: "dark",
          language: "nl",
        },
      };
      await userRef.set(newUser);
      return res.status(200).json(newUser);
    }

    const user = snap.data();
    await userRef.update({ updatedAt: Date.now(), lastLoginAt: Date.now() });

    return res.status(200).json(user);
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
    const uid = (req as any).user.uid;
    const tasksRef = db.collection("users").doc(uid).collection("tasks");
    const snap = await tasksRef.get();

    const tasks = snap.docs.map((doc) => ({
      taskId: doc.id,
      ...doc.data(),
    }));

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
    const uid = (req as any).user.uid;
    const { title, description, difficulty, xp, gold, dueAt, isRepeatable } = req.body;

    const tasksRef = db.collection("users").doc(uid).collection("tasks");
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
    const uid = (req as any).user.uid;
    const { taskId } = req.params;

    const taskSnap = await db
      .collection("users")
      .doc(uid)
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
    const uid = (req as any).user.uid;
    const { taskId } = req.params;

    const taskRef = db
      .collection("users")
      .doc(uid)
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
    const uid = (req as any).user.uid;
    const { taskId } = req.params;

    await db
      .collection("users")
      .doc(uid)
      .collection("tasks")
      .doc(taskId)
      .delete();

    return res.status(200).json({ success: true });
  } catch (e: any) {
    console.error("Error in DELETE /tasks/:taskId:", e);
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

    const newXP = (user.stats?.xp || 0) + (task.xp || 0);
    const newGold = (user.stats?.gold || 0) + (task.gold || 0);

    const statsUpdate = {
      "stats.xp": newXP,
      "stats.gold": newGold,
      "stats.totalXP": (user.stats?.totalXP || 0) + (task.xp || 0),
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

    return res.status(200).json(achievements);
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
    const { name, description, icon, reward } = req.body;

    const newAchievementRef = db.collection("achievements").doc();
    await newAchievementRef.set({
      name,
      description,
      icon,
      reward,
      createdAt: Date.now(),
    });

    return res.status(201).json({
      achievementId: newAchievementRef.id,
      name,
      description,
      icon,
      reward,
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
    const userSnap = await db.collection("users").doc(uid).get();

    const user = userSnap.data() || {};
    return res.status(200).json(user.inventory || {});
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

// ============ USERS ============

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

// ============ HEALTH ============

app.get("/health", (_req, res) => {
  res.status(200).json({ ok: true, timestamp: Date.now() });
});

// ============ ERROR HANDLER ============

app.use((_req, res) => {
  res.status(404).json({ error: "Not found" });
});

// ============ EXPORT ============

export const api = functions
  .region("us-central1")
  .runWith({
    timeoutSeconds: 60,
    memory: "256MB",
  })
  .https.onRequest(app);
