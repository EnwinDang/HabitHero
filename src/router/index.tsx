import { Routes, Route } from "react-router-dom";
import LoginPage from "../pages/LoginPage";
import RegisterPage from "../pages/RegisterPage";
import HomePage from "../pages/HomePage";
import AdminLayout from "../pages/layouts/AdminLayout";
import TeacherLayout from "../components/layout/TeacherLayout";
import ProtectedRoute from "../components/ProtectedRoute";

import StudentManagement from "../pages/admin/StudentManagement";
import TeacherManagement from "../pages/admin/TeacherManagement";
import AdminDashboard from "../pages/admin/AdminDashboard";
import CourseManagement from "../pages/admin/CourseManagement";
import WorldList from "@/pages/admin/WorldList";
import MonsterManagement from "@/pages/admin/MonsterManagement";
import ItemManagement from "../pages/admin/ItemManagement";
import TeacherDashboard from "../pages/teacher/Dashboard";
import TeacherCourses from "../pages/teacher/Courses";
import TeacherModules from "../pages/teacher/Modules";
import TeacherModuleDetail from "../pages/teacher/ModuleDetail";
import TeacherStudents from "../pages/teacher/Students";
import TeacherStudentDetail from "../pages/teacher/StudentDetail";
import TeacherProfile from "../pages/teacher/Profile";

export const AppRoutes = () => {
  return (
    <Routes>
      {/* Publieke Routes */}
      <Route path="/" element={<LoginPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      
      {/* Admin dashboard Routes */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <HomePage />
          </ProtectedRoute>
        }
      />

      {/* Admin Routes (Nested in AdminLayout) */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute>
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<AdminDashboard />} />
        <Route path="dashboard" element={<AdminDashboard />} />
        <Route path="students" element={<StudentManagement />} />
        <Route path="teachers" element={<TeacherManagement />} />
        <Route path="courses" element={<CourseManagement />} />
        <Route path="worlds" element={<WorldList />} />
        <Route path="monsters" element={<MonsterManagement/>} />
        <Route path="items" element={<ItemManagement />} />
      </Route>

      {/* Teacher Routes (Nested in TeacherLayout) */}
      <Route
        path="/teacher"
        element={
          <ProtectedRoute>
            <TeacherLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<TeacherDashboard />} />
        <Route path="dashboard" element={<TeacherDashboard />} />
        <Route path="courses" element={<TeacherCourses />} />
        <Route path="modules" element={<TeacherModules />} />
        <Route path="modules/:moduleId" element={<TeacherModuleDetail />} />
        <Route path="students" element={<TeacherStudents />} />
        <Route path="students/:studentId" element={<TeacherStudentDetail />} />
        <Route path="profile" element={<TeacherProfile />} />
      </Route>
    </Routes>
  );
};