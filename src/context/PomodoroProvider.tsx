import React, { useEffect, useMemo, useState } from "react";
import { db, auth } from "@/firebase";
import { doc, updateDoc, increment } from "firebase/firestore";
import {
  clampInt,
  PomodoroContext,
  type PomodoroContextValue,
  type PomodoroSettings,
  readStoredSettings,
  STORAGE_KEY,
} from "./pomodoro";
import { useAuth } from "@/context/AuthContext";
import { onFocusSessionCompleted } from "@/services/achievement.service";

const TIMER_STORAGE_KEY = "habithero:pomodoroTimer:v1";

type StoredTimerState = {
  status: "idle" | "running" | "paused";
  timeLeftSeconds: number;
  sessionsCompleted: number;
  totalFocusSeconds: number;
  lastUpdatedMs: number;
  dayKey?: string; 
  phase?: "focus" | "break";
};

function getDayKey(ms: number = Date.now()) {
  const d = new Date(ms);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function readStoredTimerState(defaultFocusSeconds: number): Omit<StoredTimerState, "lastUpdatedMs"> {
  try {
    const raw = localStorage.getItem(TIMER_STORAGE_KEY);
    if (!raw) return { status: "idle", timeLeftSeconds: defaultFocusSeconds, sessionsCompleted: 0, totalFocusSeconds: 0, phase: "focus" };
    const parsed = JSON.parse(raw) as Partial<StoredTimerState>;
    const todayKey = getDayKey();
    const storedDayKey = parsed.dayKey || getDayKey(parsed.lastUpdatedMs ?? Date.now());
    if (storedDayKey !== todayKey) {
      return { status: "idle", timeLeftSeconds: defaultFocusSeconds, sessionsCompleted: 0, totalFocusSeconds: 0, phase: "focus" };
    }
    return {
      status: parsed.status === "running" ? "running" : parsed.status === "paused" ? "paused" : "idle",
      timeLeftSeconds: clampInt(parsed.timeLeftSeconds ?? defaultFocusSeconds, 0, 86400),
      sessionsCompleted: parsed.sessionsCompleted ?? 0,
      totalFocusSeconds: parsed.totalFocusSeconds ?? 0,
      phase: parsed.phase === "break" ? "break" : "focus",
    };
  } catch {
    return { status: "idle", timeLeftSeconds: defaultFocusSeconds, sessionsCompleted: 0, totalFocusSeconds: 0, phase: "focus" };
  }
}

export function PomodoroProvider({ children }: { children: React.ReactNode }) {
  const { user: authUser } = useAuth();

  const [settings, setSettings] = useState<PomodoroSettings>(() => readStoredSettings());
  const [status, setStatus] = useState<"idle" | "running" | "paused">("idle");
  const [timeLeftSeconds, setTimeLeftSeconds] = useState(settings.focusDuration * 60);
  const [sessionsCompleted, setSessionsCompleted] = useState(0);
  const [totalFocusSeconds, setTotalFocusSeconds] = useState(0);
  const [phase, setPhase] = useState<"focus" | "break">("focus");
  const [xpGained, setXpGained] = useState<number | null>(null);
  const [levelUpReward, setLevelUpReward] = useState<any | null>(null);

  useEffect(() => {
    const saved = readStoredTimerState(settings.focusDuration * 60);
    setStatus(saved.status);
    setTimeLeftSeconds(saved.timeLeftSeconds);
    setSessionsCompleted(saved.sessionsCompleted);
    setTotalFocusSeconds(saved.totalFocusSeconds);
    setPhase(saved.phase || "focus");
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  }, [settings]);

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
    } catch { }
  }, [sessionsCompleted, status, timeLeftSeconds, totalFocusSeconds, phase]);

  const handleSessionCompleted = useMemo(() => {
    return async (newLocalCount: number) => {
      if (!authUser?.uid) return;
      try {
        const token = await auth.currentUser?.getIdToken();
        if (token) {
          const response = await fetch("/api/pomodoro/session-completed", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              sessionsCount: 1,
              focusSeconds: settings.focusDuration * 60,
            }),
          });
          const data = await response.json();
          if (data.xpGained) {
            setXpGained(data.xpGained);
          }
        }
        onFocusSessionCompleted(newLocalCount).catch(console.error);
      } catch (error) {
        console.error("Fout bij sync naar backend:", error);
      }
    };
  }, [authUser?.uid, settings.focusDuration]);

  useEffect(() => {
    if (status !== "running") return;
    const interval = setInterval(() => {
      setTimeLeftSeconds((prev: number) => {
        const next = prev - 1;
        if (phase === "focus" && prev > 0) {
          setTotalFocusSeconds((t: number) => {
            const nt = t + 1;
            if (nt % 60 === 0 && t % 60 !== 0) {
              setXpGained(5);
              if (authUser?.uid) {
                updateDoc(doc(db, "users", authUser.uid), { "stats.xp": increment(5) });
              }
            }
            return nt;
          });
        }
        if (next <= 0) {
          if (phase === "focus") {
            setSessionsCompleted((s: number) => {
              const nextS = s + 1;
              handleSessionCompleted(nextS);
              return nextS;
            });
            setPhase("break");
            return settings.breakDuration * 60;
          }
          setPhase("focus");
          setStatus("idle");
          return settings.focusDuration * 60;
        }
        return next;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [handleSessionCompleted, phase, settings.breakDuration, settings.focusDuration, status, authUser?.uid]);

  const value = useMemo<PomodoroContextValue>(() => {
    return {
      focusDuration: settings.focusDuration,
      breakDuration: settings.breakDuration,
      setFocusDuration: (m: number) => {
        const n = clampInt(m, 1, 180);
        setSettings((p: PomodoroSettings) => ({ ...p, focusDuration: n }));
        if (status !== "running") setTimeLeftSeconds(n * 60);
      },
      setBreakDuration: (m: number) => {
        setSettings((p: PomodoroSettings) => ({ ...p, breakDuration: clampInt(m, 1, 60) }));
      },
      status,
      timeLeftSeconds,
      phase,
      totalSessions: sessionsCompleted,
      totalFocusSeconds,
      todaysSessions: sessionsCompleted,
      todaysFocusSeconds: totalFocusSeconds,
      start: () => setStatus("running"),
      pause: () => setStatus("paused"),
      toggle: () => setStatus((p: string) => (p === "running" ? "paused" : "running")),
      reset: () => {
        setStatus("idle");
        setPhase("focus");
        setTimeLeftSeconds(settings.focusDuration * 60);
      },
      xpGained,
      levelUpReward,
    };
  }, [
    sessionsCompleted,
    settings,
    status,
    timeLeftSeconds,
    totalFocusSeconds,
    xpGained,
    levelUpReward,
    phase
  ]);

  return (
    <PomodoroContext.Provider value={value}>
      {children}
    </PomodoroContext.Provider>
  );
}