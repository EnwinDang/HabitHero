import { useEffect, useState } from "react";
import { Zap } from "lucide-react";

interface StaminaBarProps {
  currentStamina: number;
  maxStamina: number;
  nextRegenIn?: number; // milliseconds until next regeneration
  showTimer?: boolean;
  size?: "small" | "medium" | "large";
  className?: string;
}

export function StaminaBar({
  currentStamina,
  maxStamina,
  nextRegenIn,
  showTimer = true,
  size = "medium",
  className = "",
}: StaminaBarProps) {
  const [timeUntilNext, setTimeUntilNext] = useState<number>(nextRegenIn || 0);

  // Update timer every second
  useEffect(() => {
    if (!showTimer || !nextRegenIn || currentStamina >= maxStamina) {
      setTimeUntilNext(0);
      return;
    }

    const interval = setInterval(() => {
      setTimeUntilNext((prev) => Math.max(0, prev - 1000));
    }, 1000);

    return () => clearInterval(interval);
  }, [nextRegenIn, showTimer, currentStamina, maxStamina]);

  // Format time as "Xm Ys" or "Xs"
  const formatTime = (ms: number): string => {
    if (ms <= 0) return "0s";
    const totalSeconds = Math.ceil(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    }
    return `${seconds}s`;
  };

  // Calculate percentage
  const percentage = maxStamina > 0 ? (currentStamina / maxStamina) * 100 : 0;

  // Determine color based on stamina level
  const getColor = (): string => {
    if (percentage >= 80) return "#10b981"; // green-500
    if (percentage >= 40) return "#f59e0b"; // yellow-500
    if (percentage > 0) return "#ef4444"; // red-500
    return "#6b7280"; // gray-500
  };

  // Get status text
  const getStatus = (): string => {
    if (currentStamina >= maxStamina) return "Ready to battle!";
    if (percentage >= 40) return "Regenerating...";
    if (percentage > 0) return "Low stamina!";
    return "No stamina";
  };

  // Size classes
  const sizeClasses = {
    small: "text-xs",
    medium: "text-sm",
    large: "text-base",
  };

  const barHeight = {
    small: "h-2",
    medium: "h-3",
    large: "h-4",
  };

  const iconSize = {
    small: 14,
    medium: 16,
    large: 20,
  };

  const color = getColor();
  const status = getStatus();

  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <div className="flex items-center gap-2">
        <Zap size={iconSize[size]} style={{ color }} />
        <span className={`font-semibold ${sizeClasses[size]}`} style={{ color }}>
          {currentStamina}/{maxStamina}
        </span>
        {showTimer && currentStamina < maxStamina && timeUntilNext > 0 && (
          <span className={`text-gray-400 ${sizeClasses[size]}`}>
            Next in: {formatTime(timeUntilNext)}
          </span>
        )}
        {currentStamina >= maxStamina && (
          <span className={`text-green-500 ${sizeClasses[size]}`}>✓</span>
        )}
      </div>

      {/* Progress Bar */}
      <div
        className={`w-full bg-gray-700 rounded-full overflow-hidden ${barHeight[size]}`}
        style={{ border: "1px solid rgba(255, 255, 255, 0.1)" }}
      >
        <div
          className="h-full transition-all duration-500 ease-out"
          style={{
            width: `${percentage}%`,
            backgroundColor: color,
            boxShadow: percentage > 0 ? `0 0 8px ${color}40` : "none",
          }}
        />
      </div>

      {/* Status Text */}
      {size !== "small" && (
        <span className={`text-xs ${sizeClasses[size]}`} style={{ color }}>
          {status}
        </span>
      )}
    </div>
  );
}
