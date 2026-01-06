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
  async list(): Promise<World[]> {
    try {
      return await apiFetch<World[]>("/worlds");
    } catch (error) {
      console.warn("Backend offline, using mock worlds data:", error);
      return Promise.resolve(MOCK_WORLDS);
    }
  },

  async create(world: Partial<World>): Promise<World> {
    try {
      return await apiFetch<World>("/worlds", {
        method: "POST",
        body: JSON.stringify(world)
      });
    } catch (error) {
      console.warn("Backend offline, using mock create:", error);
      return Promise.resolve({ ...MOCK_WORLDS[0], ...world } as World);
    }
  },

  async get(worldId: string): Promise<World> {
    try {
      return await apiFetch<World>(`/worlds/${worldId}`);
    } catch (error) {
      console.warn("Backend offline, using mock world:", error);
      const world = MOCK_WORLDS.find(w => w.worldId === worldId);
      if (!world) throw new Error("World not found");
      return Promise.resolve(world);
    }
  },

  async replace(worldId: string, world: World): Promise<World> {
    try {
      return await apiFetch<World>(`/worlds/${worldId}`, {
        method: "PUT",
        body: JSON.stringify(world)
      });
    } catch (error) {
      console.warn("Backend offline, using mock replace:", error);
      return Promise.resolve(world);
    }
  },

  async patch(worldId: string, patch: Partial<World>): Promise<World> {
    try {
      return await apiFetch<World>(`/worlds/${worldId}`, {
        method: "PATCH",
        body: JSON.stringify(patch)
      });
    } catch (error) {
      console.warn("Backend offline, using mock patch:", error);
      const world = MOCK_WORLDS.find(w => w.worldId === worldId);
      if (!world) throw new Error("World not found");
      return Promise.resolve({ ...world, ...patch } as World);
    }
  },

  async delete(worldId: string): Promise<void> {
    try {
      return await apiFetch<void>(`/worlds/${worldId}`, { method: "DELETE" });
    } catch (error) {
      console.warn("Backend offline, mock delete (no-op):", error);
      return Promise.resolve();
    }
  },

  async stages(worldId: string): Promise<Record<string, any>[]> {
    try {
      return await apiFetch<Record<string, any>[]>(`/worlds/${worldId}/stages`);
    } catch (error) {
      console.warn("Backend offline, using mock stages:", error);
      return Promise.resolve(MOCK_STAGES);
    }
  },
};
