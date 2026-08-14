import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, LabelList, XAxis, YAxis } from "recharts";
import { BarChart3, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  ChartContainer,
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
import { sectionClass } from "@/components/dashboard/DashboardLayout";
import type { JudgingCriterion } from "@/components/dashboard/judgingCriteria";
import type { AdminSubmissionRow } from "@/components/dashboard/AdminDashboard";
import type { Submission } from "@/types/portal";
import {
  buildJudgeMarkChartRows,
  buildJudgeMarksCsv,
  judgeMarksCsvFilename,
  type JudgeMarkChartInput,
} from "@/lib/judgeMarksChart";
import { downloadCsv } from "@/lib/submissionCsv";
import { cn } from "@/lib/utils";

const chartConfig = {
  chartScore: { label: "Avg judge mark", color: "hsl(262 83% 68%)" },
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

function fromAdminRows(submissions: AdminSubmissionRow[]): JudgeMarkChartInput[] {
  return submissions.map((row) => ({
    id: row.id,
    title: row.title,
    teamName: row.teamName,
    participantLabel: row.participantEmail,
    averageScore: row.averageScore,
    scoredByCount: row.scoredByCount,
    judgeMarks: row.judgeMarks,
    createdAt: row.createdAt,
  }));
}

function fromJudgeSubmissions(submissions: Submission[]): JudgeMarkChartInput[] {
  return submissions.map((submission) => ({
    id: submission.id,
    title: submission.title,
    teamName: submission.team_name,
    participantLabel:
      submission.owner_email?.trim() ||
      submission.owner_name?.trim() ||
      submission.team_name?.trim() ||
      "Builder",
    averageScore: typeof submission.judge_score === "number" ? submission.judge_score : null,
    scoredByCount: typeof submission.judge_score === "number" ? 1 : 0,
    judgeMarks: [
      {
        judgeEmail: "Your mark",
        score: typeof submission.judge_score === "number" ? submission.judge_score : null,
        criteriaScores: submission.judge_criteria_scores ?? undefined,
      },
    ],
    createdAt: submission.created_at,
  }));
}

type JudgeMarksChartPanelProps = {
  eventLabel: string;
  judgingCriteria: JudgingCriterion[];
  isLoading?: boolean;
  submissions?: AdminSubmissionRow[];
  judgeSubmissions?: Submission[];
  scoreHeading?: string;
  subtitle?: string;
};

export function JudgeMarksChartPanel({
  eventLabel,
  judgingCriteria,
  isLoading,
  submissions,
  judgeSubmissions,
  scoreHeading = "Avg judge mark",
  subtitle = "Ranked by judge scores only. Project agent theme marks are on a separate chart.",
}: JudgeMarksChartPanelProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const inputs = useMemo(
    () => (judgeSubmissions ? fromJudgeSubmissions(judgeSubmissions) : fromAdminRows(submissions ?? [])),
    [judgeSubmissions, submissions],
  );
  const rows = useMemo(
    () => buildJudgeMarkChartRows(inputs, judgingCriteria),
    [inputs, judgingCriteria],
  );
  const chartHeight = Math.min(760, Math.max(280, rows.length * 48));

  if (isLoading) {
    return (
      <section id="judge-marks-chart" className={`${sectionClass} scroll-mt-24`}>
        <p className="font-body text-sm text-muted-foreground">Loading judge marks…</p>
      </section>
    );
  }

  if (rows.length === 0) return null;

  return (
    <section
      id="judge-marks-chart"
      className="scroll-mt-24 overflow-hidden rounded-xl border border-white/[0.08] bg-card/70"
    >
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-white/[0.06] px-4 py-4 sm:px-6">
        <div className="flex min-w-0 items-start gap-3">
          <span className="dash-icon-chip dash-icon-chip--violet" aria-hidden>
            <BarChart3 className="h-4 w-4" />
          </span>
          <div>
            <p className="dash-eyebrow">Judge marks</p>
            <h2 className="dash-section-title">Judge mark chart</h2>
            <p className="dash-subtitle">{subtitle}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            {rows.filter((row) => row.averageScore != null).length} scored · /100
          </p>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-9 px-3 text-[0.65rem] uppercase tracking-[0.2em]"
            onClick={() =>
              downloadCsv(judgeMarksCsvFilename(eventLabel), buildJudgeMarksCsv(rows, judgingCriteria))
            }
          >
            <Download className="h-3.5 w-3.5" />
            Download CSV
          </Button>
        </div>
      </div>

      <div className="space-y-6 p-4 sm:p-6">
        <ChartContainer
          config={chartConfig}
          className="aspect-auto w-full min-h-[280px]"
          style={{ height: chartHeight }}
        >
          <BarChart
            data={rows}
            layout="vertical"
            margin={{ left: 8, right: 36, top: 8, bottom: 8 }}
            barCategoryGap={12}
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
            <ChartTooltip cursor={{ fill: "hsl(262 83% 68% / 0.08)" }} content={<ChartTooltipContent indicator="dot" />} />
            <Bar
              dataKey="chartScore"
              name={scoreHeading}
              fill="var(--color-chartScore)"
              radius={3}
              maxBarSize={18}
              cursor="pointer"
              onClick={(entry) => {
                const id = selectIdFromBar(entry);
                if (id) setActiveId(id);
              }}
            >
              <LabelList dataKey="chartScore" position="right" className="fill-primary text-[10px] font-semibold" />
            </Bar>
          </BarChart>
        </ChartContainer>

        <div>
          <p className="font-display text-sm font-semibold text-foreground">Judge positioning</p>
          <p className="mt-1 font-body text-xs text-muted-foreground">
            Average of recorded judge totals. Criterion columns are judge averages, not project-agent scores.
          </p>

          <div className="mt-4 space-y-3 md:hidden">
            {rows.map((row) => (
              <button
                key={row.id}
                type="button"
                onClick={() => setActiveId(row.id)}
                className={cn(
                  "w-full rounded-xl border px-3.5 py-3 text-left transition-colors",
                  row.id === activeId
                    ? "border-violet-400/40 bg-violet-500/10"
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
                        {row.teamName || row.participantLabel}
                      </p>
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="font-mono text-lg font-bold tabular-nums text-primary">
                      {row.averageScore != null ? row.averageScore.toFixed(1) : "—"}
                    </p>
                    <p className="text-[10px] uppercase tracking-[0.1em] text-muted-foreground">judge avg</p>
                  </div>
                </div>
              </button>
            ))}
          </div>

          <div className="dash-table-scroll mt-4 hidden rounded-xl border border-white/10 md:block">
            <Table>
              <TableHeader>
                <TableRow className="border-white/10 bg-muted/15 hover:bg-muted/15">
                  <TableHead className="dash-table-head w-[56px]">Pos</TableHead>
                  <TableHead className="dash-table-head">Project</TableHead>
                  <TableHead className="dash-table-head">Team</TableHead>
                  {judgingCriteria.map((criterion) => (
                    <TableHead key={criterion.id} className="dash-table-head w-[110px] text-right">
                      {criterion.title}
                    </TableHead>
                  ))}
                  <TableHead className="dash-table-head w-[110px] text-right">Judge avg</TableHead>
                  <TableHead className="dash-table-head w-[90px] text-right">Judges</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow
                    key={row.id}
                    className={cn(
                      "cursor-pointer border-white/5 transition-colors hover:bg-primary/5",
                      row.id === activeId && "bg-violet-500/10",
                    )}
                    onClick={() => setActiveId(row.id)}
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
                      <p className="mt-0.5 text-xs text-muted-foreground">{row.participantLabel}</p>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{row.teamName || "—"}</TableCell>
                    {judgingCriteria.map((criterion) => (
                      <TableCell key={criterion.id} className="text-right font-mono text-sm tabular-nums">
                        {row.criterionAverages[criterion.id] != null
                          ? row.criterionAverages[criterion.id]!.toFixed(1)
                          : "—"}
                      </TableCell>
                    ))}
                    <TableCell className="text-right font-mono text-sm font-bold tabular-nums text-primary">
                      {row.averageScore != null ? row.averageScore.toFixed(1) : "—"}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs tabular-nums text-muted-foreground">
                      {row.scoredByCount}/{row.judgeCount}
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
