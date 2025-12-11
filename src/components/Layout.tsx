import React from 'react';
import { Outlet, useLocation, useParams } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { useAppState } from '../context/AppStateContext';
import './Layout.css';

export const Layout: React.FC = () => {
  const location = useLocation();
  const params = useParams();
  const { modules } = useAppState();

  const getBreadcrumbs = (): string[] | undefined => {
    const path = location.pathname;
    
    if (path.startsWith('/dashboard')) {
      return ['Dashboard'];
    }
    if (path.startsWith('/modules')) {
      if (params.moduleId) {
        const module = modules.find(m => m.id === params.moduleId);
        return ['Dashboard', 'Modules', module?.name || 'Module'];
      }
      return ['Dashboard', 'Modules'];
    }
    if (path.startsWith('/students')) {
      if (params.studentId) {
        return ['Dashboard', 'Students', 'Student Details'];
      }
      return ['Dashboard', 'Students'];
    }
    if (path.startsWith('/profile')) {
      return ['Dashboard', 'Profile'];
    }
    
    return undefined;
  };

  return (
    <div className="layout">
      <Sidebar />
      <div className="layout-content">
        <TopBar breadcrumbs={getBreadcrumbs()} />
        <main className="layout-main">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
