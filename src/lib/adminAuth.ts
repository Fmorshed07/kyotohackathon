import { createUserWithEmailAndPassword, signInWithEmailAndPassword, type Auth } from "firebase/auth";
import { doc, setDoc, type Firestore } from "firebase/firestore";
import type { PortalRole } from "@/types/portal";

const ADMIN_USERNAME = import.meta.env.VITE_ADMIN_USERNAME?.trim() || "admin";
const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD?.trim() || "";

/** Hidden Firebase Auth email — not configured by users. */
export const getInternalAdminEmail = () => {
  const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID?.trim() || "hackathon-tokyo";
  return `portal-admin.${projectId}@firebase.app`;
};

export const isInternalAdminEmail = (email: string) =>
  email.trim().toLowerCase() === getInternalAdminEmail().toLowerCase();

export const normalizePortalRole = (value: unknown): PortalRole | undefined => {
  if (typeof value !== "string") return undefined;
  const normalized = value.trim().toLowerCase();
  if (normalized === "judge" || normalized === "judges") return "judge";
  if (normalized === "mentor" || normalized === "mentors") return "mentor";
  if (normalized === "participant" || normalized === "participants") return "participant";
  if (normalized === "admin" || normalized === "admins") return "admin";
  return undefined;
};

export const isReservedAdminUsername = (value: string) =>
  value.trim().toLowerCase() === ADMIN_USERNAME.toLowerCase();

export const validateReservedAdminCredentials = (username: string, password: string) =>
  isReservedAdminUsername(username) && ADMIN_PASSWORD.length > 0 && password === ADMIN_PASSWORD;

export const signInOrCreateReservedAdmin = async (auth: Auth, email: string, password: string) => {
  try {
    await createUserWithEmailAndPassword(auth, email, password);
  } catch (error: unknown) {
    const code =
      typeof error === "object" && error && "code" in error
        ? String((error as { code?: string }).code)
        : "";

    if (code === "auth/email-already-in-use") {
      await signInWithEmailAndPassword(auth, email, password);
      return;
    }

    throw error;
  }
};

export const loginWithReservedAdminCredentials = async (
  auth: Auth,
  db: Firestore,
  username: string,
  password: string,
) => {
  if (!validateReservedAdminCredentials(username, password)) {
    throw new Error("Invalid admin username or password.");
  }

  const internalEmail = getInternalAdminEmail();
  await signInOrCreateReservedAdmin(auth, internalEmail, ADMIN_PASSWORD);

  const user = auth.currentUser;
  if (!user) {
    throw new Error("Admin sign-in failed. Please try again.");
  }

  await ensureAdminUserRecord(db, user.uid);
};

export const ensureAdminUserRecord = async (db: Firestore, uid: string) => {
  await setDoc(
    doc(db, "users", uid),
    {
      email: ADMIN_USERNAME,
      role: "admin",
    },
    { merge: true },
  );
};
