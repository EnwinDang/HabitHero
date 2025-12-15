import { apiFetch } from "./client";
import type { Item, ItemType, ItemRarity } from "../models/item.model";

export type ItemsQuery = {
  type?: ItemType;
  rarity?: ItemRarity;
  activeOnly?: boolean;
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

export const ItemsAPI = {
  list(query: ItemsQuery = {}): Promise<Item[]> {
    return apiFetch<Item[]>(`/items${qs(query)}`);
  },

  create(item: Item): Promise<Item> {
    return apiFetch<Item>("/items", { method: "POST", body: JSON.stringify(item) });
  },

  get(itemId: string): Promise<Item> {
    return apiFetch<Item>(`/items/${itemId}`);
  },

  replace(itemId: string, item: Item): Promise<Item> {
    return apiFetch<Item>(`/items/${itemId}`, { method: "PUT", body: JSON.stringify(item) });
  },

  patch(itemId: string, patch: Partial<Item>): Promise<Item> {
    return apiFetch<Item>(`/items/${itemId}`, { method: "PATCH", body: JSON.stringify(patch) });
  },

  delete(itemId: string): Promise<void> {
    return apiFetch<void>(`/items/${itemId}`, { method: "DELETE" });
  },
};
