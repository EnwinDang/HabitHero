import { useEffect, useState } from "react";
import { auth, db, ref, get } from "../services/api/firebase";
import { signOut } from "firebase/auth";
import { useNavigate } from "react-router-dom";

export default function HomePage() {
  const navigate = useNavigate();
  const user = auth.currentUser;

  const [hero, setHero] = useState<any>(null);

  useEffect(() => {
    if (!user) return;

    const fetchHero = async () => {
      const snapshot = await get(ref(db, "users/" + user.uid));
      if (snapshot.exists()) setHero(snapshot.val());
    };

    fetchHero();
  }, [user]);

  const logout = async () => {
    await signOut(auth);
    navigate("/login");
  };

  if (!hero) {
    return (
      <div className="text-white h-screen flex items-center justify-center text-2xl">
        Loading your hero...
      </div>
    );
  }

  // XP bar logic
  const xpPercent = Math.min((hero.xp / (hero.level * 100)) * 100, 100);

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0c0c0c] to-[#1a1a1a] text-white p-6">

      {/* HEADER */}
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-4xl font-bold tracking-wide">HabitHero</h1>
        <button
          onClick={logout}
          className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg font-semibold"
        >
          Logout
        </button>
      </div>

      {/* MAIN HERO PANEL */}
      <div className="bg-black/30 backdrop-blur-md border border-white/10 rounded-xl p-6 shadow-xl max-w-xl mx-auto">

        <h2 className="text-2xl mb-4 font-semibold">Your Hero</h2>

        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-lg font-semibold">Level {hero.level}</p>
            <p className="text-sm text-gray-400">XP: {hero.xp}</p>
          </div>

          <div className="text-right">
            <p className="text-yellow-400 text-lg font-semibold">💰 {hero.gold} Gold</p>
            <p className="text-blue-400 text-sm">⚡ {hero.stamina}/{hero.maxStamina} Stamina</p>
          </div>
        </div>

        {/* XP BAR */}
        <div className="w-full bg-gray-700 rounded-full h-4 mt-2">
          <div
            className="bg-green-500 h-4 rounded-full transition-all"
            style={{ width: `${xpPercent}%` }}
          ></div>
        </div>

        {/* HERO STATS */}
        <div className="grid grid-cols-2 gap-4 mt-6">
          <div className="p-4 bg-black/40 border border-white/10 rounded-lg text-center">
            <p className="text-xl font-bold">{hero.heroStats.damage}</p>
            <p className="text-gray-400 text-sm">Damage</p>
          </div>

          <div className="p-4 bg-black/40 border border-white/10 rounded-lg text-center">
            <p className="text-xl font-bold">{hero.heroStats.defense}</p>
            <p className="text-gray-400 text-sm">Defense</p>
          </div>

          <div className="p-4 bg-black/40 border border-white/10 rounded-lg text-center">
            <p className="text-xl font-bold">{hero.heroStats.health}</p>
            <p className="text-gray-400 text-sm">Health</p>
          </div>

          <div className="p-4 bg-black/40 border border-white/10 rounded-lg text-center">
            <p className="text-xl font-bold">{(hero.heroStats.critChance * 100).toFixed(1)}%</p>
            <p className="text-gray-400 text-sm">Crit Chance</p>
          </div>
        </div>

      </div>

      {/* ACTION BUTTONS */}
      <div className="max-w-xl mx-auto mt-6 grid grid-cols-2 gap-4">

        <button
          className="bg-blue-600 hover:bg-blue-700 p-4 rounded-xl font-semibold text-lg"
          onClick={() => navigate("/tasks")}
        >
          📘 Tasks
        </button>

        <button
          className="bg-purple-600 hover:bg-purple-700 p-4 rounded-xl font-semibold text-lg"
          onClick={() => navigate("/battle")}
        >
          ⚔️ Start Battle
        </button>

        <button
          className="bg-amber-600 hover:bg-amber-700 p-4 rounded-xl font-semibold text-lg col-span-2"
          onClick={() => navigate("/inventory")}
        >
          🎒 Open Inventory
        </button>

      </div>

      {/* DAILY TASKS PREVIEW */}
      <div className="max-w-xl mx-auto mt-10">
        <h2 className="text-xl mb-3 font-semibold">Today's Tasks</h2>

        <div className="space-y-3">

          {(hero.tasks ? Object.values(hero.tasks) : []).slice(0, 3).map((t: any, i: number) => (
            <div key={i} className="p-4 rounded-xl bg-black/40 border border-white/10 flex justify-between">
              <div>
                <p className="font-semibold">{t.title}</p>
                <p className="text-sm text-gray-400">{t.difficulty} • +{t.xpReward} XP</p>
              </div>
              <p className="text-green-400 font-bold">{t.isCompleted ? "✓" : ""}</p>
            </div>
          ))}

          {/* if no tasks */}
          {(!hero.tasks || Object.keys(hero.tasks).length === 0) && (
            <p className="text-gray-500 text-center">No tasks yet. Add some!</p>
          )}
        </div>
      </div>
    </div>
  );
}
