export interface World {
  id: string;
  worldId: string;
  name: string;
  description?: string | null;
  order: number;
  isActive: boolean;

  // Optional game fields used in admin UI
  element?: string | null;
  stages?: any[];
}
