import React from 'react';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import './TableRow.css';

interface TableRowProps {
  title: string;
  subtitle?: string;
  rightContent?: React.ReactNode;
  onClick?: () => void;
  style?: React.CSSProperties;
  children?: React.ReactNode;
}

export const TableRow: React.FC<TableRowProps> = ({
  title,
  subtitle,
  rightContent,
  onClick,
  style,
  children
}) => {
  const className = `table-row ${onClick ? 'table-row-clickable' : ''}`;
  
  const content = (
    <>
      <div className="table-row-texts">
        <div className="table-row-title">{title}</div>
        {subtitle && <div className="table-row-subtitle">{subtitle}</div>}
        {children}
      </div>
      {rightContent && <div className="table-row-right">{rightContent}</div>}
    </>
  );

  if (onClick) {
    return (
      <div className={className} onClick={onClick} style={style}>
        {content}
      </div>
    );
  }

  return (
    <div className={className} style={style}>
      {content}
    </div>
  );
};
