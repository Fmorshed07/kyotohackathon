import {
  collection,
  getDocs,
  query,
  where,
  type DocumentData,
  type Firestore,
  type QueryDocumentSnapshot,
} from "firebase/firestore";
import type { Submission } from "@/types/portal";
import { formatTeamMemberNames, isSubmissionCollaborator } from "@/lib/teamRoster";

/** IDs are slug-safe so AI-created events can use their own Firestore document ID. */
export type HackathonId = string;

export type HackathonStatus = "active" | "upcoming" | "past";

/**
 * Independent of listing lifecycle (live / upcoming / past).
 * Pause is a soft freeze organisers can reverse; close is the deadline state.
 */
export type SubmissionMode = "open" | "paused" | "closed";

export const STATUS_ORDER: Record<HackathonStatus, number> = {
  active: 0,
  upcoming: 1,
  past: 2,
};

export type PortalHackathon = {
  id: HackathonId;
  name: string;
  shortName: string;
  eventDate: string;
  location: string;
  theme: string;
  status: HackathonStatus;
  /** Organiser gate for project writes. Missing → open, unless the event is past. */
  submissionMode?: SubmissionMode;
};

/**
 * Site landing edition (Impact Kyoto). Live hosted events (AI Ideathon, etc.)
 * come from Firestore and merge into dashboards dynamically — do not hardcode them here.
 */
export const SITE_HACKATHON_ID: HackathonId = "impact-kyoto";

/** Legacy submissions without `hackathon_id` belong to Impact Tokyo. */
export const LEGACY_HACKATHON_ID: HackathonId = "impact-tokyo";

export const DEFAULT_HACKATHON_ID = SITE_HACKATHON_ID;

/** Fixed Impact editions only. Hosted events are loaded from the `hackathons` collection. */
export const PORTAL_HACKATHONS: PortalHackathon[] = [
  {
    id: "impact-kyoto",
    name: "Impact Kyoto 2026",
    shortName: "Kyoto",
    eventDate: "4th July 2026",
    location: "Kyoto, Japan",
    theme: "Agentic AI for Japan's Future",
    status: "past",
  },
  {
    id: "impact-tokyo",
    name: "Impact Tokyo 2026",
    shortName: "Tokyo",
    eventDate: "7th March 2026",
    location: "Tokyo, Japan",
    theme: "AI for Global Good",
    status: "past",
  },
  {
    id: "impact-dhaka",
    name: "Impact Dhaka 2026",
    shortName: "Dhaka",
    eventDate: "Date TBA",
    location: "Dhaka, Bangladesh",
    theme: "AI for Urban Transformation",
    status: "past",
  },
];

export const isHackathonId = (value: string): value is HackathonId =>
  /^[a-z0-9]+(?:-[a-z0-9]+)*$/i.test(value.trim());

export const isSubmissionMode = (value: unknown): value is SubmissionMode =>
  value === "open" || value === "paused" || value === "closed";

/** Explicit host/admin gate always wins. Going live or marking past never reopens a pause. */
export const getHackathonSubmissionMode = (
  hackathon: Pick<PortalHackathon, "status" | "submissionMode">,
): SubmissionMode => {
  if (isSubmissionMode(hackathon.submissionMode)) return hackathon.submissionMode;
  return hackathon.status === "past" ? "closed" : "open";
};

export const areSubmissionsWritable = (
  hackathon: Pick<PortalHackathon, "status" | "submissionMode">,
): boolean => getHackathonSubmissionMode(hackathon) === "open";

export const getSubmissionModeLabel = (mode: SubmissionMode): string => {
  if (mode === "paused") return "Submissions paused";
  if (mode === "closed") return "Submissions closed";
  return "Submissions open";
};

export const getSubmissionLockCopy = (mode: SubmissionMode): string | null => {
  if (mode === "paused") {
    return "Organisers paused submissions. You can still view your project, but saves are locked until they reopen.";
  }
  if (mode === "closed") {
    return "Submissions are closed for this hackathon. You can still view your project and the event board.";
  }
  return null;
};

