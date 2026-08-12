import {
  collection,
  getDocs,
  type Firestore,
} from "firebase/firestore";

export type HostEventStatus = "draft" | "published" | "closed";
export type HostTicketStatus = "issued" | "checked_in" | "cancelled";

export type HostEventScheduleItem = {
  time: string;
  title: string;
  description: string;
};

export type HostEventGuest = {
  name: string;
  role: string;
  bio: string;
  imageUrl: string;
};

export type HostEvent = {
  id: string;
  owner_id: string;
  name: string;
  /** Short hero line shown under the event name. */
  tagline: string;
  description: string;
  theme: string;
  format: string;
  eligibility: string;
  teamSize: string;
  prize: string;
  rulebookUrl: string;
  registrationUrl: string;
  highlightNote: string;
  focusAreas: string[];
  schedule: HostEventScheduleItem[];
  coverImageUrl: string;
  bannerImageUrl: string;
  logoUrl: string;
  galleryUrls: string[];
  guests: HostEventGuest[];
  organizerName: string;
  accentColor: string;
  fontPreset: string;
  layoutStyle: string;
  start_at: string;
  end_at: string;
  location: string;
  capacity: number;
  status: HostEventStatus;
  /** Linked public listing in `hackathons` (set on publish). */
  public_hackathon_id?: string | null;
  created_at: string;
  updated_at: string;
};

export type HostEventTicket = {
  id: string;
  host_id: string;
  event_id: string;
  attendee_name: string;
  attendee_email: string;
  ticket_type: string;
  ticket_code: string;
  qr_payload: string;
  status: HostTicketStatus;
  created_at: string;
  checked_in_at?: string | null;
};

export type HostEventJudge = {
  id: string;
  host_id: string;
  event_id: string;
  name: string;
  email: string;
  organization: string;
  expertise: string;
  status: "invited" | "confirmed";
  created_at: string;
};

export const createTicketCode = () => {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const random = Array.from({ length: 8 }, () =>
    alphabet[Math.floor(Math.random() * alphabet.length)],
  ).join("");
  return `CGN-${random}`;
};

export const createTicketQrPayload = (eventId: string, ticketCode: string) =>
  `COGNISOR:TICKET:${eventId}:${ticketCode}`;

export const getTicketQrImageUrl = (payload: string) =>
  `https://api.qrserver.com/v1/create-qr-code/?size=256x256&margin=8&data=${encodeURIComponent(payload)}`;

export const extractTicketCode = (input: string) => {
  const normalized = input.trim().toUpperCase();
  if (normalized.startsWith("COGNISOR:TICKET:")) {
    const pieces = normalized.split(":");
    return pieces.at(-1) ?? "";
  }
  return normalized;
};

export const formatDateTime = (value: string) => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Date to be confirmed";
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(parsed);
};

/** Convert ISO timestamps into a readable public event date range. */
export const formatPublicEventDate = (startAt: string, endAt?: string) => {
  const start = formatDateTime(startAt);
  if (!endAt?.trim()) return start;
  const end = formatDateTime(endAt);
  if (end === "Date to be confirmed" || end === start) return start;
  return `${start} – ${end}`;
};

/** Safe parse for datetime-local values before writing ISO strings. */
export const parseDatetimeLocal = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
};

