import { Routes, Route } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import HomePage from "./pages/HomePage";
import ProtectedRoute from "./components/ProtectedRoute";
import { AuthProvider } from "./context/AuthContext";
import TeacherLayout from "./components/layout/TeacherLayout";
import Dashboard from "./pages/teacher/Dashboard";
import Courses from "./pages/teacher/Courses";
import Modules from "./pages/teacher/Modules";
import ModuleDetail from "./pages/teacher/ModuleDetail";
import Students from "./pages/teacher/Students";
import StudentDetail from "./pages/teacher/StudentDetail";
import Profile from "./pages/teacher/Profile";

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <HomePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/teacher"
          element={
            <ProtectedRoute>
              <TeacherLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="courses" element={<Courses />} />
          <Route path="modules" element={<Modules />} />
          <Route path="courses/:courseId/modules" element={<Modules />} />
          <Route path="modules/:moduleId" element={<ModuleDetail />} />
          <Route path="students" element={<Students />} />
          <Route path="students/:studentId" element={<StudentDetail />} />
          <Route path="profile" element={<Profile />} />
        </Route>
      </Routes>
    </AuthProvider>
  );
}
