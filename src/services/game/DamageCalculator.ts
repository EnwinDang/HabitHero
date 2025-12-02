import type { PlayerStats } from "../../models/PlayerStats";
import type { Monster } from "../../models/Monster";
import type { ElementType } from "../../models/Item";

export interface CombatContext {
  player: PlayerStats;
  monster: Monster;
  playerElement: ElementType;
  monsterElement: ElementType;
  elementMatrix: Record<string, Record<string, number>>;
  critBaseChance: number;
  critBaseDamage: number;
}

/**
 * DamageCalculator
 * - berekent basis damage, element bonus, crit, defense reduction
 * - deze functie is pure en kan makkelijk getest worden
 */
export class DamageCalculator {
  static calculatePlayerHit(ctx: CombatContext): { damage: number; isCrit: boolean; elementMultiplier: number } {
    const { player, monster, playerElement, monsterElement, elementMatrix, critBaseChance, critBaseDamage } = ctx;

    const base = player.damage;
    const elementMultiplier =
      elementMatrix[playerElement]?.[monsterElement] !== undefined
        ? elementMatrix[playerElement][monsterElement]
        : 1;

    const critChance = critBaseChance + player.critChance;
    const isCrit = Math.random() < critChance;
    const critMultiplier = isCrit ? (critBaseDamage + player.critDamage) : 1;

    // simpele defense reductie
    const defenseFactor = 1 - 0.07; // 7% reduction baseline
    const rawDamage = base * elementMultiplier * critMultiplier * defenseFactor;

    const damage = Math.max(1, Math.round(rawDamage));
    return { damage, isCrit, elementMultiplier };
  }

  static calculateMonsterHit(ctx: CombatContext): { damage: number; elementMultiplier: number } {
    const { player, monster, playerElement, monsterElement, elementMatrix } = ctx;
    const base = monster.baseDamage;

    const elementMultiplier =
      elementMatrix[monsterElement]?.[playerElement] !== undefined
        ? elementMatrix[monsterElement][playerElement]
        : 1;

    const defenseFactor = 1 - (player.defense * 0.01);
    const rawDamage = base * elementMultiplier * defenseFactor;
    const damage = Math.max(1, Math.round(rawDamage));
    return { damage, elementMultiplier };
  }
}
