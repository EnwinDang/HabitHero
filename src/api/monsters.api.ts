import { apiFetch } from "./client";
import type { Monster, MonsterTier } from "../models/monster.model";

export type MonstersQuery = {
  worldId?: string;
  tier?: MonsterTier;
};

function qs(params: Record<string, any>): string {
  const sp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v === undefined || v === null || v === "") return;
    sp.append(k, String(v));
  });
  const s = sp.toString();
  return s ? `?${s}` : "";
}

export const MonstersAPI = {
  list(query: MonstersQuery = {}): Promise<Monster[]> {
    return apiFetch<Monster[]>(`/monsters${qs(query)}`);
  },

  create(monster: Partial<Monster>): Promise<Monster> {
    return apiFetch<Monster>("/monsters", {
      method: "POST",
      body: JSON.stringify(monster)
    });
  },

  get(monsterId: string): Promise<Monster> {
    return apiFetch<Monster>(`/monsters/${monsterId}`);
  },

  replace(monsterId: string, m: Monster): Promise<Monster> {
    return apiFetch<Monster>(`/monsters/${monsterId}`, {
      method: "PUT",
      body: JSON.stringify(m)
    });
  },

  patch(monsterId: string, patch: Partial<Monster>): Promise<Monster> {
    return apiFetch<Monster>(`/monsters/${monsterId}`, {
      method: "PATCH",
      body: JSON.stringify(patch)
    });
  },

  delete(monsterId: string): Promise<void> {
    return apiFetch<void>(`/monsters/${monsterId}`, {
      method: "DELETE"
    });
  },
};
