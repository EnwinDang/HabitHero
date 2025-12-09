import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyCyWMNSFXZJfq40U1PomrRA4D_S_HYOlKA",
  authDomain: "habithero-73d98.firebaseapp.com",
  databaseURL: "https://habithero-73d98-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "habithero-73d98",
  storageBucket: "habithero-73d98.firebasestorage.app",
  messagingSenderId: "63808260264",
  appId: "1:63808260264:web:fcbfe863fc8011ab2a1a9d",
  measurementId: "G-WVWY29BKQW"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

export const db = getDatabase(app);
export const auth = getAuth(app);
