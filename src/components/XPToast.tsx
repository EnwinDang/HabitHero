import React, { useEffect, useMemo, useState } from "react";
import { getCurrentLevelProgress, getLevelFromXP } from "@/utils/xpCurve";

export default function XPToast({
  totalXP,
  xpGained,
  accentColor,
  levelUpReward,
}: {
  totalXP: number;
  xpGained: number;
  accentColor: string;
  levelUpReward?: { oldLevel: number; newLevel: number; reward?: any };
}) {
  const [visible, setVisible] = useState(true);

  const { startPercent, endPercent, startLevel, endLevel, endXPWithinLevel, endRequired } = useMemo(() => {
    const startLevel = getLevelFromXP(totalXP);
    const startProgress = getCurrentLevelProgress(totalXP, startLevel);
    const endTotalXP = totalXP + xpGained;
    const endLevel = getLevelFromXP(endTotalXP);
    const endProgress = getCurrentLevelProgress(endTotalXP, endLevel);
    return {
      startPercent: startProgress.percentage,
      endPercent: endProgress.percentage,
      startLevel,
      endLevel,
      endXPWithinLevel: endProgress.current,
      endRequired: endProgress.required,
    };
  }, [totalXP, xpGained]);

  useEffect(() => {
    const t = setTimeout(() => setVisible(false), 3000);
    return () => clearTimeout(t);
  }, []);

  if (!visible) return null;

  // Show level-up animation if available
  if (levelUpReward) {
    const LevelUpAnimation = React.lazy(() => import("./LevelUpAnimation"));
    return (
      <React.Suspense fallback={null}>
        <LevelUpAnimation
          oldLevel={levelUpReward.oldLevel}
          newLevel={levelUpReward.newLevel}
          reward={levelUpReward.reward}
          accentColor={accentColor}
        />
      </React.Suspense>
    );
  }

  return (
    <div className="fixed left-1/2 -translate-x-1/2 top-6 z-50">
      <div
        className="rounded-xl shadow-lg px-5 py-4"
        style={{ background: "rgba(0,0,0,0.8)", color: "#fff" }}
      >
        <div className="flex items-center gap-3 mb-2">
          <span style={{ color: accentColor, fontWeight: 700 }}>+{xpGained} XP</span>
          {endLevel > startLevel && (
            <span className="ml-2 font-bold" style={{ color: accentColor }}>
              Level Up! {startLevel} → {endLevel}
            </span>
          )}
        </div>
        <div className="w-64 h-3 bg-white/20 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-600 ease-out"
            style={{ width: `${startPercent}%`, background: accentColor }}
          />
          {/* Animate to end percent using a second bar overlay */}
          <div
            className="-mt-3 h-3 rounded-full transition-all duration-1000 ease-out"
            style={{ width: `${endPercent}%`, background: accentColor, opacity: 0.7 }}
          />
        </div>
        <div className="mt-2 text-xs opacity-80">
          Level {endLevel} • {endXPWithinLevel}/{endRequired} XP
        </div>
      </div>
    </div>
  );
}
