import type { Lootbox } from "../../models/Lootbox";

export interface LootboxRollResult {
  category: string;
  rarity: string;
}

/**
 * LootboxEngine
 * - bepaalt op basis van dropRates en rarityRates wat je ongeveer krijgt
 * - selectie van een concreet item gebeurt in de caller (op basis van categorie+rarity)
 */
export class LootboxEngine {
  static roll(lootbox: Lootbox): LootboxRollResult {
    const category = this.weightedRandom(lootbox.dropRates);
    const rarity = this.weightedRandom(lootbox.rarityRates);
    return { category, rarity };
  }

  private static weightedRandom(weights: Record<string, number>): string {
    const entries = Object.entries(weights);
    const total = entries.reduce((sum, [, w]) => sum + w, 0);
    const r = Math.random() * total;
    let acc = 0;
    for (const [key, w] of entries) {
      acc += w;
      if (r <= acc) return key;
    }
    return entries[entries.length - 1][0];
  }
}
