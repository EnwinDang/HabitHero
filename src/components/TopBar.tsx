import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { useAppState } from '../context/AppStateContext';
import './TopBar.css';

interface TopBarProps {
  breadcrumbs?: string[];
}

export const TopBar: React.FC<TopBarProps> = ({ breadcrumbs }) => {
  const { teacher } = useAppState();
  const navigate = useNavigate();

  return (
    <header className="topbar">
      <div className="topbar-content">
        <div className="topbar-left">
          {breadcrumbs && breadcrumbs.length > 0 && (
            <div className="breadcrumbs">
              {breadcrumbs.map((crumb, index) => (
                <React.Fragment key={index}>
                  {index > 0 && <ChevronRight size={16} className="breadcrumb-separator" />}
                  <span className={index === breadcrumbs.length - 1 ? 'breadcrumb-current' : 'breadcrumb-item'}>
                    {crumb}
                  </span>
                </React.Fragment>
              ))}
            </div>
          )}
          {!breadcrumbs && (
            <h2 className="topbar-title">Welcome back, {teacher?.fullName || 'Teacher'}</h2>
          )}
        </div>
        <div className="topbar-right">
          <div className="topbar-user">
            <div className="user-avatar">
              {teacher?.fullName?.charAt(0).toUpperCase() || 'T'}
            </div>
            <span className="user-name">{teacher?.fullName || 'Teacher'}</span>
          </div>
        </div>
      </div>
    </header>
  );
};
