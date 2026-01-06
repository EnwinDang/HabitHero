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
    <div className="min-h-screen bg-gray-900 text-white p-4 sm:p-6">
      {/* HEADER */}
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 sm:mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">
            Welkom, {user.displayName}
          </h1>
          <p className="text-gray-400 text-sm sm:text-base">
            Level {user.stats.level}
          </p>
        </div>

        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 px-4 py-2 rounded text-sm sm:text-base flex-1 sm:flex-none"
          >
            {isRefreshing ? "Laden..." : "Vernieuwen"}
          </button>
          <button
            onClick={handleLogout}
            className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded text-sm sm:text-base flex-1 sm:flex-none"
          >
            Uitloggen
          </button>
        </div>
      </header>

      {/* ERROR MESSAGE */}
      {(error || userError || tasksError) && (
        <div className="bg-yellow-900 border-l-4 border-yellow-500 text-yellow-200 p-3 sm:p-4 mb-4 sm:mb-6 rounded text-sm sm:text-base">
          <p className="font-semibold">⚠️ Waarschuwing</p>
          <p className="text-xs sm:text-sm">{error || userError || tasksError}</p>
        </div>
      )}

      {/* STATS */}
      <section className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
        <StatCard label="XP" value={user.stats.xp} />
        <StatCard label="Gold" value={user.stats.gold} />
        <StatCard label="Streak" value={user.stats.streak} />
        <StatCard label="Level" value={user.stats.level} />
      </section>

      {/* TASKS */}
      <section>
        <h2 className="text-xl sm:text-2xl font-semibold mb-3 sm:mb-4">
          Taken van vandaag {tasksLoading && "🔄"}
        </h2>

        {tasksLoading && tasks.length === 0 ? (
          <p className="text-gray-400 text-sm sm:text-base">Laden...</p>
        ) : tasks.length === 0 ? (
          <p className="text-gray-400 text-sm sm:text-base">Geen taken 🎉</p>
        ) : (
          <ul className="space-y-2 sm:space-y-3">
            {tasks.map(task => (
              <li
                key={task.taskId}
                className="bg-gray-800 p-3 sm:p-4 rounded flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 sm:gap-4 hover:bg-gray-700 transition"
              >
                <div className="flex-1 min-w-0">
                  <strong className="text-base sm:text-lg block truncate">{task.title}</strong>
                  <p className="text-xs sm:text-sm text-gray-400">
                    Moeilijkheid: {task.difficulty}
                  </p>
                </div>

                <span className="text-yellow-400 text-sm sm:text-base whitespace-nowrap">
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
    <div className="bg-gray-800 rounded p-3 sm:p-4 text-center">
      <p className="text-gray-400 text-xs sm:text-sm">{label}</p>
      <p className="text-xl sm:text-2xl font-bold">{value}</p>
    </div>
  );
}
