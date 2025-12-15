import { ReactNode, useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { onAuthStateChanged, User as FirebaseUser } from "firebase/auth";
import { auth } from "@/firebase";

interface Props {
  children: ReactNode;
}

export default function ProtectedRoute({ children }: Props) {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // 🔄 Firebase is nog aan het checken
  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  // ❌ Niet ingelogd
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // ✅ Ingelogd
  return <>{children}</>;
}
