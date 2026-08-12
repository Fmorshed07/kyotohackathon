import { collection, doc, deleteDoc, getDoc, getDocs, query, setDoc, updateDoc, where, writeBatch, type Firestore } from "firebase/firestore";
import { getFirebaseAuth } from "@/lib/firebaseClient";
import type { HackathonId, HackathonStatus, PortalHackathon } from "@/lib/hackathons";
import { buildHostEventSummary, formatPublicEventDate, type HostEvent } from "@/lib/hostEvents";
import {
  getEventFontPreset,
  getEventLayoutStyle,
  normalizeAccentHex,
} from "@/lib/eventBranding";
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

const DEFAULT_HOST_CRITERIA: AiHackathonDraft["criteria"] = [
  { title: "Impact & problem fit", weight: 25, questions: ["Does the project solve a meaningful problem?"] },
  { title: "Innovation", weight: 20, questions: ["Is the approach original and thoughtful?"] },
  { title: "Technical implementation", weight: 20, questions: ["Is there a credible, working implementation?"] },
  { title: "Scalability", weight: 20, questions: ["Can the solution grow beyond the event?"] },
  { title: "Demo & presentation", weight: 15, questions: ["Is the work communicated clearly?"] },
];

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
  /** Present when this public listing was published from a host ops event. */
  hostEventId?: string;
  organizerName?: string;
  logoUrl?: string;
  accentColor?: string;
  fontPreset?: string;
  layoutStyle?: string;
  tagline?: string;
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
    criteria: normalizeCriteria(DEFAULT_HOST_CRITERIA),
    updated_at: now,
  });
  await batch.commit();
  return event;
}

/**
 * Publish a host ops event onto the public `hackathons` directory + `/events/:id` page.
 * Writes are sequential so Firestore rules can see the hackathon before criteria is written.
 */
