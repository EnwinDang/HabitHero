import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';

export default function TeacherLayout() {
  return (
    <div className="hh-shell">
      <Sidebar />
      <main className="hh-main">
        <div className="hh-content">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

