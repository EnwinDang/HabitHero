import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import express from "express";
import cors from "cors";

// Initialize Admin SDK (uses the Functions service account automatically)
admin.initializeApp();

const app = express();

// CORS - in dev maakt dit alles makkelijker
app.use(
  cors({
    origin: true,
    credentials: true,
  })
);

app.use(express.json());

/**
 * Auth middleware - verwacht:
 * Authorization: Bearer <FIREBASE_ID_TOKEN>
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

/**
 * Default user object - pas aan naar jouw model
 */
function buildDefaultUser(uid: string, decoded: admin.auth.DecodedIdToken) {
  const email = decoded.email ?? null;
  const displayName =
    decoded.name ??
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
app.get(
  "/auth/me",
  requireAuth,
  async (req: express.Request, res: express.Response) => {
  try {
    const decoded = (req as any).user as admin.auth.DecodedIdToken;
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
      displayName:
        decoded.name ??
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
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || "Server error" });
  }
});

// Handige health check
app.get("/health", (_req: express.Request, res: express.Response) => {
  res.status(200).json({ ok: true, timestamp: Date.now() });
});

/**
 * IMPORTANT:
 * Export function name MUST be "api"
 * so your Vite proxy target:
 * https://us-central1-habithero-73d98.cloudfunctions.net/api
 */
export const api = functions
  .region("us-central1")
  .https.onRequest(app);
