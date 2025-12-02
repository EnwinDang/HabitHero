import type { ElementType } from "./Item";

export interface Skill {
  name: string;
  power?: number;
  element?: ElementType;
  multiplier?: number; // bv. 1.5 = 150% dmg
}
