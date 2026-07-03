import { deleteDoc, deleteField, doc, getDoc, setDoc, type Firestore } from "firebase/firestore";
import { isInternalAdminEmail } from "@/lib/adminAuth";
import type { PortalRole } from "@/types/portal";

export type AdminGrantRecord = {
  email: string;
  grantedAt: string;
};

export type GrantAdminResult =
  | { status: "granted"; email: string; userId: string }
  | { status: "pending"; email: string }
  | { status: "already_admin"; email: string }
  | { status: "invalid_email"; email: string };

export const normalizeGrantEmail = (email: string) => email.trim().toLowerCase();

export const adminGrantDocId = (email: string) => normalizeGrantEmail(email);

const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

export async function grantAdminAccessByEmail(
  db: Firestore,
  email: string,
  findUserByEmail: (normalizedEmail: string) => { id: string; role: PortalRole } | undefined,
): Promise<GrantAdminResult> {
  const trimmed = email.trim();
  if (!isValidEmail(trimmed)) {
    return { status: "invalid_email", email: trimmed };
  }

  const normalized = normalizeGrantEmail(trimmed);

  if (isInternalAdminEmail(trimmed)) {
    return { status: "already_admin", email: trimmed };
  }

  const existing = findUserByEmail(normalized);
  if (existing) {
    if (existing.role === "admin") {
      return { status: "already_admin", email: trimmed };
    }

    await setDoc(
      doc(db, "users", existing.id),
      {
        role: "admin",
        email: trimmed,
        judgeApprovalStatus: deleteField(),
      },
      { merge: true },
    );

    await deleteDoc(doc(db, "admin_grants", adminGrantDocId(trimmed))).catch(() => {});
    return { status: "granted", email: trimmed, userId: existing.id };
  }

  await setDoc(doc(db, "admin_grants", adminGrantDocId(trimmed)), {
    email: trimmed,
    grantedAt: new Date().toISOString(),
  } satisfies AdminGrantRecord);

  return { status: "pending", email: trimmed };
}

export async function hasPendingAdminGrant(
  db: Firestore,
  email: string | null | undefined,
): Promise<boolean> {
  if (!email?.trim()) return false;
  const grantSnap = await getDoc(doc(db, "admin_grants", adminGrantDocId(email)));
  return grantSnap.exists();
}

export async function consumePendingAdminGrant(
  db: Firestore,
  email: string | null | undefined,
): Promise<boolean> {
  if (!email?.trim()) return false;
  const grantRef = doc(db, "admin_grants", adminGrantDocId(email));
  const grantSnap = await getDoc(grantRef);
  if (!grantSnap.exists()) return false;
  await deleteDoc(grantRef);
  return true;
}
