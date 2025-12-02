export interface Lootbox {
  id: string;               // common_box, epic_box, ...
  boxName: string;
  tier: string;             // common / epic / legendary
  goldCost: number;
  dropRates: Record<string, number>;   // category -> kans (weapon/armor/pet/...)
  rarityRates: Record<string, number>; // rarity -> kans
}
