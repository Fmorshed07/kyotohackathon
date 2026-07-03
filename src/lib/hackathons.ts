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

export type HackathonId = "impact-kyoto" | "impact-tokyo" | "impact-dhaka";

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

const HACKATHON_IDS = new Set<string>(PORTAL_HACKATHONS.map((hackathon) => hackathon.id));

export const isHackathonId = (value: string): value is HackathonId => HACKATHON_IDS.has(value);

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
} as const;
