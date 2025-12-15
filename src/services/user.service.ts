import { UsersAPI } from "../api/users.api";
import type { User } from "../models/user.model";
import type { Inventory, EquippedItems } from "../models/inventory.model";
import type { UserAchievementProgress } from "../models/achievement.model";

export async function getUserProfile(uid: string): Promise<{
  user: User;
  inventory: Inventory;
  equipped: EquippedItems;
  achievements: UserAchievementProgress[];
}> {
  const [user, inventory, equipped, achievements] = await Promise.all([
    UsersAPI.get(uid),
    UsersAPI.getInventory(uid),
    UsersAPI.getEquipped(uid),
    UsersAPI.getAchievementProgress(uid),
  ]);

  return { user, inventory, equipped, achievements };
}

export async function updateUser(uid: string, patch: Partial<User>): Promise<User> {
  return UsersAPI.patch(uid, patch);
}
