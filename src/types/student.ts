export type StudentStatus = 'ahead' | 'on-track' | 'behind';

export interface StudentSummary {
  id: string;
  alias: string;
  xpLevel: number;
  exercisesCompleted: number;
  totalExercises: number;
  completionPercent: number;
  status: StudentStatus;
}

export interface StudentDetail {
  id: string;
  alias: string;
  xpLevel: number;
  completionPercent: number;
  status: StudentStatus;
  moduleProgress: Array<{
    moduleId: string;
    moduleName: string;
    completedExercises: number;
    totalExercises: number;
  }>;
  recentCompletions: Array<{
    exerciseTitle: string;
    moduleName: string;
    completedAt: string;
  }>;
}

