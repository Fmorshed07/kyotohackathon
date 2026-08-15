import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { ClipboardCheck, Scale } from "lucide-react";
import { sectionClass } from "@/components/dashboard/DashboardLayout";
import { SubmissionSearchInput } from "@/components/dashboard/SubmissionSearchInput";
import { getTeamAccentStyle, getCriterionAccentStyle } from "@/components/dashboard/judgeDashboardAccents";
import type { JudgingCriterion } from "@/components/dashboard/judgingCriteria";
import type { AdminSubmissionRow } from "@/components/dashboard/AdminDashboard";
import type { PortalHackathon } from "@/lib/hackathons";
import { matchesSearchQuery } from "@/lib/submissionSearch";
import { cn } from "@/lib/utils";
import { formatSubmissionDateTime } from "@/lib/datetime";

type AdminJudgeMarksPanelProps = {
  selectedHackathon: PortalHackathon;
  submissions: AdminSubmissionRow[];
  judgingCriteria: JudgingCriterion[];
  isLoading: boolean;
};

type JudgeMark = AdminSubmissionRow["judgeMarks"][number];
type MarkCheckFilter = "all" | "saved" | "awaiting";

function hasAnyScore(row: AdminSubmissionRow) {
  return row.judgeMarks.some((mark) => typeof mark.score === "number");
}

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
            {hasScore ? "Saved" : "Not saved yet"}
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
  const awaiting = !hasAnyScore(submission);

  return (
    <article className={cn("overflow-hidden rounded-xl border", accent.panel)}>
      <header className="border-b border-white/10 px-4 py-4 sm:px-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-xs text-muted-foreground">{submission.participantEmail}</p>
              {awaiting ? (
                <Badge
                  variant="outline"
                  className="border-amber-400/40 bg-amber-500/10 text-[10px] uppercase tracking-[0.1em] text-amber-200"
                >
                  Awaiting scores
                </Badge>
              ) : null}
            </div>
            <h3 className={cn("mt-0.5 text-base font-semibold sm:text-lg", accent.teamName)}>
              {submission.title || "Untitled Project"}
            </h3>
            {submission.teamName ? (
              <p className="mt-0.5 text-xs text-muted-foreground">{submission.teamName}</p>
            ) : null}
            {formatSubmissionDateTime(submission.createdAt) ? (
              <p className="mt-1 font-mono text-[11px] text-muted-foreground">
                Submitted {formatSubmissionDateTime(submission.createdAt)}
              </p>
            ) : null}
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
              {scoredCount}/{Math.max(submission.judgeMarks.length, scoredCount)} judges
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
              Saved marks by judge
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
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState<MarkCheckFilter>("all");

  const savedSubmissions = submissions.filter(hasAnyScore);
  const awaitingSubmissions = submissions.filter((row) => !hasAnyScore(row));
  const totalMarks = submissions.reduce(
    (total, row) => total + row.judgeMarks.filter((m) => typeof m.score === "number").length,
    0
  );

  const filteredSubmissions = submissions.filter((row) => {
    if (filter === "saved" && !hasAnyScore(row)) return false;
    if (filter === "awaiting" && hasAnyScore(row)) return false;
    return matchesSearchQuery(searchQuery, [
      row.title,
      row.teamName,
      row.participantEmail,
      row.shortDescription,
      ...row.judgeMarks.map((mark) => mark.judgeEmail),
    ]);
  });

  const filterOptions: Array<{ id: MarkCheckFilter; label: string; count: number }> = [
    { id: "all", label: "All", count: submissions.length },
    { id: "saved", label: "Saved", count: savedSubmissions.length },
    { id: "awaiting", label: "Awaiting", count: awaitingSubmissions.length },
  ];

  return (
    <section className={`${sectionClass} overflow-hidden p-0`} id="judge-marks">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-white/10 px-6 py-5">
        <div className="flex items-start gap-3">
          <span className="dash-icon-chip dash-icon-chip--violet" aria-hidden>
            <ClipboardCheck className="h-4 w-4" />
          </span>
          <div>
            <p className="dash-eyebrow">Saved marks</p>
            <h2 className="dash-title">Judge marks</h2>
            <p className="dash-subtitle">
              Every entry below has been read from saved judge records for {selectedHackathon.name}.
            </p>
          </div>
        </div>
        <Badge
          variant="outline"
          className="border-primary/40 bg-primary/10 font-mono uppercase tracking-[0.14em] text-primary"
        >
          {isLoading ? "Loading…" : `${totalMarks} saved marks · ${savedSubmissions.length} projects`}
        </Badge>
      </div>

      <div className="space-y-5 p-4 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <SubmissionSearchInput
            id="judge-mark-check-search"
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search project, team, participant, or judge…"
            className="w-full sm:max-w-md"
          />
          <div
            className="flex flex-wrap gap-1.5"
            role="tablist"
            aria-label="Mark check filters"
          >
            {filterOptions.map((option) => (
              <button
                key={option.id}
                type="button"
                role="tab"
                aria-selected={filter === option.id}
                onClick={() => setFilter(option.id)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-[0.68rem] font-semibold uppercase tracking-[0.12em] transition-colors",
                  filter === option.id
                    ? "border-primary/40 bg-primary/15 text-primary"
                    : "border-white/10 bg-muted/15 text-muted-foreground hover:border-primary/30 hover:text-primary"
                )}
              >
                {option.label}
                <span className="font-mono tabular-nums opacity-80">{option.count}</span>
              </button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading judge marks…</p>
        ) : submissions.length === 0 ? (
          <p className="dash-empty">No submissions yet for {selectedHackathon.name}.</p>
        ) : filteredSubmissions.length === 0 ? (
          <p className="dash-empty">
            {searchQuery.trim()
              ? "No projects match this search."
              : filter === "awaiting"
                ? "Every project has at least one saved judge mark."
                : filter === "saved"
                  ? "No saved judge marks yet. Scores appear here after judges save them."
                  : "No projects to show."}
          </p>
        ) : (
          <div className="grid gap-5">
            {filteredSubmissions.map((submission) => (
              <SubmissionMarksCard
                key={submission.id}
                submission={submission}
                judgingCriteria={judgingCriteria}
              />
            ))}
          </div>
        )}

        {!isLoading && filter === "all" && !searchQuery.trim() && awaitingSubmissions.length > 0 ? (
          <div className="rounded-xl border border-dashed border-border/60 bg-muted/10 p-4">
            <div className="flex items-center gap-2">
              <Scale className="h-4 w-4 text-muted-foreground" aria-hidden />
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Awaiting scores · {awaitingSubmissions.length}
              </p>
            </div>
            <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
              {awaitingSubmissions.map((row) => (
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
