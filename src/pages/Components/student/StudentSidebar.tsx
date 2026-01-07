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
    { name: "Home", path: "/dashboard", icon: <Sword size={20} />, end: true },
    {
      name: "Daily Tasks",
      path: "/dashboard/daily-tasks",
      icon: <ClipboardList size={20} />,
    },
    { name: "Focus Mode", path: "/dashboard/focus", icon: <Timer size={20} /> },
    { name: "Battle", path: "/dashboard/battle", icon: <Swords size={20} /> },
    { name: "World Map", path: "/dashboard/world-map", icon: <Map size={20} /> },
    { name: "Stats", path: "/dashboard/stats", icon: <BarChart3 size={20} /> },
    {
      name: "Achievements",
      path: "/dashboard/achievements",
      icon: <Trophy size={20} />,
    },
    {
      name: "Calendar",
      path: "/dashboard/calendar",
      icon: <Calendar size={20} />,
    },
    {
      name: "Lootboxes",
      path: "/dashboard/lootboxes",
      icon: <Gift size={20} />,
    },
    {
      name: "Inventory",
      path: "/dashboard/inventory",
      icon: <Package size={20} />,
    },
    { name: "Profile", path: "/dashboard/profile", icon: <User size={20} /> },
    {
      name: "Settings",
      path: "/dashboard/settings",
      icon: <Settings size={20} />,
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
      <div className={`p-6 border-b ${theme.border}`}>
        <h1 className="text-2xl font-bold" style={theme.accentText}>
          HabitHero
        </h1>
        <p className={`text-xs ${theme.textMuted} uppercase tracking-widest mt-1`}>
          Student Portal
        </p>
      </div>

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
              end={item.end}
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

      {/* Footer - Logout */}
      <div className={`p-4 border-t ${theme.border}`}>
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
