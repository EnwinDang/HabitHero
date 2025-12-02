import type { PlayerStats } from "../../models/PlayerStats";
import type { Monster } from "../../models/Monster";
import type { ElementType } from "../../models/Item";
import { DamageCalculator, CombatContext } from "./DamageCalculator";

export interface CombatResult {
  winner: "player" | "monster";
  turns: number;
  playerRemainingHp: number;
  monsterRemainingHp: number;
  log: string[];
}

export interface CombatSettings {
  elementMatrix: Record<string, Record<string, number>>;
  critBaseChance: number;
  critBaseDamage: number;

  // NEW
  playerMissChance: number;   // e.g. 0.05 = 5% kans dat player mist
  monsterMissChance: number;  // e.g. 0.08 = 8% kans dat monster mist
}

export class CombatEngine {
  static simulateBattle(
    playerStats: PlayerStats,
    monster: Monster,
    playerElement: ElementType,
    settings: CombatSettings
  ): CombatResult {
    
    let playerHp = playerStats.health;
    let monsterHp = monster.baseHealth;
    let turns = 0;
    const log: string[] = [];

    const ctxBase: Omit<CombatContext, "player" | "monster" | "playerElement" | "monsterElement"> = {
      elementMatrix: settings.elementMatrix,
      critBaseChance: settings.critBaseChance,
      critBaseDamage: settings.critBaseDamage
    };

    while (playerHp > 0 && monsterHp > 0 && turns < 100) {
      turns++;

      // ------------------------
      // PLAYER TURN
      // ------------------------

      // MISS CHANCE
      if (Math.random() < settings.playerMissChance) {
        log.push(`Turn ${turns}: Player MISSES the attack!`);
      } else {
        const playerCtx: CombatContext = {
          ...ctxBase,
          player: playerStats,
          monster,
          playerElement,
          monsterElement: monster.elementType
        };

        const playerHit = DamageCalculator.calculatePlayerHit(playerCtx);
        monsterHp -= playerHit.damage;

        log.push(
          `Turn ${turns}: Player hits ${monster.name} for ${playerHit.damage} (${playerHit.isCrit ? "CRIT" : "normal"})`
        );
      }

      if (monsterHp <= 0) break;

      // ------------------------
      // MONSTER TURN
      // ------------------------

      if (Math.random() < settings.monsterMissChance) {
        log.push(`Turn ${turns}: ${monster.name} MISSES the attack!`);
      } else {
        const monsterCtx: CombatContext = {
          ...ctxBase,
          player: playerStats,
          monster,
          playerElement,
          monsterElement: monster.elementType
        };

        const monsterHit = DamageCalculator.calculateMonsterHit(monsterCtx);
        playerHp -= monsterHit.damage;

        log.push(`Turn ${turns}: ${monster.name} hits player for ${monsterHit.damage}`);
      }
    }

    const winner: "player" | "monster" =
      playerHp > 0 && monsterHp <= 0 ? "player" : "monster";

    return {
      winner,
      turns,
      playerRemainingHp: Math.max(0, Math.round(playerHp)),
      monsterRemainingHp: Math.max(0, Math.round(monsterHp)),
      log
    };
  }
}