export const upsertPortalHackathon = (
  catalog: PortalHackathon[],
  event: PortalHackathon,
): PortalHackathon[] => {
  const index = catalog.findIndex((item) => item.id === event.id);
  if (index === -1) return [...catalog, event];
  const next = [...catalog];
  next[index] = { ...next[index], ...event };
  return next;
};

/** Fallback label when an id is not in the static catalog or a live event list. */
export const portalHackathonStub = (
  id: HackathonId,
  overrides?: Partial<PortalHackathon>
): PortalHackathon => ({
  id,
  name: overrides?.name ?? id,
  shortName: overrides?.shortName ?? id,
  eventDate: overrides?.eventDate ?? "See event page",
  location: overrides?.location ?? "See event page",
  theme: overrides?.theme ?? "",
  status: overrides?.status ?? "upcoming",
});

export const findPortalHackathon = (
  id: HackathonId,
  catalog: PortalHackathon[] = PORTAL_HACKATHONS
): PortalHackathon | undefined => catalog.find((entry) => entry.id === id);

/**
 * Resolve an event by id from an optional live catalog, then the static portal list.
 * Unknown Firebase ids return a stub — never silently remap to Kyoto.
 */
export const resolvePortalHackathon = (
  id: HackathonId,
  catalog: PortalHackathon[] = PORTAL_HACKATHONS
): PortalHackathon =>
  findPortalHackathon(id, catalog) ??
  findPortalHackathon(id, PORTAL_HACKATHONS) ??
  portalHackathonStub(id);

export const getHackathonById = (id: HackathonId): PortalHackathon =>
  resolvePortalHackathon(id);

/** Persist preferred event across signup → onboarding (and returning-user join). */
export const PENDING_HACKATHON_KEY = "cognisor_pending_hackathon";

export function stashPendingHackathon(id: string) {
  if (!isHackathonId(id)) return;
  try {
    sessionStorage.setItem(PENDING_HACKATHON_KEY, id);
  } catch {
    // ignore quota / private mode
  }
}

export function readPendingHackathon(): HackathonId | null {
  try {
    const value = sessionStorage.getItem(PENDING_HACKATHON_KEY);
    return value && isHackathonId(value) ? value : null;
  } catch {
    return null;
  }
}

export function clearPendingHackathon() {
  try {
    sessionStorage.removeItem(PENDING_HACKATHON_KEY);
  } catch {
    // ignore
  }
}

export function mergeHackathonCatalogs(...lists: PortalHackathon[][]): PortalHackathon[] {
  const byId = new Map<string, PortalHackathon>();
  for (const list of lists) {
    for (const item of list) {
      byId.set(item.id, item);
    }
  }
  return Array.from(byId.values());
}

export const getSubmissionHackathonId = (
  submission: Pick<Submission, "hackathon_id">
): HackathonId => {
  if (submission.hackathon_id && isHackathonId(submission.hackathon_id)) {
    return submission.hackathon_id;
  }
  return LEGACY_HACKATHON_ID;
};

export const submissionBelongsToHackathon = (
  submission: Pick<Submission, "hackathon_id">,
  hackathonId: HackathonId
): boolean => getSubmissionHackathonId(submission) === hackathonId;

export const filterSubmissionsByHackathon = <T extends Pick<Submission, "hackathon_id">>(
  submissions: T[],
  hackathonId: HackathonId
): T[] =>
  submissions.filter((submission) => submissionBelongsToHackathon(submission, hackathonId));

/** Group records that already carry a resolved `hackathonId` (legacy docs included). */
export function groupByHackathon<T extends { hackathonId: HackathonId }>(
  items: T[],
  catalog: PortalHackathon[] = PORTAL_HACKATHONS,
  options?: { selectedId?: HackathonId | null },
): Array<{ hackathon: PortalHackathon; items: T[] }> {
  const buckets = new Map<HackathonId, T[]>();
  for (const item of items) {
    const list = buckets.get(item.hackathonId);
    if (list) list.push(item);
    else buckets.set(item.hackathonId, [item]);
  }

  const selectedId = options?.selectedId ?? null;

  return Array.from(buckets.entries())
    .map(([id, grouped]) => ({
      hackathon: resolvePortalHackathon(id, catalog),
      items: grouped,
    }))
    .sort((left, right) => {
      if (selectedId) {
        if (left.hackathon.id === selectedId) return -1;
        if (right.hackathon.id === selectedId) return 1;
      }
      const status = STATUS_ORDER[left.hackathon.status] - STATUS_ORDER[right.hackathon.status];
      if (status !== 0) return status;
      return left.hackathon.name.localeCompare(right.hackathon.name);
    });
}

