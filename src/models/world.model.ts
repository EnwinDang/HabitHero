export interface World {
  id: string;
  worldId: string;
  name: string;
  description?: string | null;
  order: number;
  isActive: boolean;

  // Optional game fields used in admin UI
  element?: string | null;
  // Some pages reference an alternate field name
  elementType?: string | null;
  stages?: any[];
}
