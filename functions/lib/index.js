"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.api = void 0;
const admin = __importStar(require("firebase-admin"));
const https_1 = require("firebase-functions/v1/https");
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
// Initialize Admin SDK
admin.initializeApp();
const app = (0, express_1.default)();
const db = admin.firestore();
// CORS
app.use((0, cors_1.default)({
    origin: true,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
}));
app.options("*", (0, cors_1.default)());
app.use(express_1.default.json());
/**
 * Auth middleware
 */
async function requireAuth(req, res, next) {
    try {
        const header = req.headers.authorization || "";
        const [type, token] = header.split(" ");
        if (type !== "Bearer" || !token) {
            return res.status(401).json({ error: "Missing Bearer token" });
        }
        const decoded = await admin.auth().verifyIdToken(token);
        req.user = decoded;
        next();
    }
    catch (err) {
        return res.status(401).json({ error: "Invalid token" });
    }
}
// ============ AUTH ============
/**
 * GET /auth/me
 */
app.get("/auth/me", requireAuth, async (req, res) => {
    try {
        const uid = req.user.uid;
        const decoded = req.user;
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
    }
    catch (e) {
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
        const uid = req.user.uid;
        const tasksRef = db.collection("users").doc(uid).collection("tasks");
        const snap = await tasksRef.get();
        const tasks = snap.docs.map((doc) => ({
            taskId: doc.id,
            ...doc.data(),
        }));
        return res.status(200).json(tasks);
    }
    catch (e) {
        console.error("Error in GET /tasks:", e);
        return res.status(500).json({ error: e?.message });
    }
});
/**
 * POST /tasks
 */
app.post("/tasks", requireAuth, async (req, res) => {
    try {
        const uid = req.user.uid;
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
    }
    catch (e) {
        console.error("Error in POST /tasks:", e);
        return res.status(500).json({ error: e?.message });
    }
});
/**
 * GET /tasks/{taskId}
 */
app.get("/tasks/:taskId", requireAuth, async (req, res) => {
    try {
        const uid = req.user.uid;
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
    }
    catch (e) {
        console.error("Error in GET /tasks/:taskId:", e);
        return res.status(500).json({ error: e?.message });
    }
});
/**
 * PATCH /tasks/{taskId}
 */
app.patch("/tasks/:taskId", requireAuth, async (req, res) => {
    try {
        const uid = req.user.uid;
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
    }
    catch (e) {
        console.error("Error in PATCH /tasks/:taskId:", e);
        return res.status(500).json({ error: e?.message });
    }
});
/**
 * DELETE /tasks/{taskId}
 */
app.delete("/tasks/:taskId", requireAuth, async (req, res) => {
    try {
        const uid = req.user.uid;
        const { taskId } = req.params;
        await db
            .collection("users")
            .doc(uid)
            .collection("tasks")
            .doc(taskId)
            .delete();
        return res.status(200).json({ success: true });
    }
    catch (e) {
        console.error("Error in DELETE /tasks/:taskId:", e);
        return res.status(500).json({ error: e?.message });
    }
});
/**
 * POST /tasks/{taskId}/complete
 */
app.post("/tasks/:taskId/complete", requireAuth, async (req, res) => {
    try {
        const uid = req.user.uid;
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
    }
    catch (e) {
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
    }
    catch (e) {
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
    }
    catch (e) {
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
    }
    catch (e) {
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
    }
    catch (e) {
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
    }
    catch (e) {
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
    }
    catch (e) {
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
    }
    catch (e) {
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
        let query = db.collection("users");
        if (role) {
            query = query.where("role", "==", role);
        }
        if (status) {
            query = query.where("status", "==", status);
        }
        // We halen de data op zonder de complexe sortering die indexen vereist
        const snap = await query.limit(parseInt(limit, 10) || 50).get();
        const users = snap.docs.map((doc) => ({
            uid: doc.id,
            ...doc.data(),
        }));
        return res.status(200).json({
            data: users,
            pagination: {
                total: snap.size,
                limit: parseInt(limit, 10) || 50
            },
        });
    }
    catch (e) {
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
    }
    catch (e) {
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
    }
    catch (e) {
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
    }
    catch (e) {
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
    }
    catch (e) {
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
    }
    catch (e) {
        console.error("Error in GET /leaderboards/global:", e);
        return res.status(500).json({ error: e?.message });
    }
});
// ============ COURSES ============
/**
 * GET /courses
 */
