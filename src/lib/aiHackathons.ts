import { collection, doc, getDoc, getDocs, query, setDoc, where, writeBatch, type Firestore } from "firebase/firestore";
import { getFirebaseAuth } from "@/lib/firebaseClient";
import type { HackathonId, HackathonStatus, PortalHackathon } from "@/lib/hackathons";
import { slugifyCriterionId, type JudgingCriterion } from "@/components/dashboard/judgingCriteria";

export type HackathonGuest = {
  name: string;
  role?: string;
  bio?: string;
  imageUrl?: string;
};

export type AiHackathonDraft = {
  name: string;
  shortName: string;
  eventDate: string;
  location: string;
  theme: string;
  summary: string;
  format: string;
  eligibility: string;
  teamSize: string;
  prize: string;
  requirements: string[];
  schedule: Array<{ time: string; title: string; description: string }>;
  criteria: Array<{ title: string; weight: number; questions: string[] }>;
  /** Optional public-facing visuals and official event/registration page. */
  coverImageUrl?: string;
  /** Optional homepage / hero banner image (falls back to cover). */
  bannerImageUrl?: string;
  galleryUrls?: string[];
  guests?: HackathonGuest[];
  lumaUrl?: string;
};

/** A complete event brief entered directly by an organiser, without AI generation. */
export type ManualHackathonDraft = Omit<AiHackathonDraft, "criteria">;

export type HostedHackathon = PortalHackathon & {
  summary: string;
  format: string;
  eligibility: string;
  teamSize: string;
  prize: string;
  requirements: string[];
  schedule: Array<{ time: string; title: string; description: string }>;
  rulebookUrl: string;
  coverImageUrl: string;
  bannerImageUrl: string;
  galleryUrls: string[];
  guests: HackathonGuest[];
  lumaUrl: string;
  published: boolean;
  createdAt: string;
  createdBy: string;
  aiGenerated: boolean;
  createdManually: boolean;
};

function eventSlug(value: string) {
  const slug = value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 44);
  return slug || "hackathon";
}

function externalUrl(value?: string) {
  const candidate = value?.trim();
  if (!candidate) return "";
  try {
    const url = new URL(candidate);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : "";
  } catch {
    return "";
  }
}

function normalizeGalleryUrls(value?: string[]) {
  if (!Array.isArray(value)) return [];
  return value.map((url) => externalUrl(url)).filter(Boolean).slice(0, 24);
}

function normalizeGuests(value?: HackathonGuest[]) {
  if (!Array.isArray(value)) return [];
  return value
    .map((guest) => ({
      name: guest?.name?.trim() || "",
      role: guest?.role?.trim() || "",
      bio: guest?.bio?.trim() || "",
      imageUrl: externalUrl(guest?.imageUrl),
    }))
    .filter((guest) => guest.name || guest.imageUrl)
    .slice(0, 24);
}

function normalizeCriteria(criteria: AiHackathonDraft["criteria"]): JudgingCriterion[] {
  const uniqueIds = new Set<string>();
  return criteria.map((criterion) => ({
    id: slugifyCriterionId(criterion.title, uniqueIds),
    title: criterion.title.trim(),
    weight: Math.max(1, Math.round(criterion.weight)),
    questions: criterion.questions.map((question) => question.trim()).filter(Boolean),
  }));
}

