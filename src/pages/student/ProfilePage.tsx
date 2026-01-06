import React, { useState, useEffect } from "react";
import { useRealtimeUser } from "@/hooks/useRealtimeUser";
import { useTheme, getThemeClasses } from "@/context/ThemeContext";
import { getCurrentLevelProgress, getLevelFromXP } from "@/utils/xpCurve";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/firebase";
import {
  ClipboardList,
  Mail,
  CalendarDays,
  UserCircle,
  Sword,
  Shield,
  Wand2,
  Crown,
  Skull,
  Target,
  Flame,
  Zap,
  Check,
  X,
} from "lucide-react";

// Avatar options - Lucide React icons
const avatarIcons = [
  { icon: Sword, name: "Sword" },
  { icon: Shield, name: "Shield" },
  { icon: Target, name: "Bow" },
  { icon: Wand2, name: "Wand" },
  { icon: Flame, name: "Dragon" },
  { icon: Crown, name: "Crown" },
  { icon: Skull, name: "Skull" },
  { icon: Zap, name: "Lightning" },
];

export default function ProfilePage() {
  const { user, loading: userLoading } = useRealtimeUser();
  const { darkMode, setDarkMode, accentColor } = useTheme();

  const [selectedAvatar, setSelectedAvatar] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Get theme classes
  const theme = getThemeClasses(darkMode, accentColor);

  // Load saved avatar from user.photoURL
  useEffect(() => {
    if (user?.photoURL) {
      const avatarIndex = parseInt(user.photoURL);
      if (!isNaN(avatarIndex) && avatarIndex >= 0 && avatarIndex < avatarIcons.length) {
        setSelectedAvatar(avatarIndex);
      }
    }
  }, [user]);

  // Save avatar to Firebase
  const handleSaveAvatar = async () => {
    if (!user) return;

    setIsSaving(true);
    setSaveMessage(null);

    try {
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, {
        photoURL: selectedAvatar.toString(),
      });

      setSaveMessage({ type: 'success', text: 'Avatar succesvol opgeslagen!' });
      setTimeout(() => setSaveMessage(null), 3000);
    } catch (error) {
      console.error("Error saving avatar:", error);
      setSaveMessage({ type: 'error', text: 'Fout bij het opslaan van avatar' });
      setTimeout(() => setSaveMessage(null), 3000);
    } finally {
      setIsSaving(false);
    }
  };



  if (userLoading) {
    return (
      <div
        className={`min-h-screen ${theme.bg} flex items-center justify-center transition-colors duration-300`}
      >
        <div className="text-xl animate-pulse" style={theme.accentText}>
          Laden...
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const memberSince = new Date().toLocaleDateString("nl-NL", {
    month: "long",
    year: "numeric",
  });

  return (
    <div className={`min-h-screen ${theme.bg} transition-colors duration-300`}>
      <main className="p-8 overflow-y-auto">
        {/* Header */}
        <div className="mb-8">
          <h2 className={`text-4xl font-bold ${theme.text}`}>
            Profile Settings
          </h2>
        </div>

        <div className="space-y-6">
          {/* TOP ROW: Profile + My Information (same height) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
            {/* LEFT - PROFILE CARD */}
            <div className="h-full">
              <div
                className={`${theme.card} border ${theme.border} rounded-3xl p-8 text-center ${theme.shadow} hover:${theme.borderHover} transition-all duration-300 h-full flex flex-col`}
              >

                {/* Avatar */}
                <div
                  className="w-32 h-32 mx-auto rounded-2xl border-4 flex items-center justify-center mb-4"
                  style={{
                    borderColor: accentColor,
                    backgroundColor: `${accentColor}20`,
                  }}
                >
                  {React.createElement(avatarIcons[selectedAvatar].icon, {
                    size: 64,
                    style: { color: accentColor },
                  })}
                </div>

                <h3 className={`text-3xl font-bold ${theme.text}`}>
                  {user.displayName}
                </h3>
                <p className={`text-xs ${theme.textMuted} uppercase tracking-widest mt-2`}>
                  Level {getLevelFromXP(user.stats.xp)} Adventurer
                </p>

                {/* Stats Preview */}
                <div className={`grid grid-cols-3 gap-4 mt-6 pt-6 border-t ${theme.border}`}>
                  <div className={`${theme.inputBg} rounded-lg p-2`}>
                    <p className="text-yellow-400 font-bold">
                      {user.stats.gold}
                    </p>
                    <p className={`${theme.textSubtle} text-xs`}>Gold</p>
                  </div>
                  <div className={`${theme.inputBg} rounded-lg p-2`}>
                    <p className="font-bold" style={theme.accentText}>
                      {getCurrentLevelProgress(user.stats.xp, getLevelFromXP(user.stats.xp)).current}
                    </p>
                    <p className={`${theme.textSubtle} text-xs`}>XP</p>
                  </div>
                  <div className={`${theme.inputBg} rounded-lg p-2`}>
                    <p className="text-orange-400 font-bold">
                      {user.stats.streak}
                    </p>
                    <p className={`${theme.textSubtle} text-xs`}>Streak</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT - MY INFORMATION */}
          <div className="h-full">
            <div
              className={`${theme.card} border ${theme.border} rounded-3xl p-8 ${theme.shadow} hover:${theme.borderHover} transition-all duration-300 h-full`}
            >
              <div className="flex justify-between items-center mb-6">
                <h3
                  className={`text-xl font-bold ${theme.text} flex items-center gap-2`}
                >
                  <ClipboardList size={20} style={{ color: accentColor }} />{" "}
                  My Information
                </h3>
                <button
                  className="px-4 py-2 rounded-xl border-2 text-sm font-semibold transition-all hover:shadow-md"
                  style={{
                    color: accentColor,
                    borderColor: `${accentColor}40`,
                    backgroundColor: 'transparent',
                  }}
                >
                  Edit
                </button>
              </div>

              <div className="space-y-4">
                <InfoRow
                  icon={<UserCircle size={20} />}
                  label=""
                  value={user.displayName || "Hero"}
                  darkMode={darkMode}
                />
                <InfoRow
                  icon={<Mail size={20} />}
                  label=""
                  value={user.email || "hunter@shadow.com"}
                  darkMode={darkMode}
                />
                <InfoRow
                  icon={<CalendarDays size={20} />}
                  label=""
                  value={memberSince}
                  darkMode={darkMode}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Avatar + Theme + Accent (structured) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Choose Avatar */}
          <div
            className={`${theme.card} border ${theme.border} rounded-3xl p-8 ${theme.shadow} hover:${theme.borderHover} transition-all duration-300`}
          >
            <h3
              className={`text-xl font-bold ${theme.text} mb-4 flex items-center gap-2`}
            >
              <UserCircle size={24} style={{ color: accentColor }} />
              Choose Avatar
            </h3>

            {/* Success/Error Message */}
            {saveMessage && (
              <div
                className={`mb-4 p-3 rounded-xl flex items-center gap-2 ${saveMessage.type === 'success' ? 'bg-green-500/20 text-green-600 dark:text-green-400' : 'bg-red-500/20 text-red-600 dark:text-red-400'}`}
              >
                {saveMessage.type === 'success' ? <Check size={20} /> : <X size={20} />}
                <span className="text-sm font-semibold">{saveMessage.text}</span>
              </div>
            )}

            <div className="grid grid-cols-4 gap-3">
              {avatarIcons.map((avatarItem, index) => (
                <button
                  key={index}
                  onClick={() => setSelectedAvatar(index)}
                  className="p-4 rounded-xl transition-all border-2 hover:scale-105"
                  style={{
                    backgroundColor:
                      selectedAvatar === index
                        ? darkMode
                          ? `${accentColor}20`
                          : `${accentColor}10`
                        : darkMode
                          ? "rgba(55, 65, 81, 0.3)"
                          : "rgba(243, 244, 246, 1)",
                    borderColor:
                      selectedAvatar === index ? accentColor : "transparent",
                    boxShadow:
                      selectedAvatar === index
                        ? `0 0 15px ${accentColor}40`
                        : "none",
                  }}
                  title={avatarItem.name}
                >
                  {React.createElement(avatarItem.icon, {
                    size: 32,
                    style: { color: selectedAvatar === index ? accentColor : (darkMode ? '#9ca3af' : '#6b7280') },
                  })}
                </button>
              ))}
            </div>

            {/* Save Button */}
            <button
              onClick={handleSaveAvatar}
              disabled={isSaving}
              className="w-full mt-6 px-6 py-3 rounded-xl font-bold text-white transition-all hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                backgroundColor: isSaving ? '#9ca3af' : accentColor,
              }}
            >
              {isSaving ? 'Opslaan...' : 'Avatar Opslaan'}
            </button>
          </div>

          {/* Theme + Accent */}
          <div className="space-y-6">
            {/* Theme Settings */}
            <div
              className={`${theme.card} border ${theme.border} rounded-3xl p-8 ${theme.shadow} hover:${theme.borderHover} transition-all duration-300`}
            >
              <h3
                className={`text-xl font-bold ${theme.text} mb-4 flex items-center gap-2`}
              >
                <span>🌙</span> Theme Settings
              </h3>
              <div
                className={`flex justify-between items-center p-4 ${theme.inputBg} rounded-xl`}
              >
                <div>
                  <p className="font-medium" style={theme.accentText}>
                    Dark Mode
                  </p>
                  <p className={`${theme.textSubtle} text-sm`}>
                    {darkMode
                      ? "Shadow realm activated"
                      : "Light mode active"}
                  </p>
                </div>
                <button
                  onClick={() => setDarkMode(!darkMode)}
                  className="w-14 h-8 rounded-full p-1 transition-all"
                  style={{
                    backgroundColor: darkMode ? accentColor : "#d1d5db",
                    boxShadow: darkMode
                      ? `0 0 10px ${accentColor}50`
                      : "none",
                  }}
                >
                  <div
                    className={`w-6 h-6 rounded-full bg-white shadow transition-transform ${darkMode ? "translate-x-6" : "translate-x-0"
                      }`}
                  />
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

