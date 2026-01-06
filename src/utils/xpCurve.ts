/**
 * XP Curve Utility Functions
 * 
 * Implements exponential XP growth system based on Firebase configuration:
 * - baseXP: 100 (XP required for level 1)
 * - growthFactor: 1.18 (18% increase per level)
 * - type: "exponential"
 */

export interface XPCurveConfig {
    baseXP: number;
    growthFactor: number;
    type: 'exponential' | 'linear';
}

// Default configuration (matches Firebase)
const DEFAULT_XP_CURVE: XPCurveConfig = {
    baseXP: 100,
    growthFactor: 1.18,
    type: 'exponential',
};

/**
 * Calculate XP required to reach a specific level
 * Formula: baseXP * (growthFactor ^ (level - 1))
 * 
 * Examples:
 * - Level 1: 100 * (1.18 ^ 0) = 100 XP
 * - Level 2: 100 * (1.18 ^ 1) = 118 XP
 * - Level 3: 100 * (1.18 ^ 2) = 139 XP
 * - Level 10: 100 * (1.18 ^ 9) = 501 XP
 */
export function getXPForLevel(level: number, config: XPCurveConfig = DEFAULT_XP_CURVE): number {
    if (level <= 0) return 0;

    if (config.type === 'exponential') {
        return Math.floor(config.baseXP * Math.pow(config.growthFactor, level - 1));
    } else {
        // Linear growth
        return config.baseXP * level;
    }
}

/**
 * Calculate total XP required to reach a specific level
 * (Sum of all XP from level 1 to level - 1)
 * 
 * This is the cumulative XP needed BEFORE starting the target level
 * Example: getTotalXPForLevel(3) = XP for level 1 + XP for level 2 = 100 + 118 = 218
 */
export function getTotalXPForLevel(level: number, config: XPCurveConfig = DEFAULT_XP_CURVE): number {
    if (level <= 1) return 0;

    // Sum XP from all previous levels
    let total = 0;
    for (let i = 1; i < level; i++) {
        total += getXPForLevel(i, config);
    }
    return total;
}

/**
 * Calculate current level from total XP
 * Returns the level the user is currently at
 */
export function getLevelFromXP(totalXP: number, config: XPCurveConfig = DEFAULT_XP_CURVE): number {
    if (totalXP <= 0) return 1;

    let level = 1;
    let xpRequired = 0;

    // Keep adding XP requirements until we exceed totalXP
    while (xpRequired <= totalXP) {
        xpRequired += getXPForLevel(level, config);
        if (xpRequired <= totalXP) {
            level++;
        }
    }

    return level;
}

/**
 * Get XP progress within current level
 * Returns: { current: number, required: number, percentage: number }
 */
export function getCurrentLevelProgress(
    totalXP: number,
    currentLevel: number,
    config: XPCurveConfig = DEFAULT_XP_CURVE
): { current: number; required: number; percentage: number } {
    const xpForPreviousLevels = getTotalXPForLevel(currentLevel, config);
    const xpRequiredForCurrentLevel = getXPForLevel(currentLevel, config);
    const currentLevelXP = totalXP - xpForPreviousLevels;

    return {
        current: Math.max(0, Math.min(currentLevelXP, xpRequiredForCurrentLevel)),
        required: xpRequiredForCurrentLevel,
        percentage: Math.min(100, Math.max(0, Math.round((currentLevelXP / xpRequiredForCurrentLevel) * 100))),
    };
}

/**
 * Get XP needed to reach next level
 */
export function getXPToNextLevel(
    totalXP: number,
    currentLevel: number,
    config: XPCurveConfig = DEFAULT_XP_CURVE
): number {
    const progress = getCurrentLevelProgress(totalXP, currentLevel, config);
    return Math.max(0, progress.required - progress.current);
}

/**
 * Format XP number with commas for readability
 * Example: 1234567 -> "1,234,567"
 */
export function formatXP(xp: number): string {
    return xp.toLocaleString('en-US');
}
