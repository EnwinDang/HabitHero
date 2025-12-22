import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import {
    Sword,
    Scroll,
    Timer,
    BarChart3,
    Trophy,
    Calendar,
    User,
    Settings,
    LogOut,
    ClipboardList,
} from 'lucide-react';

const StudentSidebar = () => {
    const navigate = useNavigate();
    const { logout } = useAuth();
    const { darkMode, accentColor } = useTheme();

    const menuItems = [
        { name: 'Home', path: '/dashboard', icon: <Sword size={20} />, end: true },
        { name: 'Quests', path: '#', icon: <Scroll size={20} /> },
        { name: 'Daily Tasks', path: '/dashboard/daily-tasks', icon: <ClipboardList size={20} /> },
        { name: 'Focus Mode', path: '/dashboard/focus', icon: <Timer size={20} /> },
        { name: 'Stats', path: '/dashboard/stats', icon: <BarChart3 size={20} /> },
        { name: 'Achievements', path: '/dashboard/achievements', icon: <Trophy size={20} /> },
        { name: 'Calendar', path: '/dashboard/calendar', icon: <Calendar size={20} /> },
        { name: 'Profile', path: '/dashboard/profile', icon: <User size={20} /> },
        { name: 'Settings', path: '/dashboard/settings', icon: <Settings size={20} /> },
    ];

    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

    return (
        <div
            className={`h-screen w-64 flex flex-col shadow-xl ${darkMode ? 'bg-slate-900 text-slate-100' : 'bg-white text-slate-900'
                }`}
            style={{
                borderRight: `1px solid ${darkMode ? 'rgba(71, 85, 105, 0.5)' : 'rgba(226, 232, 240, 1)'}`,
            }}
        >
            <div className="p-6 border-b" style={{ borderColor: darkMode ? 'rgba(71, 85, 105, 0.5)' : 'rgba(226, 232, 240, 1)' }}>
                <h1
                    className="text-2xl font-bold"
                    style={{
                        color: accentColor,
                    }}
                >
                    HabitHero
                </h1>
                <p className="text-xs mt-1" style={{ color: accentColor, opacity: 0.6 }}>Student Portal</p>
            </div>

            <nav className="flex-1 px-4 py-4 space-y-1">
                {menuItems.map((item) => {
                    if (item.path === '#') {
                        return (
                            <div
                                key={item.name}
                                className="flex items-center gap-3 p-3 rounded-xl text-sm font-medium transition-all cursor-not-allowed opacity-50"
                                style={{ color: darkMode ? '#9ca3af' : '#6b7280' }}
                            >
                                {item.icon}
                                <span>{item.name}</span>
                            </div>
                        );
                    }

                    return (
                        <NavLink
                            key={item.name}
                            to={item.path}
                            end={item.end}
                            className={({ isActive }) => `
                flex items-center gap-3 p-3 rounded-xl text-sm font-medium transition-all
                ${isActive
                                    ? ''
                                    : darkMode
                                        ? 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                                        : 'text-slate-600 hover:bg-violet-50 hover:text-violet-700'
                                }
              `}
                            style={({ isActive }) =>
                                isActive
                                    ? {
                                        background: `linear-gradient(to right, ${accentColor}20, rgba(168, 85, 247, 0.1))`,
                                        color: accentColor,
                                        borderWidth: '1px',
                                        borderStyle: 'solid',
                                        borderColor: `${accentColor}50`,
                                    }
                                    : {}
                            }
                        >
                            {item.icon}
                            <span>{item.name}</span>
                        </NavLink>
                    );
                })}
            </nav>

            <div className="p-4 border-t" style={{ borderColor: darkMode ? 'rgba(71, 85, 105, 0.5)' : 'rgba(226, 232, 240, 1)' }}>
                <button
                    onClick={handleLogout}
                    className="flex items-center gap-3 p-3 w-full text-red-400 hover:text-red-300 hover:bg-red-900/20 rounded-xl transition-all text-sm font-medium"
                >
                    <LogOut size={20} />
                    <span>Logout</span>
                </button>
            </div>
        </div>
    );
};

export default StudentSidebar;
