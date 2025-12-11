import React from 'react';
import { colors } from '../theme/colors';
import './ProgressBar.css';

interface ProgressBarProps {
  value: number; // 0-100
}

export const ProgressBar: React.FC<ProgressBarProps> = ({ value }) => {
  const width = Math.min(Math.max(value, 0), 100);
  return (
    <div className="progress-track">
      <div className="progress-fill" style={{ width: `${width}%` }} />
    </div>
  );
};
