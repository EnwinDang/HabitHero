/**
 * World completion messages and animations
 * Maps world IDs to their completion quotes, animations, and next world unlocks
 */

// Import background images
import worldFireBg from '@/assets/worlds/world_fire.png';
import worldWaterBg from '@/assets/worlds/world_water.png';
import worldEarthBg from '@/assets/worlds/world_earth.png';
import worldWindBg from '@/assets/worlds/world_wind.png';

export const WORLD_ENDINGS = {
  world_1: {
    quote: "All fires fade. What is forged remains.",
    animation: "forge-collapse",
    nextWorld: "world_2",
  },
  world_2: {
    quote: "In the deepest freeze, strength is born.",
    animation: "ice-shatter",
    nextWorld: "world_3",
  },
  world_3: {
    quote: "From stone and soil, legends rise.",
    animation: "earth-quake",
    nextWorld: "world_4",
  },
  world_4: {
    quote: "Through the storm, you stand unbroken.",
    animation: "lightning-strike",
    nextWorld: undefined, // Last world
  },
  // Fallback for worlds without specific endings
  default: {
    quote: "All fires fade. What is forged remains.",
    animation: "default",
    nextWorld: undefined,
  },
} as const;

/**
 * Get world ending data by world ID
 */
export function getWorldEnding(worldId: string) {
  return WORLD_ENDINGS[worldId as keyof typeof WORLD_ENDINGS] || WORLD_ENDINGS.default;
}

/**
 * Get world ending quote by world ID
 */
export function getWorldEndingQuote(worldId: string): string {
  return getWorldEnding(worldId).quote;
}

/**
 * Get background image for a world by world ID
 * Returns the imported image path or undefined if not found
 * 
 * Mapping:
 *   world_1 -> fire (Blazing Forge)
 *   world_2 -> water (Abyssal Tides)
 *   world_3 -> earth (Verdant Depths)
 *   world_4 -> wind (Skyreach Expanse)
 * 
 * Usage:
 *   const bgImage = getWorldBackground(world.worldId);
 *   style={{ backgroundImage: bgImage ? `url(${bgImage})` : 'none' }}
 */
export function getWorldBackground(worldId: string): string | undefined {
  const backgrounds: Record<string, string> = {
    world_1: worldFireBg,
    world_2: worldWaterBg,
    world_3: worldEarthBg,
    world_4: worldWindBg,
  };
  return backgrounds[worldId];
}

