import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { sectionClass } from "@/components/dashboard/DashboardLayout";
import type { Submission } from "@/types/portal";
import {
  JUDGING_CRITERIA,
  calculateTotalFromCriteria,
  clampCriterionScore,
  type JudgingCriterionId,
} from "@/components/dashboard/judgingCriteria";

type TeamSummary = {
  name: string;
  submissions: Submission[];
  members: string[];
};

const parseMemberNames = (rawMemberNames: string | null | undefined) =>
  (rawMemberNames ?? "")
    .split(/[\n,;]+/)
    .map((name) => name.trim())
    .filter(Boolean);

export type JudgeDashboardProps = {
  submissions: Submission[];
  isLoadingSubmissions: boolean;
  judgeMessage: string | null;
  summary: {
    total: number;
    scored: number;
    averageScore: number | null;
  };
  onCriterionScoreChange: (
    id: string,
    criterionId: JudgingCriterionId,
    value: number | null
  ) => void;
  onNotesChange: (id: string, value: string) => void;
  onSave: (submission: Submission) => Promise<void>;
};

export function JudgeDashboard({
  submissions,
  isLoadingSubmissions,
  judgeMessage,
  summary,
  onCriterionScoreChange,
  onNotesChange,
  onSave,
}: JudgeDashboardProps) {
  const [selectedTeamName, setSelectedTeamName] = useState<string | null>(null);
  const scoreButtonStopsByWeight: Record<number, number[]> = {
    25: [0, 5, 10, 15, 20, 25],
    20: [0, 4, 8, 12, 16, 20],
    15: [0, 3, 6, 9, 12, 15],
  };
  const teams = Array.from(
    submissions.reduce<Map<string, TeamSummary>>((acc, submission) => {
      const teamName = submission.team_name?.trim() || "Unnamed team";
      const existing = acc.get(teamName);
      if (!existing) {
        acc.set(teamName, {
          name: teamName,
          submissions: [submission],
          members: parseMemberNames(submission.member_names),
        });
        return acc;
      }

      const combinedMembers = [
        ...existing.members,
        ...parseMemberNames(submission.member_names),
      ];
      existing.members = Array.from(new Set(combinedMembers));
      existing.submissions.push(submission);
      return acc;
    }, new Map())
    .values()
  ).sort((left, right) => left.name.localeCompare(right.name));
  const activeTeam = teams.find((team) => team.name === selectedTeamName) ?? teams[0] ?? null;

  return (
    <div className="space-y-8" id="overview">
      {/* Overview */}
      <section className={`${sectionClass} p-4 sm:p-6`} aria-label="Judge overview">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-foreground">
              Overview
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Track how many teams have submitted and how many you have scored.
            </p>
          </div>
          <div className="grid w-full gap-3 sm:grid-cols-3 lg:w-auto lg:gap-4">
            <div className="rounded-xl border border-primary/30 bg-gradient-to-b from-primary/10 to-transparent px-5 py-3 text-center">
              <p className="font-display text-2xl font-semibold tabular-nums text-primary">
                {isLoadingSubmissions ? "—" : summary.total}
              </p>
              <p className="text-xs font-medium text-muted-foreground">
                Submissions
              </p>
            </div>
            <div className="rounded-xl border border-border/50 bg-muted/20 px-5 py-3 text-center">
              <p className="font-display text-2xl font-semibold tabular-nums text-primary">
                {isLoadingSubmissions ? "—" : summary.scored}
              </p>
              <p className="text-xs font-medium text-muted-foreground">
                Scored
              </p>
            </div>
            <div className="rounded-xl border border-border/50 bg-muted/20 px-5 py-3 text-center">
              <p className="font-display text-2xl font-semibold tabular-nums text-primary">
                {isLoadingSubmissions
                  ? "—"
                  : summary.averageScore != null
                    ? summary.averageScore.toFixed(1)
                    : "—"}
              </p>
              <p className="text-xs font-medium text-muted-foreground">
                Avg Score
              </p>
            </div>
          </div>
        </div>
        {judgeMessage && (
          <p className="mt-4 rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-sm text-primary">
            {judgeMessage}
          </p>
        )}
      </section>

      <section className={`${sectionClass} p-4 sm:p-6`} id="teams" aria-label="Teams">
        <div className="mb-5 border-b border-border/40 pb-4">
          <h2 className="text-lg font-semibold text-foreground">Teams</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Team names are listed separately for quick review before scoring.
          </p>
        </div>
        {isLoadingSubmissions ? (
          <p className="text-sm text-muted-foreground">Loading teams…</p>
        ) : teams.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border/60 bg-muted/20 py-10 text-center text-sm text-muted-foreground">
            No teams available yet.
          </p>
        ) : (
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
              {teams.map((team) => {
                const isActive = activeTeam?.name === team.name;
                return (
                  <button
                    key={team.name}
                    type="button"
                    onClick={() => setSelectedTeamName(team.name)}
                    className={`rounded-xl border px-4 py-3 text-left transition ${
                      isActive
                        ? "border-primary/50 bg-primary/10"
                        : "border-border/50 bg-muted/20 hover:border-primary/30 hover:bg-primary/5"
                    }`}
                  >
                    <p className="text-sm font-semibold text-foreground">{team.name}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {team.submissions.length}{" "}
                      {team.submissions.length === 1 ? "submission" : "submissions"}{" "}
                      - {team.members.length} {team.members.length === 1 ? "member" : "members"}
                    </p>
                  </button>
                );
              })}
            </div>

            <div className="rounded-xl border border-border/50 bg-muted/20 p-4">
              {activeTeam ? (
                <div className="space-y-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                      Team Details
                    </p>
                    <h3 className="mt-1 text-base font-semibold text-foreground">{activeTeam.name}</h3>
                  </div>

                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                      Members
                    </p>
                    {activeTeam.members.length > 0 ? (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {activeTeam.members.map((member) => (
                          <span
                            key={`${activeTeam.name}-${member}`}
                            className="rounded-full border border-border/60 bg-background px-2.5 py-1 text-xs text-foreground"
                          >
                            {member}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-2 text-sm text-muted-foreground">No member names provided.</p>
                    )}
                  </div>

                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                      Submissions
                    </p>
                    <div className="mt-2 space-y-2">
                      {activeTeam.submissions.map((submission) => (
                        <div
                          key={`${activeTeam.name}-${submission.id}`}
                          className="rounded-lg border border-border/60 bg-background/80 px-3 py-2"
                        >
                          <p className="text-sm font-medium text-foreground">
                            {submission.title || "Untitled Project"}
                          </p>
                          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                            {submission.short_description || "No description provided."}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        )}
      </section>

      {/* Submissions & scoring */}
      <section
        className={`${sectionClass} overflow-hidden p-0`}
        id="submissions"
        aria-labelledby="scoring-heading"
      >
        <div className="border-b border-border/40 px-6 py-5">
          <h2
            id="scoring-heading"
            className="text-lg font-semibold text-foreground"
          >
            Submissions & live scoring
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Score projects by weighted criteria, then save total points and notes.
          </p>
        </div>
        <div className="p-4 sm:p-6">
          {isLoadingSubmissions ? (
            <p className="text-sm text-muted-foreground">
              Loading submissions…
            </p>
          ) : submissions.length === 0 ? (
            <p className="rounded-lg border border-dashed border-border/60 bg-muted/20 py-12 text-center text-sm text-muted-foreground">
              No submissions yet. Scores will appear here as teams submit.
            </p>
          ) : (
            <>
              <div className="space-y-4 md:hidden">
                {submissions.map((submission) => {
                  const totalScore =
                    submission.judge_criteria_scores && typeof submission.judge_criteria_scores === "object"
                      ? calculateTotalFromCriteria(submission.judge_criteria_scores)
                      : submission.judge_score ?? 0;
                  return (
                    <article
                      key={submission.id}
                      className="space-y-4 rounded-xl border border-border/50 bg-muted/20 p-4"
                    >
                      <div className="space-y-1">
                        <p className="text-sm font-semibold text-foreground">
                          {submission.title || "Untitled Project"}
                        </p>
                        <p className="line-clamp-3 text-xs text-muted-foreground">
                          {submission.short_description || "No description provided."}
                        </p>
                      </div>

                      <div className="space-y-1 text-xs">
                        {submission.project_url && (
                          <a
                            href={submission.project_url}
                            target="_blank"
                            rel="noreferrer"
                            className="block text-primary underline underline-offset-4 hover:no-underline"
                          >
                            Project URL
                          </a>
                        )}
                        {submission.submission_pdf_url && (
                          <a
                            href={submission.submission_pdf_url}
                            target="_blank"
                            rel="noreferrer"
                            className="block text-primary underline underline-offset-4 hover:no-underline"
                          >
                            PDF
                          </a>
                        )}
                        {submission.demo_video_url && (
                          <a
                            href={submission.demo_video_url}
                            target="_blank"
                            rel="noreferrer"
                            className="block text-primary underline underline-offset-4 hover:no-underline"
                          >
                            Demo Video
                          </a>
                        )}
                      </div>

                      <div className="space-y-3">
                        {JUDGING_CRITERIA.map((criterion) => {
                          const scoreStops =
                            scoreButtonStopsByWeight[criterion.weight] ?? [0, criterion.weight];
                          const activeScore = submission.judge_criteria_scores?.[criterion.id] ?? null;
                          return (
                            <div
                              key={criterion.id}
                              className="rounded-xl border border-border/50 bg-background/80 p-3"
                            >
                              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                                <p className="text-xs font-semibold text-foreground">{criterion.title}</p>
                                <span className="rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                                  {activeScore ?? 0}/{criterion.weight}
                                </span>
                              </div>
                              <p className="mb-3 text-xs leading-relaxed text-muted-foreground">
                                {criterion.description}
                              </p>
                              <div className="mb-2 flex flex-wrap gap-1.5">
                                {scoreStops.map((value) => {
                                  const isActive = activeScore === value;
                                  return (
                                    <button
                                      key={`${criterion.id}-${value}`}
                                      type="button"
                                      className={`h-8 min-w-10 rounded-md border px-2 text-xs font-semibold transition ${
                                        isActive
                                          ? "border-primary bg-primary text-primary-foreground shadow-sm"
                                          : "border-border/70 bg-background hover:border-primary/40 hover:bg-primary/5"
                                      }`}
                                      onClick={() =>
                                        onCriterionScoreChange(submission.id, criterion.id, value)
                                      }
                                    >
                                      {value}
                                    </button>
                                  );
                                })}
                              </div>
                              <Input
                                type="number"
                                min={0}
                                max={criterion.weight}
                                value={activeScore ?? ""}
                                onChange={(e) => {
                                  const raw = e.target.value.trim();
                                  if (raw === "") {
                                    onCriterionScoreChange(submission.id, criterion.id, null);
                                    return;
                                  }
                                  const parsed = Number(raw);
                                  if (Number.isNaN(parsed)) return;
                                  onCriterionScoreChange(
                                    submission.id,
                                    criterion.id,
                                    clampCriterionScore(parsed, criterion.weight)
                                  );
                                }}
                                className="h-8 w-24 text-right text-xs"
                              />
                            </div>
                          );
                        })}
                        <div className="flex items-center justify-between rounded-lg border border-primary/30 bg-primary/5 px-3 py-2">
                          <p className="text-xs font-medium text-primary/90">Total score</p>
                          <p className="font-display text-base font-semibold tabular-nums text-primary">
                            {totalScore}/100
                          </p>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                          Judge Notes
                        </p>
                        <Textarea
                          rows={3}
                          value={submission.judge_notes ?? ""}
                          onChange={(e) => onNotesChange(submission.id, e.target.value)}
                          className="resize-y text-sm"
                        />
                      </div>

                      <Button
                        size="sm"
                        className="h-9 w-full text-xs font-semibold"
                        onClick={() => onSave(submission)}
                      >
                        Save
                      </Button>
                    </article>
                  );
                })}
              </div>

              <div className="hidden overflow-x-auto rounded-xl border border-border/40 md:block">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border/50 hover:bg-transparent">
                      <TableHead className="w-[180px] text-xs font-semibold">
                        Project
                      </TableHead>
                      <TableHead className="text-xs font-semibold">
                        Links
                      </TableHead>
                      <TableHead className="min-w-[520px] text-xs font-semibold">
                        Score
                      </TableHead>
                      <TableHead className="min-w-[220px] text-xs font-semibold">
                        Judge Notes
                      </TableHead>
                      <TableHead className="w-[80px]" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {submissions.map((submission) => {
                      const totalScore =
                        submission.judge_criteria_scores && typeof submission.judge_criteria_scores === "object"
                          ? calculateTotalFromCriteria(submission.judge_criteria_scores)
                          : submission.judge_score ?? 0;
                      return (
                        <TableRow key={submission.id} className="border-border/40 hover:bg-muted/20">
                          <TableCell className="align-top">
                            <div className="space-y-1">
                              <p className="text-sm font-semibold">
                                {submission.title || "Untitled Project"}
                              </p>
                              <p className="line-clamp-3 text-xs text-muted-foreground">
                                {submission.short_description || "No description provided."}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell className="align-top">
                            <div className="space-y-1 text-xs">
                              {submission.project_url && (
                                <a
                                  href={submission.project_url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="block text-primary underline underline-offset-4 hover:no-underline"
                                >
                                  Project URL
                                </a>
                              )}
                              {submission.submission_pdf_url && (
                                <a
                                  href={submission.submission_pdf_url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="block text-primary underline underline-offset-4 hover:no-underline"
                                >
                                  PDF
                                </a>
                              )}
                              {submission.demo_video_url && (
                                <a
                                  href={submission.demo_video_url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="block text-primary underline underline-offset-4 hover:no-underline"
                                >
                                  Demo Video
                                </a>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="align-top">
                            <div className="space-y-3">
                              {JUDGING_CRITERIA.map((criterion) => {
                                const scoreStops =
                                  scoreButtonStopsByWeight[criterion.weight] ?? [0, criterion.weight];
                                const activeScore = submission.judge_criteria_scores?.[criterion.id] ?? null;
                                return (
                                  <div
                                    key={criterion.id}
                                    className="rounded-xl border border-border/50 bg-muted/20 p-3"
                                  >
                                    <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                                      <p className="text-xs font-semibold text-foreground">
                                        {criterion.title}
                                      </p>
                                      <span className="rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                                        {activeScore ?? 0}/{criterion.weight}
                                      </span>
                                    </div>
                                    <p className="mb-3 text-xs leading-relaxed text-muted-foreground">
                                      {criterion.description}
                                    </p>
                                    <div className="mb-2 flex flex-wrap gap-1.5">
                                      {scoreStops.map((value) => {
                                        const isActive = activeScore === value;
                                        return (
                                          <button
                                            key={`${criterion.id}-${value}`}
                                            type="button"
                                            className={`h-8 min-w-10 rounded-md border px-2 text-xs font-semibold transition ${
                                              isActive
                                                ? "border-primary bg-primary text-primary-foreground shadow-sm"
                                                : "border-border/70 bg-background hover:border-primary/40 hover:bg-primary/5"
                                            }`}
                                            onClick={() =>
                                              onCriterionScoreChange(submission.id, criterion.id, value)
                                            }
                                          >
                                            {value}
                                          </button>
                                        );
                                      })}
                                    </div>
                                    <Input
                                      type="number"
                                      min={0}
                                      max={criterion.weight}
                                      value={activeScore ?? ""}
                                      onChange={(e) => {
                                        const raw = e.target.value.trim();
                                        if (raw === "") {
                                          onCriterionScoreChange(submission.id, criterion.id, null);
                                          return;
                                        }
                                        const parsed = Number(raw);
                                        if (Number.isNaN(parsed)) return;
                                        onCriterionScoreChange(
                                          submission.id,
                                          criterion.id,
                                          clampCriterionScore(parsed, criterion.weight)
                                        );
                                      }}
                                      className="h-8 w-24 text-right text-xs"
                                    />
                                  </div>
                                );
                              })}
                              <div className="flex items-center justify-between rounded-lg border border-primary/30 bg-primary/5 px-3 py-2">
                                <p className="text-xs font-medium text-primary/90">
                                  Total score
                                </p>
                                <p className="font-display text-base font-semibold tabular-nums text-primary">
                                  {totalScore}/100
                                </p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="align-top">
                            <Textarea
                              rows={3}
                              value={submission.judge_notes ?? ""}
                              onChange={(e) => onNotesChange(submission.id, e.target.value)}
                              className="min-w-[200px] resize-y text-sm"
                            />
                          </TableCell>
                          <TableCell className="align-top">
                            <Button
                              size="sm"
                              className="h-8 px-3 text-xs font-semibold"
                              onClick={() => onSave(submission)}
                            >
                              Save
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </div>
      </section>
    </div>
  );
}
