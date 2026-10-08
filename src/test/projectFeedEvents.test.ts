import { describe, expect, it } from "vitest";
import { buildFeedEventOptions, compareFeedEventOptions, type FeedEvent } from "@/lib/projectFeedEvents";
import type { Submission } from "@/types/portal";

const now = Date.parse("2026-10-09T11:00:00Z");
const event = (id: string, patch: Partial<FeedEvent> = {}): FeedEvent => ({
  id, name: id, shortName: id, eventDate: "Date to be confirmed", location: "Tokyo", theme: "Community",
  status: "upcoming", published: true, ...patch,
});
const submission = (id: string, eventId: string, patch: Partial<Submission> = {}): Submission => ({
  id, hackathon_id: eventId, user_id: `owner-${id}`, title: id, short_description: null, project_url: null,
  submission_pdf_url: null, demo_video_url: null, created_at: "2026-10-01T00:00:00Z", judge_score: null, judge_notes: null,
  ...patch,
});
const catalog = (events: FeedEvent[]) => new Map(events.map(item => [item.id, item]));

describe("project feed event options", () => {
  it("uses event dates ahead of stale lifecycle labels", () => {
    const events = [
      event("finished", { status: "active", startAt: "2026-10-09T09:00:00Z", endAt: "2026-10-09T10:00:00Z" }),
      event("next", { status: "past", startAt: "2026-10-10T09:00:00Z", endAt: "2026-10-10T13:00:00Z" }),
      event("live", { status: "past", startAt: "2026-10-09T09:00:00Z", endAt: "2026-10-09T13:00:00Z" }),
    ];
    const options = buildFeedEventOptions(events.map(item => submission(item.id, item.id)), catalog(events), now);
    expect(options.map(({ id, status }) => [id, status])).toEqual([["live", "active"], ["next", "upcoming"], ["finished", "past"]]);
  });

  it.each([
    ["2026-10-09T08:59:59.999Z", "upcoming"],
    ["2026-10-09T09:00:00.000Z", "active"],
    ["2026-10-09T12:59:59.999Z", "active"],
    ["2026-10-09T13:00:00.000Z", "past"],
  ])("resolves Tokyo time at the exact lifecycle boundary %s", (instant, status) => {
    const tokyo = event("tokyo", { status: "past", startAt: "2026-10-09T18:00:00+09:00", endAt: "2026-10-09T22:00:00+09:00" });
    expect(buildFeedEventOptions([submission("project", "tokyo")], catalog([tokyo]), Date.parse(instant))[0].status).toBe(status);
  });

  it("includes current public events before their first project, while omitting empty archives", () => {
    const events = [
      event("active", { status: "active" }),
      event("upcoming"),
      event("public-catalog", { published: undefined }),
      event("empty-past", { status: "past" }),
      event("past-with-project", { status: "past" }),
      event("private", { published: false }),
    ];
    const options = buildFeedEventOptions([submission("archive", "past-with-project")], catalog(events), now);
    expect(options.map(({ id, count }) => [id, count])).toEqual([
      ["active", 0], ["public-catalog", 0], ["upcoming", 0], ["past-with-project", 1],
    ]);
  });

  it("keeps missing-event projects unknown and excludes explicitly unpublished events", () => {
    const submissions = [submission("missing", "missing-event"), submission("legacy-catalog", "impact-tokyo"), submission("hidden", "private")];
    const options = buildFeedEventOptions(submissions, catalog([event("private", { published: false, status: "active" })]), now);
    expect(options).toHaveLength(2);
    expect(options.every(item => item.status === "unknown" && item.count === 1)).toBe(true);
    expect(options.find(item => item.id === "missing-event")?.event.name).toBe("missing-event");
    expect(options.find(item => item.id === "impact-tokyo")?.event.name).toBe("Impact Tokyo 2026");
    expect(options.some(item => item.id === "private")).toBe(false);
  });

  it("retains a selected public event when it ends without any matching projects", () => {
    const ending = event("selected", { startAt: "2026-10-09T09:00:00Z", endAt: "2026-10-09T13:00:00Z" });
    const events = catalog([ending, event("other-past", { status: "past" }), event("private", { published: false, status: "past" })]);
    const end = Date.parse(ending.endAt!);
    expect(buildFeedEventOptions([], events, end - 1).map(item => item.id)).toEqual(["selected"]);
    expect(buildFeedEventOptions([], events, end)).toEqual([]);
    expect(buildFeedEventOptions([], events, end, "selected")).toEqual([{ id: "selected", event: ending, count: 0, status: "past" }]);
    expect(buildFeedEventOptions([], events, end, "private")).toEqual([]);
    expect(buildFeedEventOptions([], events, end, "missing")).toEqual([]);
  });

  it("counts the provided video subset and still includes current events with zero matching videos", () => {
    const events = catalog([event("live", { status: "active" }), event("next"), event("archive", { status: "past" }), event("image-archive", { status: "past" })]);
    const submissions = [
      submission("live-video", "live", { demo_video_url: "https://example.com/demo.mp4" }),
      submission("live-image", "live"),
      submission("next-image", "next"),
      submission("archive-video", "archive", { demo_video_url: "https://example.com/archive.mp4" }),
      submission("archive-image", "image-archive"),
    ];
    expect(buildFeedEventOptions(submissions, events, now).find(item => item.id === "live")?.count).toBe(2);
    const videos = submissions.filter(item => item.demo_video_url);
    expect(buildFeedEventOptions(videos, events, now).map(({ id, count }) => [id, count])).toEqual([
      ["live", 1], ["next", 0], ["archive", 1],
    ]);
    expect(submissions).toHaveLength(5);
  });

  it("sorts active events by earliest finish and upcoming events by earliest start", () => {
    const events = [
      event("live-undated", { name: "AAA", status: "active" }),
      event("live-partial", { name: "AAA", status: "active", endAt: "2026-10-09T11:30:00Z" }),
      event("later", { startAt: "2026-10-11T09:00:00Z", endAt: "2026-10-11T13:00:00Z" }),
      event("live-late", { startAt: "2026-10-09T09:00:00Z", endAt: "2026-10-09T14:00:00Z" }),
      event("next-undated", { name: "AAA" }),
      event("next-partial", { name: "AAA", startAt: "2026-10-09T11:30:00Z" }),
      event("live-soon", { startAt: "2026-10-09T09:00:00Z", endAt: "2026-10-09T12:00:00Z" }),
      event("next", { startAt: "2026-10-10T09:00:00Z", endAt: "2026-10-10T13:00:00Z" }),
    ];
    expect(buildFeedEventOptions([], catalog(events), now).map(item => item.id)).toEqual([
      "live-soon", "live-late", "live-partial", "live-undated", "next", "later", "next-partial", "next-undated",
    ]);
  });

  it("orders dated archives ahead of newer imports, with stable name and ID ties", () => {
    const events = [
      event("dated-new", { status: "past", startAt: "2026-10-01T09:00:00Z", endAt: "2026-10-08T13:00:00Z", createdAt: "2026-01-01T00:00:00Z" }),
      event("dated-end", { status: "past", endAt: "2026-10-07T13:00:00Z" }),
      event("dated-start", { status: "past", startAt: "2026-10-06T09:00:00Z" }),
      event("import-new", { status: "past", createdAt: "2026-10-09T00:00:00Z" }),
      event("import-old", { status: "past", createdAt: "2026-10-02T00:00:00Z" }),
      event("future-invalid", { status: "past", endAt: "2026-10-11T13:00:00Z", createdAt: "2026-10-01T00:00:00Z" }),
      event("tie-b", { name: "Alpha", status: "past", startAt: "invalid", endAt: "invalid", createdAt: "invalid" }),
      event("tie-a", { name: "Alpha", status: "past" }),
      event("last", { name: "Zeta", status: "past" }),
    ];
    const submissions = events.map(item => submission(item.id, item.id));
    const expected = ["dated-new", "dated-end", "dated-start", "import-new", "import-old", "future-invalid", "tie-a", "tie-b", "last"];
    const options = buildFeedEventOptions(submissions, catalog(events), now);
    expect(options.map(item => item.id)).toEqual(expected);
    expect(buildFeedEventOptions([...submissions].reverse(), catalog([...events].reverse()), now).map(item => item.id)).toEqual(expected);
    expect([...options].reverse().sort((left, right) => compareFeedEventOptions(left, right, now)).map(item => item.id)).toEqual(expected);
  });

  it("falls back to saved status for incomplete, invalid, or reversed time ranges", () => {
    const events = [
      event("partial", { status: "active", endAt: "2026-10-09T13:00:00Z" }),
      event("invalid", { status: "upcoming", startAt: "not a date", endAt: "not a date" }),
      event("reversed", { status: "past", startAt: "2026-10-11T13:00:00Z", endAt: "2026-10-10T13:00:00Z" }),
    ];
    const options = buildFeedEventOptions(events.map(item => submission(item.id, item.id)), catalog(events), now);
    expect(options.map(({ id, status }) => [id, status])).toEqual([["partial", "active"], ["invalid", "upcoming"], ["reversed", "past"]]);
  });
});
