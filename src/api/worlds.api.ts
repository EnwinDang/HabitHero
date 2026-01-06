import { apiFetch } from "./client";
import type { World } from "../models/world.model";

// Mock data to replace missing backend
const MOCK_WORLDS: World[] = [
  {
    id: "world-fire",
    worldId: "world-fire",
    name: "Inferno Peaks",
    description: "A scorching realm of fire and ash. Only the brave survive.",
    element: "fire",
    order: 1,
    isActive: true
  },
  {
    id: "world-ice",
    worldId: "world-ice",
    name: "Frostguard Citadel",
    description: "Frozen wastelands where the wind bites sharper than steel.",
    element: "ice",
    order: 2,
    isActive: true
  },
  {
    id: "world-earth",
    worldId: "world-earth",
    name: "Stonehaven",
    description: "Ancient caverns and sturdy mountains protected by golems.",
    element: "earth",
    order: 3,
    isActive: true
  },
  {
    id: "world-storm",
    worldId: "world-storm",
    name: "Stormpeak",
    description: "A chaotic sky realm commanded by thunder and lightning.",
    element: "lightning",
    order: 4,
    isActive: true
  }
];

const MOCK_STAGES = Array.from({ length: 10 }, (_, i) => ({
  stage: i + 1,
  name: `Stage ${i + 1}`,
  description: "A challenging battle awaits."
}));

export const WorldsAPI = {
  list(): Promise<World[]> {
    // return apiFetch<World[]>("/worlds");
    return Promise.resolve(MOCK_WORLDS);
  },
  create(world: Partial<World>): Promise<World> {
    // return apiFetch<World>("/worlds", { method: "POST", body: JSON.stringify(world) });
    return Promise.resolve({ ...MOCK_WORLDS[0], ...world } as World);
  },
  get(worldId: string): Promise<World> {
    // return apiFetch<World>(`/worlds/${worldId}`);
    const world = MOCK_WORLDS.find(w => w.worldId === worldId);
    if (!world) throw new Error("World not found");
    return Promise.resolve(world);
  },
  replace(worldId: string, world: World): Promise<World> {
    return Promise.resolve(world);
  },
  patch(worldId: string, patch: Partial<World>): Promise<World> {
    const world = MOCK_WORLDS.find(w => w.worldId === worldId);
    if (!world) throw new Error("World not found");
    return Promise.resolve({ ...world, ...patch } as World);
  },
  delete(worldId: string): Promise<void> {
    return Promise.resolve();
  },

  stages(worldId: string): Promise<Record<string, any>[]> {
    // return apiFetch<Record<string, any>[]>(`/worlds/${worldId}/stages`);
    return Promise.resolve(MOCK_STAGES);
  },
};
