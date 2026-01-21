import { apiFetch } from "./client";
import type { User, UserSettings } from "../models/user.model";
import type { Inventory, EquippedItems } from "../models/inventory.model";
import type { UserAchievementProgress } from "../models/achievement.model";
import type { Pet } from "../models/pet.model";

export type UsersQuery = {
  limit?: number;
  offset?: number;
  role?: "student" | "teacher" | "admin";
  status?: "active" | "disabled";
};

export type PatchUserRequest = Partial<
  Pick<User, "displayName" | "photoURL" | "role" | "status" | "heroType">
> & {
  settings?: Partial<UserSettings>;
  stats?: Partial<User["stats"]>;
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

export const UsersAPI = {
  list(query: UsersQuery = {}): Promise<{ pagination: any; data: User[] }> {
    return apiFetch(`/users${qs(query)}`);
  },

  create(user: User): Promise<User> {
    return apiFetch<User>("/users", {
      method: "POST",
      body: JSON.stringify(user),
    });
  },

  get(uid: string): Promise<User> {
    return apiFetch<User>(`/users/${uid}`);
  },

  replace(uid: string, user: User): Promise<User> {
    return apiFetch<User>(`/users/${uid}`, {
      method: "PUT",
      body: JSON.stringify(user),
    });
  },

  patch(uid: string, patch: PatchUserRequest): Promise<User> {
    return apiFetch<User>(`/users/${uid}`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    });
  },

  delete(uid: string): Promise<void> {
    return apiFetch<void>(`/users/${uid}`, { method: "DELETE" });
  },

  // Settings
  getSettings(uid: string): Promise<UserSettings> {
    return apiFetch<UserSettings>(`/users/${uid}/settings`);
  },

  patchSettings(
    uid: string,
    patch: Partial<UserSettings>
  ): Promise<UserSettings> {
    return apiFetch<UserSettings>(`/users/${uid}/settings`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    });
  },

  // Inventory / Equipped
  getInventory(uid: string): Promise<Inventory> {
    return apiFetch<Inventory>(`/users/${uid}/inventory`);
  },

  patchInventory(uid: string, patch: Partial<Inventory>): Promise<Inventory> {
    return apiFetch<Inventory>(`/users/${uid}/inventory`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    });
  },

  getEquipped(uid: string): Promise<EquippedItems> {
    return apiFetch<EquippedItems>(`/users/${uid}/equipped`);
  },

  patchEquipped(
    uid: string,
    patch: Partial<EquippedItems>
  ): Promise<EquippedItems> {
    return apiFetch<EquippedItems>(`/users/${uid}/equipped`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    });
  },

  // Achievements progress
  getAchievementProgress(uid: string): Promise<UserAchievementProgress[]> {
    return apiFetch<UserAchievementProgress[]>(`/users/${uid}/achievements`);
  },

  getAchievement(
    uid: string,
    achievementId: string
  ): Promise<UserAchievementProgress> {
    return apiFetch<UserAchievementProgress>(
      `/users/${uid}/achievements/${achievementId}`
    );
  },

  claimAchievement(
    uid: string,
    achievementId: string
  ): Promise<{
    success: boolean;
    rewards: { xp: number; gold: number };
    leveledUp: boolean;
    newLevel: number;
    levelUpRewards?: any;
  }> {
    return apiFetch<{
      success: boolean;
      rewards: { xp: number; gold: number };
      leveledUp: boolean;
      newLevel: number;
      levelUpRewards?: any;
    }>(`/users/${uid}/achievements/${achievementId}/claim`, {
      method: "POST",
    });
  },

  // Pets owned
  getPets(uid: string): Promise<Pet[]> {
    return apiFetch<Pet[]>(`/users/${uid}/pets`);
  },

  addPet(uid: string, petId: string): Promise<void> {
    return apiFetch<void>(`/users/${uid}/pets`, {
      method: "POST",
      body: JSON.stringify({ petId }),
    });
  },

  addLootboxToInventory(
    uid: string,
    lootboxId: string,
    quantity = 1
  ): Promise<{ success: boolean; lootboxId: string; quantity: number; totalLootboxes: number }> {
    return apiFetch(`/users/${uid}/inventory/add-lootbox`, {
      method: "POST",
      body: JSON.stringify({ lootboxId, quantity }),
    });
  },

  removePet(uid: string, petId: string): Promise<void> {
    return apiFetch<void>(`/users/${uid}/pets`, {
      method: "DELETE",
      body: JSON.stringify({ petId }),
    });
  },

  // Focus Session - complete a focus session and get XP reward from backend
  completeFocusSession(
    uid: string,
    durationMinutes: number
  ): Promise<{
    xpGained: number;
    newXp: number;
    newLevel: number;
    leveledUp: boolean;
  }> {
    return apiFetch<{
      xpGained: number;
      newXp: number;
      newLevel: number;
      leveledUp: boolean;
    }>(`/users/${uid}/focus-session`, {
      method: "POST",
      body: JSON.stringify({ durationMinutes }),
    });
  },

  // Stamina
  getStamina(uid: string): Promise<{
    currentStamina: number;
    maxStamina: number;
    regenerationRate: number;
    nextRegenIn: number;
    timeUntilFull: number;
    canBattle: boolean;
  }> {
    return apiFetch(`/users/${uid}/stamina`);
  },

  consumeStamina(
    uid: string,
    amount: number
  ): Promise<{
    success: boolean;
    staminaBefore: number;
    staminaAfter: number;
    currentStamina: number;
  }> {
    return apiFetch(`/users/${uid}/stamina/consume`, {
      method: "POST",
      body: JSON.stringify({ amount }),
    });
  },
};