export async function publishHostEventPublicly(
  db: Firestore,
  hostEvent: HostEvent,
  createdBy: string,
): Promise<HostedHackathon> {
  if (!hostEvent.name.trim() || !hostEvent.start_at || !hostEvent.location.trim()) {
    throw new Error("Event name, start time, and location are required before publishing.");
  }
  if (Number.isNaN(new Date(hostEvent.start_at).getTime())) {
    throw new Error("Start time is invalid. Save the event details again, then publish.");
  }

  const now = new Date().toISOString();
  const existingId = hostEvent.public_hackathon_id?.trim();
  const id = (existingId || `${eventSlug(hostEvent.name)}-${Date.now().toString(36).slice(-6)}`) as HackathonId;

  let createdAt = now;
  if (existingId) {
    const existing = await getDoc(doc(db, "hackathons", existingId));
    if (existing.exists()) {
      const previous = existing.data() as Partial<HostedHackathon>;
      if (previous.createdBy && previous.createdBy !== createdBy) {
        throw new Error("This public listing belongs to another host.");
      }
      createdAt = previous.createdAt?.trim() || now;
    }
  }

  const shortName =
    hostEvent.name.trim().split(/\s+/).slice(0, 3).join(" ") || hostEvent.name.trim();
  const focusRequirements = hostEvent.focusAreas.map((area) => `Focus: ${area}`);
  const capacityRequirement =
    hostEvent.capacity > 0 ? [`Capacity: ${hostEvent.capacity} attendees`] : [];
  const programme =
    hostEvent.schedule.length > 0
      ? hostEvent.schedule.map((item) => ({
          time: item.time.trim() || formatPublicEventDate(hostEvent.start_at),
          title: item.title.trim() || "Programme item",
          description: item.description.trim(),
        }))
      : [
          {
            time: formatPublicEventDate(hostEvent.start_at),
            title: "Event start",
            description: hostEvent.location.trim(),
          },
          ...(hostEvent.end_at && !Number.isNaN(new Date(hostEvent.end_at).getTime())
            ? [
                {
                  time: formatPublicEventDate(hostEvent.end_at),
                  title: "Event end",
                  description: hostEvent.location.trim(),
                },
              ]
            : []),
        ];
  const event: HostedHackathon = {
    id,
    name: hostEvent.name.trim(),
    shortName,
    eventDate: formatPublicEventDate(hostEvent.start_at, hostEvent.end_at),
    location: hostEvent.location.trim(),
    theme: hostEvent.theme.trim() || hostEvent.tagline.trim().slice(0, 120) || "Hosted event",
    status: "upcoming",
    summary: buildHostEventSummary(hostEvent),
    format: hostEvent.format.trim() || "Hosted event",
    eligibility: hostEvent.eligibility.trim() || "Open to registered attendees",
    teamSize: hostEvent.teamSize.trim() || "As announced by the host",
    prize: hostEvent.prize.trim() || "As announced by the host",
    requirements: [...focusRequirements, ...capacityRequirement],
    schedule: programme,
    rulebookUrl: externalUrl(hostEvent.rulebookUrl),
    coverImageUrl: externalUrl(hostEvent.coverImageUrl),
    bannerImageUrl: externalUrl(hostEvent.bannerImageUrl) || externalUrl(hostEvent.coverImageUrl),
    galleryUrls: normalizeGalleryUrls(hostEvent.galleryUrls),
    guests: normalizeGuests(hostEvent.guests),
    lumaUrl: externalUrl(hostEvent.registrationUrl),
    published: true,
    createdAt,
    createdBy,
    aiGenerated: false,
    createdManually: true,
    hostEventId: hostEvent.id,
    organizerName: hostEvent.organizerName.trim(),
    logoUrl: externalUrl(hostEvent.logoUrl),
    accentColor: normalizeAccentHex(hostEvent.accentColor) || "#00A3FF",
    fontPreset: getEventFontPreset(hostEvent.fontPreset),
    layoutStyle: getEventLayoutStyle(hostEvent.layoutStyle),
    tagline: hostEvent.tagline.trim(),
  };

  await setDoc(doc(db, "hackathons", id), event, { merge: Boolean(existingId) });
  await setDoc(
    doc(db, "hackathon_criteria", id),
    { criteria: normalizeCriteria(DEFAULT_HOST_CRITERIA), updated_at: now },
    { merge: true },
  );
  await updateDoc(doc(db, "host_events", hostEvent.id), {
    status: "published",
    public_hackathon_id: id,
    updated_at: now,
  });

  return event;
}

