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
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
// Initialize Admin SDK (uses the Functions service account automatically)
admin.initializeApp();
const app = (0, express_1.default)();
// CORS - in dev maakt dit alles makkelijker
app.use((0, cors_1.default)({
    origin: true,
    credentials: true,
}));
app.use(express_1.default.json());
/**
 * Auth middleware - verwacht:
 * Authorization: Bearer <FIREBASE_ID_TOKEN>
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
/**
 * Default user object - pas aan naar jouw model
 */
function buildDefaultUser(uid, decoded) {
    const email = decoded.email ?? null;
    const displayName = decoded.name ??
        decoded.email?.split("@")[0] ??
        "New Hero";
    const now = Date.now();
    return {
        uid,
        email,
        displayName,
        createdAt: now,
        updatedAt: now,
        stats: {
            level: 1,
            xp: 0,
            gold: 0,
            streak: 0
        },
        // Je kan later uitbreiden:
        inventory: {},
        equipped: {},
    };
}
/**
 * GET /auth/me
 * - Verifieert token
 * - Maakt user aan in Realtime Database als die niet bestaat
 * - Returnt User object
 */
app.get("/auth/me", requireAuth, async (req, res) => {
    try {
        const decoded = req.user;
        const uid = decoded.uid;
        const userRef = admin.database().ref(`users/${uid}`);
        const snap = await userRef.get();
        if (!snap.exists()) {
            const newUser = buildDefaultUser(uid, decoded);
            await userRef.set(newUser);
            return res.status(200).json(newUser);
        }
        const existingUser = snap.val();
        // update some fields opportunistically (naam/email kan veranderen bij Google)
        const patched = {
            ...existingUser,
            email: decoded.email ?? existingUser.email ?? null,
            displayName: decoded.name ??
                existingUser.displayName ??
                decoded.email?.split("@")[0] ??
                "Hero",
            updatedAt: Date.now(),
        };
        await userRef.update({
            email: patched.email,
            displayName: patched.displayName,
            updatedAt: patched.updatedAt,
        });
        return res.status(200).json(patched);
    }
    catch (e) {
        return res.status(500).json({ error: e?.message || "Server error" });
    }
});
// Handige health check
app.get("/health", (_req, res) => {
    res.status(200).json({ ok: true, timestamp: Date.now() });
});
/**
 * IMPORTANT:
 * Export function name MUST be "api"
 * so your Vite proxy target:
 * https://us-central1-habithero-73d98.cloudfunctions.net/api
 */
exports.api = functions
    .region("us-central1")
    .https.onRequest(app);
