import React from 'react';
import { colors } from '../theme/colors';
import './Badge.css';

type Difficulty = 'easy' | 'medium' | 'hard';
type ProgressStatus = 'ahead' | 'on-track' | 'behind';

interface BadgeProps {
  label: string;
  type: 'difficulty' | 'status' | 'pill';
  variant?: Difficulty | ProgressStatus | 'neutral' | 'active' | 'hidden';
  style?: Record<string, string | number>;
}

export const Badge: React.FC<BadgeProps> = ({ label, type, variant = 'neutral', style }) => {
  const background = (() => {
    if (type === 'difficulty') {
      if (variant === 'easy') return '#DCFCE7';
      if (variant === 'medium') return '#FEF3C7';
      if (variant === 'hard') return '#FEE2E2';
    }
    if (type === 'status') {
      if (variant === 'ahead') return '#DCFCE7';
      if (variant === 'on-track') return '#E0E7FF';
      if (variant === 'behind') return '#FEE2E2';
    }
    if (variant === 'active') return '#E0E7FF';
    if (variant === 'hidden') return '#F3F4F6';
    return '#E5E7EB';
  })();

  const textColor = (() => {
    if (variant === 'easy' || variant === 'ahead') return '#166534';
    if (variant === 'medium') return '#92400E';
    if (variant === 'hard' || variant === 'behind') return '#991B1B';
    if (variant === 'active') return colors.primaryDark;
    if (variant === 'hidden') return colors.muted;
    return colors.text;
  })();

  return (
    <span className="badge" style={{ backgroundColor: background, color: textColor, ...style }}>
      {label}
    </span>
  );
};
