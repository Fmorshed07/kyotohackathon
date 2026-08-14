import {
  collection,
  doc,
  getDoc,
  getDocs,
  increment,
  query,
  where,
  writeBatch,
  type Firestore,
} from "firebase/firestore";

import { isValidSubscribeEmail, normalizeSubscribeEmail } from "@/lib/hackathonSubscribe";

export const STAR_MIN = 1;
export const STAR_MAX = 5;
export const PROJECT_STARS_COLLECTION = "project_stars";
export const PROJECT_STAR_STATS_COLLECTION = "project_star_stats";

export type StarStats = {
  sum: number;
  count: number;
};

export const EMPTY_STAR_STATS: StarStats = { sum: 0, count: 0 };

const VOTER_STORAGE_KEY = "cognisor_star_voter";
const RATINGS_STORAGE_KEY = "cognisor_star_ratings";
const EMAIL_STORAGE_KEY = "cognisor_star_email";

export function ratingDocId(projectId: string, userId: string) {
  return `${projectId}_${userId}`;
}

export function isValidPublicVoterId(value: string) {
  return /^[A-Za-z0-9_-]{16,64}$/.test(value);
}

/** Stable per-browser id so guests can star once without creating an account. */
export function getPublicVoterId() {
  if (typeof window === "undefined") return "";
  const existing = window.localStorage.getItem(VOTER_STORAGE_KEY)?.trim() ?? "";
  if (isValidPublicVoterId(existing)) return existing;
  const generated = (
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random()}`
  ).replace(/[^A-Za-z0-9]/g, "");
  const next = `${generated}guestvoteridfallback`.slice(0, 32);
  window.localStorage.setItem(VOTER_STORAGE_KEY, next);
  return next;
}

export function readLocalStarRatings() {
  if (typeof window === "undefined") return {} as Record<string, number>;
  try {
    const parsed = JSON.parse(window.localStorage.getItem(RATINGS_STORAGE_KEY) ?? "{}") as unknown;
    if (!parsed || typeof parsed !== "object") return {};
    const ratings: Record<string, number> = {};
    for (const [projectId, value] of Object.entries(parsed as Record<string, unknown>)) {
      const stars = Number(value);
      if (!projectId || !Number.isFinite(stars) || stars < STAR_MIN) continue;
      ratings[projectId] = clampStarRating(stars);
    }
    return ratings;
  } catch {
    return {};
  }
}

export function writeLocalStarRating(projectId: string, stars: number) {
  if (typeof window === "undefined" || !projectId) return;
  const next = { ...readLocalStarRatings(), [projectId]: clampStarRating(stars) };
  window.localStorage.setItem(RATINGS_STORAGE_KEY, JSON.stringify(next));
}

export function readSavedStarEmail() {
  if (typeof window === "undefined") return "";
  const email = normalizeSubscribeEmail(window.localStorage.getItem(EMAIL_STORAGE_KEY) ?? "");
  return isValidSubscribeEmail(email) ? email : "";
}

export function writeSavedStarEmail(email: string) {
  if (typeof window === "undefined") return;
  const normalized = normalizeSubscribeEmail(email);
  if (!isValidSubscribeEmail(normalized)) return;
  window.localStorage.setItem(EMAIL_STORAGE_KEY, normalized);
}

/** One email can star a project once. Hex id stays within public voter-id rules. */
export async function voterIdFromEmail(email: string) {
  const normalized = normalizeSubscribeEmail(email);
  const bytes = new TextEncoder().encode(normalized);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 32);
}

export function clampStarRating(value: number) {
  if (!Number.isFinite(value)) return STAR_MIN;
  return Math.min(STAR_MAX, Math.max(STAR_MIN, Math.round(value)));
}

export function parseStarStats(data: unknown): StarStats {
  if (!data || typeof data !== "object") return { ...EMPTY_STAR_STATS };
  const record = data as Record<string, unknown>;
  const sum = Number(record.star_sum);
  const count = Number(record.star_count);
  return {
    sum: Number.isFinite(sum) && sum > 0 ? sum : 0,
    count: Number.isFinite(count) && count > 0 ? Math.floor(count) : 0,
  };
}

/** Rounded 0–5 fill for public display. Never expose the raw average. */
export function communityStarFill(stats: StarStats = EMPTY_STAR_STATS) {
  if (stats.count <= 0 || stats.sum <= 0) return 0;
  return Math.min(STAR_MAX, Math.max(0, Math.round(stats.sum / stats.count)));
}

export function starRatingDelta(previous: number, next: number) {
  const from = previous > 0 ? clampStarRating(previous) : 0;
  const to = next > 0 ? clampStarRating(next) : 0;
  if (from === to) return { sum: 0, count: 0 };
  if (from === 0) return { sum: to, count: 1 };
  if (to === 0) return { sum: -from, count: -1 };
  return { sum: to - from, count: 0 };
}

export function compareStarStats(left: StarStats, right: StarStats) {
  const fillDiff = communityStarFill(right) - communityStarFill(left);
  if (fillDiff !== 0) return fillDiff;
  if (right.count !== left.count) return right.count - left.count;
  return right.sum - left.sum;
}

export async function fetchProjectStarStats(db: Firestore) {
  const snapshot = await getDocs(collection(db, PROJECT_STAR_STATS_COLLECTION));
  const stats: Record<string, StarStats> = {};
  snapshot.forEach((item) => {
    stats[item.id] = parseStarStats(item.data());
  });
  return stats;
}

export async function fetchMyProjectStarRatings(db: Firestore, userId: string) {
  if (!userId) return {} as Record<string, number>;
  const snapshot = await getDocs(
    query(collection(db, PROJECT_STARS_COLLECTION), where("user_id", "==", userId)),
  );
  const ratings: Record<string, number> = {};
  snapshot.forEach((item) => {
    const data = item.data() as { project_id?: unknown; stars?: unknown };
    const projectId = typeof data.project_id === "string" ? data.project_id : "";
    const stars = Number(data.stars);
    if (!projectId || !Number.isFinite(stars)) return;
    ratings[projectId] = clampStarRating(stars);
  });
  return ratings;
}

export async function saveProjectStarRating(
  db: Firestore,
  input: { projectId: string; userId: string; stars: number | null; email: string },
) {
  const projectId = input.projectId.trim();
  const userId = input.userId.trim();
  const email = normalizeSubscribeEmail(input.email);
  if (!projectId || !isValidPublicVoterId(userId) || !isValidSubscribeEmail(email)) {
    throw new Error("Enter a valid email to star this project.");
  }

  const ratingRef = doc(db, PROJECT_STARS_COLLECTION, ratingDocId(projectId, userId));
  const statsRef = doc(db, PROJECT_STAR_STATS_COLLECTION, projectId);
  const existing = await getDoc(ratingRef);
  const previous = existing.exists() ? Number(existing.data()?.stars) || 0 : 0;
  if (previous > 0) {
    throw new Error("You already starred this project.");
  }

  const next = input.stars == null || input.stars <= 0 ? 0 : clampStarRating(input.stars);
  if (next <= 0) {
    return { previous, next };
  }
  const delta = starRatingDelta(previous, next);
  if (delta.sum === 0 && delta.count === 0) {
    return { previous, next };
  }

  const now = new Date().toISOString();
  const batch = writeBatch(db);
  batch.set(ratingRef, {
    project_id: projectId,
    user_id: userId,
    stars: next,
    email,
    created_at: now,
    updated_at: now,
  });
  batch.set(
    statsRef,
    {
      star_sum: increment(delta.sum),
      star_count: increment(delta.count),
      updated_at: now,
      last_voter_id: userId,
    },
    { merge: true },
  );
  await batch.commit();
  return { previous, next, delta };
}
