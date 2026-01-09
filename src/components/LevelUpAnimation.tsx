import React, { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";

interface LevelUpProps {
  oldLevel: number;
  newLevel: number;
  reward?: { gold?: number; gems?: number; [key: string]: any };
  accentColor: string;
}

const LevelUpAnimation = ({ oldLevel, newLevel, reward, accentColor }: LevelUpProps) => {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setVisible(false), 3500);
    return () => clearTimeout(t);
  }, []);

  if (!visible) return null;

  // Simple confetti effect using animated divs
  const confetti = Array.from({ length: 8 }).map((_, i) => (
    <div
      key={i}
      className="absolute animate-bounce"
      style={{
        left: `${Math.random() * 100}%`,
        top: 0,
        width: "8px",
        height: "8px",
        borderRadius: "50%",
        background: accentColor,
        opacity: 0.8,
        animation: `fall-confetti 3s ease-out forwards`,
        animationDelay: `${i * 0.1}s`,
      }}
    />
  ));

  return (
    <>
      <style>{`
        @keyframes fall-confetti {
          0% { transform: translateY(-10px) rotate(0deg); opacity: 1; }
          100% { transform: translateY(300px) rotate(360deg); opacity: 0; }
        }
        @keyframes pop-up {
          0% { transform: scale(0.5) translateY(20px); opacity: 0; }
          50% { transform: scale(1.1); }
          100% { transform: scale(1) translateY(0); opacity: 1; }
        }
      `}</style>
      <div className="fixed inset-0 pointer-events-none flex items-center justify-center z-50">
        {/* Confetti */}
        <div className="absolute w-full h-96">{confetti}</div>

        {/* Level up card */}
        <div
          className="relative animate-bounce rounded-3xl shadow-2xl px-8 py-6 text-center"
          style={{
            background: `linear-gradient(135deg, rgba(0,0,0,0.9), rgba(0,0,0,0.7))`,
            border: `2px solid ${accentColor}`,
            animation: `pop-up 0.6s ease-out`,
          }}
        >
          <div className="flex items-center justify-center gap-2 mb-3">
            <Sparkles size={24} style={{ color: accentColor }} />
            <h2 className="text-4xl font-bold" style={{ color: accentColor }}>
              LEVEL UP!
            </h2>
            <Sparkles size={24} style={{ color: accentColor }} />
          </div>
          <p className="text-white text-lg mb-4">
            {oldLevel} <span style={{ color: accentColor }}>→</span> {newLevel}
          </p>

          {/* Rewards */}
          {reward && Object.keys(reward).length > 0 && (
            <div className="mt-4 pt-4 border-t border-white/20 space-y-2">
              <p className="text-white/70 text-sm">Rewards:</p>
              {reward.gold ? (
                <p className="text-yellow-400 font-semibold">+{reward.gold} Gold</p>
              ) : null}
              {reward.gems ? (
                <p className="text-purple-400 font-semibold">+{reward.gems} Gems</p>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default LevelUpAnimation;
