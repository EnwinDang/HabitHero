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
        const taskList = snapshot.docs.map((doc) => ({
          taskId: doc.id,
          ...doc.data(),
        })) as Task[];

        setTasks(taskList);
        setLoading(false);
        setError(null);
        console.log("📡 Realtime tasks updated:", taskList.length, "tasks");
      },
      (err) => {
        console.error("❌ Firestore listener error:", err);
        setError("Could not load realtime tasks");
        setLoading(false);
      }
    );

    // Cleanup listener
    return () => {
      console.log("🔌 Disconnecting realtime listener");
      unsubscribe();
    };
  }, []);

  return { tasks, loading, error };
}
