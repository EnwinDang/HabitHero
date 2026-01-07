import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { UsersAPI } from "@/api/users.api";
import { db } from "@/firebase";
import { doc, updateDoc, getDoc, increment } from "firebase/firestore";
import {
  clampInt,
  DEFAULTS,
  PomodoroContext,
  type PomodoroContextValue,
  type PomodoroSettings,
  readStoredSettings,
  STORAGE_KEY,
} from "./pomodoro";
import { onFocusSessionCompleted, onStreakUpdated } from "@/services/achievement.service";
import { getLevelFromXP } from "@/utils/xpCurve";

const TIMER_STORAGE_KEY = "habithero:pomodoroTimer:v1";
const MS_IN_DAY = 24 * 60 * 60 * 1000;

type StoredTimerState = {
  status: "idle" | "running" | "paused";
  timeLeftSeconds: number;
  sessionsCompleted: number;
  totalFocusSeconds: number;
  lastUpdatedMs: number;
  dayKey?: string; // YYYY-MM-DD to reset daily stats
  phase?: "focus" | "break";
};

function getDayKey(ms: number = Date.now()) {
  const d = new Date(ms);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function readStoredTimerState(defaultFocusSeconds: number): Omit<StoredTimerState, "lastUpdatedMs"> {
  try {
    const raw = localStorage.getItem(TIMER_STORAGE_KEY);
    if (!raw) {
      return {
        status: "idle",
        timeLeftSeconds: defaultFocusSeconds,
        sessionsCompleted: 0,
        totalFocusSeconds: 0,
        phase: "focus",
      };
    }

    const parsed = JSON.parse(raw) as Partial<StoredTimerState>;
    const todayKey = getDayKey();
    const storedDayKey = parsed.dayKey || getDayKey(parsed.lastUpdatedMs ?? Date.now());

    const status: StoredTimerState["status"] =
      parsed.status === "running" || parsed.status === "paused" || parsed.status === "idle"
        ? parsed.status
        : "idle";

    const safeTimeLeft = clampInt(parsed.timeLeftSeconds ?? defaultFocusSeconds, 0, 24 * 60 * 60);
    const safeSessions = clampInt(parsed.sessionsCompleted ?? 0, 0, Number.MAX_SAFE_INTEGER);
    const safeTotal = clampInt(parsed.totalFocusSeconds ?? 0, 0, Number.MAX_SAFE_INTEGER);
    const safePhase: "focus" | "break" = parsed.phase === "break" ? "break" : "focus";

    // New day: reset daily stats and timer state
    if (storedDayKey !== todayKey) {
      return {
        status: "idle",
        timeLeftSeconds: defaultFocusSeconds,
        sessionsCompleted: 0,
        totalFocusSeconds: 0,
        phase: "focus",
      };
    }

    // If it was running, reduce remaining time by elapsed seconds since last update.
    if (status === "running") {
      const lastUpdatedMs = Number(parsed.lastUpdatedMs ?? 0);
      const elapsedSeconds = lastUpdatedMs > 0 ? Math.floor((Date.now() - lastUpdatedMs) / 1000) : 0;
      const nextTimeLeft = Math.max(0, safeTimeLeft - Math.max(0, elapsedSeconds));

      // If it fully elapsed while the app was closed, just reset to idle.
      if (nextTimeLeft <= 0) {
        return {
          status: "idle",
          timeLeftSeconds: defaultFocusSeconds,
          sessionsCompleted: safeSessions,
          totalFocusSeconds: safeTotal,
          phase: safePhase,
        };
      }

      return {
        status: "running",
        timeLeftSeconds: nextTimeLeft,
        sessionsCompleted: safeSessions,
        totalFocusSeconds: safeTotal,
        phase: safePhase,
      };
    }

    return {
      status,
      timeLeftSeconds: safeTimeLeft,
      sessionsCompleted: safeSessions,
      totalFocusSeconds: safeTotal,
      phase: safePhase,
    };
  } catch {
    return {
      status: "idle",
      timeLeftSeconds: defaultFocusSeconds,
      sessionsCompleted: 0,
      totalFocusSeconds: 0,
      phase: "focus",
    };
  }
}

export function PomodoroProvider({ children }: { children: React.ReactNode }) {
  const { user: authUser } = useAuth();

  const [settings, setSettings] = useState<PomodoroSettings>(() => {
    if (typeof window === "undefined") return DEFAULTS;
    return readStoredSettings();
  });

  const [status, setStatus] = useState<"idle" | "running" | "paused">(() => {
    if (typeof window === "undefined") return "idle";
    return readStoredTimerState(settings.focusDuration * 60).status;
  });
  const [timeLeftSeconds, setTimeLeftSeconds] = useState(() => {
    if (typeof window === "undefined") return settings.focusDuration * 60;
    return readStoredTimerState(settings.focusDuration * 60).timeLeftSeconds;
  });
  const [sessionsCompleted, setSessionsCompleted] = useState(() => {
    if (typeof window === "undefined") return 0;
    return readStoredTimerState(settings.focusDuration * 60).sessionsCompleted;
  });
  const [totalFocusSeconds, setTotalFocusSeconds] = useState(() => {
    if (typeof window === "undefined") return 0;
    return readStoredTimerState(settings.focusDuration * 60).totalFocusSeconds;
  });
  const [phase, setPhase] = useState<"focus" | "break">(() => {
    if (typeof window === "undefined") return "focus";
    return readStoredTimerState(settings.focusDuration * 60).phase || "focus";
  });
  const [xpGained, setXpGained] = useState<number | null>(null);
  const [levelUpReward, setLevelUpReward] = useState<{ oldLevel: number; newLevel: number; reward?: any } | null>(null);
  const currentSessionIdRef = useRef<string | null>(null);
  const focusCompletedInSessionRef = useRef(false);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch {
      // ignore write failures (private mode, quota, etc.)
    }
  }, [settings]);

  // Persist timer runtime state so it survives refresh.
  useEffect(() => {
    try {
      const payload: StoredTimerState = {
        status,
        timeLeftSeconds,
        sessionsCompleted,
        totalFocusSeconds,
        lastUpdatedMs: Date.now(),
        dayKey: getDayKey(),
        phase,
      };
      localStorage.setItem(TIMER_STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // ignore write failures
    }
  }, [sessionsCompleted, status, timeLeftSeconds, totalFocusSeconds, phase]);

  // Auto-clear XP toast value after 2 seconds (shorter to let level-up show).
  useEffect(() => {
    if (xpGained == null) return;
    const t = setTimeout(() => setXpGained(null), 2000);
    return () => clearTimeout(t);
  }, [xpGained]);

  const handleSessionCompleted = useMemo(() => {
    return async (newSessionCount: number) => {
      if (!authUser?.uid) return;
      const uid = authUser.uid;
      const userRef = doc(db, "users", uid);
      const todayKey = getDayKey();
      const yesterdayKey = getDayKey(Date.now() - MS_IN_DAY);

      try {
        // Read streak state from Firestore
        const snap = await getDoc(userRef);
        const data = snap.data() || {};
        const stats = (data as any).stats || {};
        const streaks = (data as any).streaks || {};
        const pomodoro = (data as any).pomodoro || {};
        const lastFocusDate = typeof stats.lastFocusDate === "string" ? stats.lastFocusDate : undefined;
        const currentStreak = typeof stats.streak === "number" ? stats.streak : 0;
        const currentMaxStreak = typeof stats.maxStreak === "number" ? stats.maxStreak : currentStreak;

        const prevStreakDailyBest = typeof streaks?.daily?.best === "number" ? streaks.daily.best : 0;

        const prevPomodoroDaily = lastFocusDate === todayKey
          ? (typeof pomodoro?.daily?.current === "number" ? pomodoro.daily.current : 0)
          : 0;
        const prevPomodoroBest = typeof pomodoro?.daily?.best === "number" ? pomodoro.daily.best : 0;

        let newStreak = 1;
        if (lastFocusDate === todayKey) {
          newStreak = currentStreak || 1;
        } else if (lastFocusDate === yesterdayKey) {
          newStreak = currentStreak + 1;
        } else {
          newStreak = 1;
        }

        const newMaxStreak = Math.max(currentMaxStreak, newStreak);
        const streakDailyBest = Math.max(prevStreakDailyBest, newStreak);

        const newPomodoroDaily = prevPomodoroDaily + 1;
        const newPomodoroDailyBest = Math.max(prevPomodoroBest, newPomodoroDaily);

        // Update Firestore counters and streak (session totals handled by backend API to avoid double increments)
        await updateDoc(userRef, {
          "stats.lastFocusDate": todayKey,
          "stats.streak": newStreak,
          "stats.maxStreak": newMaxStreak,
          "streaks.daily.current": newStreak,
          "streaks.daily.best": streakDailyBest,
          "pomodoro.daily.current": newPomodoroDaily,
          "pomodoro.daily.best": newPomodoroDailyBest,
        });

        // Update streak + focus achievements
        onStreakUpdated(newStreak).catch((error) => {
          console.error("Failed to update streak achievements:", error);
        });
        onFocusSessionCompleted(newSessionCount).catch((error) => {
          console.error("Failed to update focus achievements:", error);
        });

        // XP is awarded per minute during focus in the timer loop.
      } catch (error) {
        console.error("❌ Failed to update pomodoro stats:", error);
      }
    };
  }, [authUser?.uid, settings.focusDuration]);

  // Shared timer loop. Recreates the interval whenever status/phase or durations change to avoid stale closures.
  useEffect(() => {
    if (status !== "running") return;

    const interval = setInterval(() => {
      setTimeLeftSeconds((prev) => {
        const next = prev - 1;

        // Count focus time while ticking and grant +5 XP each full minute of focus
        if (phase === "focus" && next >= 0) {
          setTotalFocusSeconds((t) => {
            const nt = t + 1;
            if (nt % 60 === 0) {
              // Visual pop-up
              setXpGained(5);
              // Persist XP increment and check for level-up
              if (authUser?.uid) {
                const userRef = doc(db, "users", authUser.uid);
                updateDoc(userRef, { "stats.xp": increment(5) })
                  .then(async () => {
                    // Fetch updated user to check if leveled up
                    const snap = await getDoc(userRef);
                    if (snap.exists()) {
                      const newTotalXP = (snap.data() as any).stats?.xp ?? 0;
                      const oldTotalXP = newTotalXP - 5;
                      const oldLevel = getLevelFromXP(oldTotalXP);
                      const newLevel = getLevelFromXP(newTotalXP);

                      if (newLevel > oldLevel) {
                        // Fetch level rewards from backend
                        try {
                          const levelsSnap = await getDoc(doc(db, "levels", "definitions"));
                          const levelsData = levelsSnap.data();
                          const levels = levelsData?.levels || [];
                          const levelDef = levels.find((l: any) => l.level === newLevel);
                          const reward = levelDef?.rewards || {};

                          setLevelUpReward({ oldLevel, newLevel, reward });
                          // Auto-clear after animation
                          setTimeout(() => setLevelUpReward(null), 3500);
                        } catch (err) {
                          console.error("Failed to fetch level rewards:", err);
                        }
                      }
                    }
                  })
                  .catch((err) => console.error("Failed to increment XP per minute:", err));
              }
            }
            return nt;
          });
        }

        if (next <= 0) {
          if (phase === "focus") {
            if (focusCompletedInSessionRef.current) {
              // Already processed this focus session; just switch to break
              setPhase("break");
              setStatus("running");
              return settings.breakDuration * 60;
            }
            // Mark this session's focus as completed
            focusCompletedInSessionRef.current = true;
            
            setSessionsCompleted((prevSessions) => {
              const nextSessions = prevSessions + 1;
              handleSessionCompleted(nextSessions);
              return nextSessions;
            });
            setPhase("break");
            setStatus("running");
            return settings.breakDuration * 60;
          }

          // Break finished: go back to focus and idle
          focusCompletedInSessionRef.current = false;
          setPhase("focus");
          setStatus("idle");
          return settings.focusDuration * 60;
        }

        return next;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [handleSessionCompleted, phase, settings.breakDuration, settings.focusDuration, status]);

  const value = useMemo<PomodoroContextValue>(() => {
    return {
      ...settings,
      setFocusDuration: (minutes) => {
        const next = clampInt(minutes, 1, 180);
        setSettings((prev) => ({
          ...prev,
          focusDuration: next,
        }));

        if (status !== "running") {
          setTimeLeftSeconds(next * 60);
        }
      },
      setBreakDuration: (minutes) => {
        setSettings((prev) => ({
          ...prev,
          breakDuration: clampInt(minutes, 1, 60),
        }));
      },

      status,
      timeLeftSeconds,
      phase,
      sessionsCompleted,
      totalFocusSeconds,
      xpGained,
      levelUpReward,

      start: () => {
        // If we're idle, reset to full duration and ensure we start in focus phase
        // Also generate a new session ID to prevent duplicate counts from previous sessions
        if (status === "idle") {
          currentSessionIdRef.current = Math.random().toString(36).substr(2, 9);
          focusCompletedInSessionRef.current = false;
        }
        setPhase((prev) => (status === "idle" ? "focus" : prev));
        setTimeLeftSeconds((prev) => (status === "idle" ? settings.focusDuration * 60 : prev));
        setStatus("running");
      },
      pause: () => setStatus("paused"),
      toggle: () =>
        setStatus((prev) => (prev === "running" ? "paused" : "running")),
      reset: () => {
        setStatus("idle");
        setPhase("focus");
        setTimeLeftSeconds(settings.focusDuration * 60);
      },
    };
  }, [sessionsCompleted, settings, status, timeLeftSeconds, totalFocusSeconds, xpGained]);

  return <PomodoroContext.Provider value={value}>{children}</PomodoroContext.Provider>;
}
