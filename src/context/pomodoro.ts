import { createContext, useContext } from "react";

export type PomodoroSettings = {
  focusDuration: number; // minutes
  breakDuration: number; // minutes
};

export type PomodoroContextValue = PomodoroSettings & {
  setFocusDuration: (minutes: number) => void;
  setBreakDuration: (minutes: number) => void;

  // Shared timer state
  status: "idle" | "running" | "paused";
  timeLeftSeconds: number;
  phase: "focus" | "break";

  // Shared stats
  sessionsCompleted: number;
  totalFocusSeconds: number;

  // Controls
  start: () => void;
  pause: () => void;
  toggle: () => void;
  reset: () => void;

  // Optional UI signal
  xpGained: number | null;
  levelUpReward: { oldLevel: number; newLevel: number; reward?: any } | null;
};

export const STORAGE_KEY = "habithero:pomodoroSettings:v1";

export const DEFAULTS: PomodoroSettings = {
  focusDuration: 25,
  breakDuration: 5,
};

export function clampInt(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, Math.trunc(value)));
}

export function readStoredSettings(): PomodoroSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    const parsed = JSON.parse(raw) as Partial<PomodoroSettings>;

    return {
      focusDuration: clampInt(parsed.focusDuration ?? DEFAULTS.focusDuration, 1, 180),
      breakDuration: clampInt(parsed.breakDuration ?? DEFAULTS.breakDuration, 1, 60),
    };
  } catch {
    return DEFAULTS;
  }
}

export const PomodoroContext = createContext<PomodoroContextValue | undefined>(
  undefined
);

export function usePomodoro() {
  const ctx = useContext(PomodoroContext);
  if (!ctx) {
    throw new Error("usePomodoro must be used within PomodoroProvider");
  }
  return ctx;
}
