import { Badge } from "@/components/ui/badge";
import { Scale } from "lucide-react";
import { sectionClass } from "@/components/dashboard/DashboardLayout";
import { getTeamAccentStyle, getCriterionAccentStyle } from "@/components/dashboard/judgeDashboardAccents";
import type { JudgingCriterion } from "@/components/dashboard/judgingCriteria";
import type { AdminSubmissionRow } from "@/components/dashboard/AdminDashboard";
import type { PortalHackathon } from "@/lib/hackathons";
import { cn } from "@/lib/utils";

type AdminJudgeMarksPanelProps = {
  selectedHackathon: PortalHackathon;
  submissions: AdminSubmissionRow[];
  judgingCriteria: JudgingCriterion[];
  isLoading: boolean;
};

type JudgeMark = AdminSubmissionRow["judgeMarks"][number];

function JudgeMarkCard({
  mark,
  judgingCriteria,
}: {
  mark: JudgeMark;
  judgingCriteria: JudgingCriterion[];
}) {
  const accent = getTeamAccentStyle(mark.judgeEmail);
  const hasScore = typeof mark.score === "number";
  const initial = (mark.judgeEmail?.[0] ?? "?").toUpperCase();

  return (
    <div
      className={cn(
        "rounded-xl border p-3 transition-colors",
        hasScore ? accent.panel : "border-border/40 bg-muted/15"
      )}
    >
      <div className="flex items-start gap-3">
        <span
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-sm font-bold",
            hasScore ? accent.pill : "border-border/50 bg-muted/30 text-muted-foreground"
          )}
          aria-hidden
        >
          {initial}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-foreground">{mark.judgeEmail}</p>
          <p className="mt-0.5 text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
            {hasScore ? "Scored" : "Not scored yet"}
          </p>
        </div>
        <div className="text-right">
          <p
            className={cn(
              "font-mono text-xl font-bold tabular-nums",
              hasScore ? "text-primary" : "text-muted-foreground"
            )}
          >
            {hasScore ? mark.score!.toFixed(1) : "—"}
          </p>
          <p className="text-[10px] text-muted-foreground">/ 100</p>
        </div>
      </div>

      {mark.criteriaScores && judgingCriteria.length > 0 ? (
        <div className="mt-3 grid gap-1.5 sm:grid-cols-2">
          {judgingCriteria.map((criterion) => {
            const criterionAccent = getCriterionAccentStyle(criterion.id);
            const value = mark.criteriaScores?.[criterion.id];
            return (
              <div
                key={`${mark.judgeId}-${criterion.id}`}
                className={cn("rounded-md border px-2 py-1.5", criterionAccent.card)}
              >
                <p className="truncate text-[10px] font-medium text-muted-foreground">
                  {criterion.title}
                </p>
                <p className="font-mono text-sm font-semibold tabular-nums text-foreground">
                  {typeof value === "number" ? `${value}/${criterion.weight}` : "—"}
                </p>
              </div>
            );
          })}
        </div>
      ) : null}

      {mark.notes?.trim() ? (
        <div className="mt-3 rounded-md border border-border/50 bg-background/40 px-2.5 py-2">
          <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
            Notes
          </p>
          <p className="mt-1 text-xs leading-relaxed text-foreground">{mark.notes}</p>
        </div>
      ) : null}
    </div>
  );
}

