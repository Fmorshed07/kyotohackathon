import { Badge } from "@/components/ui/badge";
import { Medal, Trophy } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { sectionClass } from "@/components/dashboard/DashboardLayout";
import { getTeamAccentStyle } from "@/components/dashboard/judgeDashboardAccents";
import type { AdminSubmissionRow } from "@/components/dashboard/AdminDashboard";
import type { PortalHackathon } from "@/lib/hackathons";
import { cn } from "@/lib/utils";

type AdminTop3MarksPanelProps = {
  selectedHackathon: PortalHackathon;
  submissions: AdminSubmissionRow[];
  isLoading: boolean;
};

const RANK_LABELS = ["1st", "2nd", "3rd"] as const;

const RANK_MEDAL_CLASS: Record<(typeof RANK_LABELS)[number], string> = {
  "1st": "border-amber-400/50 bg-amber-500/15 text-amber-200",
  "2nd": "border-slate-300/40 bg-slate-400/15 text-slate-200",
  "3rd": "border-orange-400/40 bg-orange-500/15 text-orange-200",
};

function getTeamLabel(row: AdminSubmissionRow): string {
  return row.teamName?.trim() || row.title?.trim() || row.participantEmail;
}

function Top3MarksMobileCard({
  row,
  rank,
}: {
  row: AdminSubmissionRow;
  rank: number;
}) {
  const rankLabel = RANK_LABELS[rank - 1] ?? `${rank}th`;
  const accent = getTeamAccentStyle(row.teamName ?? row.title ?? row.participantEmail);

  return (
    <article className={cn("rounded-xl border p-3.5 sm:p-4", accent.panel)}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-2.5">
          <span
            className={cn(
              "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border font-mono text-xs font-bold tabular-nums",
              RANK_MEDAL_CLASS[rankLabel as (typeof RANK_LABELS)[number]] ??
                "border-primary/30 bg-primary/10 text-primary"
            )}
          >
            {rank}
          </span>
          <div className="min-w-0">
            <p className={cn("text-sm font-semibold leading-snug", accent.teamName)}>
              {getTeamLabel(row)}
            </p>
            {row.title && row.teamName ? (
              <p className="mt-0.5 text-xs text-muted-foreground">{row.title}</p>
            ) : null}
            <p className="mt-0.5 text-xs text-muted-foreground">{row.participantEmail}</p>
          </div>
        </div>
        <div className="shrink-0 text-right">
          <p className="font-mono text-lg font-bold tabular-nums text-primary">
            {row.averageScore!.toFixed(1)}
          </p>
          <p className="text-[10px] uppercase tracking-[0.1em] text-muted-foreground">avg</p>
        </div>
      </div>
      <p className="mt-3 border-t border-white/10 pt-3 text-xs text-muted-foreground">
        {row.scoredByCount} judge{row.scoredByCount === 1 ? "" : "s"} scored
      </p>
    </article>
  );
}

export function AdminTop3MarksPanel({
  selectedHackathon,
  submissions,
  isLoading,
}: AdminTop3MarksPanelProps) {
  const scoredSubmissions = submissions.filter((row) => row.averageScore != null);
  const top3 = scoredSubmissions.slice(0, 3);
  const leaderNames = top3.length
    ? top3
        .filter((row) => row.averageScore === top3[0]?.averageScore)
        .map((row) => getTeamLabel(row))
        .join(", ")
    : "";

  return (
    <section className={sectionClass} id="top-3-marks">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div className="flex min-w-0 items-start gap-3">
          <span className="dash-icon-chip dash-icon-chip--sunset shrink-0" aria-hidden>
            <Medal className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <p className="dash-eyebrow">Score leaderboard</p>
            <h2 className="dash-title">Top 3 teams by marks</h2>
            <p className="dash-subtitle">
              Highest average judge scores for {selectedHackathon.name}.
            </p>
          </div>
        </div>
        <Badge
          variant="outline"
          className="w-fit shrink-0 border-accent/40 bg-accent/10 font-mono text-[10px] text-accent uppercase tracking-[0.1em] sm:text-xs sm:tracking-[0.14em]"
        >
          {isLoading
            ? "Loading…"
            : `${scoredSubmissions.length} team${scoredSubmissions.length === 1 ? "" : "s"} scored`}
        </Badge>
      </div>

      <div className="mt-4 overflow-hidden rounded-xl border border-accent/25 bg-gradient-to-r from-accent/10 via-muted/15 to-transparent p-3.5 sm:p-4">
        {top3.length ? (
          <>
            <p className="flex items-center gap-1.5 dash-eyebrow text-accent/90">
              <Trophy className="h-3.5 w-3.5" aria-hidden />
              {top3.filter((row) => row.averageScore === top3[0]?.averageScore).length > 1
                ? "Tie for 1st place"
                : "Current leader"}
            </p>
            <p className="mt-1.5 font-display text-base font-bold leading-snug text-foreground sm:text-lg">
              {leaderNames}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {top3[0]!.averageScore!.toFixed(1)} average mark
            </p>
          </>
        ) : (
          <p className="text-sm leading-relaxed text-muted-foreground">
            No scored teams yet. Rankings appear here once judges submit marks.
          </p>
        )}
      </div>

      {isLoading ? (
        <p className="mt-5 text-sm text-muted-foreground">Loading scores…</p>
      ) : top3.length === 0 ? null : (
        <>
          <div className="mt-5 space-y-3 md:hidden">
            {top3.map((row, index) => (
              <Top3MarksMobileCard key={row.id} row={row} rank={index + 1} />
            ))}
          </div>
          <div className="dash-table-scroll mt-5 hidden rounded-xl border border-white/10 md:block">
            <Table>
              <TableHeader>
                <TableRow className="border-white/10 bg-muted/15 hover:bg-muted/15">
                  <TableHead className="dash-table-head w-[56px]">#</TableHead>
                  <TableHead className="dash-table-head">Team</TableHead>
                  <TableHead className="dash-table-head">Project</TableHead>
                  <TableHead className="dash-table-head w-[100px] text-right">Avg mark</TableHead>
                  <TableHead className="dash-table-head w-[90px] text-right">Judges</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {top3.map((row, index) => (
                  <TableRow
                    key={row.id}
                    className="border-white/5 transition-colors hover:bg-primary/5"
                  >
                    <TableCell className="font-mono text-sm tabular-nums text-muted-foreground">
                      {index + 1}
                    </TableCell>
                    <TableCell>
                      <p className="text-sm font-medium">
                        {row.teamName?.trim() || "—"}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">{row.participantEmail}</p>
                    </TableCell>
                    <TableCell className="text-sm">{row.title || "Untitled Project"}</TableCell>
                    <TableCell className="text-right font-mono text-sm font-bold tabular-nums text-primary">
                      {row.averageScore!.toFixed(1)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm tabular-nums">
                      {row.scoredByCount}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      )}
    </section>
  );
}