app.get("/courses", async (req, res) => {
    try {
        const activeOnly = req.query.activeOnly === "true";
        const coursesRef = db.collection("courses");
        let query = coursesRef;
        if (activeOnly) {
            query = query.where("isActive", "==", true);
        }
        const snap = await query.get();
        const courses = snap.docs.map((doc) => ({
            courseId: doc.id,
            ...doc.data(),
        }));
        return res.status(200).json(courses);
    }
    catch (e) {
        console.error("Error in GET /courses:", e);
        return res.status(500).json({ error: e?.message });
    }
});
/**
 * POST /courses
 */
app.post("/courses", requireAuth, async (req, res) => {
    try {
        const newCourseRef = db.collection("courses").doc();
        const course = {
            ...req.body,
            createdAt: Date.now(),
            updatedAt: Date.now(),
        };
        await newCourseRef.set(course);
        return res.status(201).json({
            courseId: newCourseRef.id,
            ...course,
        });
    }
    catch (e) {
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
    }
    catch (e) {
        console.error("Error in GET /courses/:courseId:", e);
        return res.status(500).json({ error: e?.message });
    }
});
/**
 * PUT /courses/:courseId
 */
app.put("/courses/:courseId", requireAuth, async (req, res) => {
    try {
        const { courseId } = req.params;
        const courseRef = db.collection("courses").doc(courseId);
        const course = {
            ...req.body,
            updatedAt: Date.now(),
        };
        await courseRef.set(course, { merge: false });
        return res.status(200).json({
            courseId,
            ...course,
        });
    }
    catch (e) {
        console.error("Error in PUT /courses/:courseId:", e);
        return res.status(500).json({ error: e?.message });
    }
});
/**
 * PATCH /courses/:courseId
 */
app.patch("/courses/:courseId", requireAuth, async (req, res) => {
    try {
        const { courseId } = req.params;
        const courseRef = db.collection("courses").doc(courseId);
        await courseRef.update({
            ...req.body,
            updatedAt: Date.now(),
        });
        const updated = await courseRef.get();
        return res.status(200).json({
            courseId: updated.id,
            ...updated.data(),
        });
    }
    catch (e) {
        console.error("Error in PATCH /courses/:courseId:", e);
        return res.status(500).json({ error: e?.message });
    }
});
/**
 * DELETE /courses/:courseId
 */
app.delete("/courses/:courseId", requireAuth, async (req, res) => {
    try {
        const { courseId } = req.params;
        await db.collection("courses").doc(courseId).delete();
        return res.status(200).json({ success: true });
    }
    catch (e) {
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
    }
    catch (e) {
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
    }
    catch (e) {
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
    }
    catch (e) {
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
    }
    catch (e) {
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
    }
    catch (e) {
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
    }
    catch (e) {
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
    }
    catch (e) {
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
    }
    catch (e) {
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
    }
    catch (e) {
        console.error("Error in DELETE /modules/:moduleId:", e);
        return res.status(500).json({ error: e?.message });
    }
});
// ============ COMBAT ============
/**
 * POST /combat/start
 */
app.post("/combat/start", requireAuth, async (req, res) => {
    try {
        const uid = req.user.uid;
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
    }
    catch (e) {
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
    }
    catch (e) {
        console.error("Error in GET /combat/:combatId:", e);
        return res.status(500).json({ error: e?.message });
    }
});
/**
 * POST /combat/:combatId/resolve
 */
app.post("/combat/:combatId/resolve", requireAuth, async (req, res) => {
    try {
        const uid = req.user.uid;
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
            await userRef.update({
                "stats.xp": (user.stats?.xp || 0) + xpGained,
                "stats.gold": (user.stats?.gold || 0) + goldGained,
                "stats.totalXP": (user.stats?.totalXP || 0) + xpGained,
            });
        }
        const updated = await combatRef.get();
        return res.status(200).json({
            combatId: updated.id,
            ...updated.data(),
        });
    }
    catch (e) {
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
    }
    catch (e) {
        console.error("Error in GET /worlds:", e);
        return res.status(500).json({ error: e?.message });
    }
});
/**
 * POST /worlds
 */
