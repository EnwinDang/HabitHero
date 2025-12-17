import { createContext, useContext, useState, ReactNode, useEffect } from "react";

interface ThemeContextType {
    darkMode: boolean;
    setDarkMode: (value: boolean) => void;
    accentColor: string;
    setAccentColor: (value: string) => void;
}

const ThemeContext = createContext<ThemeContextType | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
    // Initialize from localStorage or use defaults
    const [darkMode, setDarkMode] = useState(() => {
        const saved = localStorage.getItem("habitHero_darkMode");
        return saved !== null ? JSON.parse(saved) : true;
    });

    const [accentColor, setAccentColor] = useState(() => {
        const saved = localStorage.getItem("habitHero_accentColor");
        return saved || "#06b6d4"; // Default cyan
    });

    // Save to localStorage when values change
    useEffect(() => {
        localStorage.setItem("habitHero_darkMode", JSON.stringify(darkMode));
    }, [darkMode]);

    useEffect(() => {
        localStorage.setItem("habitHero_accentColor", accentColor);
    }, [accentColor]);

    return (
        <ThemeContext.Provider value={{ darkMode, setDarkMode, accentColor, setAccentColor }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error("useTheme must be used within a ThemeProvider");
    }
    return context;
}

// Helper function to get theme classes
export function getThemeClasses(darkMode: boolean, accentColor: string) {
    return {
        bg: darkMode ? 'bg-[#0a0a0f]' : 'bg-gray-100',
        sidebar: darkMode ? 'bg-[#12121a]' : 'bg-white',
        card: darkMode ? 'bg-[#12121a]' : 'bg-white',
        cardGradient: darkMode ? 'from-[#1a1a2e] to-[#0f0f1a]' : 'from-blue-50 to-white',
        text: darkMode ? 'text-white' : 'text-gray-800',
        textMuted: darkMode ? 'text-gray-400' : 'text-gray-500',
        textSubtle: darkMode ? 'text-gray-500' : 'text-gray-400',
        borderStyle: { borderColor: `${accentColor}40` },
        accentText: { color: accentColor },
        accentBg: { backgroundColor: accentColor },
        glowStyle: { boxShadow: `0 0 20px ${accentColor}30` },
        inputBg: darkMode ? 'bg-gray-800/30' : 'bg-gray-100',
        gradientText: {
            background: `linear-gradient(to right, ${accentColor}, #a855f7)`,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
        },
    };
}