const mapSubmissionDoc = (docSnap: QueryDocumentSnapshot<DocumentData>): Submission => ({
  id: docSnap.id,
  ...(docSnap.data() as Omit<Submission, "id">),
});

export async function fetchAllSubmissions(db: Firestore): Promise<Submission[]> {
  const snapshot = await getDocs(collection(db, "submissions"));
  return snapshot.docs.map(mapSubmissionDoc);
}

export async function fetchSubmissionsForHackathon(
  db: Firestore,
  hackathonId: HackathonId
): Promise<Submission[]> {
  if (hackathonId === LEGACY_HACKATHON_ID) {
    const snapshot = await getDocs(collection(db, "submissions"));
    return snapshot.docs
      .map(mapSubmissionDoc)
      .filter((submission) => submissionBelongsToHackathon(submission, hackathonId));
  }

  const submissionsQuery = query(
    collection(db, "submissions"),
    where("hackathon_id", "==", hackathonId)
  );
  const snapshot = await getDocs(submissionsQuery);
  return snapshot.docs.map(mapSubmissionDoc);
}

export const HACKATHON_STORAGE_KEYS = {
  admin: "portal_selected_hackathon_admin",
  host: "portal_selected_hackathon_host",
  judge: "portal_selected_hackathon_judge",
  participant: "portal_selected_hackathon_participant",
} as const;

/** External public sites for legacy Impact editions (hosted events use `/events/:id`). */
export const HACKATHON_PUBLIC_URLS: Partial<Record<HackathonId, string>> = {
  "impact-tokyo": "https://tokyohacackathon.vercel.app/",
  "impact-dhaka": "https://impactdhaka.vercel.app/",
};

/** Public URL for any event id — external map when set, otherwise dynamic `/events/:id`. */
export const getHackathonPublicUrl = (hackathonId: HackathonId) =>
  HACKATHON_PUBLIC_URLS[hackathonId] ?? `/events/${encodeURIComponent(hackathonId)}`;

export const getEventBoardPath = (hackathonId: HackathonId) =>
  `/boards/${encodeURIComponent(hackathonId)}`;

export const getParticipantEventWorkspacePath = (hackathonId: HackathonId) =>
  `/dashboard/participant?hackathon=${encodeURIComponent(hackathonId)}`;

export const getAdminEventWorkspacePath = (hackathonId: HackathonId) =>
  `/dashboard/admin?hackathon=${encodeURIComponent(hackathonId)}`;

/** Append `?hackathon=` so admin sub-pages stay on the same event workspace. */
export const withHackathonQuery = (path: string, hackathonId?: HackathonId | null) => {
  if (!hackathonId || !isHackathonId(hackathonId)) return path;
  const hashIndex = path.indexOf("#");
  const pathname = hashIndex >= 0 ? path.slice(0, hashIndex) : path;
  const hash = hashIndex >= 0 ? path.slice(hashIndex) : "";
  const join = pathname.includes("?") ? "&" : "?";
  return `${pathname}${join}hackathon=${encodeURIComponent(hackathonId)}${hash}`;
};

export const getJudgeEventWorkspacePath = (hackathonId: HackathonId) =>
  `/dashboard/judge?hackathon=${encodeURIComponent(hackathonId)}`;

/** Prefer the live event in a catalog (active → upcoming → first). */
export const pickDefaultHackathonId = (
  catalog: PortalHackathon[] = PORTAL_HACKATHONS,
): HackathonId => {
  const active = catalog.find((entry) => entry.status === "active");
  if (active) return active.id;
  const upcoming = catalog.find((entry) => entry.status === "upcoming");
  if (upcoming) return upcoming.id;
  return catalog[0]?.id ?? DEFAULT_HACKATHON_ID;
};

