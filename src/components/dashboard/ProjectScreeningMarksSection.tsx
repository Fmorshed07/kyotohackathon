import { Bar, BarChart, CartesianGrid, LabelList, XAxis, YAxis } from "recharts";
import { BarChart3 } from "lucide-react";
import type { ApplicantOpsStatus } from "@/lib/platformOps";
import type { ProjectConceptSource } from "@/lib/projectScreening";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
};

type ProjectScreeningMarksSectionProps = {
  rows: ProjectScreeningMarkRow[];
  activeId: string | null;
  onSelect: (id: string) => void;
};

const statusLabel: Record<ApplicantOpsStatus, string> = {
  pending: "Pending",
  shortlisted: "Shortlisted",
  passed: "Passed",
};

const chartConfig = {
  themeFit: { label: "Theme fit", color: "hsl(199 100% 50%)" },
  conceptQuality: { label: "Concept", color: "hsl(162 48% 42%)" },
  score: { label: "Total mark", color: "hsl(185 100% 58%)" },
} satisfies ChartConfig;

const RANK_BADGE: Record<number, string> = {
  1: "border-amber-400/50 bg-amber-500/15 text-amber-200",
  2: "border-slate-300/40 bg-slate-400/15 text-slate-200",
  3: "border-orange-400/40 bg-orange-500/15 text-orange-200",
};

const selectIdFromBar = (entry: unknown) => {
  if (!entry || typeof entry !== "object") return "";
  const record = entry as { id?: unknown; payload?: { id?: unknown } };
  if (typeof record.id === "string" && record.id) return record.id;
  if (typeof record.payload?.id === "string") return record.payload.id;
  return "";
};

const truncate = (value: string, max = 22) =>
  value.length > max ? `${value.slice(0, max - 1)}…` : value;

export function ProjectScreeningMarksSection({
  rows,
  activeId,
  onSelect,
}: ProjectScreeningMarksSectionProps) {
  const ranked = [...rows].sort((left, right) => right.score - left.score || left.title.localeCompare(right.title));
  const chartRows = ranked.map((row, index) => {
    const position = index + 1;
    return {
      ...row,
      position,
      axisLabel: `#${position} ${truncate(row.title)}`,
    };
  });
  const chartHeight = Math.min(760, Math.max(280, chartRows.length * 56));

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
            <h2 className="dash-section-title">Full mark chart</h2>
            <p className="dash-subtitle">
              Ranked by total mark. Theme fit, concept quality, and overall score for every concept.
            </p>
          </div>
        </div>
        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
          {chartRows.length} placed · /100
        </p>
      </div>

      <div className="space-y-6 p-4 sm:p-6">
        <ChartContainer
          config={chartConfig}
          className="aspect-auto w-full"
          style={{ height: chartHeight }}
        >
          <BarChart
            data={chartRows}
            layout="vertical"
            margin={{ left: 8, right: 36, top: 8, bottom: 8 }}
            barCategoryGap={10}
          >
            <CartesianGrid horizontal={false} strokeDasharray="3 3" />
            <XAxis type="number" domain={[0, 100]} tickLine={false} axisLine={false} />
            <YAxis
              type="category"
              dataKey="axisLabel"
              width={128}
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 11 }}
            />
            <ChartTooltip
              cursor={{ fill: "hsl(199 100% 50% / 0.08)" }}
              content={<ChartTooltipContent indicator="dot" />}
            />
            <ChartLegend content={<ChartLegendContent />} />
            <Bar
              dataKey="themeFit"
              fill="var(--color-themeFit)"
              radius={3}
              maxBarSize={14}
              cursor="pointer"
              onClick={(entry) => {
                const id = selectIdFromBar(entry);
                if (id) onSelect(id);
              }}
            >
              <LabelList dataKey="themeFit" position="right" className="fill-muted-foreground text-[10px]" />
            </Bar>
            <Bar
              dataKey="conceptQuality"
              fill="var(--color-conceptQuality)"
              radius={3}
              maxBarSize={14}
              cursor="pointer"
              onClick={(entry) => {
                const id = selectIdFromBar(entry);
                if (id) onSelect(id);
              }}
            >
              <LabelList dataKey="conceptQuality" position="right" className="fill-muted-foreground text-[10px]" />
            </Bar>
            <Bar
              dataKey="score"
              fill="var(--color-score)"
              radius={3}
              maxBarSize={14}
              cursor="pointer"
              onClick={(entry) => {
                const id = selectIdFromBar(entry);
                if (id) onSelect(id);
              }}
            >
              <LabelList dataKey="score" position="right" className="fill-primary text-[10px] font-semibold" />
            </Bar>
          </BarChart>
        </ChartContainer>

        <div>
          <p className="font-display text-sm font-semibold text-foreground">Positioning with marks</p>
          <p className="mt-1 font-body text-xs text-muted-foreground">
            Click a row to open that concept. Position is rank by total mark.
          </p>

          <div className="mt-4 space-y-3 md:hidden">
            {chartRows.map((row) => (
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
                    <dd className="mt-0.5 text-foreground">{statusLabel[row.status]}</dd>
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
                  <TableHead className="dash-table-head">Builder</TableHead>
                  <TableHead className="dash-table-head w-[100px] text-right">Theme fit</TableHead>
                  <TableHead className="dash-table-head w-[100px] text-right">Concept</TableHead>
                  <TableHead className="dash-table-head w-[100px] text-right">Total mark</TableHead>
                  <TableHead className="dash-table-head w-[110px] text-right">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {chartRows.map((row) => (
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
                        {row.teamName || (row.source === "pitch" ? "Pitch" : "—")}
                      </p>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{row.participantName}</TableCell>
                    <TableCell className="text-right font-mono text-sm tabular-nums">{row.themeFit}</TableCell>
                    <TableCell className="text-right font-mono text-sm tabular-nums">{row.conceptQuality}</TableCell>
                    <TableCell className="text-right font-mono text-sm font-bold tabular-nums text-primary">
                      {row.score}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs uppercase tracking-[0.1em] text-muted-foreground">
                      {statusLabel[row.status]}
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
