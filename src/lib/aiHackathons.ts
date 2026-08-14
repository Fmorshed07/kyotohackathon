import {
  collection,
  doc,
  deleteDoc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  setDoc,
  updateDoc,
  where,
  writeBatch,
  type Firestore,
  type Unsubscribe,
} from "firebase/firestore";
import { getFirebaseAuth } from "@/lib/firebaseClient";
import {
  PORTAL_HACKATHONS,
  STATUS_ORDER,
  buildAdminHackathonCatalog,
  getHackathonPublicUrl,
  isJoinableHackathon,
  mergeHackathonCatalogs,
  sortJoinableHackathons,
  type HackathonId,
  type HackathonStatus,
  type PortalHackathon,
  type SubmissionMode,
  getHackathonSubmissionMode,
  isSubmissionMode,
} from "@/lib/hackathons";
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
  /** Organiser gate for project writes. Independent of live / upcoming / past. */
  submissionMode?: SubmissionMode;
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
 * Re-publishing preserves an existing active/past/upcoming lifecycle unless `options.status` is set.
 */
export async function publishHostEventPublicly(
  db: Firestore,
  hostEvent: HostEvent,
  createdBy: string,
  options?: { status?: HackathonStatus },
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
  // Keep active/past lifecycle when re-publishing or updating an existing public listing.
  let lifecycleStatus: HackathonStatus = options?.status ?? "upcoming";
  let submissionMode: SubmissionMode | undefined;
  if (existingId) {
    const existing = await getDoc(doc(db, "hackathons", existingId));
    if (existing.exists()) {
      const previous = existing.data() as Partial<HostedHackathon>;
      if (previous.createdBy && previous.createdBy !== createdBy) {
        throw new Error("This public listing belongs to another host.");
      }
      createdAt = previous.createdAt?.trim() || now;
      if (!options?.status) {
        if (previous.status === "active" || previous.status === "past" || previous.status === "upcoming") {
          lifecycleStatus = previous.status;
        }
      }
      if (isSubmissionMode(previous.submissionMode)) {
        submissionMode = previous.submissionMode;
      }
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
    status: lifecycleStatus,
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
    ...(submissionMode ? { submissionMode } : {}),
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
    createdManually: event.createdManually === true || (event.aiGenerated !== true && Boolean(event.hostEventId)),
    hostEventId: typeof event.hostEventId === "string" ? event.hostEventId : undefined,
    organizerName: typeof event.organizerName === "string" ? event.organizerName.trim() : "",
    logoUrl: externalUrl(event.logoUrl),
    accentColor: normalizeAccentHex(event.accentColor) || "",
    fontPreset: getEventFontPreset(event.fontPreset),
    layoutStyle: getEventLayoutStyle(event.layoutStyle),
    tagline: typeof event.tagline === "string" ? event.tagline.trim() : "",
    submissionMode: getHackathonSubmissionMode({
      status: event.status === "active" || event.status === "past" ? event.status : "upcoming",
      submissionMode: isSubmissionMode(event.submissionMode) ? event.submissionMode : undefined,
    }),
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

function mapAdminHackathonDocs(
  docs: Array<{ id: string; data: () => Record<string, unknown> }>,
  options?: { requirePublished?: boolean },
): HostedHackathon[] {
  return sortHostedHackathons(
    docs
      .map((docSnap) =>
        asHostedHackathon(docSnap.id, docSnap.data() as Record<string, unknown>, options),
      )
      .filter((event): event is HostedHackathon => event !== null),
  );
}

/**
 * List queries silently omit docs the client cannot read (e.g. unpublished when
 * admin claim is slow). Always re-fetch portal editions by id so Mark past /
 * Unpublish on Kyoto/Tokyo/Dhaka still reach the admin UI.
 */
async function mergePortalEditionOverrides(
  db: Firestore,
  events: HostedHackathon[],
): Promise<HostedHackathon[]> {
  const portalDocs = await Promise.all(
    PORTAL_HACKATHONS.map((portal) => fetchHackathonForAdmin(db, portal.id)),
  );
  const byId = new Map(events.map((event) => [event.id, event]));
  for (const portalDoc of portalDocs) {
    if (portalDoc) byId.set(portalDoc.id, portalDoc);
  }
  return sortHostedHackathons([...byId.values()]);
}

/** Admin-only: includes unpublished drafts and hidden events. */
export async function fetchAllHackathonsForAdmin(db: Firestore): Promise<HostedHackathon[]> {
  let listed: HostedHackathon[] = [];
  try {
    const snapshot = await getDocs(collection(db, "hackathons"));
    listed = mapAdminHackathonDocs(snapshot.docs, { requirePublished: false });
  } catch (error) {
    // Non-admin list rules only allow published docs — fall back so switchers still work.
    console.warn("[hackathons] Full admin list failed; loading published events only.", error);
    listed = await fetchPublishedHackathons(db);
  }
  return mergePortalEditionOverrides(db, listed);
}

/**
 * Live admin catalog: any create / publish / status change in Firestore
 * appears in the event switcher without a page reload.
 */
export function subscribeAllHackathonsForAdmin(
  db: Firestore,
  onChange: (events: HostedHackathon[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  let cancelled = false;

  const publish = (events: HostedHackathon[]) => {
    void mergePortalEditionOverrides(db, events)
      .then((merged) => {
        if (!cancelled) onChange(merged);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        // Still surface the list we have rather than blanking the UI.
        onChange(events);
        onError?.(
          error instanceof Error ? error : new Error("Could not merge portal editions."),
        );
      });
  };

  const unsubscribe = onSnapshot(
    collection(db, "hackathons"),
    (snapshot) => {
      publish(mapAdminHackathonDocs(snapshot.docs, { requirePublished: false }));
    },
    (error) => {
      console.warn("[hackathons] Live admin list failed; falling back to one-shot fetch.", error);
      onError?.(error);
      void fetchAllHackathonsForAdmin(db)
        .then((events) => {
          if (!cancelled) onChange(events);
        })
        .catch((fallbackError: unknown) => {
          if (cancelled) return;
          onError?.(
            fallbackError instanceof Error
              ? fallbackError
              : new Error("Could not load hosted hackathons."),
          );
        });
    },
  );

  return () => {
    cancelled = true;
    unsubscribe();
  };
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

/** Marker used for portal catalog rows that are not yet backed by a Firestore listing. */
export const PORTAL_CATALOG_CREATED_BY = "portal-catalog";

export function isPortalEditionId(id: string) {
  return PORTAL_HACKATHONS.some((portal) => portal.id === id);
}

/** True only for in-memory catalog stubs (no Firestore listing yet). */
export function isPortalCatalogEvent(event: Pick<HostedHackathon, "createdBy" | "id">) {
  return event.createdBy === PORTAL_CATALOG_CREATED_BY;
}

export function portalHackathonAsHosted(hackathon: PortalHackathon): HostedHackathon {
  return {
    id: hackathon.id,
    name: hackathon.name,
    shortName: hackathon.shortName,
    eventDate: hackathon.eventDate,
    location: hackathon.location,
    theme: hackathon.theme,
    status: hackathon.status,
    summary: hackathon.theme,
    format: "Portal catalog",
    eligibility: "See event board",
    teamSize: "See event board",
    prize: hackathon.status === "past" ? "Completed" : "Portal live",
    requirements: [],
    schedule: [],
    rulebookUrl: "",
    coverImageUrl: "",
    bannerImageUrl: "",
    galleryUrls: [],
    guests: [],
    lumaUrl: "",
    // Portal boards stay listed on /hackathons (including past editions).
    published: true,
    createdAt: "",
    createdBy: PORTAL_CATALOG_CREATED_BY,
    aiGenerated: false,
    createdManually: false,
  };
}

/**
 * Materialize a fixed portal edition (Kyoto / Tokyo / Dhaka) into Firestore so
 * admin edit / publish / lifecycle controls can persist. No-op if the doc exists
 * or the id is not a portal edition.
 */
export async function ensurePortalCatalogHackathon(
  db: Firestore,
  id: string,
  createdBy?: string,
): Promise<boolean> {
  if (!isPortalEditionId(id)) return false;
  const ref = doc(db, "hackathons", id);
  const existing = await getDoc(ref);
  if (existing.exists()) return false;

  const portal = PORTAL_HACKATHONS.find((entry) => entry.id === id);
  if (!portal) return false;

  const authUid = getFirebaseAuth().currentUser?.uid?.trim() || "";
  const owner = createdBy?.trim() || authUid || "admin";
  const base = portalHackathonAsHosted(portal);
  const { id: _omit, ...fields } = base;

  await setDoc(ref, {
    ...fields,
    createdAt: new Date().toISOString(),
    createdBy: owner,
    createdManually: true,
    portalEdition: true,
  });
  return true;
}

/** Admin (or owning host via rules): patch public listing fields. */
export async function updateHostedHackathon(
  db: Firestore,
  id: string,
  patch: HostedHackathonUpdate,
): Promise<void> {
  await ensurePortalCatalogHackathon(db, id);

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

export function hostedToPortalHackathon(event: HostedHackathon): PortalHackathon {
  return {
    id: event.id,
    name: event.name,
    shortName: event.shortName,
    eventDate: event.eventDate,
    location: event.location,
    theme: event.theme,
    status: event.status,
    submissionMode: event.submissionMode,
  };
}

/**
 * Load a portal edition for the public catalog. Unpublished docs are not
 * readable to anonymous users (Firestore get rules) — treat permission errors
 * as "unpublished / omit" instead of failing the whole catalog fetch.
 */
async function fetchPortalEditionForPublicCatalog(
  db: Firestore,
  id: string,
): Promise<HostedHackathon | null | "unreadable"> {
  try {
    return await fetchHackathonForAdmin(db, id);
  } catch {
    return "unreadable";
  }
}

/**
 * Public name catalog: published Firebase rows win.
 * Portal editions that exist in Firestore but are unpublished are omitted
 * so home / boards / sign-in never show a stale Active Kyoto stub.
 */
export async function fetchPortalHackathonCatalog(db: Firestore): Promise<PortalHackathon[]> {
  const [published, ...portalDocs] = await Promise.all([
    fetchPublishedHackathons(db),
    ...PORTAL_HACKATHONS.map((portal) => fetchPortalEditionForPublicCatalog(db, portal.id)),
  ]);

  const publishedById = new Map(
    published.map((event) => [event.id, hostedToPortalHackathon(event)] as const),
  );
  const catalog: PortalHackathon[] = [];

  for (let index = 0; index < PORTAL_HACKATHONS.length; index += 1) {
    const portal = PORTAL_HACKATHONS[index];
    const doc = portalDocs[index];
    if (doc === "unreadable") {
      // Exists but unpublished (or otherwise not publicly readable) — omit.
      publishedById.delete(portal.id);
      continue;
    }
    if (doc) {
      if (!doc.published) continue;
      catalog.push(hostedToPortalHackathon(doc));
      publishedById.delete(portal.id);
      continue;
    }
    catalog.push(portal);
    publishedById.delete(portal.id);
  }

  for (const event of publishedById.values()) {
    catalog.push(event);
  }

  return [...catalog].sort((left, right) => {
    const byStatus = STATUS_ORDER[left.status] - STATUS_ORDER[right.status];
    if (byStatus !== 0) return byStatus;
    return left.name.localeCompare(right.name);
  });
}

/** Live event for hero / marketing: prefer published `active`, then joinable. */
export async function fetchLivePortalHackathon(db: Firestore): Promise<PortalHackathon | null> {
  const published = await fetchPublishedHackathons(db);
  const active = published.find((event) => event.status === "active");
  if (active) return hostedToPortalHackathon(active);

  const createdAtById: Record<string, string> = {};
  for (const event of published) {
    createdAtById[event.id] = event.createdAt;
  }
  const joinable = sortJoinableHackathons(
    published.filter(isJoinableHackathon).map(hostedToPortalHackathon),
    createdAtById,
  );
  return joinable[0] ?? null;
}

/**
 * Dashboard switchers: Firestore status/name overwrite static portal stubs
 * so admin header badges match Go live / Mark past / Unpublish.
 * Sorted active → upcoming → past so live events (e.g. AI Ideathon) surface first.
 */
export function buildAdminPortalCatalog(events: HostedHackathon[]): PortalHackathon[] {
  return buildAdminHackathonCatalog(events.map(hostedToPortalHackathon));
}

/**
 * Events participants can join at signup / onboarding / dashboard.
 * Follows admin publish + lifecycle (active / upcoming only).
 */
export async function fetchJoinablePortalHackathons(db: Firestore): Promise<PortalHackathon[]> {
  const published = await fetchPublishedHackathons(db);
  const createdAtById: Record<string, string> = {};
  for (const event of published) {
    createdAtById[event.id] = event.createdAt;
  }

  const joinable = published.filter(isJoinableHackathon).map(hostedToPortalHackathon);
  return sortJoinableHackathons(joinable, createdAtById);
}

/** Signup / join pickers: match published AI Ideathon events by id or name. */
export function isAiIdeathonEvent(
  event: Pick<PortalHackathon, "id" | "name" | "shortName">,
): boolean {
  const haystack = `${event.id} ${event.name} ${event.shortName}`.toLowerCase();
  return haystack.includes("ideathon");
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
  await ensurePortalCatalogHackathon(db, id);
  await setDoc(doc(db, "hackathons", id), { published }, { merge: true });
  await syncLinkedHostEventVisibility(db, id, published);
}

export async function setHackathonStatus(
  db: Firestore,
  id: string,
  status: HackathonStatus,
): Promise<void> {
  await ensurePortalCatalogHackathon(db, id);
  const payload: { status: HackathonStatus; published?: boolean } = { status };
  // Going live also makes the event public so /hackathons and /events stay consistent.
  // Past / upcoming keep the current published flag so you can keep past events visible
  // or hide them independently via publish / unpublish.
  if (status === "active") {
    payload.published = true;
  }
  await setDoc(doc(db, "hackathons", id), payload, { merge: true });
  if (status === "active") {
    await syncLinkedHostEventVisibility(db, id, true);
  }
}

export async function setHackathonSubmissionMode(
  db: Firestore,
  id: string,
  submissionMode: SubmissionMode,
): Promise<void> {
  await ensurePortalCatalogHackathon(db, id);
  await setDoc(doc(db, "hackathons", id), { submissionMode }, { merge: true });
}

/** Live updates for a single listing (participant lock banners, host/admin gates). */
export function subscribeHackathon(
  db: Firestore,
  id: string,
  onChange: (event: HostedHackathon | null) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  return onSnapshot(
    doc(db, "hackathons", id),
    (snapshot) => {
      if (!snapshot.exists()) {
        onChange(null);
        return;
      }
      onChange(
        asHostedHackathon(snapshot.id, snapshot.data() as Record<string, unknown>, {
          requirePublished: false,
        }),
      );
    },
    (error) => {
      onError?.(error);
    },
  );
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
  return getHackathonPublicUrl(id);
}

export function getHackathonVisibilityLabel(event: Pick<HostedHackathon, "published" | "status">) {
  if (!event.published) return "Unpublished";
  if (event.status === "active") return "Live";
  if (event.status === "past") return "Past";
  return "Published";
}

/**
 * Admin event management: include fixed portal editions (Kyoto / Tokyo / Dhaka)
 * alongside Firestore-hosted listings so past catalog events stay visible.
 * Firestore docs for the same id win over the catalog stub.
 */
export function mergePortalCatalogIntoEvents(events: HostedHackathon[]): HostedHackathon[] {
  const byId = new Map(events.map((event) => [event.id, event]));
  const portalRows = PORTAL_HACKATHONS.map(
    (portal) => byId.get(portal.id) ?? portalHackathonAsHosted(portal),
  );
  const hostedOnly = events.filter(
    (event) => !PORTAL_HACKATHONS.some((portal) => portal.id === event.id),
  );
  return sortHostedHackathons([...portalRows, ...hostedOnly]);
}
