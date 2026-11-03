import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowLeft, ArrowUpRight, FileText } from "lucide-react";
import AnimatedBackground from "@/components/AnimatedBackground";
import SiteHeader from "@/components/SiteHeader";
import { EventReportSection } from "@/components/hackathons/EventReportSection";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCommunityEvents } from "@/hooks/useCommunityEvents";
import { getEventReport, getEventReportHref, getEventReportKey, getVisibleReportMetrics } from "@/lib/eventReports";

export default function EventReportsPage() {
  const { events, isLoading, isError, refetch } = useCommunityEvents();
  const [params, setParams] = useSearchParams();
  const [search, setSearch] = useState("");
  const selectedReportRef = useRef<HTMLDivElement>(null);
  const selectedId = params.get("event") ?? "";
  const selectedEvent = events.find(event => event.id === selectedId)
    ?? (selectedId ? events.find(event => getEventReportKey(event) === selectedId) : undefined);
  useEffect(() => {
    // Opening a card lower on the index should reveal the report inserted above it.
    selectedReportRef.current?.scrollIntoView?.({ block: "start", behavior: "instant" });
  }, [selectedEvent?.id]);
  const matching = useMemo(() => {
    const needle = search.trim().toLocaleLowerCase();
    return events.filter(event => [event.name, event.location, event.theme].join(" ").toLocaleLowerCase().includes(needle));
  }, [events, search]);
  const lumaFigures = useMemo(() => events.flatMap(event => {
    const metric = getVisibleReportMetrics(getEventReport(event).metrics).find(metric => metric.id === "luma-went");
    return metric
      ? [{ event, value: metric.value }]
      : [];
  }).sort((left, right) => right.value - left.value || left.event.name.localeCompare(right.event.name)), [events]);

  const selectEvent = (eventId: string) => {
    const next = new URLSearchParams(params);
    if (eventId) next.set("event", eventId);
    else next.delete("event");
    setParams(next);
  };

  return <div className="relative min-h-svh bg-background">
    <AnimatedBackground />
    <SiteHeader />
    <main className="relative mx-auto max-w-6xl px-4 pb-20 pt-24 sm:px-6 sm:pb-28 sm:pt-28 lg:px-8">
      <Link to="/hackathons" className="inline-flex min-h-10 items-center gap-2 text-sm text-muted-foreground underline-offset-4 hover:text-primary hover:underline"><ArrowLeft className="h-4 w-4" aria-hidden="true" />Back to hackathons</Link>
      <header className="mb-8 mt-5 max-w-3xl sm:mb-10 sm:mt-7">
        <h1 className="text-[clamp(2.25rem,5.5vw,4rem)] font-semibold leading-[1.05] tracking-[-0.045em] text-slate-50">Event statistics</h1>
        <p className="mt-3 text-xs font-medium text-cyan-300/70">50+ figures</p>
      </header>

      <div className="rounded-2xl border border-white/[0.07] bg-slate-950/60 p-4 sm:p-5">
        <label htmlFor="report-event" className="text-xs font-medium text-slate-400">Choose an event report</label>
        <select id="report-event" value={selectedEvent?.id ?? ""} onChange={event => selectEvent(event.target.value)} disabled={isLoading && events.length === 0} className="mt-2 min-h-12 w-full min-w-0 rounded-xl border border-white/10 bg-slate-900/80 px-3 py-2 text-base text-slate-100 transition-colors hover:border-cyan-300/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:text-sm">
          <option value="">All event reports</option>
          {events.map(event => <option key={event.id} value={event.id}>{event.name}</option>)}
        </select>
      </div>

      {isLoading ? <p role="status" className="py-6 text-sm text-muted-foreground">Loading event reports…</p> : null}
      {isError ? <div role="alert" className="my-6 flex flex-wrap items-center gap-3 rounded-xl border border-amber-300/25 bg-amber-300/5 p-4">
        <p className="flex-1 text-sm text-muted-foreground">We couldn’t load the current event catalog. Available public archives are still shown below.</p>
        <Button type="button" variant="outline" size="sm" onClick={() => void refetch()}>Retry event reports</Button>
      </div> : null}

      {selectedEvent ? <div ref={selectedReportRef} className="mt-6 scroll-mt-24">
        <div className="flex justify-end">
          <Button type="button" variant="outline" size="sm" onClick={() => selectEvent("")}>Show all event reports</Button>
        </div>
        <EventReportSection key={selectedEvent.id} event={selectedEvent} showAllReportsLink={false} />
      </div> : selectedId && !isLoading ? <div role="status" className="my-6 rounded-xl border border-white/10 p-5">
        <h2 className="font-semibold text-foreground">This event report is unavailable</h2>
        <p className="mt-2 text-sm text-muted-foreground">Choose an event from the public catalog below.</p>
      </div> : null}

      {!selectedId && lumaFigures.length > 0 ? <section aria-labelledby="luma-figures-title" className="mt-8 rounded-3xl border border-white/[0.07] bg-slate-950/50 p-4 sm:mt-10 sm:p-7">
        <h2 id="luma-figures-title" className="text-xl font-semibold tracking-[-0.025em] text-slate-100 sm:text-2xl">Published Luma figures</h2>
        <ul aria-label="Published Luma Went figures" className="mt-5 grid gap-3 sm:mt-6 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
          {lumaFigures.map(({ event, value }) => <li key={event.id} className="relative flex min-h-[148px] min-w-0 flex-col-reverse justify-between gap-5 overflow-hidden rounded-2xl border border-cyan-300/15 bg-gradient-to-br from-slate-900/90 to-slate-950 p-5 sm:min-h-[176px] sm:p-6">
            <span aria-hidden="true" className="absolute left-5 top-0 h-px w-12 bg-cyan-300/60 sm:left-6" />
            <h3 className="min-w-0 text-xs font-medium leading-relaxed text-slate-400 sm:text-sm"><Link to={getEventReportHref(event.id)} className="inline-flex min-h-10 items-center transition-colors hover:text-cyan-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">{event.name}</Link></h3>
            <p aria-label={`${event.name} recorded Luma Went`} className="break-words text-[clamp(3.25rem,7vw,5.25rem)] font-semibold leading-[0.95] tabular-nums tracking-[-0.06em] text-slate-50 [overflow-wrap:anywhere]">{new Intl.NumberFormat("en").format(value)}</p>
          </li>)}
        </ul>
      </section> : null}

      <section className="mt-10 sm:mt-14" aria-labelledby="browse-reports-title">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-5">
          <div><h2 id="browse-reports-title" className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">Browse event reports</h2><p className="mt-2 text-sm text-muted-foreground">{isLoading && events.length === 0 ? "Loading public catalog…" : `${events.length} ${events.length === 1 ? "event" : "events"} in the public catalog`}</p></div>
          <div className="w-full sm:w-72"><label htmlFor="report-search" className="mb-2 block text-sm font-medium">Search events</label><Input id="report-search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Name, location or theme" /></div>
        </div>
        {!isLoading && matching.length === 0 ? <p className="rounded-xl border border-dashed border-white/15 p-6 text-sm text-muted-foreground">{search.trim() ? "No event reports match your search." : "No event reports are available yet."}</p> : null}
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {matching.map(event => {
            const report = getEventReport(event);
            const sourcedMetrics = getVisibleReportMetrics(report.metrics).length;
            return <li key={event.id} className="flex min-w-0">
              <article className="flex min-w-0 flex-1 flex-col rounded-2xl border border-white/[0.08] bg-slate-950/60 p-5 transition-colors hover:border-cyan-300/25 sm:p-6">
                <h3 className="text-base font-semibold leading-snug tracking-tight text-slate-200">{event.name}</h3>
                <p className="mb-5 mt-3 text-xs text-slate-500">{sourcedMetrics} available {sourcedMetrics === 1 ? "statistic" : "statistics"}</p>
                <Link to={getEventReportHref(event.id)} aria-label={`View report for ${event.name}`} aria-current={event.id === selectedEvent?.id ? "page" : undefined} className="mt-auto inline-flex min-h-10 items-center justify-between gap-2 rounded-xl border border-cyan-300/15 bg-cyan-300/[0.03] px-3 py-2 text-xs font-medium text-cyan-200 transition-colors hover:border-cyan-300/35 hover:bg-cyan-300/[0.07] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><span className="flex items-center gap-2"><FileText className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />View report</span><ArrowUpRight className="h-3.5 w-3.5 shrink-0" aria-hidden="true" /></Link>
              </article>
            </li>;
          })}
        </ul>
      </section>
    </main>
  </div>;
}
