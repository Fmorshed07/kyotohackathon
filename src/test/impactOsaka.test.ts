import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Firestore } from "firebase/firestore";
import { IMPACT_OSAKA, IMPACT_OSAKA_ID, IMPACT_OSAKA_DEFAULT_CRITERIA, getSubmissionTracks } from "@/lib/impactOsaka";
import { getBundledHackathon } from "@/lib/bundledHackathons";
import { assertSubmissionsWritable, fetchAiHackathon, fetchAllHackathonsForAdmin, fetchJoinablePortalHackathons, setHackathonSubmissionMode } from "@/lib/aiHackathons";
import { fetchHackathonCriteria } from "@/lib/hackathonCriteria";

const backend = vi.hoisted(() => ({ getDoc: vi.fn(), getDocs: vi.fn(), setDoc: vi.fn(), transactionSet: vi.fn() }));
vi.mock("@/lib/firebaseClient", () => ({ getFirebaseAuth: () => ({ currentUser: { uid: "organiser" } }) }));
vi.mock("firebase/firestore", async (original) => ({
  ...await original<typeof import("firebase/firestore")>(),
  doc: (_db: unknown, collection: string, id: string) => ({ id, collection }),
  collection: () => ({}), query: () => ({}),
  getDoc: backend.getDoc, getDocs: backend.getDocs,
  setDoc: backend.setDoc,
  runTransaction: async (_db: unknown, callback: (transaction: unknown) => unknown) => callback({ get: backend.getDoc, set: backend.transactionSet }),
}));
const db = {} as Firestore;
const missing = () => ({ exists: () => false });
const row = (data: Record<string, unknown>) => ({ id: IMPACT_OSAKA_ID, exists: () => true, data: () => data });

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-10-17T00:00:00Z"));
  vi.clearAllMocks();
  backend.getDoc.mockReset().mockResolvedValue(missing());
  backend.getDocs.mockReset().mockResolvedValue({ docs: [] });
});
afterEach(() => vi.useRealTimers());

