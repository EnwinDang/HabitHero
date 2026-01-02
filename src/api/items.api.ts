import { apiFetch } from "./client";
import type { Item, ItemType, ItemRarity } from "../models/item.model";

export type ItemsQuery = {
  collection?: string;  
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
  list(query: ItemsQuery = {collection: "items_weapons"}): Promise<{data: Item[]}> {
    return apiFetch<{data: Item[]}>(`/items${qs(query)}`);
  },

  create(item: Item, collection: string): Promise<Item> {
    return apiFetch<Item>(`/items?collection=${collection}`, { method: "POST", body: JSON.stringify(item) });
  },

  get(itemId: string, collection: string): Promise<Item> {
   return apiFetch<Item>(`/items/${itemId}?collection=${collection}`);
  },

  replace(itemId: string, item: Item, collection: string): Promise<Item> {
    return apiFetch<Item>(`/items/${itemId}?collection=${collection}`, { method: "PUT", body: JSON.stringify(item) });
  },

  patch(itemId: string, patch: Partial<Item>, collection: string): Promise<Item> {
    return apiFetch<Item>(`/items/${itemId}?collection=${collection}`, { method: "PATCH", body: JSON.stringify(patch) });
  },

  delete(itemId: string, collection: string): Promise<void> {
    return apiFetch<void>(`/items/${itemId}?collection=${collection}`, { method: "DELETE" });
  },
};
