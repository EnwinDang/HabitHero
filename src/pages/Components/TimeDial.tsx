// Helper component for the Interactive Circular Dial
import React, { useState, useEffect, useRef } from "react";
import { useTheme } from "@/context/ThemeContext";

interface TimeDialProps {
  value: number;
  onChange: (val: number) => void;
  min: number;
  max: number;
  darkMode: boolean;
  accentColor: string;
  isRunning: boolean;
  timeLeft: string;
}

export function TimeDial({
  value,
  onChange,
  min,
  max,
  darkMode,
  accentColor,
  isRunning,
  timeLeft,
}: TimeDialProps) {
  const [isDragging, setIsDragging] = useState(false);
  const elementRef = useRef<HTMLDivElement>(null);
  const center = 96;
  const radius = 88;
  const strokeWidth = 8; // Thinner lines

  // Convert minutes to degrees (0-360)
  // We map min..max to 0..359.9
  const percentage = (value - min) / (max - min);
  const degrees = percentage * 360;

  const handleInteraction = (clientX: number, clientY: number) => {
    if (!elementRef.current || isRunning) return;

    const rect = elementRef.current.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;

    const dx = clientX - cx;
    const dy = clientY - cy;

    // Calculate angle in radians, then convert to degrees
    // We want 12 o'clock to be 0 degrees
    let angle = Math.atan2(dy, dx) * (180 / Math.PI);
    angle = angle + 90; // Rotate so 0 is up
    if (angle < 0) angle += 360;

    // Map degrees back to value
    const pct = angle / 360;
    let newValue = Math.round(min + pct * (max - min));

    // Snap to 5 minute increments for easier selection
    newValue = Math.max(min, Math.min(max, newValue));
    onChange(newValue);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (isRunning) return;
    setIsDragging(true);
    handleInteraction(e.clientX, e.clientY);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (isRunning) return;
    setIsDragging(true);
    handleInteraction(e.touches[0].clientX, e.touches[0].clientY);
  };

  useEffect(() => {
    const handleMove = (e: MouseEvent) => {
      if (isDragging) {
        handleInteraction(e.clientX, e.clientY);
      }
    };
    const handleUp = () => setIsDragging(false);

    if (isDragging) {
      window.addEventListener("mousemove", handleMove);
      window.addEventListener("mouseup", handleUp);
    }
    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleUp);
    };
  }, [isDragging]);

  // Dash calculations for the SVG
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (degrees / 360) * circumference;

  return (
    <div
      ref={elementRef}
      className={`relative w-48 h-48 mb-6 ${
        !isRunning ? "cursor-grab active:cursor-grabbing" : ""
      }`}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
      onTouchMove={(e) => {
        if (isDragging)
          handleInteraction(e.touches[0].clientX, e.touches[0].clientY);
      }}
      onTouchEnd={() => setIsDragging(false)}
    >
      {/* Glow behind */}
      <div
        className="absolute inset-4 rounded-full blur-xl opacity-20 transition-all duration-300 pointer-events-none"
        style={{
          backgroundColor: accentColor,
          transform: isDragging ? "scale(1.1)" : "scale(1)",
          opacity: isDragging ? 0.4 : 0.2,
        }}
      />

      <svg
        viewBox="0 0 192 192"
        className="w-full h-full transform"
        style={{
          filter: isDragging ? `drop-shadow(0 0 8px ${accentColor}60)` : "none",
          transition: "filter 0.3s ease",
        }}
      >
        {/* Track - Thinner */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          stroke={darkMode ? "#1f2937" : "#e5e7eb"}
          strokeWidth={strokeWidth}
          fill="transparent"
        />

        {/* Progress Fill - Thinner */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          stroke={accentColor}
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          transform={`rotate(-90 ${center} ${center})`}
          className="transition-all duration-75"
        />

        {/* Knob Indicator - Smaller */}
        {!isRunning && (
          <g transform={`rotate(${degrees - 90} ${center} ${center})`}>
            <circle
              cx={center + radius}
              cy={center}
              r={8}
              fill={darkMode ? "#0f172a" : "#ffffff"}
              stroke={accentColor}
              strokeWidth={3}
              className="shadow-lg"
              style={{ cursor: "grab" }}
            />
          </g>
        )}

        {/* Ticks - Thinner */}
        {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
          <line
            key={deg}
            x1={center + (radius - 12) * Math.cos(((deg - 90) * Math.PI) / 180)}
            y1={center + (radius - 12) * Math.sin(((deg - 90) * Math.PI) / 180)}
            x2={center + radius * Math.cos(((deg - 90) * Math.PI) / 180)}
            y2={center + radius * Math.sin(((deg - 90) * Math.PI) / 180)}
            stroke={darkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"}
            strokeWidth="1.5"
          />
        ))}
      </svg>

      {/* Center Text - Smaller */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none select-none">
        <span
          className={`text-3xl font-bold font-mono tracking-tight ${
            darkMode ? "text-white" : "text-gray-800"
          }`}
        >
          {isRunning ? timeLeft : value}
        </span>
        <span
          className="text-xs font-bold uppercase tracking-widest mt-1"
          style={{ color: accentColor }}
        >
          {isRunning ? "REMAINING" : "MINUTES"}
        </span>
        {!isRunning && (
          <span
            className={`text-[10px] mt-1 opacity-50 ${
              darkMode ? "text-gray-400" : "text-gray-500"
            }`}
          >
            DRAG TO SET
          </span>
        )}
      </div>
    </div>
  );
}
