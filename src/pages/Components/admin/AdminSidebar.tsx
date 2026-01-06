import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { auth } from '../../../firebase'; 
import { signOut } from 'firebase/auth';
import { 
  LayoutDashboard, 
  UserCheck, 
  Users, 
  BookOpen, 
  Globe, 
  Ghost, 
  Sword, 
  LogOut, 
  ChevronDown, 
  ChevronRight,
  AlertCircle
} from 'lucide-react';

const AdminSidebar = () => {
  const navigate = useNavigate();
  const [worldsExpanded, setWorldsExpanded] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      localStorage.clear();
      sessionStorage.clear();
      navigate('/login');
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

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
  ];

  return (
    <div className="h-screen w-64 bg-white text-slate-900 flex flex-col border-r border-violet-100 relative font-sans">
      <div className="p-6">
        <h1 className="text-xl font-black text-violet-600 tracking-tight">HabitHero Admin</h1>
        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Manage your game world</p>
      </div>
      
      <nav className="flex-1 px-4 py-4 space-y-1">
        {menuItems.map((item) => {
          if (item.children) {
            return (
              <div key={item.name}>
                <div
                  onClick={() => setWorldsExpanded(!worldsExpanded)}
                  className="flex items-center justify-between p-3 rounded-xl text-sm font-medium transition-all cursor-pointer text-slate-500 hover:bg-violet-50 hover:text-violet-600"
                >
                  <div className="flex items-center gap-3">
                    {item.icon}
                    <span>{item.name}</span>
                  </div>
                  {worldsExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                </div>
                {worldsExpanded && (
                  <div className="mt-1 ml-4 space-y-1 border-l-2 border-violet-50">
                    {item.children.map((child) => (
                      <NavLink
                        key={child.name}
                        to={child.path}
                        className={({ isActive }) => `
                          flex items-center gap-3 p-3 ml-2 rounded-xl text-sm font-medium transition-all
                          ${isActive
                            ? 'bg-violet-50 text-violet-600'
                            : 'text-slate-400 hover:text-violet-600'}
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
                    ? 'bg-violet-50 text-violet-600'
                    : 'text-slate-500 hover:bg-violet-50 hover:text-violet-600'}
                `}
              >
                {item.icon}
                <span>{item.name}</span>
              </NavLink>
            );
          }
        })}
      </nav>

      <div className="p-4 border-t border-slate-50">
        <button 
          onClick={() => setShowLogoutConfirm(true)}
          className="flex items-center gap-3 p-3 w-full text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all text-sm font-medium uppercase tracking-widest"
        >
          <LogOut size={20} />
          <span className="text-[11px]">Logout</span>
        </button>
      </div>

      {showLogoutConfirm && (
        <div className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] p-8 max-w-sm w-full border border-violet-100 shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-rose-50 rounded-2xl flex items-center justify-center text-rose-500 mb-4">
                <AlertCircle size={32} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Logout</h3>
              <p className="text-sm text-slate-500 font-medium mb-8">Bent u zeker dat u wilt uitloggen?</p>
              
              <div className="grid grid-cols-2 gap-3 w-full">
                <button
                  onClick={() => setShowLogoutConfirm(false)}
                  className="px-6 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-slate-200"
                >
                  Annuleer
                </button>
                <button
                  onClick={handleLogout}
                  className="px-6 py-3 bg-rose-500 text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-rose-600 shadow-lg shadow-rose-200"
                >
                  Log uit
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminSidebar;