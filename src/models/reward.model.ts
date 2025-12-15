import { ItemInstance } from "./item.model";

export interface RewardBreakdown {
  xpGained: number;
  goldGained: number;
  leveledUp: boolean;
  newLevel?: number;
  lootboxGranted?: string;
  itemsGranted?: ItemInstance[];
  achievementsUnlocked?: string[];
}