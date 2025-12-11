import React, { createContext, useContext, useMemo, useReducer } from 'react';
import { mockCourse, mockExercises, mockModules, mockStudentDetails, mockStudentSummaries, mockTeacher } from '../data/mockData';
import { Exercise } from '../types/exercise';
import { Module } from '../types/module';
import { StudentDetail, StudentSummary } from '../types/student';
import { Teacher } from '../types/teacher';

interface AppState {
  isAuthenticated: boolean;
  teacher: Teacher | null;
  courseId: string;
  modules: Module[];
  exercises: Exercise[];
  students: StudentSummary[];
  studentDetails: Record<string, StudentDetail>;
}

type Action =
  | { type: 'LOGIN'; payload: Teacher }
  | { type: 'LOGOUT' }
  | { type: 'CREATE_MODULE'; payload: Module }
  | { type: 'UPDATE_MODULE'; payload: Module }
  | { type: 'CREATE_EXERCISE'; payload: Exercise }
  | { type: 'UPDATE_EXERCISE'; payload: Exercise }
  | { type: 'DELETE_EXERCISE'; payload: string };

interface AppStateContextValue extends AppState {
  login: (email: string, password: string) => void;
  register: (fullName: string, email: string, password: string) => void;
  logout: () => void;
  createModule: (module: Omit<Module, 'id'>) => void;
  updateModule: (module: Module) => void;
  createExercise: (exercise: Omit<Exercise, 'id'>) => void;
  updateExercise: (exercise: Exercise) => void;
  deleteExercise: (exerciseId: string) => void;
}

const AppStateContext = createContext<AppStateContextValue | undefined>(undefined);

const initialState: AppState = {
  isAuthenticated: false,
  teacher: null,
  courseId: mockCourse.id,
  modules: mockModules,
  exercises: mockExercises,
  students: mockStudentSummaries,
  studentDetails: mockStudentDetails
};

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'LOGIN':
      return { ...state, isAuthenticated: true, teacher: action.payload };
    case 'LOGOUT':
      return { ...state, isAuthenticated: false, teacher: null };
    case 'CREATE_MODULE': {
      const modules = [...state.modules, action.payload];
      return { ...state, modules };
    }
    case 'UPDATE_MODULE': {
      const modules = state.modules.map((m) => (m.id === action.payload.id ? action.payload : m));
      return { ...state, modules };
    }
    case 'CREATE_EXERCISE': {
      const exercises = [...state.exercises, action.payload];
      return { ...state, exercises };
    }
    case 'UPDATE_EXERCISE': {
      const exercises = state.exercises.map((e) => (e.id === action.payload.id ? action.payload : e));
      return { ...state, exercises };
    }
    case 'DELETE_EXERCISE': {
      const exercises = state.exercises.filter((e) => e.id !== action.payload);
      return { ...state, exercises };
    }
    default:
      return state;
  }
}

export const AppStateProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(reducer, initialState);

  const value = useMemo<AppStateContextValue>(
    () => ({
      ...state,
      login: () => dispatch({ type: 'LOGIN', payload: mockTeacher }),
      logout: () => dispatch({ type: 'LOGOUT' }),
      register: (fullName: string, email: string) =>
        dispatch({
          type: 'LOGIN',
          payload: { id: 'new-teacher', fullName: fullName || 'New Teacher', email }
        }),
      createModule: (module) => {
        const newModule: Module = {
          ...module,
          id: `m-${Date.now()}`,
          exerciseCount: module.exerciseCount ?? 0,
          averageCompletion: module.averageCompletion ?? 0
        };
        dispatch({ type: 'CREATE_MODULE', payload: newModule });
      },
      updateModule: (module) => dispatch({ type: 'UPDATE_MODULE', payload: module }),
      createExercise: (exercise) => {
        const newExercise: Exercise = { ...exercise, id: `e-${Date.now()}` };
        dispatch({ type: 'CREATE_EXERCISE', payload: newExercise });
      },
      updateExercise: (exercise) => dispatch({ type: 'UPDATE_EXERCISE', payload: exercise }),
      deleteExercise: (exerciseId: string) => dispatch({ type: 'DELETE_EXERCISE', payload: exerciseId })
    }),
    [state]
  );

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
};

export function useAppState(): AppStateContextValue {
  const ctx = useContext(AppStateContext);
  if (!ctx) {
    throw new Error('useAppState must be used within AppStateProvider');
  }
  return ctx;
}
