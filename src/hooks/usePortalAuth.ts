import { useEffect, useState } from "react";
import { onAuthStateChanged, signOut as firebaseSignOut } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import { getFirebaseAuth, getFirestoreDb } from "@/lib/firebaseClient";
import { getUserAllowedHackathonIds, getUserHackathonId } from "@/lib/hackathons";
import type {
  HostApprovalStatus,
  JudgeApprovalStatus,
  PortalRole,
  SessionUser,
} from "@/types/portal";

const ADMIN_OVERRIDE_STORAGE_KEY = "portal_admin_override";

const normalizePortalRole = (value: unknown): PortalRole | undefined => {
  if (typeof value !== "string") return undefined;
  const normalized = value.trim().toLowerCase();
  if (normalized === "judge" || normalized === "judges") return "judge";
  if (normalized === "mentor" || normalized === "mentors") return "mentor";
  if (normalized === "host" || normalized === "hosts") return "host";
  if (normalized === "participant" || normalized === "participants") return "participant";
  if (normalized === "admin" || normalized === "admins") return "admin";
  return undefined;
};

const normalizeHostApprovalStatus = (value: unknown): HostApprovalStatus | undefined => {
  if (typeof value !== "string") return undefined;
  const normalized = value.trim().toLowerCase();
  if (normalized === "pending") return "pending";
  if (normalized === "approved") return "approved";
  return undefined;
};

const normalizeJudgeApprovalStatus = (value: unknown): JudgeApprovalStatus | undefined => {
  if (typeof value !== "string") return undefined;
  const normalized = value.trim().toLowerCase();
  if (normalized === "pending") return "pending";
  if (normalized === "approved") return "approved";
  return undefined;
};

const readAdminOverrideSession = (): SessionUser | null => {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(ADMIN_OVERRIDE_STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as SessionUser;
    if (parsed?.role === "admin") {
      return parsed;
    }
  } catch {
    // ignore malformed local storage payload
  }
  return null;
};

export function usePortalAuth() {
  const [sessionUser, setSessionUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const auth = getFirebaseAuth();
    let unsubscribeRoleDoc: (() => void) | undefined;
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      setLoading(true);

      if (unsubscribeRoleDoc) {
        unsubscribeRoleDoc();
        unsubscribeRoleDoc = undefined;
      }

      if (!user) {
        const adminOverride = readAdminOverrideSession();
        setSessionUser(adminOverride);
        setLoading(false);
        return;
      }

      const db = getFirestoreDb();
      const userRef = doc(db, "users", user.uid);
      unsubscribeRoleDoc = onSnapshot(
        userRef,
        (userSnap) => {
          const data = userSnap.data() ?? {};
          const role = normalizePortalRole(data.role);
          const judgeApprovalStatus = normalizeJudgeApprovalStatus(data.judgeApprovalStatus);
          const hostApprovalStatus = normalizeHostApprovalStatus(data.hostApprovalStatus);
          const hackathonIds = getUserAllowedHackathonIds({
            hackathon_id: data.hackathon_id,
            hackathon_ids: data.hackathon_ids,
          });
          setSessionUser({
            id: user.uid,
            email:
              typeof data.email === "string" && data.email.trim()
                ? data.email.trim()
                : (user.email ?? ""),
            role,
            judgeApprovalStatus,
            hostApprovalStatus,
            hackathonId: hackathonIds[0] ?? getUserHackathonId({
              hackathon_id: data.hackathon_id,
              hackathon_ids: data.hackathon_ids,
            }),
            hackathonIds,
            onboardingCompletedAt:
              typeof data.onboardingCompletedAt === "string" ? data.onboardingCompletedAt : null,
            profile: {
              fullName: typeof data.fullName === "string" ? data.fullName : null,
              profileUpdatedAt:
                typeof data.profileUpdatedAt === "string" ? data.profileUpdatedAt : null,
            },
          });
          setLoading(false);
        },
        () => {
          setSessionUser({
            id: user.uid,
            email: user.email ?? "",
            role: undefined,
          });
          setLoading(false);
        },
      );
    });

    return () => {
      if (unsubscribeRoleDoc) {
        unsubscribeRoleDoc();
      }
      unsubscribeAuth();
    };
  }, []);

  const signOut = async () => {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(ADMIN_OVERRIDE_STORAGE_KEY);
    }
    const auth = getFirebaseAuth();
    await firebaseSignOut(auth);
    setSessionUser(null);
  };

  return { sessionUser, loading, signOut };
}
