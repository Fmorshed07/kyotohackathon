import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  ELEVENLABS_MEETUP,
  ELEVENLABS_MEETUP_ID,
  ELEVENLABS_MEETUP_SOURCE_URL,
  getBundledHackathon,
  getBundledEventStatus,
  mergeBundledHackathons,
} from "@/lib/elevenLabsMeetup";
import { PORTAL_HACKATHONS } from "@/lib/hackathons";
import { fetchAiHackathon, fetchPublishedHackathons, subscribeHackathon } from "@/lib/aiHackathons";
import type { Firestore } from "firebase/firestore";

const firestore = vi.hoisted(() => ({
  getDoc: vi.fn(),
  getDocs: vi.fn(),
  onSnapshot: vi.fn(),
}));

vi.mock("firebase/firestore", async (importOriginal) => ({
  ...await importOriginal<typeof import("firebase/firestore")>(),
  doc: (_db: unknown, _collection: string, id: string) => ({ id }),
  collection: () => ({}),
  query: () => ({}),
  getDoc: firestore.getDoc,
  getDocs: firestore.getDocs,
  onSnapshot: firestore.onSnapshot,
}));

const db = {} as Firestore;
const missing = () => ({ exists: () => false });
const row = (id: string, data: Record<string, unknown>) => ({ id, exists: () => true, data: () => data });