/** Hide a host-published public listing without deleting ops data. */
export async function unpublishHostEventPublicly(
  db: Firestore,
  hostEvent: HostEvent,
): Promise<void> {
  const publicId = hostEvent.public_hackathon_id?.trim();
  const now = new Date().toISOString();
  if (publicId) {
    await setDoc(doc(db, "hackathons", publicId), { published: false }, { merge: true });
  }
  await updateDoc(doc(db, "host_events", hostEvent.id), {
    status: "draft",
    updated_at: now,
  });
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
    hostEventId: typeof event.hostEventId === "string" ? event.hostEventId : undefined,
    organizerName: typeof event.organizerName === "string" ? event.organizerName.trim() : "",
    logoUrl: externalUrl(event.logoUrl),
    accentColor: normalizeAccentHex(event.accentColor) || "",
    fontPreset: getEventFontPreset(event.fontPreset),
    layoutStyle: getEventLayoutStyle(event.layoutStyle),
    tagline: typeof event.tagline === "string" ? event.tagline.trim() : "",
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

export type HostedHackathonUpdate = Partial<
  Pick<
    HostedHackathon,
    | "name"
    | "shortName"
    | "eventDate"
    | "location"
    | "theme"
    | "summary"
    | "format"
    | "eligibility"
    | "teamSize"
    | "prize"
    | "requirements"
    | "schedule"
    | "rulebookUrl"
    | "coverImageUrl"
    | "bannerImageUrl"
    | "lumaUrl"
  >
>;

/** Admin (or owning host via rules): patch public listing fields. */
export async function updateHostedHackathon(
  db: Firestore,
  id: string,
  patch: HostedHackathonUpdate,
): Promise<void> {
  const payload: Record<string, unknown> = {};
  if (patch.name !== undefined) payload.name = patch.name.trim();
  if (patch.shortName !== undefined) payload.shortName = patch.shortName.trim();
  if (patch.eventDate !== undefined) payload.eventDate = patch.eventDate.trim();
  if (patch.location !== undefined) payload.location = patch.location.trim();
  if (patch.theme !== undefined) payload.theme = patch.theme.trim();
  if (patch.summary !== undefined) payload.summary = patch.summary.trim();
  if (patch.format !== undefined) payload.format = patch.format.trim();
  if (patch.eligibility !== undefined) payload.eligibility = patch.eligibility.trim();
  if (patch.teamSize !== undefined) payload.teamSize = patch.teamSize.trim();
  if (patch.prize !== undefined) payload.prize = patch.prize.trim();
  if (patch.requirements !== undefined) {
    payload.requirements = patch.requirements.map((item) => item.trim()).filter(Boolean);
  }
  if (patch.schedule !== undefined) {
    payload.schedule = patch.schedule.map((item) => ({
      time: item.time.trim(),
      title: item.title.trim(),
      description: item.description.trim(),
    }));
  }
  if (patch.rulebookUrl !== undefined) payload.rulebookUrl = externalUrl(patch.rulebookUrl);
  if (patch.coverImageUrl !== undefined) payload.coverImageUrl = externalUrl(patch.coverImageUrl);
  if (patch.bannerImageUrl !== undefined) {
    payload.bannerImageUrl = externalUrl(patch.bannerImageUrl) || externalUrl(patch.coverImageUrl);
  }
  if (patch.lumaUrl !== undefined) payload.lumaUrl = externalUrl(patch.lumaUrl);

  if (Object.keys(payload).length === 0) return;
  await setDoc(doc(db, "hackathons", id), payload, { merge: true });

  const existing = await getDoc(doc(db, "hackathons", id));
  const hostEventId =
    existing.exists() && typeof existing.data().hostEventId === "string"
      ? (existing.data().hostEventId as string)
      : "";
  if (!hostEventId) return;

  const hostPatch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (typeof payload.name === "string") hostPatch.name = payload.name;
  if (typeof payload.summary === "string") hostPatch.description = payload.summary;
  if (typeof payload.location === "string") hostPatch.location = payload.location;
  await updateDoc(doc(db, "host_events", hostEventId), hostPatch);
}

async function syncLinkedHostEventVisibility(
  db: Firestore,
  hackathonId: string,
  published: boolean,
) {
  const existing = await getDoc(doc(db, "hackathons", hackathonId));
  if (!existing.exists()) return;
  const hostEventId = existing.data().hostEventId;
  if (typeof hostEventId !== "string" || !hostEventId.trim()) return;
  await updateDoc(doc(db, "host_events", hostEventId), {
    status: published ? "published" : "draft",
    public_hackathon_id: hackathonId,
    updated_at: new Date().toISOString(),
  });
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
  await syncLinkedHostEventVisibility(db, id, published);
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
  if (status === "active") {
    await syncLinkedHostEventVisibility(db, id, true);
  }
}

export async function deleteHostedHackathon(db: Firestore, id: string): Promise<void> {
  const existing = await getDoc(doc(db, "hackathons", id));
  const hostEventId =
    existing.exists() && typeof existing.data().hostEventId === "string"
      ? (existing.data().hostEventId as string)
      : "";
  await deleteDoc(doc(db, "hackathons", id));
  try {
    await deleteDoc(doc(db, "hackathon_criteria", id));
  } catch {
    // Criteria may not exist for every listing.
  }
  if (hostEventId) {
    await updateDoc(doc(db, "host_events", hostEventId), {
      status: "draft",
      public_hackathon_id: null,
      updated_at: new Date().toISOString(),
    });
  }
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
