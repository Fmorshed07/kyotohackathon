import { createUserWithEmailAndPassword, signInWithEmailAndPassword, type Auth } from "firebase/auth";
import { doc, setDoc, type Firestore } from "firebase/firestore";
import type { PortalRole } from "@/types/portal";

const ADMIN_USERNAME = import.meta.env.VITE_ADMIN_USERNAME?.trim() || "admin";
const ADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAIL?.trim() || "admin@impactkyoto.com";

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

export const signInOrCreateReservedAdmin = async (auth: Auth, email: string, password: string) => {
  try {
    await createUserWithEmailAndPassword(auth, email, password);
    return;
  } catch (error: unknown) {
    const code =
      typeof error === "object" && error && "code" in error
        ? String((error as { code?: string }).code)
        : "";

    if (code === "auth/email-already-in-use") {
      try {
        await signInWithEmailAndPassword(auth, email, password);
      } catch (signInError: unknown) {
        const signInCode =
          typeof signInError === "object" && signInError && "code" in signInError
            ? String((signInError as { code?: string }).code)
            : "";

        if (signInCode === "auth/invalid-credential" || signInCode === "auth/wrong-password") {
          throw new Error(
            "Admin account already exists with a different password. Reset it in Firebase Console → Authentication.",
          );
        }

        throw signInError;
      }
      return;
    }

    throw error;
  }
};

export const resolveAdminSignInEmail = (usernameOrEmail: string) => {
  const trimmed = usernameOrEmail.trim();
  if (!trimmed) return "";
  if (isReservedAdminUsername(trimmed)) return ADMIN_EMAIL;
  return trimmed;
};

export const ensureAdminUserRecord = async (db: Firestore, uid: string, email: string) => {
  await setDoc(
    doc(db, "users", uid),
    {
      email,
      role: "admin",
    },
    { merge: true },
  );
};
