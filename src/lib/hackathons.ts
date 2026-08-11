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

/** IDs are slug-safe so AI-created events can use their own Firestore document ID. */
export type HackathonId = string;

export type HackathonStatus = "active" | "upcoming" | "past";

export type PortalHackathon = {
  id: HackathonId;
  name: string;
  shortName: string;
  eventDate: string;
  location: string;
  theme: string;
  status: HackathonStatus;
};

/** Active hackathon for this site deployment (Impact Kyoto). */
export const SITE_HACKATHON_ID: HackathonId = "impact-kyoto";

/** Legacy submissions without `hackathon_id` belong to Impact Tokyo. */
export const LEGACY_HACKATHON_ID: HackathonId = "impact-tokyo";

export const DEFAULT_HACKATHON_ID = SITE_HACKATHON_ID;

export const PORTAL_HACKATHONS: PortalHackathon[] = [
  {
    id: "impact-kyoto",
    name: "Impact Kyoto 2026",
    shortName: "Kyoto",
    eventDate: "4th July 2026",
    location: "Kyoto, Japan",
    theme: "Agentic AI for Japan's Future",
    status: "active",
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
    status: "upcoming",
  },
];

export const isHackathonId = (value: string): value is HackathonId =>
  /^[a-z0-9]+(?:-[a-z0-9]+)*$/i.test(value.trim());

export const getHackathonById = (id: HackathonId): PortalHackathon => {
  const hackathon = PORTAL_HACKATHONS.find((entry) => entry.id === id);
  if (!hackathon) {
    return PORTAL_HACKATHONS[0];
  }
  return hackathon;
};

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

const mapSubmissionDoc = (docSnap: QueryDocumentSnapshot<DocumentData>): Submission => ({
  id: docSnap.id,
  ...(docSnap.data() as Omit<Submission, "id">),
});

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
  judge: "portal_selected_hackathon_judge",
  participant: "portal_selected_hackathon_participant",
} as const;

/** Public event sites participants can open from the dashboard. */
export const HACKATHON_PUBLIC_URLS: Partial<Record<HackathonId, string>> = {
  "impact-tokyo": "https://tokyohacackathon.vercel.app/",
  "impact-dhaka": "https://impactdhaka.vercel.app/",
};

export type ParticipantHackathonSummary = {
  hackathon: PortalHackathon;
  submissionCount: number;
  latestTitle: string | null;
  enrolled: boolean;
};

export const buildParticipantHackathonSummaries = (
  submissions: Submission[],
  enrolledHackathonIds?: HackathonId[] | HackathonId | null
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
  return PORTAL_HACKATHONS.filter((hackathon) => enrolledIds.has(hackathon.id)).map(
    (hackathon) => {
      const hackathonSubmissions = (byHackathon.get(hackathon.id) ?? []).slice().sort((left, right) => {
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
    }
  );
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
  memberNames: submission.member_names?.trim() || "",
  isOwn: submission.user_id === currentUserId,
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

export const getHackathonsByIds = (ids: HackathonId[]): PortalHackathon[] =>
  PORTAL_HACKATHONS.filter((hackathon) => ids.includes(hackathon.id));

const STATUS_ORDER: Record<HackathonStatus, number> = {
  active: 0,
  upcoming: 1,
  past: 2,
};

/** Events new participants can join (excludes past / archived editions). */
export const isJoinableHackathon = (hackathon: PortalHackathon): boolean =>
  hackathon.status === "active" || hackathon.status === "upcoming";

/** Active first, then upcoming — used for participant signup / join pickers. */
export const getJoinableHackathons = (): PortalHackathon[] =>
  PORTAL_HACKATHONS.filter(isJoinableHackathon).sort(
    (left, right) => STATUS_ORDER[left.status] - STATUS_ORDER[right.status]
  );

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
  return list.sort(
    (left, right) => STATUS_ORDER[left.status] - STATUS_ORDER[right.status]
  );
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
