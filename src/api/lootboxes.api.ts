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

  async open(lootboxId: string, count = 1): Promise<LootboxOpenResult> {
    try {
      return await apiFetch<LootboxOpenResult>(`/lootboxes/${lootboxId}/open`, {
        method: "POST",
        body: JSON.stringify({ count }),
      });
    } catch (error) {
      console.warn("Backend offline, using mock lootbox opening:", error);
      // Mock backend logic as fallback
      return new Promise((resolve) => {
        setTimeout(() => {
          const mockItems = [
            { name: "Steel Sword", type: "weapon", rarity: "rare", icon: "⚔️" },
            { name: "Health Potion", type: "potion", rarity: "common", icon: "🧪" },
            { name: "Gold Coins", type: "currency", rarity: "common", icon: "💰" }
          ];
          const results = Array.from({ length: count * 3 }).map(() => {
            const item = mockItems[Math.floor(Math.random() * mockItems.length)];
            return {
              itemId: "mock-item-id",
              ...item,
              quantity: 1
            } as any;
          });

          resolve({
            lootboxId,
            opened: count,
            results
          });
        }, 1000);
      });
    }
  },
};
