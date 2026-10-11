import { useSyncExternalStore } from "react";
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

type PortalAuthSnapshot = {
  sessionUser: SessionUser | null;
  loading: boolean;
};

const initialSnapshot: PortalAuthSnapshot = {
  sessionUser: null,
  loading: true,
};

let snapshot = initialSnapshot;
const listeners = new Set<() => void>();
let unsubscribeAuth: (() => void) | undefined;
let unsubscribeRoleDoc: (() => void) | undefined;
let authGeneration = 0;
let authSubscription: object | undefined;

function updateSnapshot(update: Partial<PortalAuthSnapshot>) {
  snapshot = { ...snapshot, ...update };
  listeners.forEach((listener) => listener());
}

function startAuthSubscription() {
  const auth = getFirebaseAuth();
  const subscription = {};
  authSubscription = subscription;
  unsubscribeAuth = onAuthStateChanged(auth, (user) => {
    if (authSubscription !== subscription) return;
    const generation = ++authGeneration;

    if (unsubscribeRoleDoc) {
      unsubscribeRoleDoc();
      unsubscribeRoleDoc = undefined;
    }

    if (!user) {
      // Portal access always follows Firebase auth; legacy local overrides must
      // not restore a signed-out account or grant a role without authentication.
      updateSnapshot({ sessionUser: null, loading: false });
      return;
    }

    // Never expose the previous account while the next account's profile loads.
    updateSnapshot({ sessionUser: null, loading: true });
    const db = getFirestoreDb();
    const userRef = doc(db, "users", user.uid);
    unsubscribeRoleDoc = onSnapshot(
      userRef,
      (userSnap) => {
        if (generation !== authGeneration || auth.currentUser?.uid !== user.uid) return;
        const data = userSnap.data() ?? {};
        const role = normalizePortalRole(data.role);
        const judgeApprovalStatus = normalizeJudgeApprovalStatus(data.judgeApprovalStatus);
        const hostApprovalStatus = normalizeHostApprovalStatus(data.hostApprovalStatus);
        const hackathonIds = getUserAllowedHackathonIds({
          hackathon_id: data.hackathon_id,
          hackathon_ids: data.hackathon_ids,
        });
        updateSnapshot({
          sessionUser: {
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
          },
          loading: false,
        });
      },
      () => {
        if (generation !== authGeneration || auth.currentUser?.uid !== user.uid) return;
        updateSnapshot({
          sessionUser: {
            id: user.uid,
            email: user.email ?? "",
            role: undefined,
          },
          loading: false,
        });
      },
    );
  });
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (!unsubscribeAuth) startAuthSubscription();

  return () => {
    listeners.delete(listener);
    // Route changes and StrictMode can replace all subscribers in one commit.
    // Reuse the resolved session instead of restarting auth and flashing a loader.
    queueMicrotask(() => {
      if (listeners.size) return;
      authGeneration += 1;
      authSubscription = undefined;
      unsubscribeRoleDoc?.();
      unsubscribeRoleDoc = undefined;
      unsubscribeAuth?.();
      unsubscribeAuth = undefined;
      snapshot = initialSnapshot;
    });
  };
}

const signOut = async () => {
  if (typeof window !== "undefined") {
    try {
      window.localStorage.removeItem(ADMIN_OVERRIDE_STORAGE_KEY);
    } catch {
      // Browser storage restrictions must not prevent Firebase sign-out.
    }
  }
  const auth = getFirebaseAuth();
  await firebaseSignOut(auth);
  // Another account may have signed in while this request was completing.
  if (!auth.currentUser) {
    updateSnapshot({ sessionUser: null, loading: false });
  }
};

const getSnapshot = () => snapshot;
const getServerSnapshot = () => initialSnapshot;

export function usePortalAuth() {
  const state = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  return { ...state, signOut };
}
