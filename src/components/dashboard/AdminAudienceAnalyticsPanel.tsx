import {
  Activity,
  ArrowUpRight,
  Eye,
  Globe2,
  Mail,
  MousePointerClick,
  RefreshCw,
  Share2,
  Star,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { sectionClass } from "@/components/dashboard/DashboardLayout";
import { analyticsPageLabel, type AudienceEngagementTotals, type SiteAnalyticsSnapshot } from "@/lib/siteAnalytics";

function formatCount(value: number) {
  return new Intl.NumberFormat(undefined, { notation: value >= 10_000 ? "compact" : "standard" }).format(value);
}

function MetricCard({
  label,
  value,
  hint,
  icon: Icon,
  accent = "cyan",
}: {
  label: string;
  value: string;
  hint: string;
  icon: typeof Users;
  accent?: "cyan" | "violet" | "sunset";
}) {
  const accents = {
    cyan: "border-cyan-400/20 bg-cyan-400/[0.06] text-cyan-300",
    violet: "border-violet-400/20 bg-violet-400/[0.06] text-violet-300",
    sunset: "border-amber-400/20 bg-amber-400/[0.06] text-amber-300",
  };
  return (
    <div className={`rounded-2xl border p-4 ${accents[accent]}`}>
      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
        <Icon className="h-4 w-4" aria-hidden />
      </div>
      <p className="mt-3 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}

function BreakdownList({ title, items, empty }: { title: string; items: Array<{ label: string; value: number }>; empty: string }) {
  const max = Math.max(1, ...items.map((item) => item.value));
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-4 sm:p-5">
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      {items.length === 0 ? (
        <p className="mt-5 text-sm text-muted-foreground">{empty}</p>
      ) : (
        <div className="mt-4 space-y-4">
          {items.map((item) => (
            <div key={item.label}>
              <div className="mb-1.5 flex items-center justify-between gap-3 text-xs">
                <span className="min-w-0 truncate text-foreground">{item.label}</span>
                <span className="font-mono text-muted-foreground">{formatCount(item.value)}</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-white/5">
                <div className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-blue-500" style={{ width: `${Math.max(8, (item.value / max) * 100)}%` }} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function AdminAudienceAnalyticsPanel({
  analytics,
  engagement,
  subscriberCount,
  isLoading,
  onRefresh,
}: {
  analytics: SiteAnalyticsSnapshot;
  engagement: AudienceEngagementTotals;
  subscriberCount: number;
  isLoading: boolean;
  onRefresh: () => void;
}) {
  const conversion = analytics.visitorsLast7Days ? (subscriberCount / analytics.visitorsLast7Days) * 100 : 0;
  const maxDaily = Math.max(1, ...analytics.dailySeries.map((item) => item.views));

  return (
    <section className={`${sectionClass} overflow-hidden p-0`} id="audience-analytics">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-white/10 px-5 py-5 sm:px-6">
        <div className="flex min-w-0 items-start gap-3">
          <span className="dash-icon-chip" aria-hidden><Globe2 className="h-4 w-4" /></span>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <p className="dash-eyebrow">Audience intelligence</p>
              <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-300">Privacy safe</span>
            </div>
            <h2 className="dash-title">Website analytics</h2>
            <p className="dash-subtitle">Visitors, traffic, content performance, and project engagement in one view.</p>
          </div>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={onRefresh} disabled={isLoading}>
          <RefreshCw className={`mr-2 h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      <div className="space-y-6 p-4 sm:p-6">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="Website visitors" value={isLoading ? "—" : formatCount(analytics.visitors)} hint="Unique anonymous browsers" icon={Users} />
          <MetricCard label="Page views" value={isLoading ? "—" : formatCount(analytics.pageViews)} hint={`${formatCount(analytics.sessions)} total sessions`} icon={Eye} accent="violet" />
          <MetricCard label="Last 7 days" value={isLoading ? "—" : formatCount(analytics.visitorsLast7Days)} hint={`${formatCount(analytics.visitorsLast24Hours)} in the last 24 hours`} icon={Activity} accent="sunset" />
          <MetricCard label="7-day conversion" value={isLoading ? "—" : `${conversion.toFixed(conversion >= 10 ? 0 : 1)}%`} hint={`${formatCount(subscriberCount)} new emails this week`} icon={ArrowUpRight} />
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="Project stars" value={formatCount(engagement.projectStars)} hint="Community ratings submitted" icon={Star} accent="sunset" />
          <MetricCard label="Project shares" value={formatCount(engagement.projectShares)} hint="Unique project shares" icon={Share2} accent="violet" />
          <MetricCard label="Returning visitors" value={formatCount(analytics.returningVisitors)} hint="Visited in multiple sessions" icon={MousePointerClick} />
          <MetricCard label="Pages per session" value={analytics.averagePagesPerSession.toFixed(analytics.averagePagesPerSession >= 10 ? 0 : 1)} hint="Average browsing depth" icon={Mail} accent="violet" />
        </div>

        <div className="rounded-2xl border border-white/10 bg-black/20 p-4 sm:p-5">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h3 className="text-sm font-semibold text-foreground">7-day activity</h3>
              <p className="mt-1 text-xs text-muted-foreground">Page views with unique visitors by day</p>
            </div>
            <span className="text-xs text-muted-foreground">All public pages</span>
          </div>
          <div className="mt-6 grid h-36 grid-cols-7 items-end gap-2 sm:gap-4">
            {analytics.dailySeries.map((item) => (
              <div key={item.key} className="flex h-full min-w-0 flex-col items-center justify-end gap-2">
                <span className="text-[10px] font-mono text-muted-foreground">{item.views}</span>
                <div className="relative flex h-[92px] w-full max-w-10 items-end overflow-hidden rounded-t-md bg-white/[0.04]">
                  <div className="w-full rounded-t-md bg-gradient-to-t from-blue-600 to-cyan-300" style={{ height: `${item.views ? Math.max(10, (item.views / maxDaily) * 100) : 2}%` }} title={`${item.views} views · ${item.visitors} visitors`} />
                </div>
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{item.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <BreakdownList title="Top pages" items={analytics.topPages} empty="Page performance appears after the first public visit." />
          <BreakdownList title="Traffic sources" items={analytics.trafficSources} empty="Traffic sources appear after the first public visit." />
        </div>

        <div className="rounded-2xl border border-white/10 bg-black/20 p-4 sm:p-5">
          <h3 className="text-sm font-semibold text-foreground">Recent public activity</h3>
          <p className="mt-1 text-xs text-muted-foreground">Anonymous activity only — no email, IP address, or query-string data.</p>
          <div className="mt-4 divide-y divide-white/10">
            {analytics.recentActivity.length === 0 ? (
              <p className="py-4 text-sm text-muted-foreground">Tracking starts when this update is deployed.</p>
            ) : analytics.recentActivity.map((item, index) => (
              <div key={`${item.createdAt}-${index}`} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
                <div className="min-w-0">
                  <p className="truncate font-medium text-foreground">{analyticsPageLabel(item.path)}</p>
                  <p className="truncate font-mono text-[11px] text-muted-foreground">{item.path}</p>
                </div>
                <div className="text-right text-xs text-muted-foreground">
                  <p>{item.source}</p>
                  <p>{new Date(item.createdAt).toLocaleString()}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <p className="text-xs text-muted-foreground">Website totals begin from the deployment of this tracker; historical Google Analytics data is not imported.</p>
      </div>
    </section>
  );
}