describe("Impact Osaka event workflow", () => {
  it("uses the updated single video challenge, online programme and official registration", () => {
    const event = getBundledHackathon(IMPACT_OSAKA_ID)!;
    expect(event).toMatchObject({ status: "upcoming", submissionMode: "open", timezone: "Asia/Tokyo", lumaUrl: "https://luma.com/jnwil7tv" });
    expect(new Intl.DateTimeFormat("en-GB", { timeZone: event.timezone, hour: "2-digit", minute: "2-digit" }).format(new Date(event.startAt!))).toBe("17:00");
    expect(Date.parse(event.endAt!)).toBe(event.endAtMs);
    expect(new Intl.DateTimeFormat("en-GB", { timeZone: event.timezone, hour: "2-digit", minute: "2-digit" }).format(new Date(event.endAt!))).toBe("21:00");
    expect(event.location).toContain("Discord");
    expect(getSubmissionTracks(IMPACT_OSAKA_ID)).toEqual([{ id: "ai-video", name: "AI video for real-world impact" }]);
    expect(event.schedule).toHaveLength(5);
    expect(event.sourceDescription).not.toMatch(/5 October|two tracks|Track 01|Track 02/i);
    expect(event.judgingCriteriaNames).toEqual(["Problem Relevance", "Innovation", "ElevenLabs Integration", "Video Execution & Storytelling", "Real-World Impact & Scalability"]);
  });

  it("appears in participant enrollment and the admin catalog before a cloud row exists", async () => {
    expect((await fetchJoinablePortalHackathons(db)).map((event) => event.id)).toContain(IMPACT_OSAKA_ID);
    expect((await fetchAllHackathonsForAdmin(db)).map((event) => event.id)).toContain(IMPACT_OSAKA_ID);
  });

  it("retains an unpublished Osaka override when the admin catalog falls back to the published query", async () => {
    backend.getDocs.mockRejectedValueOnce(new Error("Admin list unavailable"));
    backend.getDoc.mockImplementation(async (ref: { id: string }) => ref.id === IMPACT_OSAKA_ID
      ? row({ ...IMPACT_OSAKA, name: "Organiser's private Osaka listing", published: false, submissionMode: "paused" })
      : missing());

    const catalog = await fetchAllHackathonsForAdmin(db);

    expect(catalog.find((event) => event.id === IMPACT_OSAKA_ID)).toMatchObject({
      name: "Organiser's private Osaka listing", published: false, submissionMode: "paused",
    });
  });

  it("materialises a complete listing and rubric before the organiser pauses the bundled event", async () => {
    await setHackathonSubmissionMode(db, IMPACT_OSAKA_ID, "paused");
    expect(backend.transactionSet).toHaveBeenCalledWith(expect.objectContaining({ collection: "hackathons" }), expect.objectContaining({ name: IMPACT_OSAKA.name, createdBy: "organiser", endAtMs: IMPACT_OSAKA.endAtMs }));
    expect(backend.transactionSet).toHaveBeenCalledWith(expect.objectContaining({ collection: "hackathon_criteria" }), expect.objectContaining({ criteria: IMPACT_OSAKA_DEFAULT_CRITERIA }));
    expect(backend.setDoc).toHaveBeenCalledWith(expect.objectContaining({ id: IMPACT_OSAKA_ID }), { submissionMode: "paused" }, { merge: true });
  });

  it("does not reset an existing rubric when an organiser manages the bundled listing", async () => {
    backend.getDoc.mockImplementation(async (ref: { collection: string }) => ref.collection === "hackathon_criteria" ? row({ criteria: [{ id: "existing", weight: 100 }] }) : missing());
    await setHackathonSubmissionMode(db, IMPACT_OSAKA_ID, "closed");
    expect(backend.transactionSet).toHaveBeenCalledTimes(1);
    expect(backend.transactionSet.mock.calls[0][0].collection).toBe("hackathons");
  });

  it("switches to live at its start and closes at its end", async () => {
    backend.getDoc.mockResolvedValue(row({ ...IMPACT_OSAKA, status: "upcoming" }));
    vi.setSystemTime(new Date(IMPACT_OSAKA.startAt!));
    expect(await fetchAiHackathon(db, IMPACT_OSAKA_ID)).toMatchObject({ status: "active", submissionMode: "open" });
    expect((await fetchAiHackathon(db, IMPACT_OSAKA_ID))?.coverImageUrl).toBe(IMPACT_OSAKA.coverImageUrl);
    await expect(assertSubmissionsWritable(db, IMPACT_OSAKA_ID)).resolves.toBeUndefined();
    vi.setSystemTime(new Date(IMPACT_OSAKA.endAt!));
    expect(await fetchAiHackathon(db, IMPACT_OSAKA_ID)).toMatchObject({ status: "past", submissionMode: "closed" });
    await expect(assertSubmissionsWritable(db, IMPACT_OSAKA_ID)).rejects.toThrow("Submissions are closed");
  });

  it("does not permit late saves through an absent fallback document", async () => {
    vi.setSystemTime(new Date(IMPACT_OSAKA.endAt!));
    await expect(assertSubmissionsWritable(db, IMPACT_OSAKA_ID)).rejects.toThrow("Submissions are closed");
  });

  it.each(["paused", "closed"])("preserves an organiser's %s gate while live", async (submissionMode) => {
    vi.setSystemTime(new Date(IMPACT_OSAKA.startAt!));
    backend.getDoc.mockResolvedValue(row({ ...IMPACT_OSAKA, submissionMode }));
    expect((await fetchAiHackathon(db, IMPACT_OSAKA_ID))?.submissionMode).toBe(submissionMode);
    await expect(assertSubmissionsWritable(db, IMPACT_OSAKA_ID)).rejects.toThrow();
  });

  it("permits an explicit reopening after the deadline and rejects unpublished events", async () => {
    vi.setSystemTime(new Date(IMPACT_OSAKA.endAt!));
    backend.getDoc.mockResolvedValue(row({ ...IMPACT_OSAKA, submissionMode: "open" }));
    await expect(assertSubmissionsWritable(db, IMPACT_OSAKA_ID)).resolves.toBeUndefined();
    backend.getDoc.mockResolvedValue(row({ ...IMPACT_OSAKA, submissionMode: "open", published: false }));
    await expect(assertSubmissionsWritable(db, IMPACT_OSAKA_ID)).rejects.toThrow("locked");
    expect(await fetchAiHackathon(db, IMPACT_OSAKA_ID)).toBeNull();
  });

  it("uses the five Osaka criteria for a missing rubric and retains saved organiser weights", async () => {
    const defaults = await fetchHackathonCriteria(db, IMPACT_OSAKA_ID);
    expect(defaults.map((criterion) => criterion.title)).toEqual(IMPACT_OSAKA.judgingCriteriaNames);
    expect(defaults.reduce((total, criterion) => total + criterion.weight, 0)).toBe(100);
    expect(defaults).toEqual(IMPACT_OSAKA_DEFAULT_CRITERIA);
    const edited = [{ id: "custom", title: "Organiser rubric", weight: 100, questions: [] }];
    backend.getDoc.mockResolvedValue(row({ criteria: edited }));
    expect(await fetchHackathonCriteria(db, IMPACT_OSAKA_ID)).toEqual(edited);
  });
});
