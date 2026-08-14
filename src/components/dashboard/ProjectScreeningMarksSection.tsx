import { useMemo, useState } from "react";
import {
  CartesianGrid,
  ReferenceLine,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { BarChart3, Download, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ChartContainer, type ChartConfig } from "@/components/ui/chart";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { ApplicantOpsStatus } from "@/lib/platformOps";
import { explainProjectMark, type ProjectConceptSource } from "@/lib/projectScreening";
import {
  buildProjectMarksAnalytics,
  filterRankedMarks,
  sortRankedMarks,
  type MarksFilter,
  type MarksSort,
  type ProjectMarkShape,
} from "@/lib/projectMarksAnalytics";
import { buildProjectAgentMarksCsv, projectAgentMarksCsvFilename } from "@/lib/projectAgentMarksCsv";
import { downloadCsv } from "@/lib/submissionCsv";
import { cn } from "@/lib/utils";

export type ProjectScreeningMarkRow = {
  id: string;
  title: string;
  participantName: string;
  teamName: string | null;
  source: ProjectConceptSource;
  status: ApplicantOpsStatus;
  score: number;
  themeFit: number;
  conceptQuality: number;
  summary?: string | null;
  strengths?: string[] | null;
  gaps?: string[] | null;
};

type ProjectScreeningMarksSectionProps = {
  rows: ProjectScreeningMarkRow[];
  activeId: string | null;
  onSelect: (id: string) => void;
  csvLabel?: string;
};

const statusLabel: Record<ApplicantOpsStatus, string> = {
  pending: "Pending",
  shortlisted: "Shortlisted",
  passed: "Passed",
};

const shapeLabel: Record<ProjectMarkShape, string> = {
  shortlist: "Shortlist band",
  "theme-weak": "Idea > theme",
  "concept-thin": "Thin write-up",
  mid: "Mid pack",
  below: "Below pass",
};

const RANK_BADGE: Record<number, string> = {
  1: "border-amber-400/50 bg-amber-500/15 text-amber-200",
  2: "border-slate-300/40 bg-slate-400/15 text-slate-200",
  3: "border-orange-400/40 bg-orange-500/15 text-orange-200",
};

const FILTERS: Array<{ id: MarksFilter; label: string }> = [
  { id: "all", label: "All" },
  { id: "shortlist", label: "Shortlist band" },
  { id: "theme-weak", label: "Idea > theme" },
  { id: "concept-thin", label: "Thin write-up" },
  { id: "below", label: "Below pass" },
];

const scatterConfig = {
  themeFit: { label: "Theme fit", color: "hsl(199 100% 50%)" },
  conceptQuality: { label: "Concept quality", color: "hsl(162 48% 42%)" },
} satisfies ChartConfig;

const shapeFill = (shape: ProjectMarkShape, selected: boolean) => {
  if (selected) return "hsl(185 100% 58%)";
  if (shape === "shortlist") return "hsl(185 100% 58%)";
  if (shape === "theme-weak") return "hsl(38 92% 50%)";
  if (shape === "concept-thin") return "hsl(262 83% 68%)";
  if (shape === "below") return "hsl(215 16% 47%)";
  return "hsl(199 100% 50%)";
};

function MiniBar({ value, tone }: { value: number; tone: "theme" | "concept" | "total" }) {
  const fill =
    tone === "theme" ? "bg-[hsl(199_100%_50%)]" : tone === "concept" ? "bg-[hsl(162_48%_42%)]" : "bg-primary";
  return (
    <div className="flex items-center justify-end gap-2">
      <div className="h-1.5 w-14 overflow-hidden rounded-full bg-white/10">
        <div className={cn("h-full rounded-full", fill)} style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
      </div>
      <span className="w-8 text-right font-mono text-sm tabular-nums">{value}</span>
    </div>
  );
}

function ScoreTrack({
  themeFit,
  conceptQuality,
  score,
}: {
  themeFit: number;
  conceptQuality: number;
  score: number;
}) {
  const clamp = (value: number) => `${Math.max(0, Math.min(100, value))}%`;
  return (
    <div
      className="relative h-8 w-full"
      role="img"
      aria-label={`Theme fit ${themeFit}, concept ${conceptQuality}, total ${score} on a 0 to 100 scale`}
    >
      <div className="absolute inset-x-0 top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-white/10" />
      <div
        className="absolute top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-primary/30"
        style={{ width: clamp(score) }}
      />
      <span
        className="absolute top-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border border-black/40 bg-[hsl(199_100%_50%)]"
        style={{ left: clamp(themeFit) }}
        title={`Theme fit ${themeFit}`}
      />
      <span
        className="absolute top-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border border-black/40 bg-[hsl(162_48%_42%)]"
        style={{ left: clamp(conceptQuality) }}
        title={`Concept quality ${conceptQuality}`}
      />
      <span
        className="absolute top-1/2 size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-background bg-primary"
        style={{ left: clamp(score) }}
        title={`Total mark ${score}`}
      />
    </div>
  );
}

function ScatterTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{
    payload?: {
      id: string;
      title: string;
      teamName: string | null;
      participantName: string;
      position: number;
      markShape: ProjectMarkShape;
      themeFit: number;
      conceptQuality: number;
      score: number;
    };
  }>;
}) {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload;
  if (!row) return null;
  return (
    <div className="min-w-[12rem] rounded-lg border border-border/50 bg-background px-3 py-2 text-xs">
      <p className="font-display text-sm font-semibold text-foreground">
        #{row.position} {row.title}
      </p>
      <p className="mt-0.5 text-muted-foreground">{row.teamName || row.participantName}</p>
      <dl className="mt-2 grid grid-cols-3 gap-2 font-mono tabular-nums">
        <div>
          <dt className="text-[10px] uppercase tracking-[0.1em] text-muted-foreground">Theme</dt>
          <dd className="text-foreground">{row.themeFit}</dd>
        </div>
        <div>
          <dt className="text-[10px] uppercase tracking-[0.1em] text-muted-foreground">Concept</dt>
          <dd className="text-foreground">{row.conceptQuality}</dd>
        </div>
        <div>
          <dt className="text-[10px] uppercase tracking-[0.1em] text-muted-foreground">Total</dt>
          <dd className="font-bold text-primary">{row.score}</dd>
        </div>
      </dl>
      <p className="mt-2 text-[10px] uppercase tracking-[0.12em] text-muted-foreground">{shapeLabel[row.markShape]}</p>
    </div>
  );
}

