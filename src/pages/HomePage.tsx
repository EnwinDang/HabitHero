import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { useAuth } from "@/context/AuthContext";
import { useRealtimeTasks } from "@/hooks/useRealtimeTasks";
import { useRealtimeUser } from "@/hooks/useRealtimeUser";

import type { Task } from "../models/task.model";

export default function HomePage() {
  const navigate = useNavigate();
  const { logout, loading: authLoading } = useAuth();
  const { user, loading: userLoading, error: userError } = useRealtimeUser();
  const { tasks, loading: tasksLoading, error: tasksError } = useRealtimeTasks();

  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  async function handleLogout() {
    await logout();
    navigate("/login");
  }

  async function handleRefresh() {
    setIsRefreshing(true);
    try {
      console.log("Refreshing...");
      setError(null);
    } catch (err) {
      console.error("Refresh failed:", err);
      setError("Failed to refresh data");
    } finally {
      setIsRefreshing(false);
    }
  }

  if (authLoading || userLoading) {
    return <p className="p-6 text-lg">Dashboard laden...</p>;
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      {/* HEADER */}
      <header className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">
            Welkom, {user.displayName}
          </h1>
          <p className="text-gray-400">
            Level {user.stats.level}
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 px-4 py-2 rounded"
          >
            {isRefreshing ? "Laden..." : "Vernieuwen"}
          </button>
          <button
            onClick={handleLogout}
            className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded"
          >
            Uitloggen
          </button>
        </div>
      </header>

      {/* ERROR MESSAGE */}
      {(error || userError || tasksError) && (
        <div className="bg-yellow-900 border-l-4 border-yellow-500 text-yellow-200 p-4 mb-6 rounded">
          <p className="font-semibold">⚠️ Waarschuwing</p>
          <p className="text-sm">{error || userError || tasksError}</p>
        </div>
      )}

      {/* STATS */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard label="XP" value={user.stats.xp} />
        <StatCard label="Gold" value={user.stats.gold} />
        <StatCard label="Streak" value={user.stats.streak} />
        <StatCard label="Level" value={user.stats.level} />
      </section>

      {/* TASKS */}
      <section>
        <h2 className="text-2xl font-semibold mb-4">
          Taken van vandaag {tasksLoading && "🔄"}
        </h2>

        {tasksLoading && tasks.length === 0 ? (
          <p className="text-gray-400">Laden...</p>
        ) : tasks.length === 0 ? (
          <p className="text-gray-400">Geen taken 🎉</p>
        ) : (
          <ul className="space-y-3">
            {tasks.map(task => (
              <li
                key={task.taskId}
                className="bg-gray-800 p-4 rounded flex justify-between items-center hover:bg-gray-700 transition"
              >
                <div>
                  <strong className="text-lg">{task.title}</strong>
                  <p className="text-sm text-gray-400">
                    Moeilijkheid: {task.difficulty}
                  </p>
                </div>

                <span className="text-yellow-400">
                  {task.xp} XP • {task.gold} Gold
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

/* Kleine herbruikbare component */
function StatCard({
  label,
  value
}: {
  label: string;
  value: number | string;
}) {
  return (
    <div className="bg-gray-800 rounded p-4 text-center">
      <p className="text-gray-400 text-sm">{label}</p>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  );
}
