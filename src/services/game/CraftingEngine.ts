import type { User } from "../../models/User";
import type { Material } from "../../models/Material";

/**
 * CraftingRecipe shape:
 *  materials: { [materialId]: aantal }
 *  goldCost: number
 */
export interface CraftingRecipe {
  materials: Record<string, number>;
  goldCost: number;
}

/**
 * CraftingEngine
 * - checkt of user genoeg materialen en gold heeft
 * - trekt kosten af en geeft updated user terug
 */
export class CraftingEngine {
  static canCraft(user: User, recipe: CraftingRecipe): boolean {
    if (user.gold < recipe.goldCost) return false;
    const invMats = user.inventory.materials || {};
    for (const [matId, needed] of Object.entries(recipe.materials)) {
      const have = invMats[matId] ?? 0;
      if (have < needed) return false;
    }
    return true;
  }

  static craft(user: User, recipe: CraftingRecipe): User {
    if (!this.canCraft(user, recipe)) {
      throw new Error("Cannot craft: requirements not met");
    }
    const newMaterials: Record<string, number> = { ...user.inventory.materials };
    for (const [matId, needed] of Object.entries(recipe.materials)) {
      newMaterials[matId] = (newMaterials[matId] ?? 0) - needed;
    }
    return {
      ...user,
      gold: user.gold - recipe.goldCost,
      inventory: {
        ...user.inventory,
        materials: newMaterials
      }
    };
  }
}
