import React from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useTheme, getThemeClasses } from "@/context/ThemeContext";
import {
  Sword,
  Timer,
  BarChart3,
  Trophy,
  Calendar,
  User,
  Settings,
  LogOut,
  ClipboardList,
  Gift,
  Package,
  Swords,
  Map,
} from "lucide-react";

const StudentSidebar = () => {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const { darkMode, accentColor } = useTheme();
  const theme = getThemeClasses(darkMode, accentColor);

  const menuItems = [
    { name: "Courses", path: "/student/courses", icon: <ClipboardList size={20} /> },
    {
      name: "Daily Tasks",
      path: "/student/daily-tasks",
      icon: <ClipboardList size={20} />,
    },
    { name: "Focus Mode", path: "/student/focus-mode", icon: <Timer size={20} /> },
    { name: "World Map", path: "/student/world-map", icon: <Map size={20} /> },
    { name: "Stats", path: "/student/stats", icon: <BarChart3 size={20} /> },
    {
      name: "Achievements",
      path: "/student/achievements",
      icon: <Trophy size={20} />,
    },
    {
      name: "Calendar",
      path: "/student/calendar",
      icon: <Calendar size={20} />,
    },
    {
      name: "Lootboxes",
      path: "/student/lootboxes",
      icon: <Gift size={20} />,
    },
    {
      name: "Inventory",
      path: "/student/inventory",
      icon: <Package size={20} />,
    },
  ];

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <div
      className={`h-screen w-64 ${theme.sidebar} ${theme.text} flex flex-col shadow-xl border-r ${theme.border}`}
    >
      {/* Header */}
      <button
        onClick={() => navigate("/student")}
        className="block w-full text-left p-6 border-b hover:opacity-80 transition-opacity"
        style={{ borderColor: theme.border.split(' ')[0] }}
      >
        <h1 className="text-2xl font-bold" style={theme.accentText}>
          HabitHero
        </h1>
        <p className={`text-xs ${theme.textMuted} uppercase tracking-widest mt-1`}>
          Student Portal
        </p>
      </button>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
        {menuItems.map((item) => {
          if (item.path === "#") {
            return (
              <div
                key={item.name}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all cursor-not-allowed opacity-50 ${theme.textMuted}`}
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
              className={({ isActive }) => `
                flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200
                ${isActive
                  ? ""
                  : `${theme.textMuted} hover:opacity-80`
                }
              `}
              style={({ isActive }) => isActive ? {
                backgroundColor: darkMode ? `${accentColor}20` : `${accentColor}10`,
                color: accentColor,
                borderWidth: '1px',
                borderStyle: 'solid',
                borderColor: darkMode ? `${accentColor}50` : `${accentColor}30`
              } : {}}
            >
              {item.icon}
              <span>{item.name}</span>
            </NavLink>
          );
        })}
      </nav>

{/* Footer - Settings & Logout */}
      <div className={`p-4 space-y-2 border-t ${theme.border}`}>
        <NavLink
          to="/student/settings"
          className={({ isActive }) => `
            flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200
            ${isActive
              ? ""
              : `${theme.textMuted} hover:opacity-80`
            }
          `}
          style={({ isActive }) => isActive ? {
            backgroundColor: darkMode ? `${accentColor}20` : `${accentColor}10`,
            color: accentColor,
            borderWidth: '1px',
            borderStyle: 'solid',
            borderColor: darkMode ? `${accentColor}50` : `${accentColor}30`
          } : {}}
        >
          <Settings size={20} />
          <span>Settings</span>
        </NavLink>
        <button
          onClick={handleLogout}
          className={`flex items-center gap-3 px-4 py-3 w-full rounded-xl transition-all text-sm font-medium ${darkMode
              ? "text-rose-400 hover:text-rose-300 hover:bg-rose-900/30"
              : "text-rose-500 hover:text-rose-600 hover:bg-rose-50"
            }`}
        >
          <LogOut size={20} />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );
};

export default StudentSidebar;
