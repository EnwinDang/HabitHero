import {
  signInWithEmailAndPassword,
  signInWithPopup,
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signOut,
  updateProfile,
  deleteUser,
  reauthenticateWithCredential,
  reauthenticateWithPopup,
  EmailAuthProvider,
  User,
} from "firebase/auth";
import { auth, db } from "../../firebase";
import { doc, deleteDoc } from "firebase/firestore";

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

  // Try to delete, and if it requires recent login, re-authenticate first
  try {
    // Delete Firestore user document
    try {
      await deleteDoc(doc(db, "users", user.uid));
    } catch (error) {
      console.error("Error deleting user document:", error);
      // Continue with auth deletion even if Firestore deletion fails
    }

    // Delete Firebase Auth account
    await deleteUser(user);
  } catch (error: any) {
    // Check if error is due to requiring recent login
    if (error.code === "auth/requires-recent-login") {
      // Re-authenticate the user
      await reauthenticateUser(user, password);
      
      // Retry deletion after re-authentication
      try {
        await deleteDoc(doc(db, "users", user.uid));
      } catch (firestoreError) {
        console.error("Error deleting user document:", firestoreError);
        // Continue with auth deletion even if Firestore deletion fails
      }
      
      await deleteUser(user);
    } else {
      // Re-throw other errors
      throw error;
    }
  }
}