/** Feed an ISO timestamp back into a datetime-local input in local time. */
export const toDatetimeLocalValue = (iso: string) => {
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return "";
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${parsed.getFullYear()}-${pad(parsed.getMonth() + 1)}-${pad(parsed.getDate())}T${pad(parsed.getHours())}:${pad(parsed.getMinutes())}`;
};

export const normalizeFocusAreas = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value
      .filter((item): item is string => typeof item === "string")
      .map((item) => item.trim())
      .filter(Boolean)
      .slice(0, 24);
  }
  if (typeof value === "string") {
    return value
      .split(/[,|\n]/)
      .map((item) => item.trim())
      .filter(Boolean)
      .slice(0, 24);
  }
  return [];
};

export const normalizeHostSchedule = (value: unknown): HostEventScheduleItem[] => {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const row = item as Record<string, unknown>;
      const time = typeof row.time === "string" ? row.time.trim() : "";
      const title = typeof row.title === "string" ? row.title.trim() : "";
      const description = typeof row.description === "string" ? row.description.trim() : "";
      if (!time && !title && !description) return null;
      return { time, title: title || "Programme item", description };
    })
    .filter((item): item is HostEventScheduleItem => item !== null)
    .slice(0, 40);
};

export const emptyHostScheduleItem = (): HostEventScheduleItem => ({
  time: "",
  title: "",
  description: "",
});

export const emptyHostGuest = (): HostEventGuest => ({
  name: "",
  role: "",
  bio: "",
  imageUrl: "",
});

export const normalizeHostGalleryUrls = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 24);
};

export const normalizeHostGuests = (value: unknown): HostEventGuest[] => {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const row = item as Record<string, unknown>;
      const name = typeof row.name === "string" ? row.name.trim() : "";
      const role = typeof row.role === "string" ? row.role.trim() : "";
      const bio = typeof row.bio === "string" ? row.bio.trim() : "";
      const imageUrl = typeof row.imageUrl === "string" ? row.imageUrl.trim() : "";
      if (!name && !imageUrl) return null;
      return { name, role, bio, imageUrl };
    })
    .filter((item): item is HostEventGuest => item !== null)
    .slice(0, 24);
};

export const mapHostEventFromFirestore = (
  id: string,
  data: Record<string, unknown>,
): HostEvent => ({
  id,
  owner_id: typeof data.owner_id === "string" ? data.owner_id : "",
  name: typeof data.name === "string" ? data.name : "",
  tagline: typeof data.tagline === "string" ? data.tagline : "",
  description: typeof data.description === "string" ? data.description : "",
  theme: typeof data.theme === "string" ? data.theme : "",
  format: typeof data.format === "string" ? data.format : "",
  eligibility: typeof data.eligibility === "string" ? data.eligibility : "",
  teamSize: typeof data.teamSize === "string" ? data.teamSize : "",
  prize: typeof data.prize === "string" ? data.prize : "",
  rulebookUrl: typeof data.rulebookUrl === "string" ? data.rulebookUrl : "",
  registrationUrl: typeof data.registrationUrl === "string" ? data.registrationUrl : "",
  highlightNote: typeof data.highlightNote === "string" ? data.highlightNote : "",
  focusAreas: normalizeFocusAreas(data.focusAreas),
  schedule: normalizeHostSchedule(data.schedule),
  coverImageUrl: typeof data.coverImageUrl === "string" ? data.coverImageUrl : "",
  bannerImageUrl: typeof data.bannerImageUrl === "string" ? data.bannerImageUrl : "",
  logoUrl: typeof data.logoUrl === "string" ? data.logoUrl : "",
  galleryUrls: normalizeHostGalleryUrls(data.galleryUrls),
  guests: normalizeHostGuests(data.guests),
  organizerName: typeof data.organizerName === "string" ? data.organizerName : "",
  accentColor: typeof data.accentColor === "string" ? data.accentColor : "#00A3FF",
  fontPreset: typeof data.fontPreset === "string" ? data.fontPreset : "horizon",
  layoutStyle: typeof data.layoutStyle === "string" ? data.layoutStyle : "stage",
  start_at: typeof data.start_at === "string" ? data.start_at : "",
  end_at: typeof data.end_at === "string" ? data.end_at : "",
  location: typeof data.location === "string" ? data.location : "",
  capacity: typeof data.capacity === "number" ? data.capacity : Number(data.capacity) || 0,
  status:
    data.status === "published" || data.status === "closed" || data.status === "draft"
      ? data.status
      : "draft",
  public_hackathon_id:
    typeof data.public_hackathon_id === "string" ? data.public_hackathon_id : null,
  created_at: typeof data.created_at === "string" ? data.created_at : "",
  updated_at: typeof data.updated_at === "string" ? data.updated_at : "",
});

/** Admin-only inventory of host ops events (drafts + published). */
export async function fetchAllHostEventsForAdmin(db: Firestore): Promise<HostEvent[]> {
  const snapshot = await getDocs(collection(db, "host_events"));
  return snapshot.docs
    .map((item) => mapHostEventFromFirestore(item.id, item.data() as Record<string, unknown>))
    .sort((left, right) =>
      (right.updated_at || right.created_at).localeCompare(left.updated_at || left.created_at),
    );
}

/**
 * Build the public summary from structured host fields so the event page
 * keeps clear hierarchy instead of one wall of text.
 */
export const buildHostEventSummary = (event: Pick<
  HostEvent,
  "name" | "tagline" | "description" | "highlightNote" | "theme" | "focusAreas"
>) => {
  const blocks: string[] = [];
  if (event.tagline.trim()) blocks.push(event.tagline.trim());
  if (event.description.trim()) blocks.push(event.description.trim());
  if (event.highlightNote.trim()) blocks.push(`**${event.highlightNote.trim()}**`);
  if (event.theme.trim()) blocks.push(`### Theme\n${event.theme.trim()}`);
  if (event.focusAreas.length > 0) {
    blocks.push(`### Focus areas\n${event.focusAreas.map((area) => `- ${area}`).join("\n")}`);
  }
  return blocks.join("\n\n").trim() || `${event.name.trim()} — hosted on Cognisor.`;
};