/**
 * Admin / ops event switcher catalog: static editions + hosted Firebase events.
 * Hosted rows win on id collisions so live status/publish state is accurate.
 */
export const buildAdminHackathonCatalog = (
  hosted: PortalHackathon[],
  portal: PortalHackathon[] = PORTAL_HACKATHONS,
): PortalHackathon[] => {
  const merged = mergeHackathonCatalogs(portal, hosted);
  return [...merged].sort((left, right) => {
    const byStatus = STATUS_ORDER[left.status] - STATUS_ORDER[right.status];
    if (byStatus !== 0) return byStatus;
    return left.name.localeCompare(right.name);
  });
};

/** Live + upcoming editions — past events stay out of ops / board switchers. */
export const isCurrentHackathon = (
  hackathon: Pick<PortalHackathon, "status">,
): boolean => hackathon.status === "active" || hackathon.status === "upcoming";

/**
 * Switcher lists for admin ops, sidebar, and boards.
 * Keeps `includeId` visible when an admin is still on a past edition.
 * Returns an empty list when nothing is live/upcoming (no past fallback).
 */
export const filterCurrentHackathons = (
  catalog: PortalHackathon[],
  options?: { includeId?: HackathonId | null },
): PortalHackathon[] => {
  const includeId = options?.includeId;
  return catalog.filter(
    (hackathon) => isCurrentHackathon(hackathon) || hackathon.id === includeId,
  );
};

/** Enroll the event being saved — never silently add the site default (Impact Kyoto). */
export const nextEnrolledHackathonIds = (
  existing: HackathonId[],
  selected: HackathonId
): HackathonId[] => {
  const ids: HackathonId[] = [];
  const seen = new Set<string>();
  const push = (candidate: unknown) => {
    if (typeof candidate !== "string" || !isHackathonId(candidate) || seen.has(candidate)) {
      return;
    }
    seen.add(candidate);
    ids.push(candidate);
  };
  for (const id of existing) push(id);
  push(selected);
  return ids;
};

export type PreferredHackathonOptions = {
  requestedId?: HackathonId | null;
  storedId?: HackathonId | null;
  primaryId?: HackathonId | null;
  submissionHackathonIds?: HackathonId[];
};

/**
 * Pick which event board/workspace to open.
 * Query/path id wins, then an event the user submitted to (so a stale Kyoto
 * default cannot hide AI Ideathon work), then stored/primary enrollment.
 */
export const pickPreferredHackathonId = (
  accessibleIds: HackathonId[],
  options: PreferredHackathonOptions = {}
): HackathonId | null => {
  const accessible = Array.from(new Set(accessibleIds.filter(isHackathonId)));
  if (accessible.length === 0) return null;

  const requested = options.requestedId;
  if (requested && isHackathonId(requested) && accessible.includes(requested)) {
    return requested;
  }

  const submissionIds = (options.submissionHackathonIds ?? []).filter(
    (id) => isHackathonId(id) && accessible.includes(id)
  );

  const stored = options.storedId;
  if (stored && isHackathonId(stored) && accessible.includes(stored)) {
    const storedHasWork = submissionIds.includes(stored);
    if (storedHasWork || submissionIds.length === 0) return stored;
    if (stored === SITE_HACKATHON_ID) return submissionIds[0];
    return stored;
  }

  if (submissionIds[0]) return submissionIds[0];

  const primary = options.primaryId;
  if (primary && isHackathonId(primary) && accessible.includes(primary)) {
    return primary;
  }

  return accessible[0];
};

export const collectAccessibleHackathonIds = (input: {
  enrolledIds?: HackathonId[];
  sessionHackathonId?: HackathonId | null;
  sessionHackathonIds?: HackathonId[];
  submissions?: Pick<Submission, "hackathon_id">[];
}): HackathonId[] => {
  const ids = new Set<HackathonId>();
  const push = (candidate: unknown) => {
    if (typeof candidate === "string" && isHackathonId(candidate)) {
      ids.add(candidate);
    }
  };
  for (const id of input.enrolledIds ?? []) push(id);
  for (const id of input.sessionHackathonIds ?? []) push(id);
  push(input.sessionHackathonId);
  for (const submission of input.submissions ?? []) {
    push(getSubmissionHackathonId(submission));
  }
  return Array.from(ids);
};

