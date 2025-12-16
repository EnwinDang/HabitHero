import {
  onAuthStateChanged,
  User as FirebaseUser,
} from "firebase/auth";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { auth } from "@/firebase";
import { AuthAPI } from "@/api/auth.api";
import { logout as authLogout } from "@/services/auth/auth.service";
import type { User } from "@/models/user.model";

interface AuthContextType {
  firebaseUser: FirebaseUser | null;
  user: User | null;
  loading: boolean;
  refreshUser: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch backend user when Firebase user changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      console.log("🔄 onAuthStateChanged:", fbUser?.uid || "logged out");
      setFirebaseUser(fbUser);

      if (!fbUser) {
        console.log("❌ No Firebase user");
        setUser(null);
        setLoading(false);
        return;
      }

      try {
        console.log("📡 Fetching /auth/me...");
        const me = await AuthAPI.me();
        console.log("✅ /auth/me success:", me.displayName);
        setUser(me);
      } catch (err) {
        console.error("❌ /auth/me failed:", err);
        setUser(null);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  async function refreshUser() {
    if (!auth.currentUser) {
      setUser(null);
      return;
    }
    try {
      console.log("🔄 Refreshing user...");
      const me = await AuthAPI.me();
      setUser(me);
      console.log("✅ User refreshed");
    } catch (err) {
      console.error("❌ Refresh failed:", err);
    }
  }

  async function logout() {
    await authLogout();
  }

  return (
    <AuthContext.Provider
      value={{
        firebaseUser,
        user,
        loading,
        refreshUser,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return ctx;
}
