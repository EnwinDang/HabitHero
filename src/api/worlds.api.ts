import { apiFetch } from "./client";
import type { World } from "../models/world.model";

export const WorldsAPI = {
  list(): Promise<World[]> {
    return apiFetch<World[]>("/worlds");
  },
  create(world: World): Promise<World> {
    return apiFetch<World>("/worlds", {
      method: "POST",
      body: JSON.stringify(world),
    });
  },
  get(worldId: string): Promise<World> {
    return apiFetch<World>(`/worlds/${worldId}`);
  },
  replace(worldId: string, world: World): Promise<World> {
    return apiFetch<World>(`/worlds/${worldId}`, {
      method: "PUT",
      body: JSON.stringify(world),
    });
  },
  patch(worldId: string, patch: Partial<World>): Promise<World> {
    return apiFetch<World>(`/worlds/${worldId}`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    });
  },
  delete(worldId: string): Promise<void> {
    return apiFetch<void>(`/worlds/${worldId}`, { method: "DELETE" });
  },

  stages(worldId: string): Promise<Record<string, any>[]> {
    return apiFetch<Record<string, any>[]>(`/worlds/${worldId}/stages`);
  },
};
