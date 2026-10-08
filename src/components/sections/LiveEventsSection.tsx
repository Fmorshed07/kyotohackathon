import { useEffect, useState, type PointerEvent } from "react";
import { Link } from "react-router-dom";
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUpRight, CalendarDays, CalendarPlus, Globe2, MapPin, Pause, Play, Radio, RefreshCw } from "lucide-react";
import { useEventPreviews } from "@/hooks/useEventPreviews";
import PastEventsSection from "@/components/sections/PastEventsSection";
import CommunityAtmosphere from "@/components/CommunityAtmosphere";
import { useAmbientMotion } from "@/hooks/useAmbientMotion";
import { getHostedHackathonUrl, type HostedHackathon } from "@/lib/aiHackathons";
import { downloadEventCalendar } from "@/lib/eventCalendar";
import { formatEventPreviewDate } from "@/lib/eventPreviews";
import "./live-events.css";

function EventArtwork({ event, className = "" }: { event: HostedHackathon; className?: string }) {
  const [failedUrl, setFailedUrl] = useState("");
  const source = event.coverImageUrl || event.bannerImageUrl;
  return source && failedUrl !== source ? (
    <img src={source} alt="" loading="lazy" decoding="async" className={className} onError={() => setFailedUrl(source)} />
  ) : (
    <div className={`event-art-fallback ${className}`} aria-hidden="true">
      <span className="event-art-monogram">{event.name.trim().slice(0, 1).toUpperCase()}</span>
      <Globe2 />
    </div>
  );
}

function EventClock({ event, live }: { event: HostedHackathon; live: boolean }) {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const update = () => { if (document.visibilityState !== "hidden") setNow(Date.now()); };
    const timer = window.setInterval(update, 1000);
    document.addEventListener("visibilitychange", update);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", update);
    };
  }, []);

  const start = Date.parse(event.startAt!);
  const end = Date.parse(event.endAt!);
  const seconds = Math.max(0, Math.ceil(((live ? end : start) - now) / 1000));
  const units = [
    { label: "Days", value: Math.floor(seconds / 86400) },
    { label: "Hours", value: Math.floor(seconds / 3600) % 24 },
    { label: "Mins", value: Math.floor(seconds / 60) % 60 },
    { label: "Secs", value: seconds % 60 },
  ];
  const progress = Math.min(100, Math.max(0, ((now - start) / (end - start)) * 100));

  return (
    <div className="event-clock">
      <div className="event-clock-caption"><span className="event-kicker">{live ? "Time to be part of it" : "We begin in"}</span><span className="event-clock-line" /></div>
      <div role="timer" aria-label={live ? "Time remaining in event" : "Time until event starts"} className="event-clock-digits">
        {units.map(({ label, value }) => (
          <div key={label}><span>{String(value).padStart(2, "0")}</span><small>{label}</small></div>
        ))}
      </div>
      {live && (
        <div className="event-time-track" role="progressbar" aria-label="Event elapsed time" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.floor(progress)}>
          <span style={{ width: `${progress}%` }} />
        </div>
      )}
    </div>
  );
}

function shortEventDate(event: HostedHackathon) {
  const date = new Date(event.startAt!);
  try {
    return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", timeZone: event.timezone || undefined }).format(date);
  } catch {
    return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(date);
  }
}

