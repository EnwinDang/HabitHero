export type Difficulty = 'easy' | 'medium' | 'hard';
export type ExerciseStatus = 'active' | 'hidden';

export interface Exercise {
  id: string;
  moduleId: string;
  title: string;
  description: string;
  difficulty: Difficulty;
  recommendedDate: string;
  status: ExerciseStatus;
  studentsCompleted: number;
  studentsTotal: number;
  canvasLink?: string;
}

