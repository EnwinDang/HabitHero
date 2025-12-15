import {
  signInWithEmailAndPassword,
  signInWithPopup,
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signOut,
} from "firebase/auth";
import { auth } from "../../firebase";
import { AuthAPI } from "../../api/auth.api";
import type { User } from "../../models/user.model";

const googleProvider = new GoogleAuthProvider();

export async function loginWithEmail(email: string, password: string): Promise<User> {
  const cred = await signInWithEmailAndPassword(auth, email, password);
  await cred.user.getIdToken(true);
  return AuthAPI.me();
}

export async function registerWithEmail(email: string, password: string): Promise<User> {
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  await cred.user.getIdToken(true);
  return AuthAPI.me();
}

export async function loginWithGoogle(): Promise<User> {
  const cred = await signInWithPopup(auth, googleProvider);
  await cred.user.getIdToken(true);
  return AuthAPI.me();
}

export async function logout(): Promise<void> {
  await signOut(auth);
}

export async function getCurrentUser(): Promise<User | null> {
  if (!auth.currentUser) return null;
  return AuthAPI.me();
}