export default function LiveEventsSection() {
  const { live, upcoming, past, isLoading, hasError, refresh } = useEventPreviews();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { ref, paused, setPaused, running } = useAmbientMotion();
  const isLive = live.length > 0;
  const available = isLive ? live : upcoming;
  const previews = available.slice(0, 3);
  const selectedIndex = Math.max(0, previews.findIndex((event) => event.id === selectedId));
  const selected = previews[selectedIndex];
  const heading = isLive ? "Live now" : previews.length ? "Next up" : "Live events";

  const moveSelection = (direction: number) => {
    setSelectedId(previews[(selectedIndex + direction + previews.length) % previews.length].id);
  };
  const moveLight = (event: PointerEvent<HTMLDivElement>) => {
    if (!running || event.pointerType !== "mouse") return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - bounds.left) / bounds.width;
    const y = (event.clientY - bounds.top) / bounds.height;
    event.currentTarget.style.setProperty("--pointer-x", `${x * 100}%`);
    event.currentTarget.style.setProperty("--pointer-y", `${y * 100}%`);
    event.currentTarget.style.setProperty("--poster-rotate-x", `${(0.5 - y) * 2}deg`);
    event.currentTarget.style.setProperty("--poster-rotate-y", `${(x - 0.5) * 2}deg`);
  };

  return (
    <section ref={ref} id="live-events" aria-labelledby="live-events-title" className="event-experience" data-motion={running ? "on" : "off"}>
      <div className="event-experience-inner">
        <div className="event-section-topline">
          <span>For the moments<br />that move you.</span>
          <span className="event-edition">Meet. Build.<br />Belong.</span>
        </div>
        <header className="event-section-heading">
          <div>
            <h2 id="live-events-title">{isLoading ? "Live events" : heading}<span aria-hidden="true">.</span></h2>
            <p>{isLive ? "Good people. Big ideas. Happening right now." : previews.length ? "Something worth showing up for. Find your next beginning." : "Big ideas start when we come together."}</p>
          </div>
          <Link to="/hackathons" className="event-directory-link">Browse all events <ArrowUpRight aria-hidden="true" /></Link>
        </header>

        {isLoading ? (
          <div className="event-loading" role="status" aria-label="Loading event previews">
            <div className="event-loading-art" aria-hidden="true"><div className="event-orbit" /></div>
            <div className="event-loading-copy" aria-hidden="true"><span /><span /><span /><span /></div>
            <span className="sr-only">Loading event previews</span>
          </div>
        ) : hasError || !selected ? (
          <div className="event-quiet-state" role={hasError ? "alert" : undefined}>
            <div className="event-quiet-orbit" aria-hidden="true"><Globe2 /><span /><span /></div>
            <div className="event-quiet-copy">
              <span className="event-kicker">{hasError ? "A brief intermission" : "Between great moments"}</span>
              <h3>{hasError ? "Let’s reconnect." : "The next spark is coming."}</h3>
              <p>{hasError ? "We couldn’t load current events. Please try again." : "No events are live right now"}</p>
              {!hasError && <p>Explore past gatherings and discover what our community is building.</p>}
              {hasError ? (
                <button type="button" className="event-primary-action" onClick={refresh}><RefreshCw aria-hidden="true" /> Try again</button>
              ) : (
                <Link to="/hackathons" className="event-primary-action">Explore the community <ArrowUpRight aria-hidden="true" /></Link>
              )}
            </div>
          </div>
        ) : (
          <div className="event-stage-shell">
            <div className="event-stage-toolbar">
              <span className="event-kicker event-signal"><span className={isLive ? "event-signal-dot is-live" : "event-signal-dot"} aria-hidden="true" />{isLive ? "Happening now" : "On the horizon"}<span className="event-toolbar-count">/ {String(available.length).padStart(2, "0")} {available.length === 1 ? "event" : "events"}</span></span>
              <button type="button" className="event-motion-toggle" onClick={() => setPaused((value) => !value)} aria-pressed={paused} aria-label={paused ? "Resume animations" : "Pause animations"}>
                {paused ? <Play aria-hidden="true" /> : <Pause aria-hidden="true" />}<span>{paused ? "Resume motion" : "Pause motion"}</span>
              </button>
            </div>

            <article key={selected.id} id="event-spotlight-panel" aria-labelledby={`spotlight-title-${selected.id}`} className="event-spotlight">
              <div className="event-visual" onPointerMove={moveLight} onPointerLeave={(event) => { event.currentTarget.style.setProperty("--poster-rotate-x", "0deg"); event.currentTarget.style.setProperty("--poster-rotate-y", "0deg"); }}>
                <CommunityAtmosphere />
                <div className="event-pointer-light" aria-hidden="true" />
                <Link to={getHostedHackathonUrl(selected.id)} tabIndex={-1} aria-hidden="true" className="event-poster">
                  <EventArtwork event={selected} />
                </Link>
                <div className="event-visual-footer" aria-hidden="true"><span className="event-kicker">{shortEventDate(selected)}</span><span className="event-visual-coordinate">{String(selectedIndex + 1).padStart(2, "0")} <span>/ {String(previews.length).padStart(2, "0")}</span></span></div>
              </div>

              <div className="event-story">
                <div className="event-story-intro"><span className="event-status-pill">{isLive ? <Radio aria-hidden="true" /> : <CalendarDays aria-hidden="true" />}{isLive ? "Live now" : "Upcoming"}</span>{selected.format && <span className="event-format">{selected.format}</span>}</div>
                <p className="event-organizer">{selected.organizerName || "Cognisor community"}</p>
                <h3 id={`spotlight-title-${selected.id}`}><Link to={getHostedHackathonUrl(selected.id)}>{selected.name}</Link></h3>
                <p className="event-description">{selected.tagline || selected.theme || selected.summary}</p>
                <div className="event-facts">
                  <div><CalendarDays aria-hidden="true" /><p><span>{isLive ? "Ends" : "Starts"}</span><time dateTime={isLive ? selected.endAt : selected.startAt}>{formatEventPreviewDate((isLive ? selected.endAt : selected.startAt)!, selected.timezone)}</time></p></div>
                  <div><MapPin aria-hidden="true" /><p><span>Meet us here</span><span className="event-location">{selected.location}</span></p></div>
                </div>
                <EventClock key={`${selected.id}-${isLive}`} event={selected} live={isLive} />
                <div className="event-actions">
                  <Link to={getHostedHackathonUrl(selected.id)} className="event-primary-action">View event <ArrowUpRight aria-hidden="true" /></Link>
                  <button type="button" className="event-calendar-action" onClick={() => downloadEventCalendar(selected)}><CalendarPlus aria-hidden="true" /><span>Add to calendar</span></button>
                </div>
              </div>
            </article>

            {previews.length > 1 && (
              <div className="event-lineup">
                <div className="event-lineup-heading"><span className="event-kicker">{isLive ? "Find your crowd" : "Explore the lineup"}<ArrowDown aria-hidden="true" /></span><div className="event-lineup-nav"><button type="button" aria-label="Previous event" onClick={() => moveSelection(-1)}><ArrowLeft aria-hidden="true" /></button><button type="button" aria-label="Next event" onClick={() => moveSelection(1)}><ArrowRight aria-hidden="true" /></button></div></div>
                <div className="event-lineup-options" role="group" aria-label="Choose an event to preview">
                  {previews.map((event, index) => (
                    <button key={event.id} type="button" className="event-lineup-option" aria-pressed={event.id === selected.id} aria-controls="event-spotlight-panel" aria-label={`Preview ${event.name}`} onClick={() => setSelectedId(event.id)}>
                      <span className="event-lineup-number" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
                      <EventArtwork event={event} className="event-lineup-thumb" />
                      <span className="event-lineup-text"><span>{shortEventDate(event)}</span><strong>{event.name}</strong></span>
                      <ArrowUpRight className="event-lineup-arrow" aria-hidden="true" />
                    </button>
                  ))}
                </div>
                <span role="status" className="sr-only">Previewing {selected.name}, event {selectedIndex + 1} of {previews.length}</span>
              </div>
            )}
          </div>
        )}

        <PastEventsSection events={past} />
        <div className="event-section-footer"><span className="event-kicker">Real connections. New possibilities.</span><a href="#host">Create a moment of your own <ArrowUpRight aria-hidden="true" /></a></div>
      </div>
    </section>
  );
}
