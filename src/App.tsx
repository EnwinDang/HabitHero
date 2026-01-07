import { AuthProvider } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";
import { PomodoroProvider } from "./context/PomodoroProvider";
import { AppRoutes } from "./router"; 

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <PomodoroProvider>
          <AppRoutes />
        </PomodoroProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
