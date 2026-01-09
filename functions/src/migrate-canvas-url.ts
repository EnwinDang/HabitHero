/**
 * Migration script to add canvasUrl field to all existing tasks
 * Run this once to update all existing tasks in the database
 */

import * as admin from "firebase-admin";

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
  } catch (error) {
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
