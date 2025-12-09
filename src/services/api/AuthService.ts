import { auth } from "../../firebaseConfig";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";

export const AuthService = {
  async login(email: string, pass: string) {
    try {
      await signInWithEmailAndPassword(auth, email, pass);
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  },

  async register(email: string, pass: string) {
    try {
      const user = await createUserWithEmailAndPassword(auth, email, pass);
      return { success: true, uid: user.user.uid };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }
};
