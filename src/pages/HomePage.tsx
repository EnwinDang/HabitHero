import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { useAuth } from "@/context/AuthContext";
import { useRealtimeTasks } from "@/hooks/useRealtimeTasks";
import { useRealtimeUser } from "@/hooks/useRealtimeUser";
import { useTheme, getThemeClasses } from "@/context/ThemeContext";
import { usePomodoro } from "@/context/pomodoro";

export default function HomePage() {
  const navigate = useNavigate();
  const { logout, loading: authLoading } = useAuth();
  const { user, loading: userLoading, error: userError } = useRealtimeUser();
  const { error: tasksError } = useRealtimeTasks();
  const { darkMode, accentColor } = useTheme();
  const {
    focusDuration,
    setFocusDuration,
    status,
    timeLeftSeconds,
    toggle,
    reset,
    sessionsCompleted,
    totalFocusSeconds,
  } = usePomodoro();

  const [error] = useState<string | null>(null);

  // Get theme classes
  const theme = getThemeClasses(darkMode, accentColor);

  // Get current date info
  const today = new Date();
  const weekDays = ["Zo", "Ma", "Di", "Wo", "Do", "Vr", "Za"];
  const currentDayIndex = today.getDay();

  const getWeekDates = () => {
    const dates = [];
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - currentDayIndex);

    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      dates.push({
        day: weekDays[i],
        date: date.getDate(),
        isToday: date.toDateString() === today.toDateString()
      });
    }
    return dates;
  };

  const weekDates = getWeekDates();

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const handleStartPause = () => toggle();
  const handleReset = () => reset();

  async function handleLogout() {
    await logout();
    navigate("/login");
  }

  if (authLoading || userLoading) {
    return (
      <div className={`min-h-screen ${theme.bg} flex items-center justify-center transition-colors duration-300`}>
        <div className="text-xl animate-pulse" style={theme.accentText}>Laden...</div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const totalSeconds = focusDuration * 60;
  const safeTimeLeft = Math.min(Math.max(timeLeftSeconds, 0), totalSeconds);
  const progress = Math.round(((totalSeconds - safeTimeLeft) / totalSeconds) * 100);

  return (
    <div className={`min-h-screen ${theme.bg} flex transition-colors duration-300`}>
      {/* SIDEBAR */}
      <aside className={`w-64 ${theme.sidebar} flex flex-col min-h-screen transition-colors duration-300`} style={{ ...theme.borderStyle, borderRightWidth: '1px', borderRightStyle: 'solid' }}>
        <div className="p-6">
          <h1 className="text-2xl font-bold" style={theme.gradientText}>
            HabitHero
          </h1>
          {/* <p className={`text-xs ${theme.textSubtle} mt-1`}>ARISE</p> */}
        </div>

        <nav className="flex-1 px-4">
          <ul className="space-y-2">
            <NavItem icon="⚔️" label="Home" active onClick={() => navigate("/dashboard")} darkMode={darkMode} accentColor={accentColor} />
            <NavItem icon="📜" label="Quests" onClick={() => { }} darkMode={darkMode} accentColor={accentColor} />
            <NavItem icon="⏱️" label="Focus Mode" onClick={() => navigate("/focus")} darkMode={darkMode} accentColor={accentColor} />
            <NavItem icon="📊" label="Stats" onClick={() => navigate("/stats")} darkMode={darkMode} accentColor={accentColor} />
            <NavItem icon="🏆" label="Achievements" onClick={() => navigate("/achievements")} darkMode={darkMode} accentColor={accentColor} />
            <NavItem icon="📅" label="Calendar" onClick={() => navigate("/calendar")} darkMode={darkMode} accentColor={accentColor} />
            <NavItem icon="👤" label="Profile" onClick={() => navigate("/profile")} darkMode={darkMode} accentColor={accentColor} />
            <NavItem icon="⚙️" label="Settings" onClick={() => navigate("/settings")} darkMode={darkMode} accentColor={accentColor} />
          </ul>
        </nav>

        <div className="p-4" style={{ ...theme.borderStyle, borderTopWidth: '1px', borderTopStyle: 'solid' }}>
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 text-red-400 hover:text-red-300 w-full px-4 py-2 rounded-lg hover:bg-red-900/20 transition-colors"
          >
            <span>🚪</span>
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 p-8 overflow-y-auto">
        {/* Welcome Header */}
        <div className="mb-6">
          <p className="text-3xl font-bold tracking-widest uppercase mb-1" style={theme.accentText}>Welcome back, {user.displayName}</p>

        </div>

        {/* HERO CARD */}
        <div className="relative mb-8">
          {/* Glow Effect */}
          <div className="absolute -inset-1 rounded-2xl blur-lg opacity-30 animate-pulse" style={{ background: `linear-gradient(to right, ${accentColor}, #a855f7, ${accentColor})` }}></div>

          {/* Card */}
          <div className={`relative bg-gradient-to-br ${theme.cardGradient} rounded-2xl p-6 overflow-hidden transition-colors duration-300`} style={{ ...theme.borderStyle, borderWidth: '1px', borderStyle: 'solid' }}>
            {/* Corner Decorations */}
            <div className="absolute top-0 left-0 w-16 h-16 border-l-2 border-t-2" style={{ borderColor: `${accentColor}80` }}></div>
            <div className="absolute top-0 right-0 w-16 h-16 border-r-2 border-t-2" style={{ borderColor: `${accentColor}80` }}></div>
            <div className="absolute bottom-0 left-0 w-16 h-16 border-l-2 border-b-2" style={{ borderColor: `${accentColor}80` }}></div>
            <div className="absolute bottom-0 right-0 w-16 h-16 border-r-2 border-b-2" style={{ borderColor: `${accentColor}80` }}></div>

            <div className="flex items-start gap-6">
              {/* Character Portrait */}
              <div className="relative">
                <div className="w-32 h-40 rounded-xl border-2 flex items-center justify-center overflow-hidden" style={{ borderColor: `${accentColor}80`, backgroundColor: darkMode ? 'rgba(88, 28, 135, 0.3)' : 'rgba(219, 234, 254, 0.5)' }}>
                  <span className="text-6xl">⚔️</span>
                </div>

              </div>

              {/* Stats */}
              <div className="flex-1">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className={`text-2xl font-bold ${theme.text}`}>{user.displayName}</h3>
                    <p style={theme.accentText}> Level {user.stats.level}</p>
                  </div>
                  <div className="px-4 py-2 rounded-lg" style={{ backgroundColor: 'rgba(234, 179, 8, 0.2)', borderWidth: '1px', borderStyle: 'solid', borderColor: 'rgba(234, 179, 8, 0.5)' }}>
                    <p className="text-yellow-400 font-bold flex items-center gap-1">
                      <span>💰</span> {user.stats.gold}
                    </p>
                  </div>
                </div>

                {/* XP Bar */}
                <div className="mb-3">
                  <div className="flex justify-between text-sm mb-1">
                    <span className={theme.textMuted}>Experience</span>
                    <span style={theme.accentText}>{user.stats.xp % 1200} / 1200</span>
                  </div>
                  <div className={`h-3 rounded-full overflow-hidden ${darkMode ? 'bg-gray-800' : 'bg-gray-200'}`} style={{ ...theme.borderStyle, borderWidth: '1px', borderStyle: 'solid' }}>
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${(user.stats.xp % 1200) / 1200 * 100}%`,
                        background: `linear-gradient(to right, ${accentColor}, #a855f7)`,
                        boxShadow: `0 0 10px ${accentColor}80`
                      }}
                    />
                  </div>
                </div>

                {/* Mana Bar */}
                <div className="mb-4">
                  <div className="flex justify-between text-sm mb-1">
                    <span className={theme.textMuted}>Mana</span>
                    <span className="text-blue-400">0 / 100</span>
                  </div>
                  <div className={`h-3 rounded-full overflow-hidden ${darkMode ? 'bg-gray-800' : 'bg-gray-200'}`} style={{ borderWidth: '1px', borderStyle: 'solid', borderColor: 'rgba(59, 130, 246, 0.3)' }}>
                    <div
                      className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full"
                      style={{ width: '0%', boxShadow: '0 0 10px rgba(59, 130, 246, 0.5)' }}
                    />
                  </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-3 gap-3">
                  <StatBox icon="⚔️" label="STR" value={0} color="red" darkMode={darkMode} />
                  <StatBox icon="🛡️" label="DEF" value={0} color="blue" darkMode={darkMode} />
                  <StatBox icon="❤️" label="HP" value={0} color="green" darkMode={darkMode} />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ERROR MESSAGE */}
        {(error || userError || tasksError) && (
          <div className="bg-red-900/20 border border-red-500/50 text-red-400 p-4 mb-6 rounded-xl">
            <p className="font-semibold">⚠️ Waarschuwing</p>
            <p className="text-sm">{error || userError || tasksError}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* LEFT COLUMN */}
          <div className="lg:col-span-2 space-y-6">
            {/* DAILY QUEST + POMODORO (50/50) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* DAILY QUEST */}
              <div className={`${theme.card} rounded-2xl p-6 transition-colors duration-300`} style={{ ...theme.borderStyle, borderWidth: '1px', borderStyle: 'solid' }}>
                <div className="flex justify-between items-center mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: `linear-gradient(to br, ${accentColor}, #a855f7)` }}>
                      <span className="text-xl">📚</span>
                    </div>
                    <div>
                      <h3 className={`text-xl font-bold ${theme.text}`}>Daily tasks</h3>
                      {/* <p className={`${theme.textSubtle} text-sm`}>Daily tasks</p> */}
                    </div>
                  </div>
                  <button className="text-sm" style={theme.accentText}>View All →</button>
                </div>

                <div className="py-12 text-center flex flex-col items-center justify-center">
                  <div className={`w-16 h-16 ${darkMode ? 'bg-gray-800/50' : 'bg-gray-100'} rounded-full flex items-center justify-center mb-4`}>
                    <span className="text-3xl">📝</span>
                  </div>
                  <p className={theme.textMuted}>No active quests</p>
                  <p className={`${theme.textSubtle} text-sm`}>Complete quests to earn XP and Gold</p>
                </div>
              </div>

              {/* POMODORO TIMER */}
              <div className="relative">
                <div className="absolute -inset-0.5 rounded-2xl blur opacity-20" style={{ background: `linear-gradient(to right, ${accentColor}, #a855f7)` }}></div>
                <div className={`relative ${theme.card} rounded-2xl p-6 transition-colors duration-300`} style={{ ...theme.borderStyle, borderWidth: '1px', borderStyle: 'solid' }}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-2xl">⚡</span>
                    <h3 className={`text-xl font-bold ${theme.text}`}>Focus Mode</h3>
                  </div>
                  <p className={`${theme.textSubtle} text-sm mb-6`}>Enter the zone. Eliminate distractions.</p>

                  <div className="mb-4">
                    <label className={`${theme.textSubtle} text-xs block mb-1`}>Minutes</label>
                    <input
                      type="number"
                      inputMode="numeric"
                      min={1}
                      max={180}
                      step={1}
                      value={focusDuration}
                      onChange={(e) => {
                        const raw = e.currentTarget.valueAsNumber;
                        if (Number.isNaN(raw)) return;
                        setFocusDuration(raw);
                      }}
                      className={`${darkMode ? 'bg-gray-800/50 text-gray-200 border-gray-700' : 'bg-gray-100 text-gray-800 border-gray-200'} w-full p-2 rounded-lg border`}
                    />
                  </div>

                  <div className="flex flex-col items-center">
                    {/* Timer Circle */}
                    <div className="relative w-48 h-48 mb-6">
                      <svg viewBox="0 0 192 192" preserveAspectRatio="xMidYMid meet" className="w-full h-full transform -rotate-90">
                        <circle cx="96" cy="96" r="88" stroke={darkMode ? "#1e1e2e" : "#e5e7eb"} strokeWidth="12" fill="none" />
                        <circle
                          cx="96"
                          cy="96"
                          r="88"
                          stroke={`url(#timerGradient-${accentColor.replace('#', '')})`}
                          strokeWidth="12"
                          fill="none"
                          strokeLinecap="round"
                          strokeDasharray={2 * Math.PI * 88}
                          strokeDashoffset={2 * Math.PI * 88 * (1 - progress / 100)}
                          className="transition-all duration-1000"
                          style={{ filter: `drop-shadow(0 0 10px ${accentColor}80)` }}
                        />
                        <defs>
                          <linearGradient id={`timerGradient-${accentColor.replace('#', '')}`} x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor={accentColor} />
                            <stop offset="100%" stopColor="#a855f7" />
                          </linearGradient>
                        </defs>
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className={`text-4xl font-bold ${theme.text} font-mono`}>{formatTime(safeTimeLeft)}</span>
                        <span className="text-sm" style={theme.accentText}>{status === "running" ? "FOCUS" : "READY"}</span>
                      </div>
                    </div>

                    {/* Controls */}
                    <div className="flex gap-3">
                      <button
                        onClick={handleStartPause}
                        className="text-white px-8 py-3 rounded-xl font-bold flex items-center gap-2 transition-all"
                        style={{
                          background: `linear-gradient(to right, ${accentColor}, #a855f7)`,
                          boxShadow: `0 0 20px ${accentColor}50`
                        }}
                      >
                        {status === "running" ? "PAUSE" : "START"}
                      </button>
                      <button
                        onClick={handleReset}
                        className={`${darkMode ? 'bg-gray-800 hover:bg-gray-700 text-gray-300' : 'bg-gray-200 hover:bg-gray-300 text-gray-700'} px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-colors`}
                      >
                        RESET
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* WEEKLY CALENDAR */}
            <div className={`${theme.card} rounded-2xl p-6 transition-colors duration-300`} style={{ ...theme.borderStyle, borderWidth: '1px', borderStyle: 'solid' }}>
              <div className="flex justify-between items-center mb-4">
                <h3 className={`text-xl font-bold ${theme.text} flex items-center gap-2`}>
                  <span>📅</span> This Week
                </h3>
                <button className="text-sm" style={theme.accentText}>Full Calendar →</button>
              </div>

              <div className="grid grid-cols-7 gap-2">
                {weekDates.map((d, i) => (
                  <div
                    key={i}
                    className={`text-center py-3 rounded-xl cursor-pointer transition-all`}
                    style={d.isToday ? {
                      background: `linear-gradient(to bottom, ${accentColor}, #a855f7)`,
                      color: 'white',
                      boxShadow: `0 0 15px ${accentColor}50`
                    } : {
                      backgroundColor: darkMode ? 'rgba(55, 65, 81, 0.3)' : 'rgba(243, 244, 246, 1)',
                      color: darkMode ? '#9ca3af' : '#6b7280'
                    }}
                  >
                    <p className="text-xs font-medium">{d.day}</p>
                    <p className="text-lg font-bold">{d.date}</p>
                  </div>
                ))}
              </div>
            </div>


          </div>

          {/* RIGHT COLUMN */}
          <div className="space-y-6">
            {/* DAILY REWARDS */}
            <div className="relative">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-yellow-600 to-orange-600 rounded-2xl blur opacity-20"></div>
              <div className={`relative ${theme.card} rounded-2xl p-6 transition-colors duration-300`} style={{ borderWidth: '1px', borderStyle: 'solid', borderColor: 'rgba(234, 179, 8, 0.3)' }}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className={`text-lg font-bold ${theme.text}`}>Daily Reward</h3>
                  <span className="text-yellow-400 text-2xl">🎁</span>
                </div>
                <button className="w-full bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-500 hover:to-orange-500 text-white py-3 rounded-xl font-bold transition-all" style={{ boxShadow: '0 0 15px rgba(234, 179, 8, 0.3)' }}>
                  CLAIM REWARD
                </button>
              </div>
            </div>
            {/* STREAK */}
            <div className={`${theme.card} rounded-2xl p-6 transition-colors duration-300`} style={{ borderWidth: '1px', borderStyle: 'solid', borderColor: 'rgba(249, 115, 22, 0.3)' }}>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(to br, #ea580c, #dc2626)', boxShadow: '0 0 15px rgba(249, 115, 22, 0.3)' }}>
                  <span className="text-2xl">🔥</span>
                </div>

                <div>
                  <p className={`${theme.textMuted} text-sm`}>Current Streak</p>
                  <p className="text-3xl font-bold text-orange-400">{user.stats.streak} days</p>
                </div>
              </div>
              {/* <p className={`${theme.textSubtle} text-sm`}>Keep hunting to maintain your streak!</p> */}
            </div>

            {/* TODAY'S PROGRESS */}
            <div className={`${theme.card} rounded-2xl p-6 transition-colors duration-300`} style={{ ...theme.borderStyle, borderWidth: '1px', borderStyle: 'solid' }}>
              <h3 className={`text-lg font-bold ${theme.text} mb-4`}> Today's stats</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className={theme.textMuted}>Sessions</span>
                  <span className="font-bold" style={theme.accentText}>{sessionsCompleted}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className={theme.textMuted}>Focus Time</span>
                  <span className="text-purple-400 font-bold">{Math.floor(totalFocusSeconds / 60)} min</span>
                </div>
                <div className={`h-2 ${darkMode ? 'bg-gray-800' : 'bg-gray-200'} rounded-full overflow-hidden`}>
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${Math.min(totalFocusSeconds / 60 / 60 * 100, 100)}%`,
                      background: `linear-gradient(to right, ${accentColor}, #a855f7)`
                    }}
                  />
                </div>
              </div>
            </div>


          </div>
        </div>
      </main>
    </div>
  );
}