export type ParticipantHackathonSummary = {
  hackathon: PortalHackathon;
  submissionCount: number;
  latestTitle: string | null;
  enrolled: boolean;
};

export const buildParticipantHackathonSummaries = (
  submissions: Submission[],
  enrolledHackathonIds?: HackathonId[] | HackathonId | null,
  catalog: PortalHackathon[] = PORTAL_HACKATHONS
): ParticipantHackathonSummary[] => {
  const byHackathon = new Map<HackathonId, Submission[]>();

  for (const submission of submissions) {
    const hackathonId = getSubmissionHackathonId(submission);
    const existing = byHackathon.get(hackathonId) ?? [];
    existing.push(submission);
    byHackathon.set(hackathonId, existing);
  }

  const enrolledIds = new Set<HackathonId>();
  const enrolledList = Array.isArray(enrolledHackathonIds)
    ? enrolledHackathonIds
    : enrolledHackathonIds
      ? [enrolledHackathonIds]
      : [];
  for (const id of enrolledList) enrolledIds.add(id);
  for (const id of byHackathon.keys()) enrolledIds.add(id);

  // Only show events the participant is enrolled in or has submitted to.
  // Do not auto-inject the site default — new users should only see their chosen event(s).
  return Array.from(enrolledIds).map((id) => {
    const hackathon = resolvePortalHackathon(id, catalog);
    const hackathonSubmissions = (byHackathon.get(id) ?? []).slice().sort((left, right) => {
      const leftDate = Date.parse(left.created_at ?? "");
      const rightDate = Date.parse(right.created_at ?? "");
      if (Number.isNaN(leftDate) && Number.isNaN(rightDate)) return 0;
      if (Number.isNaN(leftDate)) return 1;
      if (Number.isNaN(rightDate)) return -1;
      return rightDate - leftDate;
    });

    return {
      hackathon,
      submissionCount: hackathonSubmissions.length,
      latestTitle: hackathonSubmissions[0]?.title?.trim() || null,
      enrolled: true,
    };
  });
};

/** Public-safe fields for the participant event board (no judge scores/notes). */
export type EventBoardEntry = {
  id: string;
  title: string;
  teamName: string;
  shortDescription: string;
  projectUrl: string;
  memberNames: string;
  isOwn: boolean;
};

export const toEventBoardEntry = (
  submission: Submission,
  currentUserId: string
): EventBoardEntry => ({
  id: submission.id,
  title: submission.title?.trim() || "Untitled project",
  teamName: submission.team_name?.trim() || "Unnamed team",
  shortDescription: submission.short_description?.trim() || "",
  projectUrl: submission.project_url?.trim() || "",
  memberNames: formatTeamMemberNames(submission),
  isOwn: isSubmissionCollaborator(submission, currentUserId),
});

export type HackathonUserRef = {
  id: string;
  role: string;
  hackathon_id?: string | null;
  hackathon_ids?: unknown;
  hackathonId?: HackathonId | null;
  hackathonIds?: HackathonId[];
};

/** Parse Firestore `hackathon_ids` (+ optional primary `hackathon_id`) into a unique list. */
export const normalizeHackathonIds = (
  value: unknown,
  fallbackHackathonId?: unknown
): HackathonId[] => {
  const ids: HackathonId[] = [];
  const seen = new Set<string>();

  const push = (candidate: unknown) => {
    if (typeof candidate !== "string" || !isHackathonId(candidate) || seen.has(candidate)) {
      return;
    }
    seen.add(candidate);
    ids.push(candidate);
  };

  if (Array.isArray(value)) {
    for (const item of value) {
      push(item);
    }
  }

  push(fallbackHackathonId);
  return ids;
};

