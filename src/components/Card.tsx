import React from 'react';
import './Card.css';

interface CardProps {
  children: React.ReactNode;
  style?: Record<string, string | number>;
  className?: string;
}

export const Card: React.FC<CardProps> = ({ children, style, className }) => {
  const classNames = `card ${className || ''}`.trim();
  return <div className={classNames} style={style}>{children}</div>;
};
