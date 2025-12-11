import React from 'react';
import { Card } from './Card';
import { ProgressBar } from './ProgressBar';
import './KpiCard.css';

interface KpiCardProps {
  label: string;
  value: string | number;
  subLabel?: string;
  progressValue?: number;
  icon?: React.ReactNode;
  trend?: string;
}

export const KpiCard: React.FC<KpiCardProps> = ({ label, value, subLabel, progressValue, icon, trend }) => {
  return (
    <Card className="kpi-card">
      <div className="kpi-header">
        <div className="kpi-label">{label}</div>
        {icon && <div className="kpi-icon">{icon}</div>}
      </div>
      <div className="kpi-value">{value}</div>
      {trend && <div className="kpi-trend">{trend}</div>}
      {subLabel && <div className="kpi-sub-label">{subLabel}</div>}
      {typeof progressValue === 'number' && (
        <div className="kpi-progress">
          <ProgressBar value={progressValue} />
        </div>
      )}
    </Card>
  );
};
