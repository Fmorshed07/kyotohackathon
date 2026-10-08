import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getDoc, setDoc, type Firestore } from "firebase/firestore";
import { publishHostEventPublicly } from "@/lib/aiHackathons";
import { mapHostEventFromFirestore } from "@/lib/hostEvents";
import { getEventPreviews } from "@/lib/eventPreviews";

vi.mock("firebase/firestore", async (original) => ({
  ...await original<typeof import("firebase/firestore")>(),
  doc: (_db: unknown, collection: string, id: string) => ({ path: `${collection}/${id}` }),
  getDoc: vi.fn(),
  setDoc: vi.fn().mockResolvedValue(undefined),
  updateDoc: vi.fn().mockResolvedValue(undefined),
}));

const db = {} as Firestore;
const host = (patch: Record<string, unknown> = {}) => mapHostEventFromFirestore("host-event", {
  owner_id: "host-id", name: "Hosted meetup", location: "Tokyo",
  start_at: "2026-10-09T18:00:00+09:00", end_at: "2026-10-09T22:00:00+09:00",
  ...patch,
});

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getDoc).mockResolvedValue({ exists: () => false } as Awaited<ReturnType<typeof getDoc>>);
});
afterEach(() => vi.restoreAllMocks());

describe("public host event dates", () => {
  it("publishes normalized start/end timestamps for date-based homepage previews", async () => {
    const published = await publishHostEventPublicly(db, host(), "host-id");
    expect(published).toMatchObject({ startAt: "2026-10-09T09:00:00.000Z", endAt: "2026-10-09T13:00:00.000Z" });
    expect(setDoc).toHaveBeenCalledWith(
      { path: `hackathons/${published.id}` },
      expect.objectContaining({ startAt: published.startAt, endAt: published.endAt }),
      { merge: false },
    );
    expect(getEventPreviews([published], Date.parse("2026-10-09T10:00:00Z")).live).toEqual([published]);
  });

  it("preserves manual status and paused submissions when adding dates to an existing listing", async () => {
    vi.mocked(getDoc).mockResolvedValue({
      exists: () => true,
      data: () => ({ createdBy: "host-id", status: "past", submissionMode: "paused", createdAt: "2026-10-01T00:00:00Z" }),
    } as Awaited<ReturnType<typeof getDoc>>);
    const published = await publishHostEventPublicly(db, host({ public_hackathon_id: "existing-listing" }), "host-id");
    expect(published).toMatchObject({ id: "existing-listing", status: "past", submissionMode: "paused" });
    const fields = vi.mocked(setDoc).mock.calls[0][1];
    expect(fields).toMatchObject({ startAt: published.startAt, endAt: published.endAt });
    expect(fields).not.toHaveProperty("submissionMode");
    expect(vi.mocked(setDoc).mock.calls[0][2]).toEqual({ merge: true });
  });

  it("does not invent an end time for events that have not supplied one", async () => {
    const published = await publishHostEventPublicly(db, host({ end_at: "" }), "host-id");
    expect(published.endAt).toBe("");
    expect(getEventPreviews([published], Date.parse("2026-10-09T10:00:00Z")).live).toEqual([]);
  });
});
