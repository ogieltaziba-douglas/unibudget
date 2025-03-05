import { initializeApp } from "firebase/app";
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCRmRU2DEamakBQ0XPbBP5wpCSic3gf1X8",
  authDomain: "unibudget-f4825.firebaseapp.com",
  databaseURL: "https://unibudget-f4825-default-rtdb.firebaseio.com",
  projectId: "unibudget-f4825",
  storageBucket: "unibudget-f4825.firebasestorage.app",
  messagingSenderId: "705568140041",
  appId: "1:705568140041:web:b14e647d90adce026e81d8",
};

let app;
let auth;
let db;

export const initializeFirebase = () => {
  if (!app) {
    app = initializeApp(firebaseConfig);
  }
  if (!auth) {
    auth = initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage),
    });
  }
  if (!db) {
    db = getFirestore(app);
  }
  return { auth, db };
};
