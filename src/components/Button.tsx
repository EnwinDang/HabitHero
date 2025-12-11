import React from 'react';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import './Button.css';

type ButtonVariant = 'primary' | 'secondary' | 'danger';

interface ButtonProps {
  variant?: ButtonVariant;
  fullWidth?: boolean;
  onClick: () => void;
  children: React.ReactNode;
  style?: React.CSSProperties;
  disabled?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  fullWidth,
  onClick,
  children,
  style,
  disabled
}) => {
  const className = `btn btn-${variant} ${fullWidth ? 'btn-full' : ''} ${disabled ? 'btn-disabled' : ''}`;

  return (
    <button
      className={className}
      onClick={onClick}
      disabled={disabled}
      style={style}
    >
      {children}
    </button>
  );
};
