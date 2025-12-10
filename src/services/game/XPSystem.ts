import type { User } from "../../models/User";

/**
 * XPSystem
 * - voegt XP toe
 * - controleert level-ups
 */
export class XPSystem {
  static addExperience(user: User, gainedXp: number, xpCurve: Record<string, number>): User {
    let newXp = user.experience + gainedXp;
    let newLevel = user.level;

    while (true) {
      const nextLevel = newLevel + 1;
      const required = xpCurve[String(nextLevel)];
      if (!required) break;
      if (newXp >= required) {
        newXp -= required;
        newLevel = nextLevel;
      } 
    }

    return {
      ...user,
      level: newLevel,
      experience: newXp
    };
  }
}
