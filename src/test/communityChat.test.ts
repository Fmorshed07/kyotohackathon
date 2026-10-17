import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Firestore } from "firebase/firestore";
import { CHAT_MESSAGE_LIMIT, deleteCommunityMessage, getCommunityChannel, getCommunityChatRole, sendCommunityMessage, subscribeToCommunityMessages } from "@/lib/communityChat";
import type { SessionUser } from "@/types/portal";

const mocks = vi.hoisted(() => ({ set: vi.fn(), commit: vi.fn(), snapshot: vi.fn(), unsub: vi.fn(), remove: vi.fn() }));
vi.mock("firebase/firestore", () => ({
  collection: (_db: unknown, path: string) => ({ path }),
  doc: (...args: unknown[]) => args.length === 1 ? { path: `${(args[0] as { path: string }).path}/${"a".repeat(20)}`, id: "a".repeat(20) } : { path: args.slice(1).join("/") },
  writeBatch: () => ({ set: mocks.set, commit: mocks.commit }),
  serverTimestamp: () => "server-timestamp",
  query: (...args: unknown[]) => args,
  orderBy: (...args: unknown[]) => ({ orderBy: args }),
  limit: (value: number) => ({ limit: value }),
  onSnapshot: mocks.snapshot,
  deleteDoc: mocks.remove,
  setDoc: vi.fn(),
}));
const db = {} as Firestore;
const user: SessionUser = { id: "p", email: "private@example.com", role: "participant", profile: { fullName: "  Aki  " } };

beforeEach(() => { vi.clearAllMocks(); mocks.commit.mockResolvedValue(undefined); mocks.snapshot.mockReturnValue(mocks.unsub); });

describe("community message service", () => {
  it("atomically sends trimmed content and its posting limit without copying email", async () => {
    await sendCommunityMessage(db, "teams", user, "  Need a designer  ");
    expect(mocks.set.mock.calls[0][1]).toEqual({ user_id: "p", author_name: "Aki", author_role: "participant", body: "Need a designer", created_at: "server-timestamp" });
    expect(mocks.set.mock.calls[1]).toEqual([{ path: "community_chat_limits/p" }, { channel_id: "teams", message_id: "a".repeat(20), last_sent_at: "server-timestamp" }]);
    expect(mocks.commit).toHaveBeenCalledOnce();
    expect(JSON.stringify(mocks.set.mock.calls)).not.toContain(user.email);
  });

  it.each(["", "  \n ", "x".repeat(CHAT_MESSAGE_LIMIT + 1)])("rejects invalid body before writing", async body => {
    await expect(sendCommunityMessage(db, "general", user, body)).rejects.toThrow("characters");
    expect(mocks.commit).not.toHaveBeenCalled();
  });

  it("requires a registered account", async () => {
    await expect(sendCommunityMessage(db, "general", { ...user, role: undefined }, "Hello")).rejects.toThrow("registered");
    expect(mocks.commit).not.toHaveBeenCalled();
  });

  it("does not use the account email as a fallback display name", async () => {
    await sendCommunityMessage(db, "general", { ...user, profile: null }, "Hello");
    expect(mocks.set.mock.calls[0][1].author_name).toBe("Community member");
  });

  it.each(["judge", "mentor", "host"] as const)("does not badge an unapproved %s as staff", role => {
    expect(getCommunityChatRole({ ...user, role })).toBe("member");
    expect(getCommunityChatRole({ ...user, role, judgeApprovalStatus: "approved", hostApprovalStatus: "approved" })).toBe(role);
  });

  it("normalizes unknown channels to general", () => {
    expect(getCommunityChannel("teams").id).toBe("teams");
    expect(getCommunityChannel("private").id).toBe("general");
    expect(getCommunityChannel(null).id).toBe("general");
  });

  it("supports safe dynamically configured rooms for message sending, reading and moderation", async () => {
    const channel = "Design-help_2026";
    await sendCommunityMessage(db, channel, user, "Hello designers");
    expect(mocks.set.mock.calls[0][0].path).toBe(`community_channels/${channel}/messages/${"a".repeat(20)}`);
    subscribeToCommunityMessages(db, channel, vi.fn(), vi.fn());
    expect(mocks.snapshot.mock.calls[0][0][0]).toEqual({ path: `community_channels/${channel}/messages` });
    await deleteCommunityMessage(db, channel, "b".repeat(20));
    expect(mocks.remove).toHaveBeenCalledWith({ path: `community_channels/${channel}/messages/${"b".repeat(20)}` });
  });

  it.each(["", "../general", "general/messages", "_hidden", "a".repeat(65)])("rejects malformed channel IDs before any message action: %j", async channel => {
    await expect(sendCommunityMessage(db, channel, user, "Hello")).rejects.toThrow("channel ID");
    expect(() => subscribeToCommunityMessages(db, channel, vi.fn(), vi.fn())).toThrow("channel ID");
    await expect(deleteCommunityMessage(db, channel, "b".repeat(20))).rejects.toThrow("channel ID");
    expect(mocks.commit).not.toHaveBeenCalled();
    expect(mocks.snapshot).not.toHaveBeenCalled();
    expect(mocks.remove).not.toHaveBeenCalled();
  });

  it("subscribes to a bounded, ordered room and exposes pending/cache state", () => {
    const receive = vi.fn();
    const fail = vi.fn();
    const unsubscribe = subscribeToCommunityMessages(db, "general", receive, fail);
    expect(mocks.snapshot.mock.calls[0][0]).toEqual([{ path: "community_channels/general/messages" }, { orderBy: ["created_at", "desc"] }, { limit: 100 }]);
    expect(mocks.snapshot.mock.calls[0][1]).toEqual({ includeMetadataChanges: true });
    mocks.snapshot.mock.calls[0][2]({ docs: [2, 1].map(id => ({ id: String(id), metadata: { hasPendingWrites: id === 2 }, data: () => ({ user_id: "p", author_name: "Aki", author_role: "participant", body: "Hello", created_at: { toMillis: () => id * 1000 } }) })), metadata: { fromCache: true } });
    expect(receive.mock.calls[0][0].map((message: { id: string }) => message.id)).toEqual(["1", "2"]);
    expect(receive.mock.calls[0][0][1].pending).toBe(true);
    expect(receive.mock.calls[0][1]).toBe(true);
    unsubscribe();
    expect(mocks.unsub).toHaveBeenCalledOnce();
  });
});
