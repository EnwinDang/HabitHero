import { initializeApp } from "firebase/app";
import { getDatabase, ref, get, set, update, remove, push } from "firebase/database";

const firebaseConfig = {
  apiKey: "YOUR_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  databaseURL: "https://YOUR_PROJECT-default-rtdb.firebaseio.com",
  projectId: "YOUR_PROJECT",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "ID",
  appId: "APP_ID"
};

export const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);

export { ref, get, set, update, remove, push };
