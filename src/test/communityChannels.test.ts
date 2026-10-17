import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Firestore } from "firebase/firestore";
import {
  COMMUNITY_CHANNELS, canPostCommunityMessage, createCommunityChannel, getCommunityChannel,
  isCommunityChannelId, saveCommunityChannel, subscribeToCommunityChannels, validateCommunityChannelDraft,
  type CommunityChannel,
} from "@/lib/communityChannels";
import type { SessionUser } from "@/types/portal";

const mocks = vi.hoisted(() => ({ setDoc: vi.fn(), snapshot: vi.fn(), unsub: vi.fn(), collection: vi.fn() }));
vi.mock("firebase/firestore", () => ({
  collection: mocks.collection,
  doc: (...args: unknown[]) => args.length === 1
    ? { id: "NewChannel42", path: `${(args[0] as { path: string }).path}/NewChannel42` }
    : { id: args[2], path: args.slice(1).join("/") },
  setDoc: mocks.setDoc,
  serverTimestamp: () => "server-timestamp",
  query: (...args: unknown[]) => args,
  limit: (value: number) => ({ limit: value }),
  onSnapshot: mocks.snapshot,
}));

const db = {} as Firestore;
const admin: SessionUser = { id: "admin-account", email: "private@example.test", role: "admin" };
const draft: Omit<CommunityChannel, "id"> = {
  name: "design-help", title: "Build with other designers.", description: "Share your design questions.",
  placeholder: "What are you working on?", section: "Projects", type: "discussion", status: "open", order: 5,
};
const channel: CommunityChannel = { id: "design-help_2026", ...draft };

beforeEach(() => {
  vi.clearAllMocks();
  mocks.collection.mockImplementation((_db: unknown, path: string) => ({ path }));
  mocks.setDoc.mockResolvedValue(undefined);
  mocks.snapshot.mockReturnValue(mocks.unsub);
});

describe("community channel configuration", () => {
  it("retains the three discussion defaults and adds an admin announcement channel", () => {
    expect(COMMUNITY_CHANNELS.map(({ id, section, type, status, order }) => ({ id, section, type, status, order }))).toEqual([
      { id: "general", section: "Community", type: "discussion", status: "open", order: 10 },
      { id: "teams", section: "Community", type: "discussion", status: "open", order: 20 },
      { id: "judges", section: "Community", type: "discussion", status: "open", order: 30 },
      { id: "announcements", section: "Information", type: "announcement", status: "open", order: 0 },
    ]);
  });

  it("uses the supplied catalog's real status when choosing a fallback", () => {
    const archived: CommunityChannel = { ...channel, id: "archived-room", status: "archived" };
    const closed: CommunityChannel = { ...channel, id: "closed-room", status: "closed" };
    expect(getCommunityChannel("archived-room", [archived, closed])).toBe(archived);
    expect(getCommunityChannel("unknown", [archived, closed])).toBe(closed);
    expect(getCommunityChannel(null, [archived])).toBe(archived);
    expect(getCommunityChannel("unknown").id).toBe("general");
  });

  it("trims display text, keeps optional text blank and accepts all field boundaries", () => {
    expect(validateCommunityChannelDraft({ ...draft, name: " design-help ", title: " Hello ", description: "  ", placeholder: "", section: " Projects " }))
      .toEqual({ ...draft, name: "design-help", title: "Hello", description: "", placeholder: "", section: "Projects" });
    expect(validateCommunityChannelDraft({ ...draft, name: "n".repeat(48), title: "t".repeat(120), description: "d".repeat(300), placeholder: "p".repeat(200), section: "s".repeat(48), order: 999 }).order).toBe(999);
  });

  it.each([
    { name: " " }, { name: "n".repeat(49) }, { title: "" }, { title: "t".repeat(121) },
    { description: "d".repeat(301) }, { placeholder: "p".repeat(201) }, { section: "" }, { section: "s".repeat(49) },
    { order: -1 }, { order: 1000 }, { order: 0.5 }, { order: Number.NaN },
    { type: "private" }, { status: "hidden" }, { private: true },
  ])("rejects malformed configuration before writing: %j", async (patch) => {
    await expect(createCommunityChannel(db, admin, { ...draft, ...patch } as Omit<CommunityChannel, "id">)).rejects.toThrow();
    expect(mocks.collection).not.toHaveBeenCalled();
    expect(mocks.setDoc).not.toHaveBeenCalled();
  });

  it("accepts only safe dynamic channel IDs", async () => {
    for (const id of ["general", "A", "design-help_2026", "a".repeat(64)]) expect(isCommunityChannelId(id)).toBe(true);
    for (const id of ["", "../private", "room/messages", "_room", " room ", "a".repeat(65)]) {
      expect(isCommunityChannelId(id)).toBe(false);
      await expect(saveCommunityChannel(db, admin, { ...channel, id })).rejects.toThrow("ID");
    }
    expect(mocks.setDoc).not.toHaveBeenCalled();
  });

  it("creates a server-ID channel and saves only its complete normalized configuration and audit fields", async () => {
    await expect(createCommunityChannel(db, admin, { ...draft, name: " design-help " })).resolves.toBe("NewChannel42");
    expect(mocks.setDoc).toHaveBeenLastCalledWith({ id: "NewChannel42", path: "community_channels/NewChannel42" }, {
      ...draft, updated_by: admin.id, updated_at: "server-timestamp",
    });
    await saveCommunityChannel(db, admin, { ...channel, title: " Updated title ", status: "archived" });
    expect(mocks.setDoc).toHaveBeenLastCalledWith({ id: channel.id, path: `community_channels/${channel.id}` }, {
      ...draft, title: "Updated title", status: "archived", updated_by: admin.id, updated_at: "server-timestamp",
    });
    expect(JSON.stringify(mocks.setDoc.mock.calls)).not.toContain(admin.email);
  });

  it("requires administrator access and propagates failed saves", async () => {
    const participant = { ...admin, role: "participant" as const };
    await expect(createCommunityChannel(db, participant, draft)).rejects.toThrow("Administrator");
    await expect(saveCommunityChannel(db, participant, channel)).rejects.toThrow("Administrator");
    expect(mocks.setDoc).not.toHaveBeenCalled();
    mocks.setDoc.mockRejectedValueOnce(new Error("Connection lost"));
    await expect(saveCommunityChannel(db, admin, channel)).rejects.toThrow("Connection lost");
  });
});

