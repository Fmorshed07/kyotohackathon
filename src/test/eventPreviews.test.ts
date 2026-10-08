import { describe, expect, it } from "vitest";
import type { HostedHackathon } from "@/lib/aiHackathons";
import { ELEVENLABS_MEETUP } from "@/lib/elevenLabsMeetup";
import { formatEventPreviewDate, getEventPreviews, getEventTimeRange } from "@/lib/eventPreviews";

const event = (patch: Partial<HostedHackathon> = {}): HostedHackathon => ({
  ...ELEVENLABS_MEETUP,
  id: "test-event",
  name: "Test event",
  startAt: "2026-10-09T09:00:00Z",
  endAt: "2026-10-09T13:00:00Z",
  ...patch,
});

describe("date-based homepage previews", () => {
  it("becomes live exactly at the start and moves to past exactly at the end", () => {
    const scheduled = event();
    const start = Date.parse(scheduled.startAt!);
    const end = Date.parse(scheduled.endAt!);
    expect(getEventPreviews([scheduled], start - 1)).toEqual({ live: [], upcoming: [scheduled], past: [] });
    expect(getEventPreviews([scheduled], start)).toEqual({ live: [scheduled], upcoming: [], past: [] });
    expect(getEventPreviews([scheduled], end - 1).live).toEqual([scheduled]);
    expect(getEventPreviews([scheduled], end)).toEqual({ live: [], upcoming: [], past: [scheduled] });
  });

  it("uses real timestamps rather than a manually selected lifecycle or display date", () => {
    const live = event({ id: "live", status: "past", eventDate: "Date to be confirmed" });
    const ended = event({ id: "ended", status: "active", endAt: "2026-10-09T10:00:00Z" });
    const next = event({ id: "next", status: "active", startAt: "2026-10-10T09:00:00Z", endAt: "2026-10-10T13:00:00Z" });
    expect(getEventPreviews([ended, next, live], Date.parse("2026-10-09T11:00:00Z"))).toEqual({ live: [live], upcoming: [next], past: [ended] });
  });

  it("compares timezone offsets as the same instant", () => {
    const tokyo = event({ startAt: "2026-10-09T18:00:00+09:00", endAt: "2026-10-09T22:00:00+09:00" });
    expect(getEventPreviews([tokyo], Date.parse("2026-10-09T09:00:00Z")).live).toEqual([tokyo]);
    expect(getEventPreviews([tokyo], Date.parse("2026-10-09T13:00:00Z")).live).toEqual([]);
  });

  it("never previews an unpublished event", () => {
    expect(getEventPreviews([event({ published: false })], Date.parse("2026-10-09T10:00:00Z"))).toEqual({ live: [], upcoming: [], past: [] });
  });

  it.each([
    { startAt: undefined },
    { endAt: undefined },
    { startAt: "invalid" },
    { endAt: "invalid" },
    { endAt: "2026-10-09T08:00:00Z" },
    { endAt: "2026-10-09T09:00:00Z" },
  ])("excludes incomplete or invalid date ranges: %j", (patch) => {
    const invalid = event(patch);
    expect(getEventTimeRange(invalid)).toBeNull();
    expect(getEventPreviews([invalid], Date.parse("2026-10-09T08:00:00Z"))).toEqual({ live: [], upcoming: [], past: [] });
  });

  it("prioritizes live events ending soonest and future events starting soonest", () => {
    const late = event({ id: "late", endAt: "2026-10-09T14:00:00Z" });
    const early = event({ id: "early", endAt: "2026-10-09T12:00:00Z" });
    const next = event({ id: "next", startAt: "2026-10-10T09:00:00Z", endAt: "2026-10-10T13:00:00Z" });
    const later = event({ id: "later", startAt: "2026-10-11T09:00:00Z", endAt: "2026-10-11T13:00:00Z" });
    expect(getEventPreviews([later, late, next, early], Date.parse("2026-10-09T11:00:00Z"))).toEqual({ live: [early, late], upcoming: [next, later], past: [] });
  });

  it("includes the published finished AI Ideathon when only its display dates exist", () => {
    const ideathon = event({
      id: "ai-ideathon-2026", name: "AI Ideathon 2026", status: "past",
      eventDate: "August 13–15, 2026", startAt: undefined, endAt: undefined,
      createdAt: "2026-08-01T00:00:00Z",
    });
    const invalidNonpast = event({ id: "invalid-active", status: "active", startAt: "invalid" });
    const privatePast = event({ ...ideathon, id: "private-past", published: false });
    expect(getEventPreviews([invalidNonpast, privatePast, ideathon], Date.parse("2026-10-09T08:00:00Z")))
      .toEqual({ live: [], upcoming: [], past: [ideathon] });
  });

  it("orders ended events newest first even when their saved statuses or creation dates differ", () => {
    const newer = event({ id: "newer", status: "upcoming", createdAt: "2026-07-01T00:00:00Z" });
    const older = event({
      id: "older", status: "active", startAt: "2026-10-08T09:00:00Z", endAt: "2026-10-08T13:00:00Z",
      createdAt: "2026-10-09T00:00:00Z",
    });
    expect(getEventPreviews([older, newer], Date.parse("2026-10-09T13:00:00Z")).past).toEqual([newer, older]);
  });

  it("orders undated archives by their available timestamps and keeps wholly undated rows", () => {
    const first = event({ id: "first", status: "past", startAt: undefined, endAt: undefined, createdAt: "2026-08-01T00:00:00Z" });
    const second = event({ id: "second", status: "past", startAt: "2026-09-01T18:00:00+09:00", endAt: undefined, createdAt: "2026-07-01T00:00:00Z" });
    const unknownA = event({ id: "unknown-a", name: "Alpha", status: "past", startAt: "invalid", endAt: "invalid", createdAt: "invalid" });
    const unknownZ = event({ ...unknownA, id: "unknown-z", name: "Zeta" });
    expect(getEventPreviews([unknownZ, first, unknownA, second], Date.parse("2026-10-09T08:00:00Z")).past)
      .toEqual([second, first, unknownA, unknownZ]);
  });

  it("keeps dated past events ahead of undated events imported more recently", () => {
    const dated = event({
      id: "september-event", startAt: "2026-09-01T09:00:00Z", endAt: "2026-09-01T13:00:00Z",
      createdAt: "2026-08-01T00:00:00Z",
    });
    const recentlyImported = event({
      id: "august-ideathon", eventDate: "August 13–15, 2026", status: "past",
      startAt: undefined, endAt: undefined, createdAt: "2026-10-08T00:00:00Z",
    });
    const olderUndated = event({
      id: "older-undated", status: "past", startAt: undefined, endAt: undefined,
      createdAt: "2026-09-01T00:00:00Z",
    });
    expect(getEventPreviews([olderUndated, recentlyImported, dated], Date.parse("2026-10-09T08:00:00Z")).past)
      .toEqual([dated, recentlyImported, olderUndated]);
  });

  it("does not also archive a manually past event whose valid dates place it in the future", () => {
    const future = event({ status: "past" });
    expect(getEventPreviews([future], Date.parse("2026-10-09T08:00:00Z")))
      .toEqual({ live: [], upcoming: [future], past: [] });
  });
});

describe("preview date labels", () => {
  it("formats dates in the event timezone", () => {
    const label = formatEventPreviewDate("2026-10-09T09:00:00Z", "Asia/Tokyo");
    const expected = new Intl.DateTimeFormat(undefined, {
      month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit", timeZoneName: "short", timeZone: "Asia/Tokyo",
    }).format(new Date("2026-10-09T09:00:00Z"));
    expect(label).toBe(expected);
  });

  it("falls back safely for unknown timezones and invalid dates", () => {
    expect(formatEventPreviewDate("2026-10-09T09:00:00Z", "Invalid/Timezone")).toBe(formatEventPreviewDate("2026-10-09T09:00:00Z"));
    expect(formatEventPreviewDate("invalid")).toBe("Date to be confirmed");
  });
});
