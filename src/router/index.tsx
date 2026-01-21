import { Routes, Route, Navigate } from "react-router-dom";
import { lazy, Suspense } from "react";
import ProtectedRoute from "../components/ProtectedRoute";

// Loading component
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
      <p className="mt-4 text-gray-600">Laden...</p>
    </div>
  </div>
);

// Lazy load public pages
const LoginPage = lazy(() => import("../pages/LoginPage"));
const RegisterPage = lazy(() => import("../pages/RegisterPage"));
const PrivacyPolicyPage = lazy(() => import("../pages/PrivacyPolicyPage"));
const HomePage = lazy(() => import("../pages/HomePage"));

// Lazy load layouts
const AdminLayout = lazy(() => import("../pages/layouts/AdminLayout"));
const StudentLayout = lazy(() => import("../pages/layouts/StudentLayout"));
const TeacherLayout = lazy(() => import("../components/layout/TeacherLayout"));

// Lazy load admin pages
const StudentManagement = lazy(() => import("../pages/admin/StudentManagement"));
const TeacherManagement = lazy(() => import("../pages/admin/TeacherManagement"));
const AdminDashboard = lazy(() => import("../pages/admin/AdminDashboard"));
const CourseManagement = lazy(() => import("../pages/admin/CourseManagement"));
const WorldList = lazy(() => import("@/pages/admin/WorldList"));
const MonsterManagement = lazy(() => import("@/pages/admin/MonsterManagement"));
const ItemManagement = lazy(() => import("../pages/admin/ItemManagement"));

// Lazy load teacher pages
const TeacherDashboard = lazy(() => import("../pages/teacher/Dashboard"));
const TeacherCourses = lazy(() => import("../pages/teacher/Courses"));
const TeacherModules = lazy(() => import("../pages/teacher/Modules"));
const TeacherModuleDetail = lazy(() => import("../pages/teacher/ModuleDetail"));
const TeacherStudents = lazy(() => import("../pages/teacher/Students"));
const TeacherStudentDetail = lazy(() => import("../pages/teacher/StudentDetail"));
const TeacherProfile = lazy(() => import("../pages/teacher/Profile"));
const TeacherSubmissions = lazy(() => import("../pages/teacher/Submissions"));

// Lazy load student pages
const StudentHomePage = lazy(() => import("../pages/student/StudentHomePage"));
const DailyTasksPage = lazy(() => import("../pages/student/DailyTasksPage"));
const ProfilePage = lazy(() => import("../pages/student/ProfilePage"));
const StatsPage = lazy(() => import("../pages/student/StatsPage"));
const AchievementsPage = lazy(() => import("../pages/student/AchievementsPage"));
const SettingsPage = lazy(() => import("../pages/student/SettingsPage"));
const CalendarPage = lazy(() => import("../pages/student/CalendarPage"));
const FocusModePage = lazy(() => import("../pages/student/FocusModePage"));
const LootboxesPage = lazy(() => import("../pages/student/LootboxesPage"));
const InventoryPage = lazy(() => import("../pages/student/InventoryPage"));
const BattlePage = lazy(() => import("../pages/student/BattlePage"));
const WorldMapPage = lazy(() => import("../pages/student/WorldMapPage"));
const CoursesPage = lazy(() => import("../pages/student/CoursesPage"));
const SubmissionsPage = lazy(() => import("../pages/student/SubmissionsPage"));
const AutoBattlePage = lazy(() => import("../pages/student/AutoBattlePage"));

export const AppRoutes = () => {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* Publieke Routes */}
        <Route path="/" element={<LoginPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
        
        {/* Admin dashboard Routes */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Suspense fallback={<PageLoader />}>
                <HomePage />
              </Suspense>
            </ProtectedRoute>
          }
        />
        
        {/* Student Dashboard Battle Route */}
        <Route
          path="/dashboard/battle"
          element={
            <ProtectedRoute>
              <Suspense fallback={<PageLoader />}>
                <StudentLayout />
              </Suspense>
            </ProtectedRoute>
          }
        >
          <Route index element={<AutoBattlePage />} />
        </Route>

        {/* Admin Routes (Nested in AdminLayout) */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <Suspense fallback={<PageLoader />}>
                <AdminLayout />
              </Suspense>
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

        {/* Student Routes (Nested in StudentLayout) */}
        <Route
          path="/student"
          element={
            <ProtectedRoute>
              <Suspense fallback={<PageLoader />}>
                <StudentLayout />
              </Suspense>
            </ProtectedRoute>
          }
        >
          <Route index element={<StudentHomePage />} />
          <Route path="home" element={<StudentHomePage />} />
          <Route path="dashboard" element={<StudentHomePage />} />
          <Route path="daily-tasks" element={<DailyTasksPage />} />
          <Route path="courses-tasks">
            <Route index element={<DailyTasksPage />} />
            <Route path=":courseId" element={<DailyTasksPage />} />
          </Route>
          <Route path="profile" element={<ProfilePage />} />
          <Route path="stats" element={<StatsPage />} />
          <Route path="achievements" element={<AchievementsPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="calendar" element={<CalendarPage />} />
          <Route path="focus-mode" element={<FocusModePage />} />
          <Route path="lootboxes" element={<LootboxesPage />} />
          <Route path="inventory" element={<InventoryPage />} />
          <Route path="battle" element={<BattlePage />} />
          <Route path="world-map" element={<WorldMapPage />} />
          <Route path="courses" element={<CoursesPage />} />
          <Route path="submissions" element={<SubmissionsPage />} />
        </Route>

        {/* Teacher Routes (Nested in TeacherLayout) */}
        <Route
          path="/teacher"
          element={
            <ProtectedRoute>
              <Suspense fallback={<PageLoader />}>
                <TeacherLayout />
              </Suspense>
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
          <Route path="submissions" element={<TeacherSubmissions />} />
          <Route path="profile" element={<TeacherProfile />} />
        </Route>
      </Routes>
    </Suspense>
  );
};