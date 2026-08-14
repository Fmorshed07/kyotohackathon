import {
  collection,
  doc,
  getDoc,
  getDocs,
  increment,
  writeBatch,
  type Firestore,
} from "firebase/firestore";
import { getPublicVoterId, isValidPublicVoterId } from "@/lib/projectStars";

export const PROJECT_SHARES_COLLECTION = "project_shares";
export const PROJECT_SHARE_STATS_COLLECTION = "project_share_stats";

export type ShareStats = {
  count: number;
};

export const EMPTY_SHARE_STATS: ShareStats = { count: 0 };

const SHARE_STORAGE_KEY = "cognisor_project_shares";

export function shareDocId(projectId: string, userId: string) {
  return `${projectId}_${userId}`;
}

export function parseShareStats(data: unknown): ShareStats {
  if (!data || typeof data !== "object") return { ...EMPTY_SHARE_STATS };
  const count = Number((data as Record<string, unknown>).share_count);
  return { count: Number.isFinite(count) && count > 0 ? Math.floor(count) : 0 };
}

export function readLocalProjectShares() {
  if (typeof window === "undefined") return {} as Record<string, true>;
  try {
    const stored = JSON.parse(window.localStorage.getItem(SHARE_STORAGE_KEY) ?? "{}") as unknown;
    if (!stored || typeof stored !== "object") return {} as Record<string, true>;
    return Object.fromEntries(
      Object.entries(stored as Record<string, unknown>).filter(([projectId, value]) => projectId && value === true),
    ) as Record<string, true>;
  } catch {
    return {} as Record<string, true>;
  }
}

export function writeLocalProjectShare(projectId: string) {
  if (typeof window === "undefined" || !projectId) return;
  window.localStorage.setItem(
    SHARE_STORAGE_KEY,
    JSON.stringify({ ...readLocalProjectShares(), [projectId]: true }),
  );
}

export async function fetchProjectShareStats(db: Firestore) {
  const snapshot = await getDocs(collection(db, PROJECT_SHARE_STATS_COLLECTION));
  const stats: Record<string, ShareStats> = {};
  snapshot.forEach((item) => {
    stats[item.id] = parseShareStats(item.data());
  });
  return stats;
}

/** Records one share per browser and project. A browser identifier is never shown publicly. */
export async function saveProjectShare(db: Firestore, projectId: string) {
  const normalizedProjectId = projectId.trim();
  const userId = getPublicVoterId();
  if (!normalizedProjectId || !isValidPublicVoterId(userId)) {
    throw new Error("Could not record this project share.");
  }

  const shareRef = doc(db, PROJECT_SHARES_COLLECTION, shareDocId(normalizedProjectId, userId));
  if ((await getDoc(shareRef)).exists()) return false;

  const now = new Date().toISOString();
  const statsRef = doc(db, PROJECT_SHARE_STATS_COLLECTION, normalizedProjectId);
  const batch = writeBatch(db);
  batch.set(shareRef, {
    project_id: normalizedProjectId,
    user_id: userId,
    created_at: now,
  });
  batch.set(
    statsRef,
    {
      share_count: increment(1),
      updated_at: now,
      last_sharer_id: userId,
    },
    { merge: true },
  );
  await batch.commit();
  return true;
}
