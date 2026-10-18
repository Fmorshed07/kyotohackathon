import type { User } from "firebase/auth";
import { collection, doc, getDocs, limit, query, runTransaction, where, type Firestore } from "firebase/firestore";
import { getFirebaseAuth } from "@/lib/firebaseClient";
import { isHackathonId, normalizeHackathonIds } from "@/lib/hackathons";

export const PARTICIPANT_REGISTRATIONS_COLLECTION = "participant_registrations";

const normalizeEmail = (value: string | null | undefined) => value?.trim().toLowerCase() ?? "";
const participantRole = (value: unknown) => typeof value === "string" && ["participant", "participants"].includes(value.trim().toLowerCase());

function approvedRegistration(data: Record<string, unknown> | undefined, email: string) {
  if (!data || data.approval_status !== "approved" || data.source !== "luma"
    || typeof data.email !== "string" || normalizeEmail(data.email) !== email
    || typeof data.hackathon_id !== "string" || !isHackathonId(data.hackathon_id.trim())) return null;
  return {
    hackathonId: data.hackathon_id.trim(),
  };
}

/** Claim approved private registrations for the current verified Firebase identity. */
export async function claimImportedParticipantEnrollment(
  db: Firestore,
  user: User,
  isCurrent: () => boolean = () => true,
): Promise<boolean> {
  const email = normalizeEmail(user.email);
  if (!user.uid || user.emailVerified !== true || !email || !isCurrent()) return false;
  const auth = getFirebaseAuth();
  const originalUser = auth.currentUser;
  const current = () => isCurrent() && originalUser !== null && auth.currentUser === originalUser
    && originalUser.uid === user.uid && originalUser.emailVerified === true && normalizeEmail(originalUser.email) === email;
  if (!current()) return false;

  // Only the verified owner may query these private records; never use profile emails.
  const registrations = await getDocs(query(
    collection(db, PARTICIPANT_REGISTRATIONS_COLLECTION), where("email", "==", email), limit(100),
  ));
  if (!current()) return false;
  const matches = registrations.docs.filter(entry => approvedRegistration(entry.data(), email));
  if (!matches.length) return false;

  return runTransaction(db, async transaction => {
    if (!current()) return false;
    const userRef = doc(db, "users", user.uid);
    const profile = await transaction.get(userRef);
    if (!current() || !profile.exists()) return false;
    const data = profile.data();
    if (!participantRole(data.role)) return false;

    // Re-read matches inside the transaction so a changed/revoked import cannot
    // be claimed from an earlier query result. Finish every read before writing.
    const currentRegistrations = await Promise.all(matches.map(entry => transaction.get(entry.ref)));
    if (!current()) return false;
    const approved = currentRegistrations.flatMap(entry => {
      const registration = entry.exists() ? approvedRegistration(entry.data(), email) : null;
      return registration ? [registration] : [];
    });
    if (!approved.length) return false;

    const existingIds = normalizeHackathonIds(data.hackathon_ids, data.hackathon_id);
    const primary = typeof data.hackathon_id === "string" && isHackathonId(data.hackathon_id.trim())
      ? data.hackathon_id.trim() : existingIds[0] ?? approved[0].hackathonId;
    // Preserve a legacy primary even when an older explicit list omitted it.
    const hackathonIds = [...new Set([primary, ...existingIds, ...approved.map(entry => entry.hackathonId)])];
    const patch: Record<string, unknown> = {};
    if (!Array.isArray(data.hackathon_ids) || data.hackathon_ids.length !== hackathonIds.length
      || data.hackathon_ids.some((id: unknown, index: number) => id !== hackathonIds[index])) patch.hackathon_ids = hackathonIds;
    if (data.hackathon_id !== primary) patch.hackathon_id = primary;
    if (!Object.keys(patch).length || !current()) return false;
    transaction.set(userRef, patch, { merge: true });
    return true;
  });
}
