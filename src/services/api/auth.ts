import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";
import { db, ref, set } from "./firebase";
import { createNewPlayer } from "../game/CharacterService";

const auth = getAuth();

/** Register new user + create default character */
export async function register(email: string, password: string) {
  const userCred = await createUserWithEmailAndPassword(auth, email, password);
  const uid = userCred.user.uid;

  // Create level 1 character
  const playerData = createNewPlayer(uid);

  // Save to database
  await set(ref(db, `users/${uid}`), playerData);

  return uid;
}

/** Login using Firebase Auth */
export async function login(email: string, password: string) {
  const userCred = await signInWithEmailAndPassword(auth, email, password);
  return userCred.user.uid;
}

/** Listen to login status */
export function onAuthChange(callback: (uid: string | null) => void) {
  return auth.onAuthStateChanged((user) => {
    callback(user ? user.uid : null);
  });
}
