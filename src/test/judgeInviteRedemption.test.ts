import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  docs: new Map<string, Record<string, unknown>>(),
  set: vi.fn(), update: vi.fn(), get: vi.fn(), run: vi.fn(),
}));
vi.mock("firebase/firestore", async original => ({
  ...await original<typeof import("firebase/firestore")>(),
  doc: (_db: unknown, collection: string, id: string) => ({ path: `${collection}/${id}`, id }),
  runTransaction: mocks.run,
  increment: (value: number) => ({ increment: value }),
  arrayUnion: (...values: unknown[]) => ({ arrayUnion: values }),
}));
import { judgeInviteProblem, mapJudgeInvite, redeemJudgeInvite } from "@/lib/portalInvites";

const token = "test-judge-invite-token";
const event = "elevenlabs-meetup-tokyo-2026";
const inviteData = () => ({ type: "judge", status: "open", hackathon_ids: [event], used_by: [], use_count: 0, max_uses: 25 });
const user = { userId: "new-judge", email: "judge@example.com", displayName: "Test Judge" };
beforeEach(() => {
  vi.clearAllMocks();
  mocks.docs.clear();
  mocks.docs.set(`portal_invites/${token}`, inviteData());
  mocks.get.mockImplementation(async (ref: { path: string; id: string }) => ({
    id: ref.id, data: () => mocks.docs.get(ref.path), exists: () => mocks.docs.has(ref.path),
  }));
  mocks.run.mockImplementation(async (_db, callback) => callback({ get: mocks.get, set: mocks.set, update: mocks.update }));
});

describe("judge invitation redemption", () => {
  it("creates approved judge access and consumes one place in one transaction", async () => {
    expect(await redeemJudgeInvite({} as never, token, user)).toEqual({ hackathonIds: [event], primaryHackathonId: event });
    expect(mocks.run).toHaveBeenCalledOnce();
    expect(mocks.set).toHaveBeenCalledWith(expect.objectContaining({ path: "users/new-judge" }), expect.objectContaining({
      role: "judge", judgeApprovalStatus: "approved", hackathon_id: event, hackathon_ids: [event], invite_token: token, fullName: "Test Judge",
    }), { merge: true });
    expect(mocks.update).toHaveBeenCalledWith(expect.objectContaining({ path: `portal_invites/${token}` }), { use_count: { increment: 1 }, used_by: { arrayUnion: [user.userId] } });
  });

  it("preserves authoritative memberships and profile instead of a stale caller list", async () => {
    mocks.docs.set("users/new-judge", { role: "judge", judgeApprovalStatus: "pending", hackathon_ids: ["kyoto-2026"], fullName: "Existing name" });
    const result = await redeemJudgeInvite({} as never, token, { ...user, existingHackathonIds: ["not-assigned"] });
    expect(result.hackathonIds).toEqual([event, "kyoto-2026"]);
    expect(mocks.set.mock.calls[0][1]).not.toHaveProperty("fullName");
  });

  it("lets a returning invitee reopen a full invite without consuming another place", async () => {
    mocks.docs.set(`portal_invites/${token}`, { ...inviteData(), used_by: [user.userId], use_count: 25 });
    mocks.docs.set("users/new-judge", { role: "judge", judgeApprovalStatus: "approved", hackathon_ids: [event] });
    await expect(redeemJudgeInvite({} as never, token, user)).resolves.toMatchObject({ primaryHackathonId: event });
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it.each([
    ["missing", null], ["revoked", { ...inviteData(), status: "revoked" }],
    ["wrong type", { ...inviteData(), type: "team" }], ["full", { ...inviteData(), use_count: 25 }],
    ["no events", { ...inviteData(), hackathon_ids: [] }],
    ["invalid event", { ...inviteData(), hackathon_ids: ["../private"] }],
  ])("rejects a %s invitation without partial writes", async (_name, value) => {
    if (value) mocks.docs.set(`portal_invites/${token}`, value); else mocks.docs.clear();
    await expect(redeemJudgeInvite({} as never, token, user)).rejects.toThrow(/invite/i);
    expect(mocks.set).not.toHaveBeenCalled();
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it.each(["participant", "host", "admin"])("does not silently convert a %s account", async role => {
    mocks.docs.set("users/new-judge", { role });
    await expect(redeemJudgeInvite({} as never, token, user)).rejects.toThrow(/another portal role/);
    expect(mocks.set).not.toHaveBeenCalled();
  });

  it("propagates a rejected transaction so the page cannot claim access succeeded", async () => {
    mocks.run.mockRejectedValueOnce(new Error("permission-denied"));
    await expect(redeemJudgeInvite({} as never, token, user)).rejects.toThrow("permission-denied");
  });

  it("does not treat an unknown status as an open invite", () => {
    expect(judgeInviteProblem(mapJudgeInvite(token, { ...inviteData(), status: "closed" }))).toMatch(/invalid|revoked/);
  });

  it("rejects malformed tokens before accessing Firestore", async () => {
    await expect(redeemJudgeInvite({} as never, "../another-path", user)).rejects.toThrow(/invalid/);
    expect(mocks.run).not.toHaveBeenCalled();
  });
});
