import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { ArrowUpRight, CalendarDays, MapPin, RefreshCw } from "lucide-react";
import SiteHeader from "@/components/SiteHeader";
import CommunityFooter from "@/components/ecosystem/CommunityFooter";
import { CommunityLink } from "@/components/ecosystem/CommunityLink";
import { CommunityEventArt } from "@/components/ecosystem/CommunityEventArt";
import { useCommunityEvents } from "@/hooks/useCommunityEvents";
import { communityEventCity, communityEventHref, communityEventPartners, communityEventStatus, filterCommunityEvents } from "@/lib/communityEcosystem";
import { getLumaArchiveUrl } from "@/lib/lumaCalendarArchive";
import { LUMA_CALENDAR_URL } from "@/data/lumaCalendarArchive";
import "@/components/ecosystem/ecosystem.css";

export default function CommunityWorkPage() {
  useEffect(() => { window.scrollTo({ top: 0, behavior: "instant" }); }, []);
  const { events, now, isPending, isError, refetch } = useCommunityEvents();
  const [params, setParams] = useSearchParams();
  const filters = { search: params.get("q") || "", city: params.get("city") || "", kind: params.get("type") || "", partner: params.get("partner") || "", status: params.get("status") || "" };
  const setFilter = (name: string, value: string) => setParams(current => {
    const next = new URLSearchParams(current);
    if (value) next.set(name, value);
    else next.delete(name);
    return next;
  }, { replace: true });
  const cities = [...new Set([...events.map(communityEventCity), ...(filters.city ? [filters.city] : [])])].sort();
  const partners = [...new Set([...events.flatMap(communityEventPartners), ...(filters.partner ? [filters.partner] : [])])].sort();
  const visible = filterCommunityEvents(events, filters, now);
  const activeFilters = Object.values(filters).some(Boolean);
  const loading = isPending && !events.length;
  const unavailable = isError && !events.length;
  return <div className="work-page"><SiteHeader /><main className="work-page-main"><header className="work-page-heading"><div><p className="eco-eyebrow">The Cognisor event collection</p><h1>A few days together.<br />An impact that lasts.</h1><p>Hackathons, meetups, and the people making things happen. Find your next event or revisit an earlier edition.</p></div><CommunityLink href="/host/signin" className="eco-button">Create your own<ArrowUpRight aria-hidden="true" /></CommunityLink></header>
    <div className="work-filters" role="search" aria-label="Filter community events">
      <label className="work-filter"><span>Search</span><input type="search" value={filters.search} onChange={e => setFilter("q", e.target.value)} placeholder="Find an event, idea, or place" /></label>
      <label className="work-filter"><span>City</span><select value={filters.city} onChange={e => setFilter("city", e.target.value)}><option value="">All cities</option>{cities.map(city => <option key={city}>{city}</option>)}</select></label>
      <label className="work-filter"><span>Organiser / partner</span><select value={filters.partner} onChange={e => setFilter("partner", e.target.value)}><option value="">All organisers</option>{partners.map(partner => <option key={partner}>{partner}</option>)}</select></label>
      <label className="work-filter"><span>When</span><select value={filters.status} onChange={e => setFilter("status", e.target.value)}><option value="">Any time</option><option value="upcoming">Upcoming</option><option value="active">Live now</option><option value="past">Past events</option></select></label>
    </div>
    <div className="work-kind-tabs" role="group" aria-label="Event type">{["All events", "Hackathons", "Meetups", "Workshops"].map((kind, index) => <button key={kind} type="button" aria-pressed={filters.kind === (index ? kind : "")} onClick={() => setFilter("type", index ? kind : "")}>{kind}</button>)}</div>
    <div className="work-results-caption"><span role="status" aria-live="polite">{loading ? "Loading events…" : unavailable ? "Event collection unavailable" : `${visible.length} ${visible.length === 1 ? "event" : "events"}${filters.city ? ` in ${filters.city}` : " in the collection"}`}</span>{activeFilters && <button type="button" onClick={() => setParams({})}>Clear filters</button>}</div>
    {isError && !!events.length && <div role="alert" className="eco-event-error">Live listings are temporarily unavailable. You can still explore the verified Luma archive.<button type="button" className="eco-button" onClick={() => void refetch()}>Try again<RefreshCw /></button></div>}
    {loading ? <div className="eco-event-loading" aria-hidden="true">Finding your next connection…</div> : unavailable ? <div role="alert" className="eco-event-error">We couldn’t load the public event catalog.<button type="button" className="eco-button" onClick={() => void refetch()}>Try again<RefreshCw /></button></div> : visible.length ? <div className="work-grid">{visible.map(event => {
      const status = communityEventStatus(event, now);
      return <article className="work-event-card" key={event.id}><CommunityLink href={communityEventHref(event, now)}><CommunityEventArt event={event} /><div className="work-event-info"><span className="work-event-status" data-status={status}>{status === "active" ? "Live now" : status === "past" ? "Past event · Registration closed" : "Upcoming"}</span><h2>{event.name}</h2><div className="work-event-meta"><span><CalendarDays aria-hidden="true" />{event.eventDate || "Date to be confirmed"}</span><span><MapPin aria-hidden="true" />{communityEventCity(event)}</span>{status === "past" && getLumaArchiveUrl(event) && <span className="text-sky-300">View on Luma<ArrowUpRight aria-hidden="true" /></span>}</div></div></CommunityLink></article>;
    })}</div> : <div className="work-empty"><h2>No events match just yet.</h2><p>Try another city, event type, or search term.</p>{activeFilters && <button type="button" className="eco-button" onClick={() => setParams({})}>Show all events</button>}</div>}
    {events.some(event => getLumaArchiveUrl(event)) && <p className="mt-8 text-sm text-slate-400">Past previews include events listed on the <CommunityLink href={LUMA_CALENDAR_URL} className="text-sky-300 underline underline-offset-4">Cognisor Luma calendar</CommunityLink>. Open a preview for the original event details.</p>}
  </main><CommunityFooter /></div>;
}
