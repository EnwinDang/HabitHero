import {
  signInWithEmailAndPassword,
  signInWithPopup,
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signOut,
  updateProfile,
  reauthenticateWithCredential,
  reauthenticateWithPopup,
  EmailAuthProvider,
  User,
} from "firebase/auth";
import { auth } from "../../firebase";
import { UsersAPI } from "../../api/users.api";

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

/**
 * Re-authenticate user based on their provider
 */
export async function reauthenticateUser(
  user: User,
  password?: string
): Promise<void> {
  const providerId = user.providerData[0]?.providerId;

  if (providerId === "google.com") {
    // Re-authenticate with Google
    await reauthenticateWithPopup(user, googleProvider);
  } else if (providerId === "password" && password) {
    // Re-authenticate with email/password
    const email = user.email;
    if (!email) {
      throw new Error("User email not found");
    }
    const credential = EmailAuthProvider.credential(email, password);
    await reauthenticateWithCredential(user, credential);
  } else {
    throw new Error(
      "Re-authentication required. Please provide your password or use Google sign-in."
    );
  }
}

/**
 * Delete user account with cascading deletion
 * This calls the backend API which handles:
 * - Course enrollments
 * - User subcollections (tasks, achievements, inventory, notifications)
 * - User document
 * - Firebase Auth account
 */
export async function deleteAccount(password?: string): Promise<void> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error("No user logged in");
  }

  // IMPORTANT: Re-authenticate FIRST to validate password before deletion
  // This ensures password is correct before we proceed with deletion
  try {
    await reauthenticateUser(user, password);
  } catch (error: any) {
    // If re-authentication fails, the password is wrong or user cancelled
    if (error.code === "auth/wrong-password" || error.code === "auth/invalid-credential") {
      throw new Error("Incorrect password. Please try again.");
    }
    if (error.code === "auth/popup-closed-by-user" || error.code === "auth/cancelled-popup-request") {
      throw new Error("Authentication cancelled. Please try again.");
    }
    // Re-throw other auth errors
    throw error;
  }

  // Now that we've validated the password, proceed with deletion
  try {
    // Call the backend API to delete everything
    // The backend will handle all cascading deletion including Firebase Auth
    await UsersAPI.delete(user.uid);
    
    // IMPORTANT: Immediately sign out to prevent AuthContext from recreating the user document
    // The Firebase Auth account is deleted, but we need to clear the local session immediately
    // This prevents the race condition where AuthContext tries to recreate the document
    await signOut(auth);
    
    // Wait a moment to ensure auth state has updated
    await new Promise(resolve => setTimeout(resolve, 100));
  } catch (error: any) {
    // If deletion fails, re-throw the error
    throw error;
  }
}