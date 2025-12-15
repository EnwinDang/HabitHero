export interface World {
  worldId: string;
  name: string;
  description?: string | null;
  order: number;
  isActive: boolean;
}
