import { useId } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import type { HostedHackathon } from "@/lib/aiHackathons";
import { getEventReport, safeReportSourceUrl, type PublicEventReport } from "@/lib/eventReports";

function sourceDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : new Intl.DateTimeFormat("en", {
    year: "numeric", month: "short", day: "numeric", timeZone: "UTC",
  }).format(date);
}

function ReportMetric({ metric }: { metric: PublicEventReport["metrics"][number] }) {
  const url = safeReportSourceUrl(metric.sourceUrl);
  const date = sourceDate(metric.asOf);
  return <article aria-label={metric.label} className="flex min-w-0 flex-col rounded-xl border border-white/10 bg-background/50 p-4 sm:p-5">
    <h3 className="text-sm font-medium text-muted-foreground">{metric.label}</h3>
    <p aria-label={`${metric.label} recorded figure`} className="mt-3 text-3xl font-semibold tracking-tight text-foreground">
      {new Intl.NumberFormat("en").format(metric.value!)}
      {metric.unit ? <span className="ml-1.5 text-sm font-normal tracking-normal text-muted-foreground">{metric.unit}</span> : null}
    </p>
    {metric.qualifier ? <p className="mt-1 text-xs text-primary">{metric.qualifier}</p> : null}
    <div className="mt-auto space-y-1 pt-4 text-xs leading-relaxed text-muted-foreground">
      <p>{url ? <a href={url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary underline-offset-4 hover:underline">{metric.sourceLabel}<ArrowUpRight className="h-3 w-3 shrink-0" aria-hidden="true" /></a> : metric.sourceLabel}</p>
      {date ? <p>As of <time dateTime={metric.asOf}>{date}</time></p> : null}
    </div>
  </article>;
}

/** Only published numeric statistics; no account or registration reads. */
export function EventReportSection({ event, showAllReportsLink = true }: { event: HostedHackathon; showAllReportsLink?: boolean }) {
  const titleId = useId();
  const report = getEventReport(event);
  const metrics = report.metrics.filter(metric => typeof metric.value === "number" && Number.isFinite(metric.value) && metric.value >= 0);
  return <section id="report" aria-labelledby={titleId} className="mt-6 scroll-mt-24 rounded-2xl border border-white/10 bg-card/70 p-4 sm:mt-8 sm:p-6">
    <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h2 id={titleId} className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">{report.eventName} — statistics</h2>
        <p className="mt-2 text-sm text-muted-foreground">{report.eventDate}</p>
      </div>
      {showAllReportsLink ? <Link to="/reports" className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-white/15 px-3 py-2 text-sm font-medium text-foreground hover:border-primary/40 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">All event reports<ArrowUpRight className="h-4 w-4" aria-hidden="true" /></Link> : null}
    </div>
    {metrics.length ? <>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" aria-label="Event statistics">
        {metrics.map(metric => <ReportMetric key={metric.id} metric={metric} />)}
      </div>
      <details className="mt-4 border-t border-white/10 pt-3 text-xs text-muted-foreground">
        <summary className="w-fit cursor-pointer py-1 font-medium text-foreground">How figures are counted</summary>
        <dl className="mt-3 space-y-3 leading-relaxed">
          {metrics.map(metric => <div key={metric.id}><dt className="font-medium text-foreground">{metric.label}</dt><dd className="mt-1">{metric.definition}</dd></div>)}
        </dl>
      </details>
      <p className="mt-3 text-xs leading-relaxed text-muted-foreground">Registrations and project records are not confirmed attendance. Luma audiences may overlap.</p>
    </> : <p className="py-3 text-sm text-muted-foreground">No verified statistics published yet.</p>}
  </section>;
}