describe("channel availability and posting", () => {
  it.each(["participant", "judge", "mentor", "host", "admin"] as const)("lets registered %s accounts discuss only in open channels", role => {
    const user = { ...admin, role };
    expect(canPostCommunityMessage(user, channel)).toBe(true);
    expect(canPostCommunityMessage(user, { ...channel, status: "closed" })).toBe(false);
    expect(canPostCommunityMessage(user, { ...channel, status: "archived" })).toBe(false);
    expect(canPostCommunityMessage(user, { ...channel, type: "announcement" })).toBe(role === "admin");
  });

  it("does not permit missing or unrecognized accounts to post", () => {
    expect(canPostCommunityMessage(null, channel)).toBe(false);
    expect(canPostCommunityMessage({ ...admin, id: "" }, channel)).toBe(false);
    expect(canPostCommunityMessage({ ...admin, role: undefined }, channel)).toBe(false);
    expect(canPostCommunityMessage({ ...admin, role: "outsider" } as unknown as SessionUser, channel)).toBe(false);
  });

  it("listens to a bounded metadata-aware catalog and retains configured closed/archive states", () => {
    const { id: _generalId, ...general } = COMMUNITY_CHANNELS[0];
    const { id: _teamsId, ...teams } = COMMUNITY_CHANNELS[1];
    const receive = vi.fn();
    const fail = vi.fn();
    const unsubscribe = subscribeToCommunityChannels(db, receive, fail);
    expect(mocks.snapshot.mock.calls[0][0]).toEqual([{ path: "community_channels" }, { limit: 100 }]);
    expect(mocks.snapshot.mock.calls[0][1]).toEqual({ includeMetadataChanges: true });
    expect(mocks.snapshot.mock.calls[0][3]).toBe(fail);
    const deliver = mocks.snapshot.mock.calls[0][2];
    deliver({ docs: [], metadata: { fromCache: true } });
    expect(receive.mock.calls[0][0]).toHaveLength(4);
    expect(receive.mock.calls[0][1]).toBe(true);
    deliver({ docs: [
      { id: "general", data: () => ({ ...general, status: "closed", updated_by: admin.id, updated_at: "timestamp" }) },
      { id: "teams", data: () => ({ ...teams, status: "archived" }) },
      { id: "custom-z", data: () => ({ ...draft, section: "Community", order: 0, name: "z-room" }) },
      { id: "custom-a", data: () => ({ ...draft, section: "Community", order: 0, name: "a-room" }) },
      { id: "private-room", data: () => ({ ...draft, visibility: "private" }) },
      { id: "broken-room", data: () => ({ ...draft, order: "first" }) },
    ], metadata: { fromCache: false } });
    const channels: CommunityChannel[] = receive.mock.calls[1][0];
    expect(channels.map(entry => entry.id)).toEqual(["custom-a", "custom-z", "general", "teams", "judges", "announcements"]);
    expect(channels.find(entry => entry.id === "general")).toMatchObject({ status: "closed", title: COMMUNITY_CHANNELS[0].title });
    expect(channels.find(entry => entry.id === "teams")?.status).toBe("archived");
    expect(receive.mock.calls[1][1]).toBe(false);
    unsubscribe();
    expect(mocks.unsub).toHaveBeenCalledOnce();
  });

  it("fails closed for malformed or incomplete existing built-in configurations", () => {
    const { id: _generalId, ...general } = COMMUNITY_CHANNELS[0];
    const receive = vi.fn();
    subscribeToCommunityChannels(db, receive, vi.fn());
    mocks.snapshot.mock.calls[0][2]({ docs: [
      { id: "general", data: () => ({ ...general, status: "closed", title: "" }) },
      { id: "teams", data: () => ({ status: "open" }) },
      { id: "incomplete-custom", data: () => ({ name: "custom", status: "open" }) },
    ], metadata: { fromCache: false } });
    const channels: CommunityChannel[] = receive.mock.calls[0][0];
    expect(channels.find(entry => entry.id === "general")?.status).toBe("closed");
    expect(channels.find(entry => entry.id === "teams")?.status).toBe("closed");
    expect(channels.some(entry => entry.id === "incomplete-custom")).toBe(false);
    expect(canPostCommunityMessage(admin, getCommunityChannel("general", channels))).toBe(false);
  });
});
