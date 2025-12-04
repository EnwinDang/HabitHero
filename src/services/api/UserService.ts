import { db, ref, get } from "./firebase";

export async function getUser(uid: string) {
  const snapshot = await get(ref(db, `users/${uid}`));

  if (!snapshot.exists()) return null;

  return snapshot.val();
}
