import type { ElementType } from "./Item";
import type { Stage } from "./Stage";

export interface World {
  id: string;                   // world_1
  worldName: string;            // "Blazing Realm"
  elementTheme: ElementType;
  stages: Record<string, Stage>; // "1" -> Stage
}
