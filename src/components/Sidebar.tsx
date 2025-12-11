import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, BookOpen, Users, Settings } from 'lucide-react';
import './Sidebar.css';

export const Sidebar: React.FC = () => {
  const location = useLocation();
  
  const navItems = [
    { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/modules', label: 'Modules', icon: BookOpen },
    { path: '/students', label: 'Students', icon: Users },
    { path: '/profile', label: 'Profile', icon: Settings }
  ];

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <h1 className="sidebar-logo">HabitHero</h1>
        <div className="sidebar-subtitle">Teacher Portal</div>
      </div>
      <nav className="sidebar-nav">
        {navItems.map(item => {
          const Icon = item.icon;
          const isActive = location.pathname.startsWith(item.path);
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`sidebar-nav-item ${isActive ? 'active' : ''}`}
            >
              <Icon size={20} className="nav-icon" />
              <span className="nav-label">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
};

