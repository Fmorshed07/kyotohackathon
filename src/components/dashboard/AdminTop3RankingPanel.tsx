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
  TOP3_SLOT_LABELS,
  type AdminTop3RankingSummary,
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
  return date.toLocaleString();
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
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <span className="dash-icon-chip dash-icon-chip--sunset" aria-hidden>
            <Trophy className="h-4 w-4" />
          </span>
          <div>
            <p className="dash-eyebrow">Judge ballots</p>
            <h2 className="dash-title">Top 3 idea ranking</h2>
            <p className="dash-subtitle">
              Aggregated judge ballots for {selectedHackathon.name}. Points: 1st = 3, 2nd = 2, 3rd = 1.
            </p>
          </div>
        </div>
        <Badge
          variant="outline"
          className="border-accent/40 bg-accent/10 font-mono text-accent uppercase tracking-[0.14em]"
        >
          {isLoading
            ? "Loading…"
            : `${summary.judgesSubmitted}/${summary.registeredJudges} judges submitted`}
        </Badge>
      </div>

      <div className="mt-4 overflow-hidden rounded-xl border border-accent/25 bg-gradient-to-r from-accent/10 via-muted/15 to-transparent p-4">
        {summary.ballotWinners.length ? (
          <>
            <p className="dash-eyebrow text-accent/90">
              {summary.ballotWinners.length > 1 ? "Ballot tie" : "Ballot leader"}
            </p>
            <p className="mt-1.5 font-display text-base font-bold text-foreground sm:text-lg">
              {winnerNames}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {summary.topBallotScore} ballot point{summary.topBallotScore === 1 ? "" : "s"}
            </p>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">
            No judge ballots submitted yet. Rankings appear here once judges save their top 3.
          </p>
        )}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-white/10 bg-muted/10 p-4 sm:p-5">
          <p className="dash-eyebrow">Leaderboard</p>
          <h3 className="mt-1 text-base font-semibold text-foreground">Ballot points by project</h3>
          {isLoading ? (
            <p className="mt-3 text-sm text-muted-foreground">Loading ballot results…</p>
          ) : summary.leaderboard.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">No ballot points recorded yet.</p>
          ) : (
            <div className="dash-table-scroll mt-3 rounded-xl border border-white/10">
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
          )}
        </div>

        <div className="rounded-xl border border-white/10 bg-muted/10 p-4 sm:p-5">
          <p className="dash-eyebrow">Judge submissions</p>
          <h3 className="mt-1 text-base font-semibold text-foreground">Individual judge ballots</h3>
          {isLoading ? (
            <p className="mt-3 text-sm text-muted-foreground">Loading judge ballots…</p>
          ) : summary.judgeRows.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">
              No mentors or judges registered for this event.
            </p>
          ) : (
            <div className="dash-table-scroll mt-3 rounded-xl border border-white/10">
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
          )}
        </div>
      </div>
    </section>
  );
}
