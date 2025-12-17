import {
  signInWithEmailAndPassword,
  signInWithPopup,
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signOut,
  updateProfile,
} from "firebase/auth";
import { auth } from "../../firebase";

const googleProvider = new GoogleAuthProvider();

/**
 * ✅ ONLY Firebase Auth - NO backend calls here
 * Backend /auth/me is called from AuthContext/HomePage
 */

export async function loginWithEmail(email: string, password: string): Promise<void> {
  await signInWithEmailAndPassword(auth, email, password);
}

export async function registerWithEmail(email: string, password: string, displayName?: string): Promise<void> {
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  
  // Update Firebase Auth profile with displayName if provided
  if (displayName && userCredential.user) {
    await updateProfile(userCredential.user, {
      displayName: displayName,
    });
  }
}

export async function loginWithGoogle(): Promise<void> {
  await signInWithPopup(auth, googleProvider);
}

export async function logout(): Promise<void> {
  await signOut(auth);
}
