import { cn } from "@/lib/utils";
import { JUDGING_CRITERIA_STATS, type CriterionAverage } from "@/lib/judgingStatistics";
import type { JudgingCriterion } from "@/components/dashboard/judgingCriteria";
type StatCardProps = {
  label: string;
  value: string;
  highlight?: boolean;
  className?: string;
};

function StatCard({ label, value, highlight = false, className }: StatCardProps) {
  return (
    <div
      className={cn(
        "dash-stat-tile",
        highlight && "dash-stat-tile--highlight",
        className
      )}
    >
      <p className="dash-stat-value">{value}</p>
      <p className="dash-stat-label">{label}</p>
    </div>
  );
}

type JudgingStatsPanelProps = {
  isLoading?: boolean;
  completionRate: number | null;
  criterionAverages: CriterionAverage[];
  stats: Array<{ label: string; value: string; highlight?: boolean }>;
  title?: string;
  description?: string;
};

export function JudgingStatsPanel({
  isLoading = false,
  completionRate,
  criterionAverages,
  stats,
  title = "Judging statistics",
  description,
}: JudgingStatsPanelProps) {
  const displayValue = (value: string) => (isLoading ? "—" : value);

  return (
    <section className="space-y-4" aria-label={title}>
      <div>
        <h3 className="dash-section-title">{title}</h3>
        {description ? (
          <p className="mt-1.5 text-sm text-muted-foreground sm:text-base md:text-lg">{description}</p>
        ) : null}
      </div>

      <div className="dash-stat-grid grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 lg:grid-cols-4 xl:grid-cols-6">
        {stats.map((stat) => (
          <StatCard
            key={stat.label}
            label={stat.label}
            value={displayValue(stat.value)}
            highlight={stat.highlight}
          />
        ))}
      </div>

      {!isLoading && completionRate != null ? (
        <div className="rounded-xl border border-white/10 bg-muted/15 p-4">
          <div className="mb-2.5 flex items-center justify-between gap-3 text-sm sm:text-base">
            <span className="font-display text-base font-semibold text-foreground sm:text-lg">Scoring progress</span>
            <span className="font-mono text-lg font-bold tabular-nums text-primary sm:text-xl">
              {completionRate.toFixed(0)}%
            </span>
          </div>
          <div className="dash-progress-track">
            <div
              className="dash-progress-fill"
              style={{ width: `${Math.min(completionRate, 100)}%` }}
            />
          </div>
        </div>
      ) : null}

      {!isLoading && criterionAverages.some((criterion) => criterion.average != null) ? (
        <div className="rounded-xl border border-white/10 bg-muted/15 p-4">
          <p className="dash-eyebrow mb-3">Average by criterion</p>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {criterionAverages.map((criterion) => (
              <div
                key={criterion.id}
                className="rounded-lg border border-white/10 bg-background/40 px-3 py-2.5 transition-colors hover:border-primary/35"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="min-w-0 text-sm font-medium leading-snug text-foreground sm:text-base md:text-lg">
                    {criterion.title}
                  </p>
                  <span className="shrink-0 rounded-full border border-white/10 bg-muted/30 px-2 py-0.5 font-mono text-xs text-muted-foreground sm:text-sm">
                    /{criterion.weight}
                  </span>
                </div>
                <p className="mt-1.5 font-mono text-xl font-bold tabular-nums text-primary sm:text-2xl">
                  {criterion.average != null ? criterion.average.toFixed(1) : "—"}
                </p>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}

export function CriteriaOverviewStats({
  className,
  criteria,
}: {
  className?: string;
  criteria?: JudgingCriterion[];
}) {
  const stats = criteria?.length
    ? {
        criteriaCount: criteria.length,
        totalPoints: criteria.reduce((sum, criterion) => sum + criterion.weight, 0),
        highestWeight: Math.max(...criteria.map((criterion) => criterion.weight)),
        lowestWeight: Math.min(...criteria.map((criterion) => criterion.weight)),
      }
    : JUDGING_CRITERIA_STATS;
  const { criteriaCount, totalPoints, highestWeight, lowestWeight } = stats;
  return (
    <div
      className={cn(
        "grid grid-cols-2 gap-3 sm:grid-cols-4",
        className
      )}
    >
      <StatCard label="Criteria" value={String(criteriaCount)} highlight />
      <StatCard label="Total points" value={String(totalPoints)} />
      <StatCard label="Top weight" value={`${highestWeight}%`} />
      <StatCard label="Min weight" value={`${lowestWeight}%`} />
    </div>
  );
}
