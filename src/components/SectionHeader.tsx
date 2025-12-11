import React from 'react';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import './SectionHeader.css';

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  rightContent?: React.ReactNode;
  style?: React.CSSProperties;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({
  title,
  subtitle,
  rightContent,
  style
}) => {
  return (
    <div className="section-header" style={style}>
      <div>
        <h2 className="section-title">{title}</h2>
        {subtitle && <div className="section-subtitle">{subtitle}</div>}
      </div>
      {rightContent && <div>{rightContent}</div>}
    </div>
  );
};
