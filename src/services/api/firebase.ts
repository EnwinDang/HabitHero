import { initializeApp } from "firebase/app";
import { getDatabase, ref, get, set, update, remove, push } from "firebase/database";

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

// Firebase initialiseren
export const app = initializeApp(firebaseConfig);

// Realtime Database initialiseren
export const db = getDatabase(app);

// Exporteer database functies
export { ref, get, set, update, remove, push };
