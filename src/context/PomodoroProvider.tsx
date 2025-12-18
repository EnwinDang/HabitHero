import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { UsersAPI } from "@/api/users.api";
import {
  clampInt,
  DEFAULTS,
  PomodoroContext,
  type PomodoroContextValue,
  type PomodoroSettings,
  readStoredSettings,
  STORAGE_KEY,
} from "./pomodoro";
// NOTE: workspace also contains a legacy PomodoroContext.tsx stub.
// Use explicit extension to avoid ambiguous resolution.

const TIMER_STORAGE_KEY = "habithero:pomodoroTimer:v1";

type StoredTimerState = {
  status: "idle" | "running" | "paused";
  timeLeftSeconds: number;
  sessionsCompleted: number;
  totalFocusSeconds: number;
  lastUpdatedMs: number;
};

function readStoredTimerState(defaultFocusSeconds: number): Omit<StoredTimerState, "lastUpdatedMs"> {
  try {
    const raw = localStorage.getItem(TIMER_STORAGE_KEY);
    if (!raw) {
      return {
        status: "idle",
        timeLeftSeconds: defaultFocusSeconds,
        sessionsCompleted: 0,
        totalFocusSeconds: 0,
      };
    }

    const parsed = JSON.parse(raw) as Partial<StoredTimerState>;
    const status: StoredTimerState["status"] =
      parsed.status === "running" || parsed.status === "paused" || parsed.status === "idle"
        ? parsed.status
        : "idle";

    const safeTimeLeft = clampInt(parsed.timeLeftSeconds ?? defaultFocusSeconds, 0, 24 * 60 * 60);
    const safeSessions = clampInt(parsed.sessionsCompleted ?? 0, 0, Number.MAX_SAFE_INTEGER);
    const safeTotal = clampInt(parsed.totalFocusSeconds ?? 0, 0, Number.MAX_SAFE_INTEGER);

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
        };
      }

      return {
        status: "running",
        timeLeftSeconds: nextTimeLeft,
        sessionsCompleted: safeSessions,
        totalFocusSeconds: safeTotal,
      };
    }

    return {
      status,
      timeLeftSeconds: safeTimeLeft,
      sessionsCompleted: safeSessions,
      totalFocusSeconds: safeTotal,
    };
  } catch {
    return {
      status: "idle",
      timeLeftSeconds: defaultFocusSeconds,
      sessionsCompleted: 0,
      totalFocusSeconds: 0,
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
  const [xpGained, setXpGained] = useState<number | null>(null);

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
      };
      localStorage.setItem(TIMER_STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // ignore write failures
    }
  }, [sessionsCompleted, status, timeLeftSeconds, totalFocusSeconds]);

  // Auto-clear XP toast value.
  useEffect(() => {
    if (xpGained == null) return;
    const t = setTimeout(() => setXpGained(null), 3000);
    return () => clearTimeout(t);
  }, [xpGained]);

  // Shared timer loop. Continues across route changes because provider stays mounted.
  useEffect(() => {
    if (status !== "running") return;

    const interval = setInterval(() => {
      setTimeLeftSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setStatus("idle");
          setSessionsCompleted((s) => s + 1);

          // Award XP once when a focus session completes
          if (authUser?.uid) {
            UsersAPI.completeFocusSession(authUser.uid, settings.focusDuration)
              .then((result) => {
                setXpGained(result.xpGained);
              })
              .catch((error) => {
                console.error("Failed to complete focus session:", error);
              });
          }

          return settings.focusDuration * 60;
        }

        return prev - 1;
      });

      setTotalFocusSeconds((t) => t + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [authUser?.uid, settings.focusDuration, status]);

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
      sessionsCompleted,
      totalFocusSeconds,
      xpGained,

      start: () => setStatus("running"),
      pause: () => setStatus("paused"),
      toggle: () =>
        setStatus((prev) => (prev === "running" ? "paused" : "running")),
      reset: () => {
        setStatus("idle");
        setTimeLeftSeconds(settings.focusDuration * 60);
      },
    };
  }, [sessionsCompleted, settings, status, timeLeftSeconds, totalFocusSeconds, xpGained]);

  return <PomodoroContext.Provider value={value}>{children}</PomodoroContext.Provider>;
}
