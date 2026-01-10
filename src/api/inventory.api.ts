import { apiFetch } from "./client";
import { auth } from "../firebase";

export const InventoryAPI = {
  async get(): Promise<any> {
    const uid = auth.currentUser?.uid;
    if (!uid) throw new Error("User not authenticated");
  return apiFetch(`/users/${uid}/inventory`);
  },

  async equip(itemId: string, slot: string): Promise<any> {
    const uid = auth.currentUser?.uid;
    if (!uid) throw new Error("User not authenticated");
    return apiFetch(`/users/${uid}/equip`, {
      method: "POST",
      body: JSON.stringify({ itemId, slot }),
    });
  },

  async unequip(slot: string): Promise<any> {
    const uid = auth.currentUser?.uid;
    if (!uid) throw new Error("User not authenticated");
    return apiFetch(`/users/${uid}/unequip`, {
      method: "POST",
      body: JSON.stringify({ slot }),
    });
  },

  async sell(itemId: string, bonus?: Record<string, number> | null): Promise<any> {
    const uid = auth.currentUser?.uid;
    if (!uid) throw new Error("User not authenticated");
    return apiFetch(`/users/${uid}/inventory/sell`, {
      method: "POST",
      body: JSON.stringify({ itemId, bonus }),
    });
  },

  async getEquipped(): Promise<any> {
    const uid = auth.currentUser?.uid;
    if (!uid) throw new Error("User not authenticated");
    return apiFetch(`/users/${uid}/equipped`);
  },
};