function SubmissionMarksCard({
  submission,
  judgingCriteria,
}: {
  submission: AdminSubmissionRow;
  judgingCriteria: JudgingCriterion[];
}) {
  const accent = getTeamAccentStyle(submission.title ?? submission.participantEmail);
  const scoredCount = submission.judgeMarks.filter((m) => typeof m.score === "number").length;

  return (
    <article className={cn("overflow-hidden rounded-xl border", accent.panel)}>
      <header className="border-b border-white/10 px-4 py-4 sm:px-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">{submission.participantEmail}</p>
            <h3 className={cn("mt-0.5 text-base font-semibold sm:text-lg", accent.teamName)}>
              {submission.title || "Untitled Project"}
            </h3>
            {submission.shortDescription ? (
              <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                {submission.shortDescription}
              </p>
            ) : null}
          </div>
          <div className="flex flex-col items-end gap-1.5">
            <div className="rounded-lg border border-primary/30 bg-primary/10 px-3 py-1.5 text-center">
              <p className="font-mono text-lg font-bold tabular-nums text-primary">
                {submission.averageScore != null ? submission.averageScore.toFixed(1) : "—"}
              </p>
              <p className="text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
                Avg score
              </p>
            </div>
            <Badge variant="secondary" className="text-[10px] uppercase tracking-[0.1em]">
              {scoredCount}/{submission.judgeMarks.length} judges
            </Badge>
          </div>
        </div>
      </header>

      <div className="space-y-3 p-4 sm:p-5">
        {submission.judgeMarks.length === 0 ? (
          <p className="text-sm text-muted-foreground">No judge marks recorded yet.</p>
        ) : (
          <>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Marks by judge
            </p>
            <div className="grid gap-3 md:grid-cols-2">
              {submission.judgeMarks.map((mark) => (
                <JudgeMarkCard
                  key={`${submission.id}-${mark.judgeId}`}
                  mark={mark}
                  judgingCriteria={judgingCriteria}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </article>
  );
}

export function AdminJudgeMarksPanel({
  selectedHackathon,
  submissions,
  judgingCriteria,
  isLoading,
}: AdminJudgeMarksPanelProps) {
  const scoredSubmissions = submissions.filter((row) =>
    row.judgeMarks.some((mark) => typeof mark.score === "number")
  );
  const totalMarks = submissions.reduce(
    (total, row) => total + row.judgeMarks.filter((m) => typeof m.score === "number").length,
    0
  );

  return (
    <section className={`${sectionClass} overflow-hidden p-0`} id="judge-marks">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-white/10 px-6 py-5">
        <div className="flex items-start gap-3">
          <span className="dash-icon-chip dash-icon-chip--violet" aria-hidden>
            <Scale className="h-4 w-4" />
          </span>
          <div>
            <p className="dash-eyebrow">Scoring breakdown</p>
            <h2 className="dash-title">Judge marks by project</h2>
            <p className="dash-subtitle">
              See which judge scored each project for {selectedHackathon.name}.
            </p>
          </div>
        </div>
        <Badge
          variant="outline"
          className="border-primary/40 bg-primary/10 font-mono uppercase tracking-[0.14em] text-primary"
        >
          {isLoading ? "Loading…" : `${totalMarks} marks · ${scoredSubmissions.length} projects`}
        </Badge>
      </div>

      <div className="space-y-5 p-4 sm:p-6">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading judge marks…</p>
        ) : submissions.length === 0 ? (
          <p className="dash-empty">
            No submissions yet for {selectedHackathon.name}.
          </p>
        ) : scoredSubmissions.length === 0 ? (
          <p className="dash-empty">
            No judge marks recorded yet. Scores will appear here as judges submit them.
          </p>
        ) : (
          <div className="grid gap-5">
            {scoredSubmissions.map((submission) => (
              <SubmissionMarksCard
                key={submission.id}
                submission={submission}
                judgingCriteria={judgingCriteria}
              />
            ))}
          </div>
        )}

        {!isLoading && submissions.length > scoredSubmissions.length ? (
          <div className="rounded-xl border border-dashed border-border/60 bg-muted/10 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Awaiting scores
            </p>
            <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
              {submissions
                .filter((row) => !row.judgeMarks.some((m) => typeof m.score === "number"))
                .map((row) => (
                  <li key={row.id}>
                    {row.title || "Untitled Project"} · {row.participantEmail}
                  </li>
                ))}
            </ul>
          </div>
        ) : null}
      </div>
    </section>
  );
}