beforeEach(() => {
  vi.clearAllMocks();
  firestore.getDoc.mockResolvedValue(missing());
  firestore.getDocs.mockResolvedValue({ docs: [] });
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe("verified ElevenLabs meetup", () => {
  it("retains the official Tokyo date, timezone, waitlist, venue and source", () => {
    const event = getBundledHackathon(ELEVENLABS_MEETUP_ID, new Date("2026-10-08T00:00:00Z"))!;
    expect(event.startAt).toBe("2026-10-09T09:00:00Z");
    expect(event.endAt).toBe("2026-10-09T13:00:00Z");
    expect(event.timezone).toBe("Asia/Tokyo");
    expect(event.eventDate).toContain("18:00–22:00 JST");
    expect(event.sourceUrl).toBe(ELEVENLABS_MEETUP_SOURCE_URL);
    expect(event.lumaUrl).toBe(ELEVENLABS_MEETUP_SOURCE_URL);
    expect(event.location).toContain("Roppongi Hills Mori Tower");
    expect(event.registrationStatus).toBe("waitlist");
    expect(event.ticketPriceLabel).toBe("Free");
    expect(event.schedule).toHaveLength(7);
    expect(event.judgingCriteriaNames).toHaveLength(5);
    expect(event.hostProfiles).toHaveLength(5);
    expect(event.organizerLinks).toHaveLength(3);
    expect(event.teamSize).toContain("3");
    expect(PORTAL_HACKATHONS.some((entry) => entry.id === event.id)).toBe(false);
    expect(getBundledHackathon("unknown-event")).toBeNull();
  });

  it("changes lifecycle at the actual event boundaries and closes past submissions", () => {
    const { startAt, endAt } = ELEVENLABS_MEETUP;
    expect(getBundledEventStatus(startAt!, endAt!, new Date("2026-10-09T08:59:59Z"))).toBe("upcoming");
    expect(getBundledEventStatus(startAt!, endAt!, new Date(startAt!))).toBe("active");
    expect(getBundledEventStatus(startAt!, endAt!, new Date("2026-10-09T12:59:59Z"))).toBe("active");
    const past = getBundledHackathon(ELEVENLABS_MEETUP_ID, new Date(endAt!));
    expect(past?.status).toBe("past");
    expect(past?.submissionMode).toBe("closed");
  });

  it("deduplicates the event while preserving cloud edits and explicit unpublish", () => {
    const override = { ...ELEVENLABS_MEETUP, name: "Host edited title", published: false };
    const merged = mergeBundledHackathons([override, { ...ELEVENLABS_MEETUP, id: "another-event" }]);
    expect(merged).toHaveLength(2);
    expect(merged.find((event) => event.id === ELEVENLABS_MEETUP_ID)).toMatchObject({
      name: "Host edited title", published: false,
    });
  });
});

describe("curated public event loading", () => {
  it("adds the source-backed listing to the published cloud directory", async () => {
    const events = await fetchPublishedHackathons(db);
    expect(events.map((event) => event.id)).toEqual([ELEVENLABS_MEETUP_ID]);
  });

  it("lets a cloud listing override bundled fields without losing source metadata", async () => {
    const saved = row(ELEVENLABS_MEETUP_ID, { name: "Edited by host", published: true, status: "past", sourceLifecycleAutomatic: false });
    firestore.getDocs.mockResolvedValue({ docs: [saved] });
    firestore.getDoc.mockResolvedValue(saved);
    const events = await fetchPublishedHackathons(db);
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ name: "Edited by host", status: "past", submissionMode: "closed", timezone: "Asia/Tokyo", sourceUrl: ELEVENLABS_MEETUP_SOURCE_URL });
  });

  it("derives the imported cloud lifecycle from its actual timestamps", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-09T10:00:00Z"));
    firestore.getDoc.mockResolvedValue(row(ELEVENLABS_MEETUP_ID, { name: ELEVENLABS_MEETUP.name, published: true, status: "upcoming" }));
    expect((await fetchAiHackathon(db, ELEVENLABS_MEETUP_ID))?.status).toBe("active");
    vi.setSystemTime(new Date("2026-10-09T13:00:00Z"));
    expect((await fetchAiHackathon(db, ELEVENLABS_MEETUP_ID))?.status).toBe("past");
    expect((await fetchAiHackathon(db, ELEVENLABS_MEETUP_ID))?.submissionMode).toBe("closed");
  });

  it("preserves explicit organiser lifecycle and submission decisions", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-09T14:00:00Z"));
    firestore.getDoc.mockResolvedValue(row(ELEVENLABS_MEETUP_ID, {
      name: ELEVENLABS_MEETUP.name, published: true, status: "active",
      sourceLifecycleAutomatic: false, submissionMode: "paused",
    }));
    expect(await fetchAiHackathon(db, ELEVENLABS_MEETUP_ID)).toMatchObject({ status: "active", submissionMode: "paused", sourceLifecycleAutomatic: false });
    firestore.getDoc.mockResolvedValue(row("another-event", { name: "Other host event", published: true, status: "upcoming" }));
    expect((await fetchAiHackathon(db, "another-event"))?.status).toBe("upcoming");
  });

  it("does not resurrect a cloud event that the organiser unpublished", async () => {
    firestore.getDoc.mockResolvedValue(row(ELEVENLABS_MEETUP_ID, { name: "Hidden event", published: false }));
    expect(await fetchPublishedHackathons(db)).toEqual([]);
    expect(await fetchAiHackathon(db, ELEVENLABS_MEETUP_ID)).toBeNull();
  });

  it("respects an unreadable curated override", async () => {
    firestore.getDoc.mockRejectedValue(Object.assign(new Error("No access"), { code: "permission-denied" }));
    expect(await fetchPublishedHackathons(db)).toEqual([]);
    expect(await fetchAiHackathon(db, ELEVENLABS_MEETUP_ID)).toBeNull();
  });

  it("resolves the curated page offline while retaining errors for ordinary events and directory loads", async () => {
    const offline = Object.assign(new Error("Offline"), { code: "unavailable" });
    vi.spyOn(console, "warn").mockImplementation(() => {});
    firestore.getDoc.mockRejectedValue(offline);
    expect((await fetchAiHackathon(db, ELEVENLABS_MEETUP_ID))?.id).toBe(ELEVENLABS_MEETUP_ID);
    await expect(fetchAiHackathon(db, "another-event")).rejects.toThrow("Offline");
    firestore.getDocs.mockRejectedValue(offline);
    await expect(fetchPublishedHackathons(db)).rejects.toThrow("Offline");
  });

  it("shows the bundled event immediately then applies live cloud edits", () => {
    const unsubscribe = vi.fn();
    firestore.onSnapshot.mockReturnValue(unsubscribe);
    const onChange = vi.fn();
    const onError = vi.fn();
    expect(subscribeHackathon(db, ELEVENLABS_MEETUP_ID, onChange, onError)).toBe(unsubscribe);
    expect(onChange.mock.calls[0][0].id).toBe(ELEVENLABS_MEETUP_ID);
    const handleSnapshot = firestore.onSnapshot.mock.calls[0][1];
    handleSnapshot(row(ELEVENLABS_MEETUP_ID, { name: "Live host edit", published: true }));
    expect(onChange.mock.lastCall?.[0].name).toBe("Live host edit");
    handleSnapshot(missing());
    expect(onChange.mock.lastCall?.[0].id).toBe(ELEVENLABS_MEETUP_ID);
    const handleError = firestore.onSnapshot.mock.calls[0][2];
    const access = Object.assign(new Error("No access"), { code: "permission-denied" });
    handleError(access);
    expect(onChange.mock.lastCall?.[0]).toBeNull();
    expect(onError).toHaveBeenCalledWith(access);
  });
});
