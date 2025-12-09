import { db } from "../../firebaseConfig";
import { ref, set } from "firebase/database";

export const UserService = {
  async createStarterUser(uid: string, username: string) {
    const starter = {
      username,
      level: 1,
      experience: 0,
      gold: 0,
      stamina: 100,
      maxStamina: 100,
      playerStats: {
        damage: 5,
        defense: 3,
        health: 100,
        critChance: 0.02,
        critDamage: 1.5
      },
      inventory: {
        weapons: [],
        helmets: [],
        chestplates: [],
        pants: [],
        boots: [],
        accessories: [],
        pets: [],
        materials: {}
      },
      currentWorld: "world_1",
      currentStage: 1,
      tasks: {},
      achievementProgress: {},
      battleHistory: {},
      createdAt: Date.now()
    };

    await set(ref(db, "users/" + uid), starter);
  }
};
