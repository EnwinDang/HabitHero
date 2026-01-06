import { apiFetch } from "./client";
import type { Lootbox, LootboxOpenResult } from "../models/lootbox.model";

export const LootboxesAPI = {
  list(): Promise<Lootbox[]> {
    return apiFetch<Lootbox[]>("/lootboxes");
  },
  create(lb: Lootbox): Promise<Lootbox> {
    return apiFetch<Lootbox>("/lootboxes", {
      method: "POST",
      body: JSON.stringify(lb),
    });
  },
  get(lootboxId: string): Promise<Lootbox> {
    return apiFetch<Lootbox>(`/lootboxes/${lootboxId}`);
  },
  replace(lootboxId: string, lb: Lootbox): Promise<Lootbox> {
    return apiFetch<Lootbox>(`/lootboxes/${lootboxId}`, {
      method: "PUT",
      body: JSON.stringify(lb),
    });
  },
  patch(lootboxId: string, patch: Partial<Lootbox>): Promise<Lootbox> {
    return apiFetch<Lootbox>(`/lootboxes/${lootboxId}`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    });
  },
  delete(lootboxId: string): Promise<void> {
    return apiFetch<void>(`/lootboxes/${lootboxId}`, { method: "DELETE" });
  },

  open(lootboxId: string, count = 1): Promise<LootboxOpenResult> {
    return apiFetch<LootboxOpenResult>(`/lootboxes/${lootboxId}/open`, {
      method: "POST",
      body: JSON.stringify({ count }),
    });
  },
};
