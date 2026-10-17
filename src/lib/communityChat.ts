import {
  collection, deleteDoc, doc, limit, onSnapshot, orderBy, query, serverTimestamp, writeBatch,
  type Firestore,
} from "firebase/firestore";
import type { SessionUser } from "@/types/portal";

export const COMMUNITY_CHANNELS = [
  { id: "general", name: "general", title: "Good conversations start here.", description: "Introduce yourself, share what you're building, and meet the community.", placeholder: "Say hello. What are you building?" },
  { id: "teams", name: "find-a-team", title: "Find your next collaborator.", description: "Share your event, idea, skills, timezone, and the teammate you're looking for.", placeholder: "I'm joining… I can help with… I'm looking for…" },
  { id: "judges", name: "ask-judges", title: "A little guidance goes a long way.", description: "Ask judges and mentors general questions. Keep private judging notes and scores out of chat.", placeholder: "Ask a question or offer advice to other builders…" },
] as const;
export type CommunityChannelId = typeof COMMUNITY_CHANNELS[number]["id"];
export type CommunityChatRole = "participant" | "judge" | "mentor" | "host" | "admin" | "member";
export const CHAT_MESSAGE_LIMIT = 2000;
export const CHAT_HISTORY_LIMIT = 100;
export const CHAT_COOLDOWN_MS = 3000;

export type CommunityMessage = {
  id: string;
  userId: string;
  authorName: string;
  authorRole: CommunityChatRole;
  body: string;
  createdAt: number | null;
  pending: boolean;
};

export function getCommunityChannel(id: string | null) {
  return COMMUNITY_CHANNELS.find(channel => channel.id === id) ?? COMMUNITY_CHANNELS[0];
}

export function getCommunityChatRole(user: SessionUser): CommunityChatRole {
  if ((user.role === "judge" || user.role === "mentor") && user.judgeApprovalStatus !== "approved") return "member";
  if (user.role === "host" && user.hostApprovalStatus !== "approved") return "member";
  return user.role ?? "member";
}

function messagesPath(channelId: CommunityChannelId) {
  if (!COMMUNITY_CHANNELS.some(channel => channel.id === channelId)) throw new Error("Unknown community channel.");
  return `community_channels/${channelId}/messages`;
}

/** One bounded listener; messages contain display metadata, never account emails. */
export function subscribeToCommunityMessages(
  db: Firestore,
  channelId: CommunityChannelId,
  onMessages: (messages: CommunityMessage[], fromCache: boolean) => void,
  onError: (error: Error) => void,
) {
  return onSnapshot(
    query(collection(db, messagesPath(channelId)), orderBy("created_at", "desc"), limit(CHAT_HISTORY_LIMIT)),
    { includeMetadataChanges: true },
    snapshot => {
      const messages = snapshot.docs.map(entry => {
        const data = entry.data({ serverTimestamps: "estimate" });
        return {
          id: entry.id,
          userId: data.user_id,
          authorName: data.author_name,
          authorRole: data.author_role,
          body: data.body,
          createdAt: typeof data.created_at?.toMillis === "function" ? data.created_at.toMillis() : null,
          pending: entry.metadata.hasPendingWrites,
        } as CommunityMessage;
      }).reverse();
      onMessages(messages, snapshot.metadata.fromCache);
    },
    onError,
  );
}

export async function sendCommunityMessage(db: Firestore, channelId: CommunityChannelId, user: SessionUser, text: string) {
  const body = text.trim();
  if (!user.id || !user.role) throw new Error("Sign in with a registered portal account to chat.");
  if (!body || body.length > CHAT_MESSAGE_LIMIT) throw new Error(`Write a message between 1 and ${CHAT_MESSAGE_LIMIT} characters.`);
  const reference = doc(collection(db, messagesPath(channelId)));
  const batch = writeBatch(db);
  batch.set(reference, {
    user_id: user.id,
    author_name: user.profile?.fullName?.trim().slice(0, 80) || "Community member",
    author_role: getCommunityChatRole(user),
    body,
    created_at: serverTimestamp(),
  });
  batch.set(doc(db, "community_chat_limits", user.id), {
    channel_id: channelId,
    message_id: reference.id,
    last_sent_at: serverTimestamp(),
  });
  await batch.commit();
}

export async function deleteCommunityMessage(db: Firestore, channelId: CommunityChannelId, messageId: string) {
  if (!/^[a-zA-Z0-9]{20}$/.test(messageId)) throw new Error("Invalid message.");
  await deleteDoc(doc(db, messagesPath(channelId), messageId));
}

export function communityChatError(error: unknown): string {
  const code = typeof error === "object" && error !== null && "code" in error ? String(error.code) : "";
  if (code.includes("permission-denied")) return "Chat access was denied. Wait a few seconds and retry. If it continues, sign in again or ask an organiser to check channel permissions.";
  if (code.includes("unavailable")) return "The chat connection is unavailable. Your draft is safe; reconnect and try again.";
  return "We couldn't complete that chat action. Your draft is safe; please try again.";
}
