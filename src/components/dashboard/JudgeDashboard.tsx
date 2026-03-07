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

type CriterionAccentStyle = {
  card: string;
  pill: string;
  activeButton: string;
  inactiveButton: string;
  input: string;
};

const TEAM_ACCENT_STYLES = [
  {
    active: "border-sky-400/60 bg-sky-500/15 shadow-[0_0_0_1px_rgba(14,165,233,0.18)]",
    inactive: "border-sky-500/30 bg-sky-500/5 hover:border-sky-400/50 hover:bg-sky-500/10",
    pill: "border-sky-400/40 bg-sky-500/10 text-sky-200",
    panel: "border-sky-500/35 bg-sky-500/5",
    teamName: "text-sky-300",
  },
  {
    active: "border-violet-400/60 bg-violet-500/15 shadow-[0_0_0_1px_rgba(139,92,246,0.2)]",
    inactive: "border-violet-500/30 bg-violet-500/5 hover:border-violet-400/50 hover:bg-violet-500/10",
    pill: "border-violet-400/40 bg-violet-500/10 text-violet-200",
    panel: "border-violet-500/35 bg-violet-500/5",
    teamName: "text-violet-300",
  },
  {
    active: "border-emerald-400/60 bg-emerald-500/15 shadow-[0_0_0_1px_rgba(16,185,129,0.2)]",
    inactive: "border-emerald-500/30 bg-emerald-500/5 hover:border-emerald-400/50 hover:bg-emerald-500/10",
    pill: "border-emerald-400/40 bg-emerald-500/10 text-emerald-200",
    panel: "border-emerald-500/35 bg-emerald-500/5",
    teamName: "text-emerald-300",
  },
  {
    active: "border-amber-400/60 bg-amber-500/15 shadow-[0_0_0_1px_rgba(245,158,11,0.2)]",
    inactive: "border-amber-500/30 bg-amber-500/5 hover:border-amber-400/50 hover:bg-amber-500/10",
    pill: "border-amber-400/40 bg-amber-500/10 text-amber-200",
    panel: "border-amber-500/35 bg-amber-500/5",
    teamName: "text-amber-300",
  },
  {
    active: "border-rose-400/60 bg-rose-500/15 shadow-[0_0_0_1px_rgba(244,63,94,0.2)]",
    inactive: "border-rose-500/30 bg-rose-500/5 hover:border-rose-400/50 hover:bg-rose-500/10",
    pill: "border-rose-400/40 bg-rose-500/10 text-rose-200",
    panel: "border-rose-500/35 bg-rose-500/5",
    teamName: "text-rose-300",
  },
  {
    active: "border-cyan-400/60 bg-cyan-500/15 shadow-[0_0_0_1px_rgba(6,182,212,0.2)]",
    inactive: "border-cyan-500/30 bg-cyan-500/5 hover:border-cyan-400/50 hover:bg-cyan-500/10",
    pill: "border-cyan-400/40 bg-cyan-500/10 text-cyan-200",
    panel: "border-cyan-500/35 bg-cyan-500/5",
    teamName: "text-cyan-300",
  },
];

