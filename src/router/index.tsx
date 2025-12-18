import { Routes, Route } from "react-router-dom";
import LoginPage from "../pages/LoginPage";
import RegisterPage from "../pages/RegisterPage";
import HomePage from "../pages/HomePage";
import AdminLayout from "../pages/layouts/AdminLayout";
import ProtectedRoute from "../components/ProtectedRoute";

import StudentManagement from "../pages/admin/StudentManagement";
import TeacherManagement from "../pages/admin/TeacherManagement";
import AdminDashboard from "../pages/admin/AdminDashboard";
import CourseManagement from "../pages/admin/CourseManagement";
import WorldManagement from "../pages/admin/WorldManagement";
import WorldList from "@/pages/admin/worldlist";
import MonsterManagement from "@/pages/admin/MonsterManagement";
import GlobalSettings from "../pages/admin/GlobalSettings";
import ItemManagement from "../pages/admin/ItemManagement";

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
        <Route path="settings" element={<GlobalSettings />} />
      </Route>
    </Routes>
  );
};