import { useId } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, BookOpen, CheckCircle2, FileText, Lightbulb } from "lucide-react";
import type { HostedHackathon } from "@/lib/aiHackathons";
import { getEventReport, getThreefoldTarget, safeReportSourceUrl, type PublicEventReport } from "@/lib/eventReports";

function reportDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : new Intl.DateTimeFormat("en", {
    year: "numeric", month: "short", day: "numeric", timeZone: "UTC",
  }).format(date);
}

function SourceDate({ value, prefix = "As of" }: { value: string; prefix?: string }) {
  const date = reportDate(value);
  return date ? <span>{prefix} <time dateTime={value}>{date}</time></span> : <span>Date not published</span>;
}

function ReportMetric({ metric }: { metric: PublicEventReport["metrics"][number] }) {
  const sourceUrl = safeReportSourceUrl(metric.sourceUrl);
  const measured = metric.value !== null && Number.isFinite(metric.value);
  const target = getThreefoldTarget(metric.value);
  const targetUnit = metric.unit || (/^(?:hours?|minutes?|days?)$/i.test(metric.qualifier?.trim() ?? "") ? metric.qualifier?.trim() : undefined);
  return <article className="flex min-w-0 flex-col rounded-xl border border-white/10 bg-background/50 p-4 sm:p-5" aria-label={metric.label}>
    <h3 className="text-sm font-medium text-muted-foreground">{metric.label}</h3>
    {measured ? <p className="mt-3 text-xs font-medium text-muted-foreground">Recorded baseline</p> : null}
    <p aria-label={`${metric.label} recorded figure`} className={`${measured ? "mt-1 text-3xl" : "mt-3 text-xl"} font-semibold tracking-tight text-foreground`}>
      {measured ? new Intl.NumberFormat("en").format(metric.value!) : "Not available"}
      {measured && metric.unit ? <span className="ml-1.5 text-sm font-normal tracking-normal text-muted-foreground">{metric.unit}</span> : null}
    </p>
    {metric.qualifier ? <p className="mt-1 text-xs font-medium text-primary">{metric.qualifier}</p> : null}
    <p className="mb-4 mt-3 text-sm leading-relaxed text-muted-foreground">{metric.definition}</p>
    <div className="mt-auto space-y-1 border-t border-white/10 pt-3 text-xs leading-relaxed text-muted-foreground">
      <p>{sourceUrl ? <a href={sourceUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary underline-offset-4 hover:underline">{metric.sourceLabel}<ArrowUpRight className="h-3 w-3 shrink-0" aria-hidden="true" /></a> : metric.sourceLabel}</p>
      <p><SourceDate value={metric.asOf} /></p>
    </div>
    {target !== null ? <div role="group" aria-label={`${metric.label} 3× planning target`} className="mt-4 rounded-lg border border-amber-300/20 bg-amber-300/5 p-3">
      <p className="text-xs font-medium text-amber-200">3× planning target</p>
      <p aria-label={`${metric.label} illustrative target`} className="mt-2 text-2xl font-semibold tracking-tight text-amber-100">
        {new Intl.NumberFormat("en").format(target)}
        {targetUnit ? <span className="ml-1.5 text-sm font-normal tracking-normal text-amber-200/80">{targetUnit}</span> : null}
      </p>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">Baseline × 3 · illustrative</p>
      {metric.value === 0 ? <p className="mt-2 text-xs leading-relaxed text-muted-foreground">A zero baseline does not establish a positive growth target.</p> : null}
    </div> : null}
  </article>;
}

/** Public aggregates and reviewed evidence only; never loads registrations or accounts. */
export function EventReportSection({ event, showAllReportsLink = true }: { event: HostedHackathon; showAllReportsLink?: boolean }) {
  const titleId = useId();
  const report = getEventReport(event);
  return <section id="report" aria-labelledby={titleId} className="mt-6 scroll-mt-24 overflow-hidden rounded-2xl border border-white/10 bg-card/70 sm:mt-8">
    <div className="flex flex-wrap items-start justify-between gap-4 border-b border-white/10 p-5 sm:p-8">
      <div className="max-w-3xl">
        <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.16em] text-primary"><FileText className="h-4 w-4" aria-hidden="true" />Event report</p>
        <h2 id={titleId} className="mt-3 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">{report.eventName} — report</h2>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">{report.summary}</p>
        <p className="mt-3 text-xs text-muted-foreground"><SourceDate value={report.checkedAt} prefix="Sources checked" /></p>
      </div>
      {showAllReportsLink ? <Link to="/reports" className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-white/15 px-3 py-2 text-sm font-medium text-foreground transition-colors hover:border-primary/40 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">All event reports<ArrowUpRight className="h-4 w-4" aria-hidden="true" /></Link> : null}
    </div>
    <div className="space-y-7 p-4 sm:space-y-8 sm:p-8">
      <p className="rounded-xl border border-amber-300/20 bg-amber-300/5 p-4 text-sm leading-relaxed text-muted-foreground">3× planning targets are illustrative scenarios calculated from each recorded baseline. They are not recorded results, forecasts or announced future programmes. Published event dates, schedules and durations remain unchanged.</p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" aria-label="Event report metrics">
        {report.metrics.map(metric => <ReportMetric key={metric.id} metric={metric} />)}
      </div>

      <div>
        <h3 className="text-lg font-semibold tracking-tight text-foreground">Social coverage</h3>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {([['Instagram', report.coverage.instagram], ['LinkedIn', report.coverage.linkedin]] as const).map(([platform, coverage]) => <article key={platform} className="min-w-0 rounded-xl border border-white/10 bg-background/40 p-4 sm:p-5">
            <h4 className="font-medium text-foreground">{platform}</h4>
            <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">{coverage}</p>
          </article>)}
        </div>
      </div>

      <div>
        <h3 className="flex items-center gap-2 text-lg font-semibold tracking-tight text-foreground"><BookOpen className="h-4 w-4 text-primary" aria-hidden="true" />Sources & evidence</h3>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">Open the original sources to see the context behind the figures and event coverage.</p>
        {report.sources.length ? <ul className="mt-4 grid gap-3 sm:grid-cols-2">
          {report.sources.map(source => {
            const url = safeReportSourceUrl(source.url);
            return <li key={source.id} className="min-w-0 rounded-xl border border-white/10 p-4 sm:p-5">
              <p className="text-xs font-medium text-primary">{source.platform}</p>
              <h4 className="mt-2 break-words text-sm font-semibold leading-relaxed text-foreground">{url ? <a href={url} target="_blank" rel="noreferrer" className="inline-flex items-start gap-1 underline-offset-4 hover:underline">{source.title}<ArrowUpRight className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" /></a> : source.title}</h4>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{source.note}</p>
              <p className="mt-3 text-xs text-muted-foreground"><SourceDate value={source.checkedAt} prefix="Checked" /></p>
            </li>;
          })}
        </ul> : <p className="mt-4 rounded-xl border border-dashed border-white/15 p-4 text-sm text-muted-foreground">Supporting sources have not been published for this event yet.</p>}
      </div>

      <div>
        <h3 className="text-lg font-semibold tracking-tight text-foreground">Event review</h3>
        <p className="mt-2 text-sm text-muted-foreground">An editorial review of the available evidence.</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {[{ title: "What worked", items: report.review.strengths, icon: CheckCircle2 }, { title: "What could improve", items: report.review.improvements, icon: Lightbulb }].map(({ title, items, icon: Icon }) => <article key={title} className="min-w-0 rounded-xl border border-white/10 p-4 sm:p-5">
            <h4 className="flex items-center gap-2 font-medium text-foreground"><Icon className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />{title}</h4>
            {items.length ? <ul className="mt-3 space-y-3 text-sm leading-relaxed text-muted-foreground">{items.map(item => <li key={item} className="flex gap-2"><span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-primary/70" aria-hidden="true" /><span>{item}</span></li>)}</ul> : <p className="mt-3 text-sm text-muted-foreground">A review has not been published yet.</p>}
          </article>)}
        </div>
      </div>

      <p className="border-t border-white/10 pt-5 text-xs leading-relaxed text-muted-foreground">How to read this report: each figure has its own definition, source and date. Registrations do not confirm attendance. Social views and interactions may overlap across posts and channels. Unavailable figures are left unmeasured rather than treated as zero.</p>
    </div>
  </section>;
}
