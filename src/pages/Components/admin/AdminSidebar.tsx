import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, UserCheck, Users, BookOpen, Globe, Ghost, Sword, Settings, LogOut, ChevronDown, ChevronRight } from 'lucide-react';

const AdminSidebar = () => {
  const [worldsExpanded, setWorldsExpanded] = useState(false);

  const menuItems = [
    { name: 'Dashboard', path: '/admin', icon: <LayoutDashboard size={20} /> },
    { name: 'Teachers', path: '/admin/teachers', icon: <UserCheck size={20} /> },
    { name: 'Students', path: '/admin/students', icon: <Users size={20} /> },
    { name: 'Courses', path: '/admin/courses', icon: <BookOpen size={20} /> },
    {
      name: 'Worlds',
      icon: <Globe size={20} />,
      children: [
        { name: 'World List', path: '/admin/worlds', icon: <Globe size={20} /> },
        { name: 'Monsters', path: '/admin/monsters', icon: <Ghost size={20} /> },
      ]
    },
    { name: 'Items', path: '/admin/items', icon: <Sword size={20} /> },
    { name: 'Settings', path: '/admin/settings', icon: <Settings size={20} /> },
  ];

  return (
    <div className="h-screen w-64 bg-white text-slate-900 flex flex-col shadow-xl border-r border-violet-100">
      <div className="p-6 border-b border-violet-100">
        <h1 className="text-xl font-bold text-violet-700">HabitHero Admin</h1>
        <p className="text-xs text-slate-500">Manage your game world</p>
      </div>
      
      <nav className="flex-1 px-4 py-4 space-y-1">
        {menuItems.map((item) => {
          if (item.children) {
            return (
              <div key={item.name}>
                <div
                  onClick={() => setWorldsExpanded(!worldsExpanded)}
                  className="flex items-center gap-3 p-3 rounded-xl text-sm font-medium transition-all cursor-pointer text-slate-600 hover:bg-violet-50 hover:text-violet-700"
                >
                  {item.icon}
                  <span>{item.name}</span>
                  {worldsExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                </div>
                {worldsExpanded && (
                  <div className="ml-6 space-y-1">
                    {item.children.map((child) => (
                      <NavLink
                        key={child.name}
                        to={child.path}
                        className={({ isActive }) => `
                          flex items-center gap-3 p-3 rounded-xl text-sm font-medium transition-all
                          ${isActive
                            ? 'bg-violet-100 text-violet-700'
                            : 'text-slate-600 hover:bg-violet-50 hover:text-violet-700'}
                        `}
                      >
                        {child.icon}
                        <span>{child.name}</span>
                      </NavLink>
                    ))}
                  </div>
                )}
              </div>
            );
          } else {
            return (
              <NavLink
                key={item.name}
                to={item.path}
                end={item.path === '/admin'}
                className={({ isActive }) => `
                  flex items-center gap-3 p-3 rounded-xl text-sm font-medium transition-all
                  ${isActive
                    ? 'bg-violet-100 text-violet-700'
                    : 'text-slate-600 hover:bg-violet-50 hover:text-violet-700'}
                `}
              >
                {item.icon}
                <span>{item.name}</span>
              </NavLink>
            );
          }
        })}
      </nav>

      <div className="p-4 border-t border-violet-100">
        <button className="flex items-center gap-3 p-3 w-full text-slate-500 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all text-sm">
          <LogOut size={20} />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );
};

export default AdminSidebar;