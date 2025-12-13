import { apiFetch } from "./client";

export function startCombat(worldId: string, stage: number) {
  return apiFetch("/combat/start", {
    method: "POST",
    body: JSON.stringify({ worldId, stage }),
  });
}
