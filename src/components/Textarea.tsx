import React from 'react';
import './Textarea.css';

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  helperText?: string;
}

export const Textarea: React.FC<TextareaProps> = ({ label, helperText, ...rest }) => {
  return (
    <div className="textarea-container">
      {label && <label className="textarea-label">{label}</label>}
      <textarea className="textarea-field" {...rest} />
      {helperText && <span className="textarea-helper">{helperText}</span>}
    </div>
  );
};

