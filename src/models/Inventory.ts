export interface Inventory {
  weapons: string[];        // item IDs
  helmets: string[];
  chestplates: string[];
  pants: string[];
  boots: string[];
  accessories: string[];
  pets: string[];           // pet IDs
  materials: Record<string, number>; // materialId -> quantity
  lootboxes?: Record<string, number>; // lootboxId -> quantity (optioneel)
}