export async function generateAiHackathonDraft(input: {
  details: string;
  rulebookUrl: string;
  model?: string;
}): Promise<AiHackathonDraft> {
  const user = getFirebaseAuth().currentUser;
  if (!user) throw new Error("You must be signed in as an admin to create an event.");
  const token = await user.getIdToken();
  const response = await fetch("/api/hackathon-ai", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const data = (await response.json().catch(() => ({}))) as { draft?: AiHackathonDraft; error?: string };
  if (!response.ok || !data.draft) {
    throw new Error(data.error || "Could not generate the hackathon setup.");
  }
  return data.draft;
}

export async function publishAiHackathon(
  db: Firestore,
  draft: AiHackathonDraft,
  rulebookUrl: string,
  createdBy: string,
): Promise<HostedHackathon> {
  const now = new Date().toISOString();
  const id = `${eventSlug(draft.name)}-${Date.now().toString(36).slice(-6)}` as HackathonId;
  const event: HostedHackathon = {
    id,
    name: draft.name.trim(),
    shortName: draft.shortName.trim(),
    eventDate: draft.eventDate.trim(),
    location: draft.location.trim(),
    theme: draft.theme.trim(),
    status: "upcoming" satisfies HackathonStatus,
    summary: draft.summary.trim(),
    format: draft.format.trim(),
    eligibility: draft.eligibility.trim(),
    teamSize: draft.teamSize.trim(),
    prize: draft.prize.trim(),
    requirements: draft.requirements.map((item) => item.trim()).filter(Boolean),
    schedule: draft.schedule,
    rulebookUrl: externalUrl(rulebookUrl),
    coverImageUrl: externalUrl(draft.coverImageUrl),
    bannerImageUrl: externalUrl(draft.bannerImageUrl) || externalUrl(draft.coverImageUrl),
    galleryUrls: normalizeGalleryUrls(draft.galleryUrls),
    guests: normalizeGuests(draft.guests),
    lumaUrl: externalUrl(draft.lumaUrl),
    published: true,
    createdAt: now,
    createdBy,
    aiGenerated: true,
    createdManually: false,
  };
  const batch = writeBatch(db);
  batch.set(doc(db, "hackathons", id), event);
  batch.set(doc(db, "hackathon_criteria", id), { criteria: normalizeCriteria(draft.criteria), updated_at: now });
  await batch.commit();
  return event;
}

export async function publishManualHackathon(
  db: Firestore,
  draft: ManualHackathonDraft,
  rulebookUrl: string,
  createdBy: string,
): Promise<HostedHackathon> {
  const now = new Date().toISOString();
  const id = `${eventSlug(draft.name)}-${Date.now().toString(36).slice(-6)}` as HackathonId;
  const defaultCriteria: AiHackathonDraft["criteria"] = [
    { title: "Impact & problem fit", weight: 25, questions: ["Does the project solve a meaningful problem?"] },
    { title: "Innovation", weight: 20, questions: ["Is the approach original and thoughtful?"] },
    { title: "Technical implementation", weight: 20, questions: ["Is there a credible, working implementation?"] },
    { title: "Scalability", weight: 20, questions: ["Can the solution grow beyond the event?"] },
    { title: "Demo & presentation", weight: 15, questions: ["Is the work communicated clearly?"] },
  ];
  const event: HostedHackathon = {
    id,
    name: draft.name.trim(),
    shortName: draft.shortName.trim() || draft.name.trim(),
    eventDate: draft.eventDate.trim() || "To be confirmed",
    location: draft.location.trim() || "To be confirmed",
    theme: draft.theme.trim() || "To be confirmed",
    status: "upcoming" satisfies HackathonStatus,
    summary: draft.summary.trim(),
    format: draft.format.trim() || "To be confirmed",
    eligibility: draft.eligibility.trim() || "To be confirmed",
    teamSize: draft.teamSize.trim() || "To be confirmed",
    prize: draft.prize.trim() || "To be confirmed",
    requirements: draft.requirements.map((item) => item.trim()).filter(Boolean),
    schedule: draft.schedule.map((item) => ({
      time: item.time.trim(),
      title: item.title.trim(),
      description: item.description.trim(),
    })),
    rulebookUrl: externalUrl(rulebookUrl),
    coverImageUrl: externalUrl(draft.coverImageUrl),
    bannerImageUrl: externalUrl(draft.bannerImageUrl) || externalUrl(draft.coverImageUrl),
    galleryUrls: normalizeGalleryUrls(draft.galleryUrls),
    guests: normalizeGuests(draft.guests),
    lumaUrl: externalUrl(draft.lumaUrl),
    published: true,
    createdAt: now,
    createdBy,
    aiGenerated: false,
    createdManually: true,
  };
  const batch = writeBatch(db);
  batch.set(doc(db, "hackathons", id), event);
  batch.set(doc(db, "hackathon_criteria", id), {
    criteria: normalizeCriteria(defaultCriteria),
    updated_at: now,
  });
  await batch.commit();
  return event;
}

function asHostedHackathon(
  id: string,
  data: Record<string, unknown>,
  options?: { requirePublished?: boolean },
): HostedHackathon | null {
  const requirePublished = options?.requirePublished !== false;
  if (typeof data.name !== "string") return null;
  if (requirePublished && data.published !== true) return null;
  const event = data as Partial<HostedHackathon>;
  return {
    id,
    name: event.name?.trim() || "Untitled hackathon",
    shortName: event.shortName?.trim() || event.name?.trim() || "Event",
    eventDate: event.eventDate?.trim() || "To be confirmed",
    location: event.location?.trim() || "To be confirmed",
    theme: event.theme?.trim() || "To be confirmed",
    status: event.status === "active" || event.status === "past" ? event.status : "upcoming",
    summary: event.summary?.trim() || "",
    format: event.format?.trim() || "To be confirmed",
    eligibility: event.eligibility?.trim() || "To be confirmed",
    teamSize: event.teamSize?.trim() || "To be confirmed",
    prize: event.prize?.trim() || "To be confirmed",
    requirements: Array.isArray(event.requirements) ? event.requirements.filter((item): item is string => typeof item === "string") : [],
    schedule: Array.isArray(event.schedule)
      ? event.schedule.filter(
          (item): item is { time: string; title: string; description: string } =>
            Boolean(item) && typeof item.time === "string" && typeof item.title === "string" && typeof item.description === "string",
        )
      : [],
    rulebookUrl: externalUrl(event.rulebookUrl),
    coverImageUrl: externalUrl(event.coverImageUrl),
    bannerImageUrl: externalUrl(event.bannerImageUrl) || externalUrl(event.coverImageUrl),
    galleryUrls: normalizeGalleryUrls(event.galleryUrls),
    guests: normalizeGuests(event.guests),
    lumaUrl: externalUrl(event.lumaUrl),
    published: data.published === true,
    createdAt: event.createdAt?.trim() || "",
    createdBy: event.createdBy?.trim() || "",
    aiGenerated: event.aiGenerated === true,
    createdManually: event.aiGenerated !== true,
  };
}

function sortHostedHackathons(events: HostedHackathon[]) {
  return [...events].sort((left, right) => {
    const statusRank = (status: HackathonStatus) =>
      status === "active" ? 0 : status === "upcoming" ? 1 : 2;
    const byStatus = statusRank(left.status) - statusRank(right.status);
    if (byStatus !== 0) return byStatus;
    return right.createdAt.localeCompare(left.createdAt);
  });
}

export async function fetchAiHackathons(db: Firestore): Promise<HostedHackathon[]> {
  const snapshot = await getDocs(collection(db, "hackathons"));
  return snapshot.docs
    .map((snapshot) => asHostedHackathon(snapshot.id, snapshot.data()))
    .filter((event): event is HostedHackathon => event !== null)
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
}

/** Admin-only: includes unpublished drafts and hidden events. */
export async function fetchAllHackathonsForAdmin(db: Firestore): Promise<HostedHackathon[]> {
  const snapshot = await getDocs(collection(db, "hackathons"));
  return sortHostedHackathons(
    snapshot.docs
      .map((snapshot) => asHostedHackathon(snapshot.id, snapshot.data(), { requirePublished: false }))
      .filter((event): event is HostedHackathon => event !== null),
  );
}

/** Public-safe event lookup used by the public hackathons directory. */
export async function fetchPublishedHackathons(db: Firestore): Promise<HostedHackathon[]> {
  const snapshot = await getDocs(
    query(collection(db, "hackathons"), where("published", "==", true)),
  );
  return snapshot.docs
    .map((snapshot) => asHostedHackathon(snapshot.id, snapshot.data()))
    .filter((event): event is HostedHackathon => event !== null)
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
}

export async function fetchAiHackathon(db: Firestore, id: string): Promise<HostedHackathon | null> {
  const snapshot = await getDoc(doc(db, "hackathons", id));
  return snapshot.exists() ? asHostedHackathon(snapshot.id, snapshot.data()) : null;
}

/** Admin-only: load a single event even when unpublished. */
export async function fetchHackathonForAdmin(db: Firestore, id: string): Promise<HostedHackathon | null> {
  const snapshot = await getDoc(doc(db, "hackathons", id));
  return snapshot.exists()
    ? asHostedHackathon(snapshot.id, snapshot.data(), { requirePublished: false })
    : null;
}

export async function setHackathonPublished(
  db: Firestore,
  id: string,
  published: boolean,
): Promise<void> {
  await setDoc(doc(db, "hackathons", id), { published }, { merge: true });
}

export async function setHackathonStatus(
  db: Firestore,
  id: string,
  status: HackathonStatus,
): Promise<void> {
  const payload: { status: HackathonStatus; published?: boolean } = { status };
  // Going live also makes the event public so /hackathons and /events stay consistent.
  if (status === "active") {
    payload.published = true;
  }
  await setDoc(doc(db, "hackathons", id), payload, { merge: true });
}

export function getHostedHackathonUrl(id: string) {
  return `/events/${encodeURIComponent(id)}`;
}

export function getHackathonVisibilityLabel(event: Pick<HostedHackathon, "published" | "status">) {
  if (!event.published) return "Unpublished";
  if (event.status === "active") return "Live";
  if (event.status === "past") return "Past";
  return "Published";
}
