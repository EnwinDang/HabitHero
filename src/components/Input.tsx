import React from 'react';
import { colors } from '../theme/colors';
import './Input.css';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  helperText?: string;
}

export const Input: React.FC<InputProps> = ({ label, helperText, disabled, ...rest }) => {
  return (
    <div className="input-container">
      {label && <label className="input-label">{label}</label>}
      <input className="input-field" disabled={disabled} {...rest} />
      {helperText && <span className="input-helper">{helperText}</span>}
    </div>
  );
};
