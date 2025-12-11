import React from 'react';
import './ScreenContainer.css';

interface ScreenContainerProps {
  children: React.ReactNode;
  scrollable?: boolean;
  style?: Record<string, string | number>;
}

export const ScreenContainer: React.FC<ScreenContainerProps> = ({
  children,
  scrollable = true,
  style
}) => {
  return (
    <div className="screen-container" style={style}>
      {children}
    </div>
  );
};
