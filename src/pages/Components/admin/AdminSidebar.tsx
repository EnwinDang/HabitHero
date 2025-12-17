import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, UserCheck, Users, BookOpen, Globe, Ghost, Sword, Settings, LogOut } from 'lucide-react';

const AdminSidebar = () => {
  const menuItems = [
    { name: 'Dashboard', path: '/admin', icon: <LayoutDashboard size={20} /> },
    { name: 'Teachers', path: '/admin/teachers', icon: <UserCheck size={20} /> },
    { name: 'Students', path: '/admin/students', icon: <Users size={20} /> },
    { name: 'courses', path: '/admin/courses', icon: <BookOpen size={20} /> },
    { name: 'Worlds', path: '/admin/worlds', icon: <Globe size={20} /> },
    { name: 'Monsters', path: '/admin/monsters', icon: <Ghost size={20} /> },
    { name: 'Items', path: '/admin/items', icon: <Sword size={20} /> },
    { name: 'Settings', path: '/admin/settings', icon: <Settings size={20} /> },
  ];

  return (
    <div className="h-screen w-64 bg-indigo-700 text-white flex flex-col shadow-xl">
      <div className="p-6">
        <h1 className="text-xl font-bold">HabitHero Admin</h1>
        <p className="text-xs text-indigo-200">Manage your game world</p>
      </div>

      <nav className="flex-1 px-4 space-y-1">
        {menuItems.map((item) => (
          <NavLink
            key={item.name}
            to={item.path}
            end={item.path === '/admin'}
            className={({ isActive }) => `
              flex items-center gap-3 p-3 rounded-lg transition-all
              ${isActive ? 'bg-white/20 font-bold' : 'hover:bg-white/10 text-indigo-100'}
            `}
          >
            {item.icon}
            <span>{item.name}</span>
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-indigo-600">
        <button className="flex items-center gap-3 p-3 w-full text-indigo-100 hover:bg-white/10 rounded-lg transition-all">
          <LogOut size={20} />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );
};

export default AdminSidebar;