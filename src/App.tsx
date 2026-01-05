import { Routes, Route } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import HomePage from "./pages/HomePage";
import StudentLayout from "./pages/layouts/StudentLayout";
import { ProfilePage, FocusModePage, StatsPage, CalendarPage, AchievementsPage, SettingsPage, DailyTasksPage, LootboxesPage } from "./pages/student";
import ProtectedRoute from "./components/ProtectedRoute";
import { AuthProvider } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";
import { PomodoroProvider } from "./context/PomodoroProvider";

export default function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <PomodoroProvider>
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<LoginPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />

            {/* Student Dashboard Routes (Nested in StudentLayout) */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <StudentLayout />
                </ProtectedRoute>
              }
            >
              {/* Index route - default when visiting /dashboard */}
              <Route index element={<HomePage />} />

              {/* Nested student routes */}
              <Route path="profile" element={<ProfilePage />} />
              <Route path="focus" element={<FocusModePage />} />
              <Route path="stats" element={<StatsPage />} />
              <Route path="calendar" element={<CalendarPage />} />
              <Route path="achievements" element={<AchievementsPage />} />
              <Route path="settings" element={<SettingsPage />} />
              <Route path="daily-tasks" element={<DailyTasksPage />} />
              <Route path="lootboxes" element={<LootboxesPage />} />
            </Route>
          </Routes>
        </PomodoroProvider>
      </ThemeProvider>
    </AuthProvider>
  );
}
