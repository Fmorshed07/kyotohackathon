import { useId } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import type { HostedHackathon } from "@/lib/aiHackathons";
import { getEventReport, getVisibleReportMetrics, type PublicEventReport } from "@/lib/eventReports";

function ReportMetric({ metric }: { metric: PublicEventReport["metrics"][number] }) {
  const durationUnit = /^(?:hours?|minutes?|days?)$/i.test(metric.qualifier?.trim() ?? "") ? metric.qualifier?.trim().toLocaleLowerCase() : undefined;
  const unit = metric.unit || durationUnit;
  const label = unit && !metric.label.toLocaleLowerCase().endsWith(unit.toLocaleLowerCase()) ? `${metric.label} (${unit})` : metric.label;
  return <article aria-label={metric.label} className="relative flex min-h-[148px] min-w-0 flex-col justify-between gap-5 overflow-hidden rounded-2xl border border-cyan-300/15 bg-gradient-to-br from-slate-900/90 to-slate-950 p-5 shadow-[0_8px_32px_-20px_rgba(0,0,0,0.65)] sm:min-h-[176px] sm:p-6">
    <span aria-hidden="true" className="absolute left-5 top-0 h-px w-12 bg-cyan-300/60 sm:left-6" />
    <p aria-label={`${metric.label} recorded figure`} className="break-words text-[clamp(3.25rem,7vw,5.25rem)] font-semibold leading-[0.95] tabular-nums tracking-[-0.06em] text-slate-50 [overflow-wrap:anywhere]">
      {new Intl.NumberFormat("en").format(metric.value!)}
    </p>
    <h3 className="max-w-[26ch] text-xs font-medium leading-relaxed text-slate-400 sm:text-sm">{label}</h3>
  </article>;
}

/** Only published numeric statistics; no account or registration reads. */
export function EventReportSection({ event, showAllReportsLink = true }: { event: HostedHackathon; showAllReportsLink?: boolean }) {
  const titleId = useId();
  const report = getEventReport(event);
  const metrics = getVisibleReportMetrics(report.metrics);
  return <section id="report" aria-labelledby={titleId} className="mt-6 scroll-mt-24 rounded-3xl border border-white/[0.07] bg-slate-950/50 p-4 sm:mt-8 sm:p-7">
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4 sm:mb-7">
      <div>
        <h2 id={titleId} className="max-w-3xl text-xl font-semibold leading-snug tracking-[-0.025em] text-slate-100 sm:text-2xl">{report.eventName} — statistics</h2>
        <p className="mt-2 text-xs font-medium text-cyan-300/70">50+ figures</p>
      </div>
      {showAllReportsLink ? <Link to="/reports" className="inline-flex min-h-10 shrink-0 items-center gap-2 rounded-full border border-white/10 bg-white/[0.02] px-4 py-2 text-xs font-medium text-slate-300 transition-colors hover:border-cyan-300/35 hover:text-cyan-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">All event reports<ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" /></Link> : null}
    </div>
    {metrics.length ?
      <div className={`grid grid-cols-1 gap-3 sm:gap-4 ${metrics.length === 1 ? "" : metrics.length === 2 ? "sm:grid-cols-2" : "sm:grid-cols-2 lg:grid-cols-3"}`} aria-label="Event statistics">
        {metrics.map(metric => <ReportMetric key={metric.id} metric={metric} />)}
      </div>
      : <p className="py-3 text-sm text-muted-foreground">No statistics at 50+ yet.</p>}
  </section>;
}