const CRITERION_ACCENT_STYLES: Record<JudgingCriterionId, CriterionAccentStyle> = {
  social_impact: {
    card: "border-sky-500/35 bg-sky-500/5",
    pill: "border-sky-400/40 bg-sky-500/15 text-sky-200",
    activeButton: "border-sky-400 bg-sky-500 text-sky-950",
    inactiveButton: "border-sky-500/35 bg-background hover:border-sky-400/55 hover:bg-sky-500/10",
    input: "border-sky-500/35 focus-visible:ring-sky-500/40",
  },
  innovation: {
    card: "border-violet-500/35 bg-violet-500/5",
    pill: "border-violet-400/40 bg-violet-500/15 text-violet-200",
    activeButton: "border-violet-400 bg-violet-500 text-violet-50",
    inactiveButton: "border-violet-500/35 bg-background hover:border-violet-400/55 hover:bg-violet-500/10",
    input: "border-violet-500/35 focus-visible:ring-violet-500/40",
  },
  implementation: {
    card: "border-emerald-500/35 bg-emerald-500/5",
    pill: "border-emerald-400/40 bg-emerald-500/15 text-emerald-200",
    activeButton: "border-emerald-400 bg-emerald-500 text-emerald-50",
    inactiveButton: "border-emerald-500/35 bg-background hover:border-emerald-400/55 hover:bg-emerald-500/10",
    input: "border-emerald-500/35 focus-visible:ring-emerald-500/40",
  },
  ai_usage: {
    card: "border-amber-500/35 bg-amber-500/5",
    pill: "border-amber-400/40 bg-amber-500/15 text-amber-200",
    activeButton: "border-amber-400 bg-amber-500 text-amber-950",
    inactiveButton: "border-amber-500/35 bg-background hover:border-amber-400/55 hover:bg-amber-500/10",
    input: "border-amber-500/35 focus-visible:ring-amber-500/40",
  },
  demo: {
    card: "border-rose-500/35 bg-rose-500/5",
    pill: "border-rose-400/40 bg-rose-500/15 text-rose-200",
    activeButton: "border-rose-400 bg-rose-500 text-rose-50",
    inactiveButton: "border-rose-500/35 bg-background hover:border-rose-400/55 hover:bg-rose-500/10",
    input: "border-rose-500/35 focus-visible:ring-rose-500/40",
  },
};

const parseMemberNames = (rawMemberNames: string | null | undefined) =>
  (rawMemberNames ?? "")
    .split(/[\n,;]+/)
    .map((name) => name.trim())
    .filter(Boolean);

const getTeamAccentStyle = (teamName: string) => {
  const seed = teamName
    .split("")
    .reduce((hash, char) => (hash * 31 + char.charCodeAt(0)) % TEAM_ACCENT_STYLES.length, 0);
  return TEAM_ACCENT_STYLES[Math.abs(seed) % TEAM_ACCENT_STYLES.length];
};

const getCriterionAccentStyle = (criterionId: JudgingCriterionId) =>
  CRITERION_ACCENT_STYLES[criterionId];

