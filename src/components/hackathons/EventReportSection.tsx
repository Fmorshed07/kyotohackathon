import { useId } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import type { HostedHackathon } from "@/lib/aiHackathons";
import { getEventReport, type PublicEventReport } from "@/lib/eventReports";

function ReportMetric({ metric }: { metric: PublicEventReport["metrics"][number] }) {
  const durationUnit = /^(?:hours?|minutes?|days?)$/i.test(metric.qualifier?.trim() ?? "") ? metric.qualifier?.trim().toLocaleLowerCase() : undefined;
  const unit = metric.unit || durationUnit;
  const label = unit && !metric.label.toLocaleLowerCase().endsWith(unit.toLocaleLowerCase()) ? `${metric.label} (${unit})` : metric.label;
  return <article aria-label={metric.label} className="flex min-w-0 flex-col rounded-xl border border-white/10 bg-background/50 p-4 sm:p-5">
    <p aria-label={`${metric.label} recorded figure`} className="text-4xl font-semibold tabular-nums tracking-tight text-foreground">
      {new Intl.NumberFormat("en").format(metric.value!)}
    </p>
    <h3 className="mt-2 text-sm font-medium text-muted-foreground">{label}</h3>
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
      </div>
      {showAllReportsLink ? <Link to="/reports" className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-white/15 px-3 py-2 text-sm font-medium text-foreground hover:border-primary/40 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">All event reports<ArrowUpRight className="h-4 w-4" aria-hidden="true" /></Link> : null}
    </div>
    {metrics.length ?
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" aria-label="Event statistics">
        {metrics.map(metric => <ReportMetric key={metric.id} metric={metric} />)}
      </div>
      : <p className="py-3 text-sm text-muted-foreground">No verified statistics published yet.</p>}
  </section>;
}
