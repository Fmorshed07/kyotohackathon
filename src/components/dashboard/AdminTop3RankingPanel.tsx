import { Badge } from "@/components/ui/badge";
import { Trophy } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { sectionClass } from "@/components/dashboard/DashboardLayout";
import {
  getSubmissionLabelForRank,
  TOP3_RANK_SLOTS,
  TOP3_SLOT_LABELS,
  type AdminJudgeTop3Row,
  type AdminTop3RankingSummary,
  type Top3BallotLeaderboardEntry,
} from "@/lib/judgeTop3Rankings";
import type { PortalHackathon } from "@/lib/hackathons";

type AdminTop3RankingPanelProps = {
  selectedHackathon: PortalHackathon;
  summary: AdminTop3RankingSummary;
  isLoading: boolean;
  submissionLookup: Map<
    string,
    { id: string; title: string | null; team_name?: string | null; participantEmail: string }
  >;
};

function formatSavedAt(iso: string | null): string {
  if (!iso) return "Not saved";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function LeaderboardMobileCard({
  entry,
  rank,
}: {
  entry: Top3BallotLeaderboardEntry;
  rank: number;
}) {
  return (
    <article className="rounded-xl border border-white/10 bg-background/40 p-3.5 sm:p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-2.5">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-primary/30 bg-primary/10 font-mono text-xs font-bold tabular-nums text-primary">
            {rank}
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold leading-snug text-foreground">{entry.title}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {entry.teamName ? `${entry.teamName} · ` : ""}
              {entry.participantEmail}
            </p>
          </div>
        </div>
        <div className="shrink-0 text-right">
          <p className="font-mono text-lg font-bold tabular-nums text-primary">{entry.ballotPoints}</p>
          <p className="text-[10px] uppercase tracking-[0.1em] text-muted-foreground">pts</p>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2 border-t border-white/10 pt-3">
        {(
          [
            ["1st", entry.firstPlaceVotes],
            ["2nd", entry.secondPlaceVotes],
            ["3rd", entry.thirdPlaceVotes],
          ] as const
        ).map(([label, count]) => (
          <div
            key={label}
            className="rounded-lg border border-border/50 bg-muted/20 px-2 py-1.5 text-center"
          >
            <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              {label}
            </p>
            <p className="font-mono text-sm font-semibold tabular-nums text-foreground">{count}</p>
          </div>
        ))}
      </div>
    </article>
  );
}

function JudgeBallotMobileCard({
  row,
  submissionLookup,
}: {
  row: AdminJudgeTop3Row;
  submissionLookup: AdminTop3RankingPanelProps["submissionLookup"];
}) {
  return (
    <article className="rounded-xl border border-white/10 bg-background/40 p-3.5 sm:p-4">
      <div className="flex items-start justify-between gap-3">
        <p className="min-w-0 break-all text-sm font-medium text-foreground">{row.judgeEmail}</p>
        <Badge
          variant={row.isComplete ? "default" : "secondary"}
          className="shrink-0 text-[10px] uppercase tracking-[0.08em]"
        >
          {row.isComplete ? "Submitted" : "Pending"}
        </Badge>
      </div>

      <dl className="mt-3 space-y-2.5">
        {TOP3_RANK_SLOTS.map((slot) => (
          <div key={slot} className="rounded-lg border border-border/40 bg-muted/15 px-3 py-2">
            <dt className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
              {TOP3_SLOT_LABELS[slot]}
            </dt>
            <dd className="mt-0.5 text-sm leading-snug text-foreground">
              {getSubmissionLabelForRank(row.ranks[slot], submissionLookup)}
            </dd>
          </div>
        ))}
      </dl>

      <p className="mt-3 text-xs text-muted-foreground">
        Last saved: {formatSavedAt(row.updatedAt)}
      </p>
    </article>
  );
}

export function AdminTop3RankingPanel({
  selectedHackathon,
  summary,
  isLoading,
  submissionLookup,
}: AdminTop3RankingPanelProps) {
  const winnerNames = summary.ballotWinners
    .map((entry) => entry.title || entry.participantEmail)
    .join(", ");

  return (
    <section className={sectionClass} id="top-3-ranking">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div className="flex min-w-0 items-start gap-3">
          <span className="dash-icon-chip dash-icon-chip--sunset shrink-0" aria-hidden>
            <Trophy className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <p className="dash-eyebrow">Judge ballots</p>
            <h2 className="dash-title">Top 3 ballots</h2>
            <p className="dash-subtitle">
              Aggregated judge ballots for {selectedHackathon.name}. Points: 1st = 3, 2nd = 2, 3rd = 1.
            </p>
          </div>
        </div>
        <Badge
          variant="outline"
          className="w-fit shrink-0 border-accent/40 bg-accent/10 font-mono text-[10px] text-accent uppercase tracking-[0.1em] sm:text-xs sm:tracking-[0.14em]"
        >
          {isLoading
            ? "Loading…"
            : `${summary.judgesSubmitted}/${summary.registeredJudges} submitted`}
        </Badge>
      </div>

      <div className="mt-4 overflow-hidden rounded-xl border border-accent/25 bg-gradient-to-r from-accent/10 via-muted/15 to-transparent p-3.5 sm:p-4">
        {summary.ballotWinners.length ? (
          <>
            <p className="dash-eyebrow text-accent/90">
              {summary.ballotWinners.length > 1 ? "Ballot tie" : "Ballot leader"}
            </p>
            <p className="mt-1.5 font-display text-base font-bold leading-snug text-foreground sm:text-lg">
              {winnerNames}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {summary.topBallotScore} ballot point{summary.topBallotScore === 1 ? "" : "s"}
            </p>
          </>
        ) : (
          <p className="text-sm leading-relaxed text-muted-foreground">
            No judge ballots submitted yet. Rankings appear here once judges save their top 3.
          </p>
        )}
      </div>

      <div className="mt-5 space-y-5 sm:mt-6 sm:space-y-6 lg:grid lg:grid-cols-2 lg:gap-6 lg:space-y-0">
        <div className="rounded-xl border border-white/10 bg-muted/10 p-3.5 sm:p-5">
          <p className="dash-eyebrow">Leaderboard</p>
          <h3 className="mt-1 text-base font-semibold text-foreground">Ballot points by project</h3>
          {isLoading ? (
            <p className="mt-3 text-sm text-muted-foreground">Loading ballot results…</p>
          ) : summary.leaderboard.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">No ballot points recorded yet.</p>
          ) : (
            <>
              <div className="mt-3 space-y-3 md:hidden">
                {summary.leaderboard.map((entry, index) => (
                  <LeaderboardMobileCard key={entry.submissionId} entry={entry} rank={index + 1} />
                ))}
              </div>
              <div className="dash-table-scroll mt-3 hidden rounded-xl border border-white/10 md:block">
                <Table>
                  <TableHeader>
                    <TableRow className="border-white/10 bg-muted/15 hover:bg-muted/15">
                      <TableHead className="dash-table-head w-[56px]">#</TableHead>
                      <TableHead className="dash-table-head">Project</TableHead>
                      <TableHead className="dash-table-head w-[90px] text-right">Points</TableHead>
                      <TableHead className="dash-table-head w-[70px] text-right">1st</TableHead>
                      <TableHead className="dash-table-head w-[70px] text-right">2nd</TableHead>
                      <TableHead className="dash-table-head w-[70px] text-right">3rd</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {summary.leaderboard.map((entry, index) => (
                      <TableRow
                        key={entry.submissionId}
                        className="border-white/5 transition-colors hover:bg-primary/5"
                      >
                        <TableCell className="font-mono text-sm tabular-nums text-muted-foreground">
                          {index + 1}
                        </TableCell>
                        <TableCell>
                          <p className="text-sm font-medium">{entry.title}</p>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {entry.teamName ? `${entry.teamName} · ` : ""}
                            {entry.participantEmail}
                          </p>
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm font-bold tabular-nums text-primary">
                          {entry.ballotPoints}
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm tabular-nums">
                          {entry.firstPlaceVotes}
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm tabular-nums">
                          {entry.secondPlaceVotes}
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm tabular-nums">
                          {entry.thirdPlaceVotes}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </div>

        <div className="rounded-xl border border-white/10 bg-muted/10 p-3.5 sm:p-5">
          <p className="dash-eyebrow">Judge submissions</p>
          <h3 className="mt-1 text-base font-semibold text-foreground">Individual judge ballots</h3>
          {isLoading ? (
            <p className="mt-3 text-sm text-muted-foreground">Loading judge ballots…</p>
          ) : summary.judgeRows.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">
              No mentors or judges registered for this event.
            </p>
          ) : (
            <>
              <div className="mt-3 space-y-3 md:hidden">
                {summary.judgeRows.map((row) => (
                  <JudgeBallotMobileCard
                    key={row.judgeId}
                    row={row}
                    submissionLookup={submissionLookup}
                  />
                ))}
              </div>
              <div className="dash-table-scroll mt-3 hidden rounded-xl border border-white/10 md:block">
                <Table>
                  <TableHeader>
                    <TableRow className="border-white/10 bg-muted/15 hover:bg-muted/15">
                      <TableHead className="dash-table-head">Judge</TableHead>
                      <TableHead className="dash-table-head">Status</TableHead>
                      <TableHead className="dash-table-head">{TOP3_SLOT_LABELS.first}</TableHead>
                      <TableHead className="dash-table-head">{TOP3_SLOT_LABELS.second}</TableHead>
                      <TableHead className="dash-table-head">{TOP3_SLOT_LABELS.third}</TableHead>
                      <TableHead className="dash-table-head w-[160px]">Last saved</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {summary.judgeRows.map((row) => (
                      <TableRow
                        key={row.judgeId}
                        className="border-white/5 transition-colors hover:bg-primary/5"
                      >
                        <TableCell className="text-sm">{row.judgeEmail}</TableCell>
                        <TableCell>
                          <Badge variant={row.isComplete ? "default" : "secondary"}>
                            {row.isComplete ? "Submitted" : "Pending"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">
                          {getSubmissionLabelForRank(row.ranks.first, submissionLookup)}
                        </TableCell>
                        <TableCell className="text-sm">
                          {getSubmissionLabelForRank(row.ranks.second, submissionLookup)}
                        </TableCell>
                        <TableCell className="text-sm">
                          {getSubmissionLabelForRank(row.ranks.third, submissionLookup)}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {formatSavedAt(row.updatedAt)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
