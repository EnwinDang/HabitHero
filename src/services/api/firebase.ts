import { initializeApp } from "firebase/app";
import { 
  getDatabase, 
  ref, get, set, update, remove, push 
} from "firebase/database";

import {
  getAuth,
  GoogleAuthProvider,
} from "firebase/auth";

// Firebase config van jouw project
const firebaseConfig = {
  apiKey: "AIzaSyCyWMNSFXZJfq40U1PomrRA4D_S_HYOlKA",
  authDomain: "habithero-73d98.firebaseapp.com",
  databaseURL: "https://habithero-73d98-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "habithero-73d98",
  storageBucket: "habithero-73d98.appspot.com",
  messagingSenderId: "63808260264",
  appId: "1:63808260264:web:fcbfe863fc8011ab2a1a9d"
};

// ------------ INIT FIREBASE -----------
export const app = initializeApp(firebaseConfig);

// ------------ DATABASE ---------------
export const db = getDatabase(app);

// ------------ AUTHENTICATION ----------
export const auth = getAuth(app);

// Google Login Provider
export const googleProvider = new GoogleAuthProvider();

// ------------ EXPORTS -----------------
export { ref, get, set, update, remove, push };
