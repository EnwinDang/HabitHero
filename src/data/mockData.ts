import { Course } from '../types/course';
import { Exercise } from '../types/exercise';
import { Module } from '../types/module';
import { StudentDetail, StudentSummary } from '../types/student';
import { Teacher } from '../types/teacher';

export const mockTeacher: Teacher = {
  id: 't1',
  fullName: 'Dr. Elise Martens',
  email: 'elise.martens@school.be'
};

export const mockCourse: Course = {
  id: 'c1',
  name: 'Programming Essentials 1',
  year: '2024-2025',
  program: 'Applied Computer Science',
  studentCount: 30
};

export const mockModules: Module[] = [
  {
    id: 'm1',
    courseId: 'c1',
    name: 'Module 1 – Introduction',
    description: 'Course overview, tools setup, and expectations.',
    exerciseCount: 3,
    averageCompletion: 82
  },
  {
    id: 'm2',
    courseId: 'c1',
    name: 'Module 2 – Variables',
    description: 'Working with variables, types, and simple IO.',
    exerciseCount: 5,
    averageCompletion: 58
  },
  {
    id: 'm3',
    courseId: 'c1',
    name: 'Module 3 – Control Flow',
    description: 'Conditionals and loops with practical labs.',
    exerciseCount: 6,
    averageCompletion: 41
  }
];

export const mockExercises: Exercise[] = [
  {
    id: 'e1',
    moduleId: 'm1',
    title: 'Course Logistics Quiz',
    description: 'Confirm understanding of course rules and deadlines.',
    difficulty: 'easy',
    recommendedDate: '2024-09-20',
    status: 'active',
    studentsCompleted: 27,
    studentsTotal: 30
  },
  {
    id: 'e2',
    moduleId: 'm2',
    title: 'Variables Basics',
    description: 'Declare, assign, and print variables.',
    difficulty: 'easy',
    recommendedDate: '2024-09-27',
    status: 'active',
    studentsCompleted: 24,
    studentsTotal: 30
  },
  {
    id: 'e3',
    moduleId: 'm2',
    title: 'Numeric Operations',
    description: 'Work with integers and floats in small challenges.',
    difficulty: 'medium',
    recommendedDate: '2024-10-02',
    status: 'active',
    studentsCompleted: 19,
    studentsTotal: 30,
    canvasLink: 'https://canvas.example.com/exercise/e3'
  },
  {
    id: 'e4',
    moduleId: 'm3',
    title: 'Loop Drills',
    description: 'Practice for-loops and while-loops.',
    difficulty: 'medium',
    recommendedDate: '2024-10-10',
    status: 'hidden',
    studentsCompleted: 6,
    studentsTotal: 30
  }
];

export const mockStudentSummaries: StudentSummary[] = [
  {
    id: 's1',
    alias: 'CodeWizard',
    xpLevel: 9,
    exercisesCompleted: 24,
    totalExercises: 40,
    completionPercent: 60,
    status: 'on-track'
  },
  {
    id: 's2',
    alias: 'LoopNinja',
    xpLevel: 11,
    exercisesCompleted: 30,
    totalExercises: 40,
    completionPercent: 75,
    status: 'ahead'
  },
  {
    id: 's3',
    alias: 'BugHunter',
    xpLevel: 7,
    exercisesCompleted: 18,
    totalExercises: 40,
    completionPercent: 45,
    status: 'behind'
  }
];

export const mockStudentDetails: Record<string, StudentDetail> = {
  s1: {
    id: 's1',
    alias: 'CodeWizard',
    xpLevel: 9,
    completionPercent: 60,
    status: 'on-track',
    moduleProgress: [
      { moduleId: 'm1', moduleName: 'Module 1 – Introduction', completedExercises: 3, totalExercises: 3 },
      { moduleId: 'm2', moduleName: 'Module 2 – Variables', completedExercises: 3, totalExercises: 5 },
      { moduleId: 'm3', moduleName: 'Module 3 – Control Flow', completedExercises: 1, totalExercises: 6 }
    ],
    recentCompletions: [
      { exerciseTitle: 'Variables Basics', moduleName: 'Variables', completedAt: '2024-10-14' },
      { exerciseTitle: 'Course Logistics Quiz', moduleName: 'Introduction', completedAt: '2024-09-21' }
    ]
  },
  s2: {
    id: 's2',
    alias: 'LoopNinja',
    xpLevel: 11,
    completionPercent: 75,
    status: 'ahead',
    moduleProgress: [
      { moduleId: 'm1', moduleName: 'Module 1 – Introduction', completedExercises: 3, totalExercises: 3 },
      { moduleId: 'm2', moduleName: 'Module 2 – Variables', completedExercises: 5, totalExercises: 5 },
      { moduleId: 'm3', moduleName: 'Module 3 – Control Flow', completedExercises: 2, totalExercises: 6 }
    ],
    recentCompletions: [
      { exerciseTitle: 'Numeric Operations', moduleName: 'Variables', completedAt: '2024-10-12' },
      { exerciseTitle: 'Variables Basics', moduleName: 'Variables', completedAt: '2024-10-08' }
    ]
  },
  s3: {
    id: 's3',
    alias: 'BugHunter',
    xpLevel: 7,
    completionPercent: 45,
    status: 'behind',
    moduleProgress: [
      { moduleId: 'm1', moduleName: 'Module 1 – Introduction', completedExercises: 2, totalExercises: 3 },
      { moduleId: 'm2', moduleName: 'Module 2 – Variables', completedExercises: 2, totalExercises: 5 },
      { moduleId: 'm3', moduleName: 'Module 3 – Control Flow', completedExercises: 0, totalExercises: 6 }
    ],
    recentCompletions: [
      { exerciseTitle: 'Course Logistics Quiz', moduleName: 'Introduction', completedAt: '2024-09-25' }
    ]
  }
};

