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
        return saved || "#8b5cf6"; // Default violet-500
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

// Helper function to get theme classes - Admin style with solid colors
export function getThemeClasses(darkMode: boolean, accentColor: string) {
    return {
        // Backgrounds
        bg: darkMode ? 'bg-gray-900' : 'bg-violet-50',
        sidebar: darkMode ? 'bg-gray-800' : 'bg-white',
        card: darkMode ? 'bg-gray-800' : 'bg-white',
        inputBg: darkMode ? 'bg-gray-700' : 'bg-white',

        // Text
        text: darkMode ? 'text-white' : 'text-slate-900',
        textMuted: darkMode ? 'text-gray-400' : 'text-slate-600',
        textSubtle: darkMode ? 'text-gray-500' : 'text-slate-500',

        // Borders
        border: darkMode ? 'border-gray-700' : 'border-violet-100',
        borderHover: darkMode ? 'border-violet-600' : 'border-violet-300',

        // Accent colors (inline styles)
        accentText: { color: accentColor },
        accentBg: { backgroundColor: accentColor },
        accentLight: { backgroundColor: `${accentColor}20` },
        accentBorder: { borderColor: `${accentColor}40` },

        // Shadows
        shadow: 'shadow-lg',
        shadowXl: 'shadow-xl',

        // Hover states
        hoverAccent: darkMode ? 'hover:bg-gray-700' : 'hover:bg-violet-50',

        // Backward compatibility (temporary - will be removed after full migration)
        borderStyle: { borderColor: `${accentColor}40` },
        gradientText: { color: accentColor }, // Simplified to solid color instead of gradient
        glowStyle: { boxShadow: `0 0 20px ${accentColor}30` }, // Keep for now
    };
}

// Helper to generate accent color with opacity
export function hexToRgba(hex: string, alpha: number): string {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