export function ProjectScreeningMarksSection({
  rows,
  activeId,
  onSelect,
  csvLabel = "project-agent",
}: ProjectScreeningMarksSectionProps) {
  const [filter, setFilter] = useState<MarksFilter>("all");
  const [sort, setSort] = useState<MarksSort>("total");
  const [query, setQuery] = useState("");
  const analytics = useMemo(() => buildProjectMarksAnalytics(rows), [rows]);
  const visible = useMemo(
    () => sortRankedMarks(filterRankedMarks(analytics.ranked, filter, query), sort),
    [analytics.ranked, filter, query, sort],
  );
  const scatterRows = useMemo(
    () =>
      visible.map((row, index) => ({
        id: row.id,
        title: row.title,
        teamName: row.teamName,
        participantName: row.participantName,
        position: row.position,
        markShape: row.shape,
        themeFit: row.themeFit,
        conceptQuality: row.conceptQuality,
        score: row.score,
        plotX: Math.max(
          0,
          Math.min(100, (Number.isFinite(row.themeFit) ? row.themeFit : 0) + ((index % 7) - 3) * 1.4),
        ),
        plotY: Math.max(
          0,
          Math.min(100, (Number.isFinite(row.conceptQuality) ? row.conceptQuality : 0) + (((index * 3) % 7) - 3) * 1.4),
        ),
      })),
    [visible],
  );
  const rowById = useMemo(() => Object.fromEntries(rows.map((row) => [row.id, row])), [rows]);
  const maxBand = Math.max(1, ...analytics.bands.map((band) => band.count));
  const filterCounts: Record<MarksFilter, number> = {
    all: analytics.count,
    shortlist: analytics.shortlistReady,
    "theme-weak": analytics.themeWeak,
    "concept-thin": analytics.conceptThin,
    below: analytics.belowCount,
  };

  if (analytics.count === 0) return null;

  return (
    <section
      id="marks-chart"
      className="scroll-mt-24 overflow-hidden rounded-xl border border-white/[0.08] bg-card/70"
    >
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-white/[0.06] px-4 py-4 sm:px-6">
        <div className="flex min-w-0 items-start gap-3">
          <span className="dash-icon-chip" aria-hidden>
            <BarChart3 className="h-4 w-4" />
          </span>
          <div>
            <p className="dash-eyebrow">Marks & positioning</p>
            <h2 className="dash-section-title">Screening analytics</h2>
            <p className="dash-subtitle">
              Ranked by agent total. Theme fit and concept quality sit on the same 0–100 scale so you can see why a
              concept ranks where it does.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            {analytics.count} placed · /100
          </p>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-9 px-3 text-[0.65rem] uppercase tracking-[0.2em]"
            onClick={() => downloadCsv(projectAgentMarksCsvFilename(csvLabel), buildProjectAgentMarksCsv(rows))}
          >
            <Download className="h-3.5 w-3.5" />
            Download CSV
          </Button>
        </div>
      </div>

      <div className="space-y-6 p-4 sm:p-6">
        <div className="dash-stat-grid grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          <div className="dash-stat-tile">
            <p className="dash-stat-value">{analytics.count}</p>
            <p className="dash-stat-label">Placed</p>
          </div>
          <div className="dash-stat-tile dash-stat-tile--highlight">
            <p className="dash-stat-value">{analytics.avgScore}</p>
            <p className="dash-stat-label">Avg total</p>
          </div>
          <div className="dash-stat-tile">
            <p className="dash-stat-value">{analytics.avgThemeFit}</p>
            <p className="dash-stat-label">Avg theme</p>
          </div>
          <div className="dash-stat-tile">
            <p className="dash-stat-value">{analytics.avgConceptQuality}</p>
            <p className="dash-stat-label">Avg concept</p>
          </div>
          <div className="dash-stat-tile">
            <p className="dash-stat-value">{analytics.shortlistReady}</p>
            <p className="dash-stat-label">Shortlist-ready</p>
          </div>
          <div className="dash-stat-tile">
            <p className="dash-stat-value">{analytics.themeWeak}</p>
            <p className="dash-stat-label">Idea &gt; theme</p>
          </div>
        </div>

        <p className="rounded-lg border border-white/10 bg-muted/15 px-4 py-3 font-body text-sm leading-relaxed text-foreground/90">
          {analytics.insight}
        </p>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(18rem,0.85fr)]">
          <div className="rounded-xl border border-white/10 bg-black/20 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-display text-sm font-semibold text-foreground">Theme vs concept</p>
                <p className="mt-1 font-body text-xs text-muted-foreground">
                  Each dot is a concept. Right is stronger theme fit, up is stronger write-up. Color is the shape of the
                  mark, not rank. Tied scores are nudged slightly so clusters stay visible.
                </p>
              </div>
              <p className="shrink-0 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                {visible.length} shown
              </p>
            </div>
            <div className="relative mt-4">
              <p className="pointer-events-none absolute left-8 top-2 z-10 max-w-[7rem] text-[10px] uppercase tracking-[0.12em] text-muted-foreground/80">
                Idea &gt; theme
              </p>
              <p className="pointer-events-none absolute right-3 top-2 z-10 text-right text-[10px] uppercase tracking-[0.12em] text-primary/80">
                Shortlist zone
              </p>
              <p className="pointer-events-none absolute bottom-10 left-8 z-10 text-[10px] uppercase tracking-[0.12em] text-muted-foreground/70">
                Off theme
              </p>
              <p className="pointer-events-none absolute bottom-10 right-3 z-10 text-right text-[10px] uppercase tracking-[0.12em] text-muted-foreground/80">
                On theme, thin
              </p>
              <ChartContainer config={scatterConfig} className="aspect-auto h-[320px] w-full">
                <ScatterChart margin={{ top: 12, right: 12, bottom: 28, left: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    type="number"
                    dataKey="plotX"
                    name="Theme fit"
                    domain={[0, 100]}
                    tickCount={5}
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 11 }}
                    label={{ value: "Theme fit →", position: "insideBottom", offset: -16, fontSize: 11 }}
                  />
                  <YAxis
                    type="number"
                    dataKey="plotY"
                    name="Concept quality"
                    domain={[0, 100]}
                    tickCount={5}
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 11 }}
                    width={36}
                    label={{ value: "Concept quality →", angle: -90, position: "insideLeft", offset: 12, fontSize: 11 }}
                  />
                  <ReferenceLine x={50} stroke="hsl(215 16% 47% / 0.55)" strokeDasharray="4 4" />
                  <ReferenceLine y={50} stroke="hsl(215 16% 47% / 0.55)" strokeDasharray="4 4" />
                  <ReferenceLine x={75} stroke="hsl(185 100% 58% / 0.35)" strokeDasharray="3 3" />
                  <ReferenceLine y={70} stroke="hsl(162 48% 42% / 0.35)" strokeDasharray="3 3" />
                  <Tooltip cursor={{ strokeDasharray: "3 3" }} content={<ScatterTooltip />} />
                  <Scatter
                    data={scatterRows}
                    onClick={(data) => {
                      const id = (data as { payload?: { id?: unknown } } | undefined)?.payload?.id;
                      if (typeof id === "string" && id) onSelect(id);
                    }}
                    shape={(props) => {
                      const { cx, cy, payload } = props as {
                        cx?: number;
                        cy?: number;
                        payload?: { id?: string; markShape?: ProjectMarkShape };
                      };
                      if (!Number.isFinite(cx) || !Number.isFinite(cy) || !payload?.id) {
                        return <g />;
                      }
                      const selected = payload.id === activeId;
                      return (
                        <circle
                          cx={cx}
                          cy={cy}
                          r={selected ? 8 : 5.5}
                          fill={shapeFill(payload.markShape ?? "mid", selected)}
                          fillOpacity={selected ? 1 : 0.88}
                          stroke={selected ? "hsl(0 0% 100%)" : "hsl(210 22% 6%)"}
                          strokeWidth={selected ? 2 : 1}
                          className="cursor-pointer"
                          onClick={() => onSelect(payload.id!)}
                        />
                      );
                    }}
                    activeShape={(props) => {
                      const { cx, cy, payload } = props as {
                        cx?: number;
                        cy?: number;
                        payload?: { id?: string; markShape?: ProjectMarkShape };
                      };
                      if (!Number.isFinite(cx) || !Number.isFinite(cy) || !payload?.id) {
                        return <g />;
                      }
                      return (
                        <circle
                          cx={cx}
                          cy={cy}
                          r={8}
                          fill={shapeFill(payload.markShape ?? "mid", true)}
                          stroke="hsl(0 0% 100%)"
                          strokeWidth={2}
                          className="cursor-pointer"
                          onClick={() => onSelect(payload.id!)}
                        />
                      );
                    }}
                  />
                </ScatterChart>
              </ChartContainer>
            </div>
            <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
              <li className="inline-flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-[hsl(185_100%_58%)]" /> Shortlist
              </li>
              <li className="inline-flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-[hsl(38_92%_50%)]" /> Idea &gt; theme
              </li>
              <li className="inline-flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-[hsl(262_83%_68%)]" /> Thin write-up
              </li>
              <li className="inline-flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-[hsl(199_100%_50%)]" /> Mid pack
              </li>
              <li className="inline-flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-[hsl(215_16%_47%)]" /> Below pass
              </li>
            </ul>
          </div>

          <div className="rounded-xl border border-white/10 bg-black/20 p-4">
            <p className="font-display text-sm font-semibold text-foreground">Score distribution</p>
            <p className="mt-1 font-body text-xs text-muted-foreground">
              How the field sits against shortlist ({analytics.bands[0].hint}) and pass ({analytics.bands[2].hint})
              lines. Median {analytics.medianScore}, spread {analytics.spread}.
            </p>
            <div className="mt-5 space-y-4">
              {analytics.bands.map((band) => (
                <div key={band.id}>
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="font-display text-sm text-foreground">{band.label}</p>
                    <p className="font-mono text-xs tabular-nums text-muted-foreground">
                      {band.count} · {band.percent}%
                    </p>
                  </div>
                  <p className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                    {band.hint}
                  </p>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
                    <div
                      className={cn(
                        "h-full rounded-full",
                        band.id === "shortlist" && "bg-primary",
                        band.id === "mid" && "bg-[hsl(199_100%_50%)]",
                        band.id === "below" && "bg-muted-foreground/60",
                      )}
                      style={{ width: `${Math.max(band.count === 0 ? 0 : 8, (band.count / maxBand) * 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
            <dl className="mt-6 grid grid-cols-3 gap-3 border-t border-white/10 pt-4 font-mono text-xs tabular-nums">
              <div>
                <dt className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">High</dt>
                <dd className="mt-1 text-foreground">{analytics.maxScore}</dd>
              </div>
              <div>
                <dt className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">Median</dt>
                <dd className="mt-1 text-foreground">{analytics.medianScore}</dd>
              </div>
              <div>
                <dt className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">Low</dt>
                <dd className="mt-1 text-foreground">{analytics.minScore}</dd>
              </div>
            </dl>
          </div>
        </div>

        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-1.5">
            {FILTERS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setFilter(item.id)}
                className={cn(
                  "rounded-full border px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.14em] transition-colors",
                  filter === item.id
                    ? "border-primary/50 bg-primary/15 text-primary"
                    : "border-white/10 bg-white/[0.03] text-muted-foreground hover:border-white/25 hover:text-foreground",
                )}
              >
                {item.label} {filterCounts[item.id]}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-[12rem] flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search concepts"
                className="h-9 pl-9"
              />
            </div>
            <Select value={sort} onValueChange={(value) => setSort(value as MarksSort)}>
              <SelectTrigger className="h-9 w-[11.5rem]">
                <SelectValue placeholder="Sort" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="total">Sort by total</SelectItem>
                <SelectItem value="theme">Sort by theme fit</SelectItem>
                <SelectItem value="concept">Sort by concept</SelectItem>
                <SelectItem value="gap">Sort by mismatch</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="font-display text-sm font-semibold text-foreground">Ranked mark chart</p>
              <p className="mt-1 font-body text-xs text-muted-foreground">
                Bar is total mark. Cyan dot is theme fit, green dot is concept quality. Rank stays by total even when
                you sort or filter.
              </p>
            </div>
            <ul className="flex flex-wrap gap-x-4 gap-y-1 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
              <li className="inline-flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-[hsl(199_100%_50%)]" /> Theme fit
              </li>
              <li className="inline-flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-[hsl(162_48%_42%)]" /> Concept
              </li>
              <li className="inline-flex items-center gap-1.5">
                <span className="size-3 rounded-full bg-primary" /> Total
              </li>
            </ul>
          </div>

          {visible.length === 0 ? (
            <p className="mt-4 rounded-xl border border-dashed border-white/10 px-4 py-8 text-center font-body text-sm text-muted-foreground">
              No concepts match this slice.
            </p>
          ) : (
            <>
              <div className="mt-3 hidden items-center gap-3 px-1 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground md:flex">
                <span className="w-[14.5rem] shrink-0" />
                <div className="relative min-w-0 flex-1">
                  <span>0</span>
                  <span className="absolute left-1/2 -translate-x-1/2">50</span>
                  <span className="absolute right-0">100</span>
                </div>
                <span className="w-10 text-right">T</span>
                <span className="w-10 text-right">C</span>
                <span className="w-10 text-right">Tot</span>
              </div>
              <div className="mt-2 max-h-[640px] space-y-1 overflow-y-auto pr-1">
                {visible.map((row) => (
                  <button
                    key={row.id}
                    type="button"
                    onClick={() => onSelect(row.id)}
                    className={cn(
                      "grid w-full grid-cols-1 items-center gap-2 rounded-lg border px-3 py-2.5 text-left transition-colors md:grid-cols-[14.5rem_minmax(0,1fr)_auto] md:gap-3",
                      row.id === activeId
                        ? "border-primary/40 bg-primary/10"
                        : "border-transparent hover:border-white/10 hover:bg-white/[0.03]",
                    )}
                  >
                    <div className="flex min-w-0 items-center gap-2.5">
                      <span
                        className={cn(
                          "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border font-mono text-xs font-bold tabular-nums",
                          RANK_BADGE[row.position] ?? "border-white/15 bg-white/5 text-muted-foreground",
                        )}
                      >
                        {row.position}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate font-display text-sm font-semibold text-foreground">{row.title}</p>
                        <p className="truncate font-body text-[11px] text-muted-foreground">
                          {row.teamName || row.participantName}
                          {row.shape !== "mid" && row.shape !== "shortlist" ? ` · ${shapeLabel[row.shape]}` : ""}
                        </p>
                      </div>
                    </div>
                    <ScoreTrack themeFit={row.themeFit} conceptQuality={row.conceptQuality} score={row.score} />
                    <div className="hidden items-center gap-3 font-mono text-xs tabular-nums md:flex">
                      <span className="w-10 text-right text-muted-foreground">{row.themeFit}</span>
                      <span className="w-10 text-right text-muted-foreground">{row.conceptQuality}</span>
                      <span className="w-10 text-right font-bold text-primary">{row.score}</span>
                    </div>
                    <dl className="grid grid-cols-3 gap-2 border-t border-white/10 pt-2 font-mono text-xs tabular-nums md:hidden">
                      <div>
                        <dt className="text-[10px] uppercase tracking-[0.1em] text-muted-foreground">Theme</dt>
                        <dd>{row.themeFit}</dd>
                      </div>
                      <div>
                        <dt className="text-[10px] uppercase tracking-[0.1em] text-muted-foreground">Concept</dt>
                        <dd>{row.conceptQuality}</dd>
                      </div>
                      <div>
                        <dt className="text-[10px] uppercase tracking-[0.1em] text-muted-foreground">Total</dt>
                        <dd className="font-bold text-primary">{row.score}</dd>
                      </div>
                    </dl>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        <div>
          <p className="font-display text-sm font-semibold text-foreground">Positioning with marks</p>
          <p className="mt-1 font-body text-xs text-muted-foreground">
            Click a row to open that concept. Why is the agent’s reason for that score.
          </p>

          <div className="mt-4 space-y-3 md:hidden">
            {visible.map((row) => (
              <button
                key={row.id}
                type="button"
                onClick={() => onSelect(row.id)}
                className={cn(
                  "w-full rounded-xl border px-3.5 py-3 text-left transition-colors",
                  row.id === activeId
                    ? "border-primary/40 bg-primary/10"
                    : "border-white/10 bg-white/[0.03] hover:border-white/20",
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-2.5">
                    <span
                      className={cn(
                        "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border font-mono text-xs font-bold tabular-nums",
                        RANK_BADGE[row.position] ?? "border-primary/30 bg-primary/10 text-primary",
                      )}
                    >
                      {row.position}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate font-display text-sm font-semibold text-foreground">{row.title}</p>
                      <p className="mt-0.5 truncate font-body text-xs text-muted-foreground">
                        {row.participantName}
                        {row.source === "pitch" ? " · pitch" : ""}
                      </p>
                      <p className="mt-2 font-body text-xs leading-relaxed text-muted-foreground">
                        {explainProjectMark(rowById[row.id] ?? row)}
                      </p>
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="font-mono text-lg font-bold tabular-nums text-primary">{row.score}</p>
                    <p className="text-[10px] uppercase tracking-[0.1em] text-muted-foreground">total</p>
                  </div>
                </div>
                <dl className="mt-3 grid grid-cols-3 gap-2 border-t border-white/10 pt-3 font-mono text-xs tabular-nums">
                  <div>
                    <dt className="text-[10px] uppercase tracking-[0.1em] text-muted-foreground">Theme</dt>
                    <dd className="mt-0.5 text-foreground">{row.themeFit}</dd>
                  </div>
                  <div>
                    <dt className="text-[10px] uppercase tracking-[0.1em] text-muted-foreground">Concept</dt>
                    <dd className="mt-0.5 text-foreground">{row.conceptQuality}</dd>
                  </div>
                  <div>
                    <dt className="text-[10px] uppercase tracking-[0.1em] text-muted-foreground">Status</dt>
                    <dd className="mt-0.5 text-foreground">{statusLabel[row.status] ?? "Pending"}</dd>
                  </div>
                </dl>
              </button>
            ))}
          </div>

          <div className="dash-table-scroll mt-4 hidden rounded-xl border border-white/10 md:block">
            <Table>
              <TableHeader>
                <TableRow className="border-white/10 bg-muted/15 hover:bg-muted/15">
                  <TableHead className="dash-table-head w-[56px]">Pos</TableHead>
                  <TableHead className="dash-table-head">Project</TableHead>
                  <TableHead className="dash-table-head min-w-[220px]">Why</TableHead>
                  <TableHead className="dash-table-head">Shape</TableHead>
                  <TableHead className="dash-table-head w-[120px] text-right">Theme fit</TableHead>
                  <TableHead className="dash-table-head w-[120px] text-right">Concept</TableHead>
                  <TableHead className="dash-table-head w-[120px] text-right">Total mark</TableHead>
                  <TableHead className="dash-table-head w-[110px] text-right">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visible.map((row) => (
                  <TableRow
                    key={row.id}
                    className={cn(
                      "cursor-pointer border-white/5 transition-colors hover:bg-primary/5",
                      row.id === activeId && "bg-primary/10",
                    )}
                    onClick={() => onSelect(row.id)}
                  >
                    <TableCell>
                      <span
                        className={cn(
                          "inline-flex h-7 w-7 items-center justify-center rounded-full border font-mono text-xs font-bold tabular-nums",
                          RANK_BADGE[row.position] ?? "border-white/15 bg-white/5 text-muted-foreground",
                        )}
                      >
                        {row.position}
                      </span>
                    </TableCell>
                    <TableCell>
                      <p className="text-sm font-medium text-foreground">{row.title}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {row.teamName || (row.source === "pitch" ? "Pitch" : row.participantName)}
                      </p>
                    </TableCell>
                    <TableCell className="max-w-[28rem]">
                      <p className="font-body text-xs leading-relaxed text-muted-foreground">
                        {explainProjectMark(rowById[row.id] ?? row)}
                      </p>
                    </TableCell>
                    <TableCell className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
                      {shapeLabel[row.shape]}
                    </TableCell>
                    <TableCell>
                      <MiniBar value={row.themeFit} tone="theme" />
                    </TableCell>
                    <TableCell>
                      <MiniBar value={row.conceptQuality} tone="concept" />
                    </TableCell>
                    <TableCell>
                      <MiniBar value={row.score} tone="total" />
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs uppercase tracking-[0.1em] text-muted-foreground">
                      {statusLabel[row.status] ?? "Pending"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </section>
  );
}
