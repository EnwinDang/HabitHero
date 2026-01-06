import React from 'react';

interface DropdownMenuItemProps {
  children: React.ReactNode;
  onClick?: (e: React.MouseEvent) => void;
  disabled?: boolean;
  style?: React.CSSProperties;
  onItemClick?: () => void;
  background?: 'transparent' | 'white';
}

export function DropdownMenuItem({ 
  children, 
  onClick, 
  disabled = false, 
  style: customStyle = {}, 
  onItemClick,
  background = 'white'
}: DropdownMenuItemProps) {
  const handleClick = (e: React.MouseEvent) => {
    if (disabled) return;
    e.stopPropagation();
    e.preventDefault();
    if (onClick) onClick(e);
    if (onItemClick) {
      setTimeout(() => onItemClick(), 0);
    }
  };

  const defaultBackground = background === 'white' ? '#ffffff' : 'transparent';

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled}
      style={{
        width: '100%',
        justifyContent: 'flex-start',
        padding: '8px 12px',
        fontSize: 14,
        background: defaultBackground,
        border: 'none',
        borderRadius: 6,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        display: 'flex',
        alignItems: 'center',
        color: 'inherit',
        pointerEvents: 'auto',
        ...customStyle,
      }}
      onMouseEnter={(e) => {
        if (!disabled) {
          e.currentTarget.style.background = 'rgba(31, 31, 35, 0.04)';
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = defaultBackground;
      }}
    >
      {children}
    </button>
  );
}

