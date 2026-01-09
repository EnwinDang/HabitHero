"use strict";
/**
 * Migration script to add canvasUrl field to all existing tasks
 * Run this once to update all existing tasks in the database
 */
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
Object.defineProperty(exports, "__esModule", { value: true });
const admin = __importStar(require("firebase-admin"));
// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
    admin.initializeApp();
}
const db = admin.firestore();
async function migrateCanvasUrl() {
    console.log("🔄 Starting migration to add canvasUrl field to all tasks...");
    try {
        // Get all users
        const usersSnapshot = await db.collection("users").get();
        console.log(`📊 Found ${usersSnapshot.size} users`);
        let totalTasks = 0;
        let updatedTasks = 0;
        let skippedTasks = 0;
        // For each user, get their tasks
        for (const userDoc of usersSnapshot.docs) {
            const userId = userDoc.id;
            const tasksSnapshot = await db
                .collection("users")
                .doc(userId)
                .collection("tasks")
                .get();
            console.log(`👤 User ${userId}: ${tasksSnapshot.size} tasks`);
            // Update each task that doesn't have canvasUrl field
            for (const taskDoc of tasksSnapshot.docs) {
                totalTasks++;
                const taskData = taskDoc.data();
                // Check if canvasUrl field already exists
                if (taskData.canvasUrl !== undefined) {
                    skippedTasks++;
                    continue;
                }
                // Add canvasUrl field with null value
                await taskDoc.ref.update({
                    canvasUrl: null,
                });
                updatedTasks++;
                console.log(`  ✅ Updated task ${taskDoc.id}`);
            }
        }
        console.log("\n📈 Migration Summary:");
        console.log(`   Total tasks found: ${totalTasks}`);
        console.log(`   Tasks updated: ${updatedTasks}`);
        console.log(`   Tasks skipped (already had canvasUrl): ${skippedTasks}`);
        console.log("✅ Migration completed successfully!");
        return {
            totalTasks,
            updatedTasks,
            skippedTasks,
        };
    }
    catch (error) {
        console.error("❌ Migration failed:", error);
        throw error;
    }
}
// Run the migration
migrateCanvasUrl()
    .then((result) => {
    console.log("\n✅ Done!", result);
    process.exit(0);
})
    .catch((error) => {
    console.error("\n❌ Error:", error);
    process.exit(1);
});
