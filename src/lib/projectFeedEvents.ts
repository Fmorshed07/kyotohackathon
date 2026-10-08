import type { HostedHackathon } from "@/lib/aiHackathons";
import { getEventTimeRange } from "@/lib/eventPreviews";
import { getHackathonById, getSubmissionHackathonId, type PortalHackathon } from "@/lib/hackathons";
import type { Submission } from "@/types/portal";

export type FeedEvent = PortalHackathon & Partial<Pick<HostedHackathon, "startAt" | "endAt" | "createdAt" | "published">>;
export type FeedEventStatus = "active" | "upcoming" | "past" | "unknown";
export type FeedEventOption = { id: string; event: FeedEvent; count: number; status: FeedEventStatus };

const statusOrder: Record<FeedEventStatus, number> = { active: 0, upcoming: 1, past: 2, unknown: 3 };

function timestamp(value?: string): number | null {
  const parsed = Date.parse(value || "");
  return Number.isFinite(parsed) ? parsed : null;
}

function statusAt(event: FeedEvent, now: number): FeedEventStatus {
  const range = getEventTimeRange(event);
  if (range) return now < range.start ? "upcoming" : now < range.end ? "active" : "past";
  return event.status === "active" || event.status === "upcoming" || event.status === "past" ? event.status : "unknown";
}

function compareDates(left: number | null, right: number | null, newestFirst = false): number {
  if (left === null) return right === null ? 0 : 1;
  if (right === null) return -1;
  return newestFirst ? right - left : left - right;
}

function pastTimestamp(event: FeedEvent, now: number): number | null {
  for (const value of [event.endAt, event.startAt]) {
    const parsed = timestamp(value);
    if (parsed !== null && parsed <= now) return parsed;
  }
  return null;
}

/** The same event order can group project cards and their event filter options. */
export function compareFeedEventOptions(left: FeedEventOption, right: FeedEventOption, now = Date.now()): number {
  const lifecycle = statusOrder[left.status] - statusOrder[right.status];
  if (lifecycle) return lifecycle;

  let dates = 0;
  if (left.status === "active") {
    dates = compareDates(getEventTimeRange(left.event)?.end ?? null, getEventTimeRange(right.event)?.end ?? null);
  } else if (left.status === "upcoming") {
    dates = compareDates(getEventTimeRange(left.event)?.start ?? null, getEventTimeRange(right.event)?.start ?? null);
  } else if (left.status === "past") {
    const leftDate = pastTimestamp(left.event, now);
    const rightDate = pastTimestamp(right.event, now);
    dates = compareDates(leftDate, rightDate, true);
    if (leftDate === null && rightDate === null) {
      dates = compareDates(timestamp(left.event.createdAt), timestamp(right.event.createdAt), true);
    }
  }
  return dates || left.event.name.localeCompare(right.event.name, "en") || left.id.localeCompare(right.id, "en");
}

export function buildFeedEventOptions(submissions: Submission[], eventById: Map<string, FeedEvent>, now: number, selectedEventId?: string): FeedEventOption[] {
  const counts = new Map<string, number>();
  for (const submission of submissions) {
    const id = getSubmissionHackathonId(submission);
    counts.set(id, (counts.get(id) ?? 0) + 1);
  }

  const options: FeedEventOption[] = [];
  for (const id of new Set([...eventById.keys(), ...counts.keys()])) {
    const known = eventById.get(id);
    if (known?.published === false) continue;
    const event = known ?? getHackathonById(id);
    const count = counts.get(id) ?? 0;
    // A fallback's default "upcoming" is a label stub, not a verified lifecycle.
    const status = known ? statusAt(known, now) : "unknown";
    const selectedArchive = id === selectedEventId && status === "past";
    if (count === 0 && status !== "active" && status !== "upcoming" && !selectedArchive) continue;
    options.push({ id, event, count, status });
  }
  return options.sort((left, right) => compareFeedEventOptions(left, right, now));
}
