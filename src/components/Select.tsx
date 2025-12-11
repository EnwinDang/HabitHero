import React from 'react';
import './Select.css';

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: SelectOption[];
  helperText?: string;
}

export const Select: React.FC<SelectProps> = ({ label, options, helperText, ...rest }) => {
  return (
    <div className="select-container">
      {label && <label className="select-label">{label}</label>}
      <select className="select-field" {...rest}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {helperText && <span className="select-helper">{helperText}</span>}
    </div>
  );
};

