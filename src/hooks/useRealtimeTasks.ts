import { useEffect, useState } from "react";
import { db } from "@/firebase";
import { auth } from "@/firebase";
import { collection, query, onSnapshot } from "firebase/firestore";
import type { Task } from "@/models/task.model";

export function useRealtimeTasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) {
      setTasks([]);
      setLoading(false);
      return;
    }

    const tasksRef = collection(db, "users", user.uid, "tasks");
    const q = query(tasksRef);

    // Real-time listener
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        // Check if user still exists (might have been deleted)
        if (!auth.currentUser || auth.currentUser.uid !== user.uid) {
          setTasks([]);
          setLoading(false);
          unsubscribe();
          return;
        }

        const taskList = snapshot.docs.map((doc) => ({
          taskId: doc.id,
          ...doc.data(),
        })) as Task[];

        setTasks(taskList);
        setLoading(false);
        setError(null);
        console.log("📡 Realtime tasks updated:", taskList.length, "tasks");
      },
      (err: any) => {
        // Handle BloomFilter errors gracefully (these are warnings, not critical errors)
        if (err?.name === "BloomFilterError" || err?.code === "failed-precondition") {
          console.warn("⚠️ Firestore sync warning (can occur when data is deleted):", err.message);
          // Check if user still exists
          if (!auth.currentUser || auth.currentUser.uid !== user.uid) {
            setTasks([]);
            setLoading(false);
            unsubscribe();
            return;
          }
          // Continue - this is usually a temporary sync issue
          return;
        }
        
        console.error("❌ Firestore listener error:", err);
        setError("Could not load realtime tasks");
        setLoading(false);
      }
    );

    // Cleanup listener
    return () => {
      console.log("🔌 Disconnecting realtime tasks listener");
      unsubscribe();
    };
  }, []);

  return { tasks, loading, error };
}
