import { auth } from "../services/api/firebase";
import { Navigate } from "react-router-dom";

export default function ProtectedRoute({ children }: any) {
  const user = auth.currentUser;

  if (!user) {
    return <Navigate to="/login" />;
  }

  return children;
}
