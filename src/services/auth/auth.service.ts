import {
  signInWithEmailAndPassword,
  signInWithPopup,
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signOut,
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

export async function registerWithEmail(email: string, password: string): Promise<void> {
  await createUserWithEmailAndPassword(auth, email, password);
}

export async function loginWithGoogle(): Promise<void> {
  await signInWithPopup(auth, googleProvider);
}

export async function logout(): Promise<void> {
  await signOut(auth);
}
