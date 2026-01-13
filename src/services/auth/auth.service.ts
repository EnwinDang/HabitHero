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

export async function deleteAccount(password?: string): Promise<void> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error("No user logged in");
  }

  const providerId = user.providerData[0]?.providerId;

  // Re-authenticate before deletion (required for security)
  try {
    if (providerId === "google.com") {
      // Google users: re-authenticate with popup
      await reauthenticateWithPopup(user, googleProvider);
    } else if (providerId === "password") {
      // Email/password users: re-authenticate with password
      if (!password) {
        throw new Error("Password is required for account deletion");
      }
      const email = user.email;
      if (!email) {
        throw new Error("User email not found");
      }
      const credential = EmailAuthProvider.credential(email, password);
      await reauthenticateWithCredential(user, credential);
    } else {
      throw new Error("Unsupported authentication provider");
    }
  } catch (error: any) {
    // Handle specific re-authentication errors
    if (error.code === "auth/popup-closed-by-user" || error.code === "auth/cancelled-popup-request") {
      throw new Error("Authentication cancelled");
    } else if (error.code === "auth/wrong-password") {
      throw new Error("Incorrect password");
    } else if (error.code === "auth/user-mismatch") {
      throw new Error("Authentication failed");
    }
    throw error;
  }

  // Call backend API for cascading deletion
  try {
    await UsersAPI.delete(user.uid);
    console.log("✅ Account deleted successfully via backend API");
  } catch (error: any) {
    console.error("❌ Error deleting account via backend API:", error);
    throw new Error(error.message || "Failed to delete account");
  }

  // Sign out after successful deletion
  await signOut(auth);
}