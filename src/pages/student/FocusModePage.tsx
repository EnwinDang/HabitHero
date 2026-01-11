import { useRealtimeUser } from "@/hooks/useRealtimeUser";
import { usePomodoro } from "@/context/pomodoro";
import { useTheme, getThemeClasses } from "@/context/ThemeContext";
import { Settings, Flame } from "lucide-react";
import XPToast from "@/components/XPToast";

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
    phase,
    start,
    pause,
    reset,
    xpGained,
    levelUpReward,
  } = usePomodoro();

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  };

  // Deze functie regelt nu de tekst onder de klok
  const getTimeLeftLabel = () => {
    if (timeLeftSeconds >= 60) {
      const mins = Math.ceil(timeLeftSeconds / 60);
      return `${mins === 1 ? "minute" : "minutes"} left`;
    }
    return "seconds left";
  };

  const handleStart = () => start();
  const handlePause = () => pause();
  const handleReset = () => reset();

  const totalSeconds = (phase === "focus" ? focusDuration : breakDuration) * 60;
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
      {levelUpReward && (
        <XPToast
          totalXP={user?.stats?.xp ?? 0}
          xpGained={0}
          accentColor={accentColor}
          levelUpReward={levelUpReward}
        />
      )}
      {xpGained != null && !levelUpReward && user && (
        <XPToast totalXP={user.stats?.xp ?? 0} xpGained={xpGained} accentColor={accentColor} />
      )}

      <main className="p-8 overflow-y-auto w-full">
        <div className="mb-8">
          <h2 className={`text-3xl font-bold ${theme.text}`}>Focus Mode</h2>
          <p style={theme.accentText}>
            Stay focused with the Pomodoro technique
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className={`lg:col-span-2 ${theme.card} rounded-2xl p-8`} style={{ ...theme.borderStyle, borderWidth: '1px', borderStyle: 'solid' }}>
            <div className="text-center mb-8">
              <h3 className={`text-2xl font-bold ${theme.text}`}>{phase === "focus" ? "Focus Time" : "Break Time"}</h3>
              <p style={theme.accentText}>{phase === "focus" ? "Time to concentrate" : "Time to rest"}</p>
            </div>

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
                    stroke={darkMode ? "#1f2937" : "#e5e7eb"}
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
                    {getTimeLeftLabel()}
                  </span>
                </div>
              </div>
            </div>

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

          <div className="space-y-6">
            <div className={`${theme.card} rounded-2xl p-6`} style={{ ...theme.borderStyle, borderWidth: '1px', borderStyle: 'solid' }}>
              <div className="flex items-center gap-2 mb-3">
                <Flame size={20} className="text-orange-500" />
                <h3 className={`text-lg font-bold ${theme.text}`}>
                  Focus Streak
                </h3>
              </div>
              <p className={`text-3xl font-bold ${theme.text}`}>
                {user?.stats?.streak ?? 0} {user?.stats?.streak === 1 ? "day" : "days"}
              </p>
              <p className={`${theme.textMuted} text-sm`}>Keep it up!</p>
            </div>

            <div className={`${theme.card} rounded-2xl p-6`} style={{ ...theme.borderStyle, borderWidth: '1px', borderStyle: 'solid' }}>
              <h3 className={`text-lg font-bold ${theme.text} mb-4`}>
                Today's Stats
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center py-2" style={{ ...theme.borderStyle, borderBottomWidth: '1px', borderBottomStyle: 'solid' }}>
                  <span className={theme.textMuted}>Sessions Today</span>
                  <span className={`font-bold ${theme.text}`}>
                    {user?.stats?.todaysSessions ?? 0}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className={theme.textMuted}>Focus Time Today</span>
                  <span className="font-bold" style={{ color: accentColor }}>
                    {Math.floor((user?.stats?.todaysFocusSeconds ?? 0) / 60)} min
                  </span>
                </div>
              </div>
            </div>

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
                      className={`w-full p-2 rounded-lg ${theme.text} ${theme.card} outline-none focus:ring-1`}
                      style={{ ...theme.borderStyle, borderWidth: '1px', borderStyle: 'solid', borderColor: accentColor }}
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
                      className={`w-full p-2 rounded-lg ${theme.text} ${theme.card} outline-none focus:ring-1`}
                      style={{ ...theme.borderStyle, borderWidth: '1px', borderStyle: 'solid', borderColor: accentColor }}
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