export const getUserAllowedHackathonIds = (
  user: Pick<HackathonUserRef, "hackathon_id" | "hackathon_ids" | "hackathonId" | "hackathonIds">
): HackathonId[] => {
  if (Array.isArray(user.hackathonIds) && user.hackathonIds.length > 0) {
    return normalizeHackathonIds(user.hackathonIds, user.hackathonId ?? user.hackathon_id);
  }
  return normalizeHackathonIds(user.hackathon_ids, user.hackathonId ?? user.hackathon_id);
};

export const userHasHackathonAccess = (
  user: Pick<HackathonUserRef, "hackathon_id" | "hackathon_ids" | "hackathonId" | "hackathonIds">,
  hackathonId: HackathonId
): boolean => getUserAllowedHackathonIds(user).includes(hackathonId);

export const getHackathonsByIds = (
  ids: HackathonId[],
  catalog: PortalHackathon[] = PORTAL_HACKATHONS
): PortalHackathon[] => {
  const seen = new Set<string>();
  const result: PortalHackathon[] = [];
  for (const id of ids) {
    if (seen.has(id)) continue;
    seen.add(id);
    result.push(resolvePortalHackathon(id, catalog));
  }
  return result;
};

/** Events new participants can join (excludes past / archived editions). */
export const isJoinableHackathon = (hackathon: PortalHackathon): boolean =>
  hackathon.status === "active" || hackathon.status === "upcoming";

export const sortJoinableHackathons = (
  list: PortalHackathon[],
  createdAtById?: Record<string, string>
): PortalHackathon[] =>
  [...list].sort((left, right) => {
    const byStatus = STATUS_ORDER[left.status] - STATUS_ORDER[right.status];
    if (byStatus !== 0) return byStatus;
    const leftCreated = createdAtById?.[left.id] ?? "";
    const rightCreated = createdAtById?.[right.id] ?? "";
    // Newest published events first within the same status.
    if (leftCreated || rightCreated) {
      return rightCreated.localeCompare(leftCreated);
    }
    return left.name.localeCompare(right.name);
  });

/** Active first, then upcoming — static catalog only (prefer async Firebase merge). */
export const getJoinableHackathons = (): PortalHackathon[] =>
  sortJoinableHackathons(PORTAL_HACKATHONS.filter(isJoinableHackathon));

/**
 * Signup / grant pickers.
 * By default excludes past events so new participants never see old editions.
 * Pass `{ includePast: true }` for admin grant UIs that need the full catalog.
 */
export const getHackathonsForOnboarding = (options?: {
  includePast?: boolean;
}): PortalHackathon[] => {
  const list = options?.includePast
    ? [...PORTAL_HACKATHONS]
    : getJoinableHackathons();
  return sortJoinableHackathons(list);
};

export const getUserHackathonId = (
  user: Pick<HackathonUserRef, "hackathon_id" | "hackathon_ids" | "hackathonId" | "hackathonIds">
): HackathonId => {
  const allowed = getUserAllowedHackathonIds(user);
  if (allowed.length > 0) {
    return allowed[0];
  }
  if (user.hackathonId && isHackathonId(user.hackathonId)) {
    return user.hackathonId;
  }
  if (user.hackathon_id && isHackathonId(user.hackathon_id)) {
    return user.hackathon_id;
  }
  return SITE_HACKATHON_ID;
};

export const filterUsersForHackathon = <T extends HackathonUserRef>(
  users: T[],
  hackathonId: HackathonId,
  submissions: Submission[]
): T[] => {
  const hackathonSubmissions = filterSubmissionsByHackathon(submissions, hackathonId);
  const participantIds = new Set(
    hackathonSubmissions.map((submission) => submission.user_id).filter(Boolean)
  );
  const judgeIds = new Set(
    hackathonSubmissions.flatMap((submission) => Object.keys(submission.judge_scores ?? {}))
  );

  return users.filter((user) => {
    if (user.role === "admin") {
      return true;
    }

    if (userHasHackathonAccess(user, hackathonId)) {
      return true;
    }

    if (participantIds.has(user.id)) {
      return true;
    }

    if (judgeIds.has(user.id)) {
      return true;
    }

    return false;
  });
};
