import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAppState } from './context/AppStateContext';
import { TeacherLoginScreen } from './screens/Auth/TeacherLoginScreen';
import { TeacherRegisterScreen } from './screens/Auth/TeacherRegisterScreen';
import { DashboardScreen } from './screens/Dashboard/DashboardScreen';
import { ModulesScreen } from './screens/Modules/ModulesScreen';
import { ModuleDetailScreen } from './screens/Modules/ModuleDetailScreen';
import { ModuleFormScreen } from './screens/Modules/ModuleFormScreen';
import { ExerciseFormScreen } from './screens/Exercises/ExerciseFormScreen';
import { StudentProgressScreen } from './screens/Students/StudentProgressScreen';
import { StudentDetailScreen } from './screens/Students/StudentDetailScreen';
import { ProfileSettingsScreen } from './screens/Profile/ProfileSettingsScreen';
import { Layout } from './components/Layout';
import { TopBar } from './components/TopBar';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAppState();
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
};

const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAppState();
  return !isAuthenticated ? <>{children}</> : <Navigate to="/dashboard" replace />;
};

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<PublicRoute><TeacherLoginScreen /></PublicRoute>} />
        <Route path="/register" element={<PublicRoute><TeacherRegisterScreen /></PublicRoute>} />
        
        <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardScreen />} />
          <Route path="modules" element={<ModulesScreen />} />
          <Route path="modules/:moduleId" element={<ModuleDetailScreen />} />
          <Route path="modules/:moduleId/edit" element={<ModuleFormScreen />} />
          <Route path="modules/new" element={<ModuleFormScreen />} />
          <Route path="modules/:moduleId/exercises/:exerciseId/edit" element={<ExerciseFormScreen />} />
          <Route path="modules/:moduleId/exercises/new" element={<ExerciseFormScreen />} />
          <Route path="students" element={<StudentProgressScreen />} />
          <Route path="students/:studentId" element={<StudentDetailScreen />} />
          <Route path="profile" element={<ProfileSettingsScreen />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