const formatSubmittedAt = (createdAt: string | null | undefined) => {
  if (!createdAt) return null;
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) return createdAt;
  return date.toLocaleString();
};

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
  const activeTeamAccent = activeTeam ? getTeamAccentStyle(activeTeam.name) : null;

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
                const accentStyle = getTeamAccentStyle(team.name);
                return (
                  <button
                    key={team.name}
                    type="button"
                    onClick={() => setSelectedTeamName(team.name)}
                    className={`rounded-xl border px-4 py-3 text-left transition ${
                      isActive
                        ? accentStyle.active
                        : accentStyle.inactive
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <p className={`text-base font-semibold ${accentStyle.teamName}`}>{team.name}</p>
                      <span
                        className={`rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.08em] ${accentStyle.pill}`}
                      >
                        View details
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {team.submissions.length}{" "}
                      {team.submissions.length === 1 ? "submission" : "submissions"}{" "}
                      - {team.members.length} {team.members.length === 1 ? "member" : "members"}
                    </p>
                  </button>
                );
              })}
            </div>

            <div
              className={`rounded-xl border p-4 ${
                activeTeamAccent ? activeTeamAccent.panel : "border-border/50 bg-muted/20"
              }`}
            >
              {activeTeam ? (
                <div className="space-y-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                      Team Details
                    </p>
                    <h3 className={`mt-1 text-xl font-semibold ${activeTeamAccent?.teamName ?? "text-foreground"}`}>
                      {activeTeam.name}
                    </h3>
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
                          className="space-y-3 rounded-lg border border-border/60 bg-background/80 px-3 py-3"
                        >
                          <p className="text-sm font-medium text-foreground">
                            {submission.title || "Untitled Project"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {submission.short_description || "No description provided."}
                          </p>
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
                            {!submission.project_url &&
                            !submission.submission_pdf_url &&
                            !submission.demo_video_url ? (
                              <p className="text-muted-foreground">No project links provided.</p>
                            ) : null}
                          </div>
                          <div className="grid gap-2 text-xs sm:grid-cols-2">
                            <div className="rounded-md border border-border/60 bg-muted/30 px-2.5 py-2">
                              <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                                Submitted
                              </p>
                              <p className="mt-1 text-foreground">
                                {formatSubmittedAt(submission.created_at) ?? "Unknown"}
                              </p>
                            </div>
                            <div className="rounded-md border border-border/60 bg-muted/30 px-2.5 py-2">
                              <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                                Current Score
                              </p>
                              <p className="mt-1 font-medium text-foreground">
                                {submission.judge_criteria_scores &&
                                typeof submission.judge_criteria_scores === "object"
                                  ? `${calculateTotalFromCriteria(submission.judge_criteria_scores)}/100`
                                  : submission.judge_score != null
                                    ? `${submission.judge_score}/100`
                                    : "Not scored yet"}
                              </p>
                            </div>
                          </div>
                          <div>
                            <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                              Latest Notes
                            </p>
                            <p className="mt-1 text-xs text-foreground">
                              {submission.judge_notes?.trim() || "No notes added yet."}
                            </p>
                          </div>
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
        className={`${sectionClass} overflow-hidden border-primary/20 bg-gradient-to-b from-primary/5 via-card/95 to-card/95 p-0`}
        id="submissions"
        aria-labelledby="scoring-heading"
      >
        <div className="border-b border-border/40 px-6 py-6 sm:px-8 sm:py-7">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2
                id="scoring-heading"
                className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl"
              >
                Submissions & live scoring
              </h2>
              <p className="mt-2 text-base text-muted-foreground">
                Score projects by weighted criteria, then save total points and notes.
              </p>
            </div>
            <span className="rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-primary">
              Judge panel
            </span>
          </div>
        </div>
        <div className="p-5 sm:p-8">
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
                  const teamName = submission.team_name?.trim() || "Unnamed team";
                  const teamAccent = getTeamAccentStyle(teamName);
                  return (
                    <article
                      key={submission.id}
                      className="space-y-5 rounded-2xl border border-border/50 bg-muted/20 p-5"
                    >
                      <div className="space-y-2">
                        <span
                          className={`inline-flex rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] ${teamAccent.pill}`}
                        >
                          {teamName}
                        </span>
                        <p className="text-base font-semibold text-foreground">
                          {submission.title || "Untitled Project"}
                        </p>
                        <p className="line-clamp-3 text-sm text-muted-foreground">
                          {submission.short_description || "No description provided."}
                        </p>
                      </div>

                      <div className="space-y-1 text-sm">
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
                          const criterionAccent = getCriterionAccentStyle(criterion.id);
                          return (
                            <div
                              key={criterion.id}
                              className={`rounded-xl border p-3 ${criterionAccent.card}`}
                            >
                              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                                <p className="text-sm font-semibold text-foreground">{criterion.title}</p>
                                <span
                                  className={`rounded-full border px-2.5 py-0.5 text-sm font-medium ${criterionAccent.pill}`}
                                >
                                  {activeScore ?? 0}/{criterion.weight}
                                </span>
                              </div>
                              <p className="mb-3 text-sm leading-relaxed text-muted-foreground">
                                {criterion.description}
                              </p>
                              <div className="mb-2 flex flex-wrap items-center gap-1.5">
                                {scoreStops.map((value) => {
                                  const isActive = activeScore === value;
                                  return (
                                    <button
                                      key={`${criterion.id}-${value}`}
                                      type="button"
                                      className={`h-9 min-w-12 rounded-md border px-2 text-sm font-semibold transition ${
                                        isActive
                                          ? `${criterionAccent.activeButton} shadow-sm`
                                          : criterionAccent.inactiveButton
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
                              <div className="flex justify-end">
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
                                  className={`h-9 w-28 text-right text-sm ${criterionAccent.input}`}
                                />
                              </div>
                            </div>
                          );
                        })}
                        <div className="flex items-center justify-between rounded-lg border border-primary/30 bg-primary/5 px-4 py-3">
                          <p className="text-sm font-medium text-primary/90">Total score</p>
                          <p className="font-display text-xl font-semibold tabular-nums text-primary">
                            {totalScore}/100
                          </p>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <p className="text-sm font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                          Judge Notes
                        </p>
                        <Textarea
                          rows={4}
                          value={submission.judge_notes ?? ""}
                          onChange={(e) => onNotesChange(submission.id, e.target.value)}
                          className="resize-y text-base"
                        />
                      </div>

                      <Button
                        size="sm"
                        className="h-10 w-full text-sm font-semibold"
                        onClick={() => onSave(submission)}
                      >
                        Save
                      </Button>
                    </article>
                  );
                })}
              </div>

              <div className="hidden rounded-2xl border border-border/40 bg-card/80 md:block">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border/50 hover:bg-transparent">
                      <TableHead className="w-[240px] text-sm font-semibold">
                        Project
                      </TableHead>
                      <TableHead className="text-sm font-semibold">
                        Links
                      </TableHead>
                      <TableHead className="min-w-[520px] text-sm font-semibold">
                        Score
                      </TableHead>
                      <TableHead className="min-w-[280px] text-sm font-semibold">
                        Judge Notes
                      </TableHead>
                      <TableHead className="w-[120px] text-right text-sm font-semibold">
                        Action
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {submissions.map((submission) => {
                      const totalScore =
                        submission.judge_criteria_scores && typeof submission.judge_criteria_scores === "object"
                          ? calculateTotalFromCriteria(submission.judge_criteria_scores)
                          : submission.judge_score ?? 0;
                      const teamName = submission.team_name?.trim() || "Unnamed team";
                      const teamAccent = getTeamAccentStyle(teamName);
                      return (
                        <TableRow key={submission.id} className="border-border/40 hover:bg-muted/20">
                          <TableCell className="align-top">
                            <div className="space-y-1">
                              <span
                                className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.12em] ${teamAccent.pill}`}
                              >
                                {teamName}
                              </span>
                              <p className="text-base font-semibold">
                                {submission.title || "Untitled Project"}
                              </p>
                              <p className="line-clamp-3 text-sm text-muted-foreground">
                                {submission.short_description || "No description provided."}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell className="align-top">
                            <div className="space-y-1 text-sm">
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
                                const criterionAccent = getCriterionAccentStyle(criterion.id);
                                return (
                                  <div
                                    key={criterion.id}
                                    className={`rounded-xl border p-4 ${criterionAccent.card}`}
                                  >
                                    <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                                      <p className="text-sm font-semibold text-foreground">
                                        {criterion.title}
                                      </p>
                                      <span
                                        className={`rounded-full border px-2.5 py-0.5 text-sm font-medium ${criterionAccent.pill}`}
                                      >
                                        {activeScore ?? 0}/{criterion.weight}
                                      </span>
                                    </div>
                                    <p className="mb-3 text-sm leading-relaxed text-muted-foreground">
                                      {criterion.description}
                                    </p>
                                    <div className="mb-2 flex flex-wrap items-center gap-1.5">
                                      {scoreStops.map((value) => {
                                        const isActive = activeScore === value;
                                        return (
                                          <button
                                            key={`${criterion.id}-${value}`}
                                            type="button"
                                            className={`h-9 min-w-12 rounded-md border px-2 text-sm font-semibold transition ${
                                              isActive
                                                ? `${criterionAccent.activeButton} shadow-sm`
                                                : criterionAccent.inactiveButton
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
                                    <div className="flex justify-end">
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
                                        className={`h-9 w-28 text-right text-sm ${criterionAccent.input}`}
                                      />
                                    </div>
                                  </div>
                                );
                              })}
                              <div className="flex items-center justify-between rounded-lg border border-primary/30 bg-primary/5 px-4 py-3">
                                <p className="text-sm font-medium text-primary/90">
                                  Total score
                                </p>
                                <p className="font-display text-xl font-semibold tabular-nums text-primary">
                                  {totalScore}/100
                                </p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="align-top">
                            <Textarea
                              rows={4}
                              value={submission.judge_notes ?? ""}
                              onChange={(e) => onNotesChange(submission.id, e.target.value)}
                              className="min-w-[240px] resize-y text-base"
                            />
                          </TableCell>
                          <TableCell className="align-top text-right whitespace-nowrap">
                            <Button
                              size="sm"
                              className="h-10 w-full min-w-0 px-3 text-sm font-semibold"
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
