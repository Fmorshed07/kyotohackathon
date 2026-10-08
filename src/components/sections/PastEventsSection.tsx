import { useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, CalendarDays, CheckCircle2, MapPin } from "lucide-react";
import { getHostedHackathonUrl, type HostedHackathon } from "@/lib/aiHackathons";
import { formatEventPreviewDate } from "@/lib/eventPreviews";
import { getLumaArchiveUrl } from "@/lib/lumaCalendarArchive";
import { LUMA_CALENDAR_URL } from "@/data/lumaCalendarArchive";
import { cn } from "@/lib/utils";

function ArchiveLink({ href, children, className, artwork = false }: { href: string; children: ReactNode; className: string; artwork?: boolean }) {
  const props = { className, tabIndex: artwork ? -1 : undefined, "aria-hidden": artwork || undefined };
  return /^https?:\/\//.test(href)
    ? <a {...props} href={href} target="_blank" rel="noopener noreferrer">{children}</a>
    : <Link {...props} to={href}>{children}</Link>;
}

function PastEventCard({ event, featured }: { event: HostedHackathon; featured: boolean }) {
  const lumaUrl = getLumaArchiveUrl(event);
  const eventUrl = lumaUrl || getHostedHackathonUrl(event.id);
  const artwork = event.bannerImageUrl || event.coverImageUrl;
  const [failedArtwork, setFailedArtwork] = useState("");
  const end = Date.parse(event.endAt || "");
  const hasEndDate = Number.isFinite(end) && end <= Date.now();

  return (
    <article className={cn("flex min-w-0 flex-col overflow-hidden rounded-2xl border border-sky-400/20 bg-slate-950/70 shadow-[0_20px_60px_-42px_rgba(56,189,248,0.4)] transition-colors hover:border-sky-400/45", featured && "lg:grid lg:grid-cols-2")}>
      <ArchiveLink href={eventUrl} artwork className={cn("relative block aspect-[16/9] min-w-0 overflow-hidden border-b border-white/10 bg-gradient-to-br from-sky-500/15 via-slate-950 to-blue-500/10", featured && "lg:aspect-auto lg:min-h-[320px] lg:border-b-0 lg:border-r")}>
        {artwork && failedArtwork !== artwork ? <img src={artwork} alt="" loading="lazy" decoding="async" onError={() => setFailedArtwork(artwork)} className="absolute inset-0 h-full w-full object-contain" /> : <CalendarDays className="absolute left-1/2 top-1/2 h-14 w-14 -translate-x-1/2 -translate-y-1/2 text-sky-300/30" aria-hidden />}
        <span className="absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-slate-950/95 px-3 py-1.5 font-display text-[10px] font-semibold uppercase tracking-[0.14em] text-white backdrop-blur-md"><CheckCircle2 className="h-3.5 w-3.5" aria-hidden />Finished</span>
      </ArchiveLink>
      <div className={cn("flex min-w-0 flex-1 flex-col p-5 sm:p-6", featured && "lg:p-8 xl:p-10")}>
        {event.organizerName ? <p className="mb-2 break-words text-xs font-semibold text-sky-300/80">{event.organizerName}</p> : null}
        <h3 className={cn("break-words font-display text-xl font-semibold leading-snug text-white", featured && "sm:text-2xl xl:text-3xl")}>
          <ArchiveLink href={eventUrl} className="line-clamp-3 rounded-sm transition-colors hover:text-sky-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400">{event.name}</ArchiveLink>
        </h3>
        <p className="mt-3 line-clamp-3 break-words font-body text-sm leading-6 text-slate-300">{event.tagline || event.theme || event.summary}</p>
        <div className="mt-auto space-y-2 pt-5 text-sm leading-6 text-slate-300">
          <p className="flex items-start gap-2"><CalendarDays className="mt-1 h-4 w-4 shrink-0 text-sky-300" aria-hidden /><span className="min-w-0 break-words">{hasEndDate ? <><span className="font-medium text-white/85">Ended </span><time dateTime={event.endAt}>{formatEventPreviewDate(event.endAt!, event.timezone)}</time></> : event.eventDate || "Date to be confirmed"}</span></p>
          <p className="flex items-start gap-2"><MapPin className="mt-1 h-4 w-4 shrink-0 text-sky-300" aria-hidden /><span className="min-w-0 break-words">{event.location}</span></p>
          <p className="pt-1 text-xs font-medium text-slate-400">Registration closed</p>
        </div>
        <ArchiveLink href={eventUrl} className="mt-5 inline-flex items-center justify-between gap-2 border-t border-white/10 pt-4 font-display text-xs font-semibold text-sky-300 transition-colors hover:text-sky-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400">{lumaUrl ? "View on Luma" : "View archive"}<ArrowUpRight className="h-4 w-4" aria-hidden /></ArchiveLink>
      </div>
    </article>
  );
}

export default function PastEventsSection({ events }: { events: HostedHackathon[] }) {
  const [expanded, setExpanded] = useState(false);
  const previews = expanded ? events : events.slice(0, 3);
  const hasLumaArchive = events.some(event => getLumaArchiveUrl(event));
  if (!previews.length) return null;

  return (
    <section id="past-events" aria-labelledby="past-events-title" className="mt-12 w-full min-w-0 border-t border-white/10 pt-10 sm:mt-16">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h2 id="past-events-title" className="font-display text-2xl font-semibold text-white sm:text-3xl">Past events</h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">Revisit completed events, their programmes, and the projects our community built. Registration is closed.</p>
          {hasLumaArchive && <a href={LUMA_CALENDAR_URL} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center gap-2 text-xs text-sky-300 underline-offset-4 hover:underline">From the Cognisor Luma calendar<ArrowUpRight className="h-3.5 w-3.5" aria-hidden /></a>}
        </div>
        <Link to="/work?status=past" className="inline-flex shrink-0 items-center gap-2 self-start rounded-xl border border-sky-400/30 px-4 py-2.5 text-xs font-semibold text-sky-300 transition-colors hover:bg-sky-400/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 sm:self-auto">Browse past events<ArrowUpRight className="h-4 w-4" aria-hidden /></Link>
      </div>
      <div id="past-event-previews" className={cn("mt-7 grid w-full min-w-0 gap-5", previews.length === 2 && "md:grid-cols-2", previews.length >= 3 && "md:grid-cols-2 xl:grid-cols-3")}>
        {previews.map((event) => <PastEventCard key={event.id} event={event} featured={previews.length === 1} />)}
      </div>
      {events.length > 3 && <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-white/10 pt-5 text-xs text-slate-400"><span role="status">Showing {previews.length} of {events.length} past events</span><button type="button" aria-expanded={expanded} aria-controls="past-event-previews" onClick={() => setExpanded(value => !value)} className="min-h-11 rounded-lg border border-sky-400/30 px-4 py-2 font-semibold text-sky-300 transition-colors hover:bg-sky-400/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400">{expanded ? "Show fewer events" : `Show all ${events.length} past events`}</button></div>}
    </section>
  );
}