/* Navigation Item Component */
function NavItem({
  icon,
  label,
  active = false,
  onClick,
  darkMode,
  accentColor
}: {
  icon: string;
  label: string;
  active?: boolean;
  onClick: () => void;
  darkMode: boolean;
  accentColor: string;
}) {
  return (
    <li>
      <button
        onClick={onClick}
        className="flex items-center gap-3 w-full px-4 py-3 rounded-xl transition-all"
        style={active ? {
          background: `linear-gradient(to right, ${accentColor}20, rgba(168, 85, 247, 0.1))`,
          color: accentColor,
          borderWidth: '1px',
          borderStyle: 'solid',
          borderColor: `${accentColor}50`
        } : {
          color: darkMode ? '#9ca3af' : '#6b7280'
        }}
      >
        <span>{icon}</span>
        <span className="font-medium">{label}</span>
      </button>
    </li>
  );
}

/* Stat Box Component */
function StatBox({ icon, label, value, color, darkMode }: { icon: string; label: string; value: number; color: string; darkMode: boolean }) {
  const colorMap = {
    red: { border: 'rgba(239, 68, 68, 0.3)', text: '#f87171', bg: darkMode ? 'rgba(127, 29, 29, 0.3)' : 'rgba(254, 226, 226, 1)' },
    blue: { border: 'rgba(59, 130, 246, 0.3)', text: '#60a5fa', bg: darkMode ? 'rgba(30, 58, 138, 0.3)' : 'rgba(219, 234, 254, 1)' },
    green: { border: 'rgba(34, 197, 94, 0.3)', text: '#4ade80', bg: darkMode ? 'rgba(20, 83, 45, 0.3)' : 'rgba(220, 252, 231, 1)' }
  };

  const colors = colorMap[color as keyof typeof colorMap];

  return (
    <div className="rounded-xl p-3 text-center" style={{ backgroundColor: colors.bg, borderWidth: '1px', borderStyle: 'solid', borderColor: colors.border }}>
      <span className="text-xl">{icon}</span>
      <p className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-400'} mt-1`}>{label}</p>
      <p className="text-xl font-bold" style={{ color: colors.text }}>{value}</p>
    </div>
  );
}
