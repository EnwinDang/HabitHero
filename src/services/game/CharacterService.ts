export function createNewPlayer(uid: string) {
  return {
    userId: uid,
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

    equipped: {
      weaponId: null,
      helmetId: null,
      chestplateId: null,
      pantsId: null,
      bootsId: null,
      accessoryId: null,
      petId: null
    },

    createdAt: Date.now()
  };
}
