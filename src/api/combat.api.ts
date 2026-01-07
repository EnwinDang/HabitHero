import { apiFetch } from "./client";
import type { Combat } from "../models/combat.model";

export type StartCombatRequest = {
  worldId: string;
  stage: number;
  seed?: string;
};

export const CombatAPI = {
  start(body: StartCombatRequest): Promise<Combat> {
    return apiFetch<Combat>("/combat/start", {
      method: "POST",
      body: JSON.stringify(body),
    });
  },

  get(combatId: string): Promise<Combat> {
    return apiFetch<Combat>(`/combat/${combatId}`);
  },

  resolve(combatId: string): Promise<Combat> {
    return apiFetch<Combat>(`/combat/${combatId}/resolve`, { method: "POST" });
  },
};
