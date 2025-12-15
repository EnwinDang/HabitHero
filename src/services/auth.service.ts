// Legacy compatibility re-export. Prefer importing from "./auth/auth.service".
export {
  loginWithEmail,
  registerWithEmail,
  loginWithGoogle,
  logout,
  getCurrentUser,
} from "./auth/auth.service";