/* Navigation Item Component */
function NavItem({
  icon,
  label,
  active = false,
  onClick,
  darkMode,
  accentColor,
}: {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  onClick: () => void;
  darkMode: boolean;
  accentColor: string;
}) {
  return (
    <li>
      <button
        onClick={onClick}
        className="flex items-center gap-3 w-full px-4 py-3 rounded-xl transition-all"
        style={
          active
            ? {
              background: `linear-gradient(to right, ${accentColor}20, rgba(168, 85, 247, 0.1))`,
              color: accentColor,
              borderWidth: "1px",
              borderStyle: "solid",
              borderColor: `${accentColor}50`,
            }
            : {
              color: darkMode ? "#9ca3af" : "#6b7280",
            }
        }
      >
        {icon}
        <span className="font-medium">{label}</span>
      </button>
    </li>
  );
}

/* Info Row Component */
function InfoRow({
  icon,
  label,
  value,
  darkMode,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  darkMode: boolean;
}) {
  return (
    <div
      className="flex items-center gap-4 p-3 rounded-xl"
      style={{
        backgroundColor: darkMode
          ? "rgba(55, 65, 81, 0.2)"
          : "rgba(243, 244, 246, 1)",
      }}
    >
      <span className="text-xl">{icon}</span>
      <div>
        <p
          className={darkMode ? "text-gray-500" : "text-gray-400"}
          style={{ fontSize: "0.875rem" }}
        >
          {label}
        </p>
        <p
          className={`font-medium ${darkMode ? "text-white" : "text-gray-800"}`}
        >
          {value}
        </p>
      </div>
    </div>
  );
}



