export interface Module {
  moduleId: string;
  courseId?: string;
  title: string;
  description?: string | null;
  order: number;
  achievementId?: string | null;
  isActive: boolean;
}
