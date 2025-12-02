import type { User } from "../../models/User";
import type { Task } from "../../models/Task";

/**
 * RewardSystem
 * - Handelt rewards na een voltooide task of gevecht af
 */
export class RewardSystem {
  static applyTaskRewards(user: User, task: Task): User {
    const gold = user.gold + task.goldReward;
    // XP-level-up logica moet via XPSystem gebeuren (buiten deze klasse)
    return {
      ...user,
      gold
    };
  }

  static applyBattleRewards(user: User, baseGold: number): User {
    return {
      ...user,
      gold: user.gold + baseGold
    };
  }
}
