// src/services/combat.service.ts
import { CombatAPI } from "../api/combat.api";
import type { Combat } from "../models/combat.model";

export async function startCombatFlow(
  worldId: string,
  stage: number
): Promise<Combat> {
  return CombatAPI.start({ worldId, stage });
}

export async function resolveCombatFlow(
  combatId: string
): Promise<Combat> {
  return CombatAPI.resolve(combatId);
}
