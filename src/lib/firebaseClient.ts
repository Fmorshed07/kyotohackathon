import { initializeApp, getApp, getApps, type FirebaseApp } from "firebase/app";
import { getAnalytics, type Analytics } from "firebase/analytics";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCtMqnY6NDGos70k-BHWAcMd5e-32Y7KRo",
  authDomain: "hackathon-tokyo.firebaseapp.com",
  projectId: "hackathon-tokyo",
  storageBucket: "hackathon-tokyo.firebasestorage.app",
  messagingSenderId: "89134934761",
  appId: "1:89134934761:web:58e4914e9da2d9bafade78",
  measurementId: "G-QRH98V86BC",
};

let firebaseApp: FirebaseApp | null = null;
let firebaseAnalytics: Analytics | null = null;
let firebaseAuth: Auth | null = null;
let firebaseDb: Firestore | null = null;

function getAppInstance(): FirebaseApp {
  if (firebaseApp) return firebaseApp;
  firebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);
  return firebaseApp;
}

export const getFirebaseApp = getAppInstance;

export function getFirebaseAnalytics(): Analytics {
  if (firebaseAnalytics) return firebaseAnalytics;
  firebaseAnalytics = getAnalytics(getAppInstance());
  return firebaseAnalytics;
}

export const getFirebaseAuth = (): Auth => {
  if (firebaseAuth) return firebaseAuth;
  firebaseAuth = getAuth(getAppInstance());
  return firebaseAuth;
};

export const getFirestoreDb = (): Firestore => {
  if (firebaseDb) return firebaseDb;
  firebaseDb = getFirestore(getAppInstance());
  return firebaseDb;
};
