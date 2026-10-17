import { collection, doc, limit, onSnapshot, query, serverTimestamp, setDoc, type Firestore } from "firebase/firestore";
import type { SessionUser } from "@/types/portal";

export type CommunityChannelId = string;
export type CommunityChannel = {
  id: CommunityChannelId;
  name: string;
  title: string;
  description: string;
  placeholder: string;
  section: string;
  type: "discussion" | "announcement";
  status: "open" | "closed" | "archived";
  order: number;
};

export const COMMUNITY_CHANNELS: CommunityChannel[] = [
  { id: "general", name: "general", title: "Good conversations start here.", description: "Introduce yourself, share what you're building, and meet the community.", placeholder: "Say hello. What are you building?", section: "Community", type: "discussion", status: "open", order: 10 },
  { id: "teams", name: "find-a-team", title: "Find your next collaborator.", description: "Share your event, idea, skills, timezone, and the teammate you're looking for.", placeholder: "I'm joining… I can help with… I'm looking for…", section: "Community", type: "discussion", status: "open", order: 20 },
  { id: "judges", name: "ask-judges", title: "A little guidance goes a long way.", description: "Ask judges and mentors general questions. Keep private judging notes and scores out of chat.", placeholder: "Ask a question or offer advice to other builders…", section: "Community", type: "discussion", status: "open", order: 30 },
  { id: "announcements", name: "announcements", title: "The latest from the community.", description: "Official updates and announcements from the organisers.", placeholder: "Share an update with the community…", section: "Information", type: "announcement", status: "open", order: 0 },
];

const CHANNEL_LIMIT = 100;
const CONFIG_FIELDS = ["name", "title", "description", "placeholder", "section", "type", "status", "order"] as const;
const DOCUMENT_FIELDS = new Set<string>([...CONFIG_FIELDS, "updated_by", "updated_at"]);
const ACCOUNT_ROLES = new Set(["participant", "judge", "mentor", "host", "admin"]);

export function isCommunityChannelId(value: unknown): value is CommunityChannelId {
  return typeof value === "string" && /^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/.test(value);
}

export function getCommunityChannel(id: string | null | undefined, catalog: readonly CommunityChannel[] = COMMUNITY_CHANNELS): CommunityChannel {
  const channels = catalog.length ? catalog : COMMUNITY_CHANNELS;
  return channels.find(channel => channel.id === id)
    ?? channels.find(channel => channel.status !== "archived")
    ?? channels[0];
}

/** Pending staff may discuss as members; announcements require an administrator. */
export function canPostCommunityMessage(user: SessionUser | null | undefined, channel: CommunityChannel | null | undefined): boolean {
  return Boolean(user?.id?.trim() && user.role && ACCOUNT_ROLES.has(user.role)
    && channel?.status === "open" && isCommunityChannelId(channel.id)
    && (channel.type === "discussion" || (channel.type === "announcement" && user.role === "admin")));
}

/** Normalize the complete public configuration before a channel write. */
export function validateCommunityChannelDraft(draft: Omit<CommunityChannel, "id">): Omit<CommunityChannel, "id"> {
  if (!draft || typeof draft !== "object" || Array.isArray(draft)
    || Object.keys(draft).some(key => !(CONFIG_FIELDS as readonly string[]).includes(key))) {
    throw new Error("Invalid community channel configuration.");
  }
  const text = (field: Exclude<typeof CONFIG_FIELDS[number], "order">, minimum: number, maximum: number) => {
    const raw = draft[field];
    if (typeof raw !== "string") throw new Error(`Channel ${field} must be text.`);
    const value = raw.trim();
    if (value.length < minimum || value.length > maximum) {
      throw new Error(`Channel ${field} must contain ${minimum}–${maximum} characters.`);
    }
    return value;
  };
  const name = text("name", 1, 48);
  const title = text("title", 1, 120);
  const description = text("description", 0, 300);
  const placeholder = text("placeholder", 0, 200);
  const section = text("section", 1, 48);
  const type = text("type", 1, 12);
  const status = text("status", 1, 8);
  if (type !== "discussion" && type !== "announcement") throw new Error("Choose a discussion or announcement channel.");
  if (status !== "open" && status !== "closed" && status !== "archived") throw new Error("Choose an open, closed, or archived channel status.");
  if (!Number.isInteger(draft.order) || draft.order < 0 || draft.order > 999) throw new Error("Channel order must be a whole number between 0 and 999.");
  return { name, title, description, placeholder, section, type, status, order: draft.order };
}

function requireAdmin(user: SessionUser) {
  if (!user?.id?.trim() || user.role !== "admin") throw new Error("Administrator access is required to manage community channels.");
}

function channelDocument(user: SessionUser, draft: Omit<CommunityChannel, "id">) {
  return { ...draft, updated_by: user.id, updated_at: serverTimestamp() };
}

export async function createCommunityChannel(db: Firestore, user: SessionUser, draft: Omit<CommunityChannel, "id">): Promise<string> {
  requireAdmin(user);
  const normalized = validateCommunityChannelDraft(draft);
  const reference = doc(collection(db, "community_channels"));
  await setDoc(reference, channelDocument(user, normalized));
  return reference.id;
}

export async function saveCommunityChannel(db: Firestore, user: SessionUser, channel: CommunityChannel): Promise<void> {
  requireAdmin(user);
  if (!isCommunityChannelId(channel?.id)) throw new Error("Invalid community channel ID.");
  const { id, ...draft } = channel;
  const normalized = validateCommunityChannelDraft(draft);
  await setDoc(doc(db, "community_channels", id), channelDocument(user, normalized));
}

function readChannel(id: string, data: Record<string, unknown>): CommunityChannel | null {
  if (!isCommunityChannelId(id) || !data || Object.keys(data).some(key => !DOCUMENT_FIELDS.has(key))
    || CONFIG_FIELDS.some(field => !Object.prototype.hasOwnProperty.call(data, field))) return null;
  const config = Object.fromEntries(CONFIG_FIELDS.map(field => [field, data[field]]));
  try {
    return { id, ...validateCommunityChannelDraft(config as Omit<CommunityChannel, "id">) };
  } catch {
    return null;
  }
}

/** A bounded public channel catalog; existing messages stay available in closed rooms. */
export function subscribeToCommunityChannels(
  db: Firestore,
  onChannels: (channels: CommunityChannel[], fromCache: boolean) => void,
  onError: (error: Error) => void,
) {
  return onSnapshot(
    query(collection(db, "community_channels"), limit(CHANNEL_LIMIT)),
    { includeMetadataChanges: true },
    snapshot => {
      const channels = new Map(COMMUNITY_CHANNELS.map(channel => [channel.id, { ...channel }]));
      for (const entry of snapshot.docs) {
        const channel = readChannel(entry.id, entry.data());
        if (channel) channels.set(channel.id, channel);
        else {
          // An existing malformed override must never reopen a built-in room.
          const builtin = COMMUNITY_CHANNELS.find(defaultChannel => defaultChannel.id === entry.id);
          if (builtin) channels.set(builtin.id, { ...builtin, status: "closed" });
        }
      }
      onChannels([...channels.values()].sort((left, right) => left.section.localeCompare(right.section)
        || left.order - right.order || left.name.localeCompare(right.name) || left.id.localeCompare(right.id)), snapshot.metadata.fromCache);
    },
    onError,
  );
}
