import type { User } from "../../models/User";

/**
 * MergeRequirement:
 *  duplicateCount: 2, goldCost: 500
 */
export interface MergeRequirement {
  duplicateCount: number;
  goldCost: number;
}

/**
 * MergeEngine
 * - combineert meerdere kopieën van een item in een hogere versie
 * - het is aan de caller om te beslissen welke itemIds voor plus1/plus2/plus3 staan
 */
export class MergeEngine {
  static canMerge(user: User, inventoryKey: keyof User["inventory"], baseItemId: string, req: MergeRequirement): boolean {
    const list = (user.inventory[inventoryKey] as string[]) || [];
    const count = list.filter(id => id === baseItemId).length;
    if (count < req.duplicateCount) return false;
    if (user.gold < req.goldCost) return false;
    return true;
  }

  static merge(
    user: User,
    inventoryKey: keyof User["inventory"],
    baseItemId: string,
    resultItemId: string,
    req: MergeRequirement
  ): User {
    if (!this.canMerge(user, inventoryKey, baseItemId, req)) {
      throw new Error("Cannot merge: requirements not met");
    }

    const list = ([...(user.inventory[inventoryKey] as string[])] || []) as string[];
    let removed = 0;
    const newList: string[] = [];

    for (const id of list) {
      if (id === baseItemId && removed < req.duplicateCount) {
        removed++;
        continue;
      }
      newList.push(id);
    }

    newList.push(resultItemId);

    return {
      ...user,
      gold: user.gold - req.goldCost,
      inventory: {
        ...user.inventory,
        [inventoryKey]: newList
      }
    };
  }
}
