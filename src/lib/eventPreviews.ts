import type { HostedHackathon } from "@/lib/aiHackathons";

type ScheduledEvent = Pick<HostedHackathon, "published" | "startAt" | "endAt">;

export function getEventTimeRange(event: ScheduledEvent): { start: number; end: number } | null {
  const start = new Date(event.startAt || "").getTime();
  const end = new Date(event.endAt || "").getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return null;
  return { start, end };
}

function pastEventOrder(event: HostedHackathon, now: number): { hasEventDate: boolean; timestamp: number } {
  // Complete ranges supply the event end; for manually archived text-only
  // listings use the best available timestamp, then their creation date.
  for (const value of [event.endAt, event.startAt]) {
    const timestamp = new Date(value || "").getTime();
    if (Number.isFinite(timestamp) && timestamp <= now) return { hasEventDate: true, timestamp };
  }
  const createdAt = new Date(event.createdAt || "").getTime();
  return { hasEventDate: false, timestamp: Number.isFinite(createdAt) ? createdAt : 0 };
}

/** Valid public dates determine lifecycle; manually archived undated rows stay visible. */
export function getEventPreviews(events: HostedHackathon[], now = Date.now()) {
  const scheduled = events.flatMap((event) => {
    const range = getEventTimeRange(event);
    return event.published && range ? [{ event, ...range }] : [];
  });
  return {
    live: scheduled
      .filter(({ start, end }) => start <= now && now < end)
      .sort((a, b) => a.end - b.end || a.event.name.localeCompare(b.event.name))
      .map(({ event }) => event),
    upcoming: scheduled
      .filter(({ start }) => now < start)
      .sort((a, b) => a.start - b.start || a.event.name.localeCompare(b.event.name))
      .map(({ event }) => event),
    past: events
      .filter((event) => {
        if (!event.published) return false;
        const range = getEventTimeRange(event);
        return range ? range.end <= now : event.status === "past";
      })
      .sort((a, b) => {
        const left = pastEventOrder(a, now);
        const right = pastEventOrder(b, now);
        return Number(right.hasEventDate) - Number(left.hasEventDate) ||
          right.timestamp - left.timestamp || a.name.localeCompare(b.name);
      }),
  };
}

export function formatEventPreviewDate(value: string, timezone?: string): string {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "Date to be confirmed";
  const options: Intl.DateTimeFormatOptions = {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  };
  try {
    return new Intl.DateTimeFormat(undefined, { ...options, ...(timezone ? { timeZone: timezone } : {}) }).format(date);
  } catch {
    return new Intl.DateTimeFormat(undefined, options).format(date);
  }
}
