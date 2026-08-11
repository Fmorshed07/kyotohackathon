import { initializeApp, getApp, getApps, type FirebaseApp } from "firebase/app";
import { getAnalytics, isSupported, type Analytics } from "firebase/analytics";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getStorage, type FirebaseStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

function assertFirebaseConfig(): void {
  const missing = Object.entries(firebaseConfig)
    .filter(([, value]) => !value)
    .map(([key]) => key);

  if (missing.length > 0) {
    throw new Error(
      `[Firebase] Missing environment variables: ${missing.join(", ")}. Configure them in .env.local.`,
    );
  }
}

let firebaseApp: FirebaseApp | null = null;
let firebaseAnalytics: Analytics | null = null;
let firebaseAuth: Auth | null = null;
let firebaseDb: Firestore | null = null;
let firebaseStorage: FirebaseStorage | null = null;

function getAppInstance(): FirebaseApp {
  if (firebaseApp) return firebaseApp;
  assertFirebaseConfig();
  firebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);
  return firebaseApp;
}

export const getFirebaseApp = getAppInstance;

export async function getFirebaseAnalytics(): Promise<Analytics | null> {
  if (firebaseAnalytics) return firebaseAnalytics;
  if (typeof window === "undefined") return null;
  const supported = await isSupported();
  if (!supported) return null;
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

export const getFirebaseStorage = (): FirebaseStorage => {
  if (firebaseStorage) return firebaseStorage;
  firebaseStorage = getStorage(getAppInstance());
  return firebaseStorage;
};
