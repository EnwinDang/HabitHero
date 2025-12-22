import { useRealtimeUser } from "@/hooks/useRealtimeUser";
import { usePomodoro } from "@/context/pomodoro";
import { useTheme, getThemeClasses } from "@/context/ThemeContext";
import {
  Settings,
  Star,
  Flame,
} from "lucide-react";

export default function FocusModePage() {
  const { user, loading } = useRealtimeUser();
  const { darkMode, accentColor } = useTheme();
  const theme = getThemeClasses(darkMode, accentColor);

  const {
    focusDuration,
    breakDuration,
    setFocusDuration,
    setBreakDuration,
    status,
    timeLeftSeconds,
    start,
    pause,
    reset,
    sessionsCompleted,
    totalFocusSeconds,
    xpGained,
  } = usePomodoro();

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  };

  const getMinutesLeft = () => {
    return Math.ceil(timeLeftSeconds / 60);
  };

  const handleStart = () => start();
  const handlePause = () => pause();
  const handleReset = () => reset();

  const totalSeconds = focusDuration * 60;
  const safeTimeLeft = Math.min(Math.max(timeLeftSeconds, 0), totalSeconds);
  const progress = ((totalSeconds - safeTimeLeft) / totalSeconds) * 100;



  if (loading) {
    return (
      <div className={`min-h-screen ${theme.bg} flex items-center justify-center transition-colors duration-300`}>
        <div className="text-xl animate-pulse" style={theme.accentText}>Loading...</div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${theme.bg} transition-colors duration-300`}>
      {/* XP Notification */}
      {xpGained && (
        <div className="fixed top-8 left-1/2 transform -translate-x-1/2 z-50 animate-bounce">
          <div className="px-6 py-3 rounded-full shadow-lg flex items-center gap-2" style={{ background: accentColor, color: 'white' }}>
            <span className="text-xl">⭐</span>
            <span className="font-bold">+{xpGained} XP earned!</span>
          </div>
        </div>
      )}

      <main className="p-8 overflow-y-auto w-full">
        {/* Header */}
        <div className="mb-8">
          <h2 className={`text-3xl font-bold ${theme.text}`}>Focus Mode</h2>
          <p style={theme.accentText}>
            Stay focused with the Pomodoro technique
          </p>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Timer Card - Takes 2 columns */}
          <div className={`lg:col-span-2 ${theme.card} rounded-2xl p-8`} style={{ ...theme.borderStyle, borderWidth: '1px', borderStyle: 'solid' }}>
            <div className="text-center mb-8">
              <h3 className={`text-2xl font-bold ${theme.text}`}>Focus Time</h3>
              <p style={theme.accentText}>Time to concentrate</p>
            </div>

            {/* Timer Circle */}
            <div className="flex justify-center mb-8">
              <div className="relative w-64 h-64">
                <svg
                  viewBox="0 0 256 256"
                  preserveAspectRatio="xMidYMid meet"
                  className="w-full h-full transform -rotate-90"
                >
                  <circle
                    cx="128"
                    cy="128"
                    r="110"
                    stroke="#e5e7eb"
                    strokeWidth="8"
                    fill="none"
                  />
                  <circle
                    cx="128"
                    cy="128"
                    r="110"
                    stroke={accentColor}
                    strokeWidth="8"
                    fill="none"
                    strokeLinecap="round"
                    strokeDasharray={2 * Math.PI * 110}
                    strokeDashoffset={2 * Math.PI * 110 * (1 - progress / 100)}
                    className="transition-all duration-1000"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className={`text-4xl font-bold ${theme.text}`}>
                    {formatTime(safeTimeLeft)}
                  </span>
                  <span className={theme.textMuted}>
                    {getMinutesLeft()} minutes left
                  </span>
                </div>
              </div>
            </div>

            {/* Controls */}
            <div className="flex justify-center gap-4">
              {status !== "running" ? (
                <button
                  onClick={handleStart}
                  className="flex flex-col items-center gap-1 text-white px-8 py-3 rounded-xl font-medium transition-colors"
                  style={{ background: accentColor }}
                >
                  <span>Start</span>
                </button>
              ) : (
                <button
                  onClick={handlePause}
                  className="flex flex-col items-center gap-1 text-white px-8 py-3 rounded-xl font-medium transition-colors"
                  style={{ background: accentColor }}
                >
                  <span>Pause</span>
                </button>
              )}
              <button
                onClick={handleReset}
                className={`flex flex-col items-center gap-1 ${theme.card} px-8 py-3 rounded-xl font-medium transition-colors`}
                style={{ ...theme.borderStyle, borderWidth: '2px', borderStyle: 'solid', color: accentColor }}
              >
                <span>Reset</span>
              </button>
            </div>
          </div>

          {/* Right Column - Stats */}
          <div className="space-y-6">
            {/* Current XP */}
            {user && (
              <div className={`${theme.card} rounded-2xl p-6`} style={{ ...theme.borderStyle, borderWidth: '1px', borderStyle: 'solid' }}>
                <div className="flex items-center gap-2 mb-3">
                  <Star size={20} style={{ color: accentColor }} />
                  <h3 className={`text-lg font-bold ${theme.text}`}>Your XP</h3>
                </div>
                <p className="text-3xl font-bold" style={{ color: accentColor }}>
                  {user.stats.xp || 0} XP
                </p>
                <p className={`${theme.textMuted} text-sm`}>
                  Level {user.stats.level || 1}
                </p>
              </div>
            )}

            {/* Focus Streak */}
            <div className={`${theme.card} rounded-2xl p-6`} style={{ ...theme.borderStyle, borderWidth: '1px', borderStyle: 'solid' }}>
              <div className="flex items-center gap-2 mb-3">
                <Flame size={20} className="text-orange-500" />
                <h3 className={`text-lg font-bold ${theme.text}`}>
                  Focus Streak
                </h3>
              </div>
              <p className={`text-3xl font-bold ${theme.text}`}>
                {user?.stats?.streak || 0} days
              </p>
              <p className={`${theme.textMuted} text-sm`}>Keep it up!</p>
            </div>

            {/* Today's Stats */}
            <div className={`${theme.card} rounded-2xl p-6`} style={{ ...theme.borderStyle, borderWidth: '1px', borderStyle: 'solid' }}>
              <h3 className={`text-lg font-bold ${theme.text} mb-4`}>
                Today's Stats
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center py-2" style={{ ...theme.borderStyle, borderBottomWidth: '1px', borderBottomStyle: 'solid' }}>
                  <span className={theme.textMuted}>Sessions</span>
                  <span className={`font-bold ${theme.text}`}>
                    {sessionsCompleted}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className={theme.textMuted}>Focus Time</span>
                  <span className="font-bold" style={{ color: accentColor }}>
                    {Math.floor(totalFocusSeconds / 60)} min
                  </span>
                </div>
              </div>
            </div>

            {/* Timer Settings */}
            <div className={`${theme.card} rounded-2xl p-6`} style={{ ...theme.borderStyle, borderWidth: '1px', borderStyle: 'solid' }}>
              <div className="flex items-center gap-2 mb-4">
                <Settings size={20} className={theme.textMuted} />
                <h3 className={`text-lg font-bold ${theme.text}`}>
                  Timer Settings
                </h3>
              </div>
              <div className="space-y-4">
                <div>
                  <label className={`text-sm ${theme.textMuted} block mb-1`}>
                    Focus Duration
                  </label>
                  <div className="flex items-center gap-2">
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
                      className={`w-full p-2 rounded-lg ${theme.text} ${theme.card}`}
                      style={{ ...theme.borderStyle, borderWidth: '1px', borderStyle: 'solid' }}
                    />
                    <span className={`text-sm ${theme.textMuted} whitespace-nowrap`}>
                      minutes
                    </span>
                  </div>
                </div>
                <div>
                  <label className={`text-sm ${theme.textMuted} block mb-1`}>
                    Break Duration
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      inputMode="numeric"
                      min={1}
                      max={60}
                      step={1}
                      value={breakDuration}
                      onChange={(e) => {
                        const raw = e.currentTarget.valueAsNumber;
                        if (Number.isNaN(raw)) return;
                        setBreakDuration(raw);
                      }}
                      className={`w-full p-2 rounded-lg ${theme.text} ${theme.card}`}
                      style={{ ...theme.borderStyle, borderWidth: '1px', borderStyle: 'solid' }}
                    />
                    <span className={`text-sm ${theme.textMuted} whitespace-nowrap`}>
                      minutes
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

/* Sidebar Item Component */
function SidebarItem({
  icon,
  label,
  active = false,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <li>
      <button
        onClick={onClick}
        className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl transition-all ${active
          ? "bg-purple-50 text-purple-600 border border-purple-200"
          : "text-gray-600 hover:bg-gray-50"
          }`}
      >
        {icon}
        <span className="font-medium">{label}</span>
      </button>
    </li>
  );
}
