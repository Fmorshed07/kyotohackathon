import type { HostedHackathon } from "@/lib/aiHackathons";
import { getEventPreviews, getEventTimeRange } from "@/lib/eventPreviews";
import { LUMA_CALENDAR_ARCHIVE, LUMA_ARCHIVE_CHECKED_AT, type LumaArchiveEntry } from "@/data/lumaCalendarArchive";

function lumaSlug(value?: string) {
  try {
    const url = new URL(value || "");
    if (url.protocol !== "https:" || url.username || url.password || url.port || !/^(?:www\.)?(?:luma\.com|lu\.ma)$/.test(url.hostname)) return "";
    return /^\/[\w-]+\/?$/.test(url.pathname) ? url.pathname.replace(/^\/|\/$/g, "") : "";
  } catch { return ""; }
}

/** Only a verified public calendar entry can replace a portal route with a Luma link. */
export function getLumaArchiveUrl(event: Pick<HostedHackathon, "lumaUrl" | "sourceUrl">) {
  const slug = lumaSlug(event.lumaUrl) || lumaSlug(event.sourceUrl);
  return LUMA_CALENDAR_ARCHIVE.some(entry => entry.slug === slug) ? `https://luma.com/${slug}` : "";
}

function archiveEvent(entry: LumaArchiveEntry): HostedHackathon {
  const { slug, portalIds: _portalIds, ...details } = entry;
  const date = new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric", timeZone: entry.timezone });
  const start = date.format(new Date(entry.startAt));
  const end = date.format(new Date(entry.endAt));
  const url = `https://luma.com/${slug}`;
  return {
    ...details, id: `luma-${slug}`, shortName: entry.name,
    eventDate: start === end ? start : `${start} – ${end}`,
    theme: "", status: "past", submissionMode: "closed", registrationStatus: "closed",
    eligibility: "", teamSize: "", prize: "", requirements: [], schedule: [], rulebookUrl: "",
    bannerImageUrl: "", galleryUrls: [], guests: [], lumaUrl: url, sourceUrl: url,
    sourceImportedAt: LUMA_ARCHIVE_CHECKED_AT, published: true,
    createdAt: entry.startAt, createdBy: "luma-calendar-archive", aiGenerated: false, createdManually: false,
  };
}

const normalizedName = (value: string) => value.normalize("NFKC").toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu, "");
function matches(event: HostedHackathon, entry: LumaArchiveEntry) {
  return lumaSlug(event.lumaUrl) === entry.slug || lumaSlug(event.sourceUrl) === entry.slug ||
    entry.portalIds?.includes(event.id) || (normalizedName(event.name) === normalizedName(entry.name) &&
      (!event.startAt || Date.parse(event.startAt) === Date.parse(entry.startAt)));
}

/** Read-only presentation merge. This never publishes or restores portal documents. */
export function mergeLumaCalendarArchive(events: HostedHackathon[], now = Date.now()): HostedHackathon[] {
  const result = events.filter(event => event.published);
  for (const entry of LUMA_CALENDAR_ARCHIVE) {
    // This is a past-only source: never introduce an upcoming event into the live spotlight.
    if (Date.parse(entry.endAt) > now) continue;
    const source = archiveEvent(entry);
    const existing = result.filter(event => matches(event, entry));
    const preferred = existing.find(event => event.createdBy !== "portal-catalog") ?? existing[0];
    if (!preferred) { result.push(source); continue; }
    // Fresh organiser-authored dates take precedence over the archived snapshot.
    const range = getEventTimeRange(preferred);
    const merged = {
      ...source, ...preferred, lumaUrl: source.lumaUrl,
      coverImageUrl: preferred.coverImageUrl || source.coverImageUrl,
      summary: preferred.summary || source.summary,
      organizerName: preferred.organizerName || source.organizerName,
      ...(preferred.createdBy === "portal-catalog" ? { format: source.format } : {}),
      ...(!range ? { startAt: source.startAt, endAt: source.endAt, timezone: source.timezone, eventDate: source.eventDate } : {}),
    };
    const first = result.indexOf(existing[0]);
    for (let i = result.length - 1; i >= 0; i--) if (matches(result[i], entry)) result.splice(i, 1);
    result.splice(first, 0, merged);
  }
  const { live, upcoming, past } = getEventPreviews(result, now);
  const scheduledIds = new Set([...live, ...upcoming, ...past].map(event => event.id));
  return [...live, ...upcoming, ...result.filter(event => !scheduledIds.has(event.id)), ...past];
}
