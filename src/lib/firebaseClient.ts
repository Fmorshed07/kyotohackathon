import { initializeApp, getApp, getApps, type FirebaseApp } from "firebase/app";
import { getAnalytics, isSupported, type Analytics } from "firebase/analytics";
import {
  browserLocalPersistence,
  getAuth,
  setPersistence,
  type Auth,
} from "firebase/auth";
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
  const required = [
    "apiKey",
    "authDomain",
    "projectId",
    "storageBucket",
    "messagingSenderId",
    "appId",
  ] as const;

  const missing = required.filter((key) => !firebaseConfig[key]);
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
let authPersistenceReady: Promise<void> | null = null;

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
  const auth = getAuth(getAppInstance());
  if (typeof window !== "undefined" && !authPersistenceReady) {
    authPersistenceReady = setPersistence(auth, browserLocalPersistence).catch(() => {
      // Fall back to default in-memory persistence if local storage is blocked.
    });
  }
  firebaseAuth = auth;
  return firebaseAuth;
};

/** Resolves once auth persistence has been configured (best-effort). */
export const ensureAuthPersistence = (): Promise<void> => {
  getFirebaseAuth();
  return authPersistenceReady ?? Promise.resolve();
};

export const getFirestoreDb = (): Firestore => {
  if (firebaseDb) return firebaseDb;
  firebaseDb = getFirestore(getAppInstance());
  return firebaseDb;
};

export const getFirebaseStorage = (): FirebaseStorage => {
  if (firebaseStorage) return firebaseStorage;
  const app = getAppInstance();
  const bucket = firebaseConfig.storageBucket?.trim();
  // Bind the configured bucket explicitly (*.firebasestorage.app names need this).
  firebaseStorage = bucket ? getStorage(app, `gs://${bucket}`) : getStorage(app);
  return firebaseStorage;
};

export const getFirebaseProjectId = () => firebaseConfig.projectId?.trim() || "";
export const getFirebaseStorageBucket = () => firebaseConfig.storageBucket?.trim() || "";
