import type { PlayerStats } from "./PlayerStats";
import type { Equipped } from "./Equipped";
import type { Inventory } from "./Inventory";
import type { Task } from "./Task";
import type { AIProfile } from "./AIProfile";
import type { BattleEntry } from "./BattleEntry";
import type { Settings } from "./Settings";

export interface User {
  id: string;                   // uid van Firebase Auth
  username: string;
  level: number;
  experience: number;
  gold: number;

  stamina: number;
  maxStamina: number;

  playerStats: PlayerStats;

  currentWorld: string;         // bv. "world_1"
  currentStage: number;         // bv. 4

  equipped: Equipped;
  inventory: Inventory;

  tasks: Record<string, Task>;                 // taskId -> Task
  achievementProgress: Record<string, boolean>; // achId -> completed
  battleHistory: BattleEntry[];

  settings: Settings;
  aiProfile: AIProfile;

  createdAt: number;            // Unix epoch
}
