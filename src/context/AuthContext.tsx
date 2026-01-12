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
import { auth, db } from "@/firebase";
import { doc, onSnapshot, getDoc } from "firebase/firestore";
import { logout as authLogout } from "@/services/auth/auth.service";
import { AuthAPI } from "@/api/auth.api";
import type { User } from "@/models/user.model";

interface AuthContextType {
  firebaseUser: FirebaseUser | null;
  user: User | null;
  loading: boolean;
  refreshUser: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Helper function to call /auth/me endpoint to update login streak
async function updateUserFromBackend() {
  try {
    console.log("📞 Calling /auth/me to update login streak...");
    const result = await AuthAPI.me();
    console.log("✅ Login streak updated:", result.stats?.loginStreak);
  } catch (error) {
    console.error("❌ Error calling /auth/me:", error);
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Unified auth and user listener
  useEffect(() => {
    let unsubscribeFirestore: () => void;

    const unsubscribeAuth = onAuthStateChanged(auth, (fbUser) => {
      console.log("🔄 onAuthStateChanged:", fbUser?.uid || "logged out");
      setFirebaseUser(fbUser);

      if (fbUser) {
        // Call backend to update login streak immediately
        updateUserFromBackend();

        // Logged in: Set up Firestore listener
        const userRef = doc(db, "users", fbUser.uid);
        unsubscribeFirestore = onSnapshot(
          userRef,
          (snapshot) => {
            if (snapshot.exists()) {
              const userData = { uid: snapshot.id, ...snapshot.data() } as User;
              console.log("👤 AuthContext User Loaded:", userData.displayName);
              setUser(userData);
            } else {
              // User document doesn't exist - this can happen if:
              // 1. User just registered and document hasn't been created yet (will be created by /auth/me)
              // 2. Account was deleted but auth session is still active (will be cleared by auth state change)
              // 3. Document was manually deleted
              
              // Check if user is still authenticated before trying to create document
              // If auth state is about to change (user being logged out), don't create document
              const currentAuthUser = auth.currentUser;
              if (!currentAuthUser || currentAuthUser.uid !== fbUser.uid) {
                // User is no longer authenticated or different user - don't create document
                console.log("⚠️ User document not found, but user is no longer authenticated - skipping document creation");
                setUser(null);
                return;
              }
              
              // Try to create it via /auth/me endpoint (which creates the document if missing)
              console.log("⚠️ User document not found, attempting to create via /auth/me...");
              updateUserFromBackend().catch((err) => {
                console.warn("Could not create user document:", err);
                // If /auth/me fails, the user might have been deleted - clear the state
                setUser(null);
              });
            }
            setLoading(false);
          },
          (err) => {
            console.error("❌ AuthContext Firestore Error:", err);
            setLoading(false);
          }
        );
      } else {
        // Logged out
        if (unsubscribeFirestore) unsubscribeFirestore();
        setUser(null);
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeFirestore) unsubscribeFirestore();
    };
  }, []);

  async function refreshUser() {
    // No-op for realtime listener, but kept for interface compatibility
    // Could implement a manual getDoc if strictly needed, but snapshot handles updates.
    if (!firebaseUser) return;
    try {
      const userRef = doc(db, "users", firebaseUser.uid);
      const snapshot = await getDoc(userRef);
      if (snapshot.exists()) {
        setUser({ uid: snapshot.id, ...snapshot.data() } as User);
      }
    } catch (e) {
      console.error("Refresh failed", e);
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