app.post("/worlds", requireAuth, async (req, res) => {
    try {
        const worldRef = db.collection("worlds").doc();
        const world = {
            ...req.body,
            createdAt: Date.now(),
        };
        await worldRef.set(world);
        return res.status(201).json({
            worldId: worldRef.id,
            ...world,
        });
    }
    catch (e) {
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
    }
    catch (e) {
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
    }
    catch (e) {
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
    }
    catch (e) {
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
        return res.status(200).json({ success: true });
    }
    catch (e) {
        console.error("Error in DELETE /worlds/:worldId:", e);
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
    }
    catch (e) {
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
    }
    catch (e) {
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
    }
    catch (e) {
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
    }
    catch (e) {
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
    }
    catch (e) {
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
    }
    catch (e) {
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
    }
    catch (e) {
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
            query = query.where("worldId", "==", req.query.worldId);
        }
        if (req.query.tier) {
            query = query.where("tier", "==", req.query.tier);
        }
        const monstersSnap = await query.get();
        const monsters = monstersSnap.docs.map((doc) => ({
            monsterId: doc.id,
            ...doc.data(),
        }));
        return res.status(200).json(monsters);
    }
    catch (e) {
        console.error("Error in GET /monsters:", e);
        return res.status(500).json({ error: e?.message });
    }
});
/**
 * POST /monsters
 */
app.post("/monsters", requireAuth, async (req, res) => {
    try {
        const monsterRef = db.collection("monsters").doc();
        const monster = {
            ...req.body,
            createdAt: Date.now(),
        };
        await monsterRef.set(monster);
        return res.status(201).json({
            monsterId: monsterRef.id,
            ...monster,
        });
    }
    catch (e) {
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
    }
    catch (e) {
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
    }
    catch (e) {
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
    }
    catch (e) {
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
        return res.status(200).json({ success: true });
    }
    catch (e) {
        console.error("Error in DELETE /monsters/:monsterId:", e);
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
        const lootboxes = lootboxesSnap.docs.map((doc) => ({
            lootboxId: doc.id,
            ...doc.data(),
        }));
        return res.status(200).json(lootboxes);
    }
    catch (e) {
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
    }
    catch (e) {
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
    }
    catch (e) {
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
    }
    catch (e) {
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
    }
    catch (e) {
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
    }
    catch (e) {
        console.error("Error in DELETE /lootboxes/:lootboxId:", e);
        return res.status(500).json({ error: e?.message });
    }
});
/**
 * POST /lootboxes/:lootboxId/open
 */
app.post("/lootboxes/:lootboxId/open", requireAuth, async (req, res) => {
    try {
        const uid = req.user.uid;
        const { lootboxId } = req.params;
        const { count = 1 } = req.body;
        const lootboxSnap = await db.collection("lootboxes").doc(lootboxId).get();
        if (!lootboxSnap.exists) {
            return res.status(404).json({ error: "Lootbox not found" });
        }
        // Simple loot generation - can be expanded
        const rewards = [];
        for (let i = 0; i < count; i++) {
            rewards.push({
                type: "gold",
                amount: Math.floor(Math.random() * 100) + 50,
            });
        }
        return res.status(200).json({
            rewards,
            openedAt: Date.now(),
        });
    }
    catch (e) {
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
        const collectionName = collection;
        const snapshot = await db.collection(collectionName).get();
        let items = [];
        snapshot.docs.forEach(doc => {
            const data = doc.data();
            const fieldValues = Object.values(data);
            const isBundleDoc = fieldValues.some(val => typeof val === 'object' && val !== null && val.name);
            if (isBundleDoc) {
                Object.entries(data).forEach(([key, value]) => {
                    items.push({ itemId: key, ...value });
                });
            }
            else {
                items.push({ itemId: doc.id, ...data });
            }
        });
        if (type)
            items = items.filter(i => i.type === type || i.itemType === type);
        if (rarity)
            items = items.filter(i => i.rarity === rarity);
        if (activeOnly === "true")
            items = items.filter(i => i.isActive !== false);
        return res.status(200).json({ data: items });
    }
    catch (e) {
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
    }
    catch (e) {
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
    }
    catch (e) {
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
    }
    catch (e) {
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
    }
    catch (e) {
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
    }
    catch (e) {
        console.error("Error in DELETE /items/:itemId:", e);
        return res.status(500).json({ error: e?.message });
    }
});
app.delete("/items/:collection/:id", requireAuth, async (req, res) => {
    try {
        const { collection, id } = req.params;
        await db.collection(collection).doc(id).delete();
        return res.status(200).json({ message: "Deleted successfully" });
    }
    catch (e) {
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
exports.api = (0, https_1.onRequest)(app);
