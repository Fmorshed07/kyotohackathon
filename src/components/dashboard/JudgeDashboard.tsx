import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Gavel, ListChecks, Target, Trophy, Users } from "lucide-react";
import { sectionClass } from "@/components/dashboard/DashboardLayout";
import { SubmissionSearchInput } from "@/components/dashboard/SubmissionSearchInput";
import { HackathonContextBanner } from "@/components/dashboard/HackathonSelector";
import { JudgingStatsPanel } from "@/components/dashboard/JudgingStatsPanel";
import { JudgeScoringWorkspace } from "@/components/dashboard/JudgeScoringWorkspace";
import { JudgeTop3RankingSection } from "@/components/dashboard/JudgeTop3RankingSection";
import { ProjectThemeMarksPanel } from "@/components/dashboard/ProjectThemeMarksPanel";
import {
  getSubmissionAccentStyle,
  getTeamAccentStyle,
} from "@/components/dashboard/judgeDashboardAccents";
import { submissionMatchesSearch } from "@/lib/submissionSearch";
import type { JudgeStatistics } from "@/lib/judgingStatistics";
import type { PortalHackathon } from "@/lib/hackathons";
import type { JudgeTop3Ranks, Submission, Top3RankSlot } from "@/types/portal";
import { collectTeamDisplayNames } from "@/lib/teamRoster";
import { formatSubmissionDateTime } from "@/lib/datetime";

type TeamSummary = {
  name: string;
  submissions: Submission[];
  members: string[];
};

export type JudgeDashboardProps = {
  selectedHackathon: PortalHackathon;
  judgingCriteria: JudgingCriterion[];
  submissions: Submission[];
  isLoadingSubmissions: boolean;
  judgeMessage: string | null;
  summary: {
    total: number;
    scored: number;
    averageScore: number | null;
  };
  statistics: JudgeStatistics | null;
  onCriterionScoreChange: (
    id: string,
    criterionId: JudgingCriterionId,
    value: number | null
  ) => void;
  onNotesChange: (id: string, value: string) => void;
  onSave: (submissionId: string) => Promise<void>;
  savingSubmissionId?: string | null;
  top3Ranks: JudgeTop3Ranks;
  top3SavedAt: string | null;
  isSavingTop3: boolean;
  onTop3RankChange: (slot: Top3RankSlot, submissionId: string | null) => void;
  onSaveTop3Ranking: () => Promise<void>;
};

export function JudgeDashboard({
  selectedHackathon,
  judgingCriteria,
  submissions,
  isLoadingSubmissions,
  judgeMessage,
  summary,
  statistics,
  onCriterionScoreChange,
  onNotesChange,
  onSave,
  savingSubmissionId,
  top3Ranks,
  top3SavedAt,
  isSavingTop3,
  onTop3RankChange,
  onSaveTop3Ranking,
}: JudgeDashboardProps) {
  const [selectedTeamName, setSelectedTeamName] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    setSelectedTeamName(null);
    setSearchQuery("");
  }, [selectedHackathon.id]);

  const teams = Array.from(
    submissions.reduce<Map<string, TeamSummary>>((acc, submission) => {
      const teamName = submission.team_name?.trim() || "Unnamed team";
      const existing = acc.get(teamName);
      if (!existing) {
        acc.set(teamName, {
          name: teamName,
          submissions: [submission],
          members: collectTeamDisplayNames(submission),
        });
        return acc;
      }

      const combinedMembers = [
        ...existing.members,
        ...collectTeamDisplayNames(submission),
      ];
      existing.members = Array.from(new Set(combinedMembers));
      existing.submissions.push(submission);
      return acc;
    }, new Map())
    .values()
  ).sort((left, right) => left.name.localeCompare(right.name));
  const filteredTeams = useMemo(() => {
    if (!searchQuery.trim()) return teams;
    return teams.filter(
      (team) =>
        submissionMatchesSearch(searchQuery, { team_name: team.name }) ||
        team.members.some((member) => submissionMatchesSearch(searchQuery, { title: member })) ||
        team.submissions.some((submission) => submissionMatchesSearch(searchQuery, submission))
    );
  }, [searchQuery, teams]);
  const filteredSubmissions = useMemo(() => {
    if (!searchQuery.trim()) return submissions;
    return submissions.filter((submission) => submissionMatchesSearch(searchQuery, submission));
  }, [searchQuery, submissions]);
  const activeTeam =
    filteredTeams.find((team) => team.name === selectedTeamName) ?? filteredTeams[0] ?? null;
  const activeTeamAccent = activeTeam ? getTeamAccentStyle(activeTeam.name) : null;
  const hasSearchQuery = searchQuery.trim().length > 0;

  const getTeamScoringProgress = (team: TeamSummary) => {
    const scored = team.submissions.filter((submission) => {
      if (
        submission.judge_criteria_scores &&
        typeof submission.judge_criteria_scores === "object"
      ) {
        return judgingCriteria.every(
          (criterion) => typeof submission.judge_criteria_scores?.[criterion.id] === "number"
        );
      }
      return submission.judge_score != null;
    }).length;
    return { scored, total: team.submissions.length };
  };

  const overallProgress = useMemo(() => {
    if (submissions.length === 0) return { scored: 0, total: 0, percent: 0 };
    const scored = submissions.filter((submission) => {
      if (
        submission.judge_criteria_scores &&
        typeof submission.judge_criteria_scores === "object"
      ) {
        return judgingCriteria.every(
          (criterion) => typeof submission.judge_criteria_scores?.[criterion.id] === "number"
        );
      }
      return submission.judge_score != null;
    }).length;
    return {
      scored,
      total: submissions.length,
      percent: Math.round((scored / submissions.length) * 100),
    };
  }, [submissions, judgingCriteria]);

  return (
    <div className="space-y-8" id="overview">
      <HackathonContextBanner hackathon={selectedHackathon} role="judge" />

      {/* Overview */}
      <section className={`${sectionClass} dash-command-panel`} aria-label="Judge overview">
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(360px,0.55fr)]">
          <div className="min-w-0">
            <div className="flex min-w-0 items-start gap-3">
              <span className="dash-icon-chip dash-icon-chip--violet" aria-hidden>
                <Gavel className="h-4 w-4" />
              </span>
              <div>
                <p className="dash-eyebrow">Judge command center</p>
                <h2 className="dash-title">Overview</h2>
                <p className="dash-subtitle max-w-2xl">
                  Track your review queue, scoring progress, and final ranking for{" "}
                  {selectedHackathon.name}.
                </p>
              </div>
            </div>

            {!isLoadingSubmissions && submissions.length > 0 ? (
              <div className="mt-5 grid gap-3 md:grid-cols-3">
                <div className="dash-workflow-card">
                  <div className="flex items-center gap-2 text-primary">
                    <ListChecks className="h-4 w-4" aria-hidden />
                    <p className="text-xs font-semibold uppercase">Queue</p>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {summary.total - summary.scored} ideas still need a complete score.
                  </p>
                </div>
                <div className="dash-workflow-card">
                  <div className="flex items-center gap-2 text-emerald-300">
                    <CheckCircle2 className="h-4 w-4" aria-hidden />
                    <p className="text-xs font-semibold uppercase">Progress</p>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {overallProgress.percent}% complete across assigned submissions.
                  </p>
                </div>
                <div className="dash-workflow-card">
                  <div className="flex items-center gap-2 text-amber-300">
                    <Target className="h-4 w-4" aria-hidden />
                    <p className="text-xs font-semibold uppercase">Decision</p>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Use saved scores to make a clean top 3 ballot.
                  </p>
                </div>
              </div>
            ) : null}
          </div>

          <div className="dash-stat-grid grid gap-2 sm:grid-cols-3 xl:grid-cols-1">
            <div className="dash-stat-tile dash-stat-tile--highlight">
              <p className="dash-stat-value">
                {isLoadingSubmissions ? "-" : summary.total}
              </p>
              <p className="dash-stat-label">Submissions</p>
            </div>
            <div className="dash-stat-tile">
              <p className="dash-stat-value">
                {isLoadingSubmissions ? "-" : summary.scored}
              </p>
              <p className="dash-stat-label">Scored</p>
            </div>
            <div className="dash-stat-tile">
              <p className="dash-stat-value">
                {isLoadingSubmissions
                  ? "-"
                  : summary.averageScore != null
                    ? summary.averageScore.toFixed(1)
                    : "-"}
              </p>
              <p className="dash-stat-label">Avg Score</p>
            </div>
          </div>
        </div>
        {judgeMessage && (
          <p className="dash-message mt-4">
            {judgeMessage}
          </p>
        )}
        {!isLoadingSubmissions && submissions.length > 0 ? (
          <>
            <div className="dash-progress-card mt-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase text-muted-foreground">
                    Your scoring progress
                  </p>
                  <p className="mt-1 font-display text-lg font-bold text-foreground">
                    {overallProgress.scored} of {overallProgress.total} ideas scored
                  </p>
                </div>
                <span className="inline-flex items-center rounded-full border border-primary/30 bg-primary/10 px-3 py-1 font-mono text-sm font-bold tabular-nums text-primary">
                  {overallProgress.percent}%
                </span>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted/40">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-primary to-secondary transition-all duration-500"
                  style={{ width: `${overallProgress.percent}%` }}
                />
              </div>
            </div>
            <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,0.56fr)_minmax(0,1fr)] lg:items-center">
              <SubmissionSearchInput
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder="Search teams, projects, or members..."
              />
              {hasSearchQuery ? (
                <p className="text-xs text-muted-foreground">
                  Showing {filteredTeams.length} of {teams.length} teams and{" "}
                  {filteredSubmissions.length} of {submissions.length} submissions.
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Search filters the roster, scoring queue, and ballot candidate list.
                </p>
              )}
            </div>
          </>
        ) : null}
        {statistics ? (
          <div className="mt-6 border-t border-white/10 pt-6">
            <JudgingStatsPanel
              isLoading={isLoadingSubmissions}
              completionRate={statistics.completionRate}
              criterionAverages={statistics.criterionAverages}
              title="Your judging statistics"
              description={`Personal scoring progress for ${selectedHackathon.name}.`}
              stats={[
                { label: "Teams", value: String(statistics.teamsCount) },
                { label: "Pending", value: String(statistics.pendingSubmissions) },
                {
                  label: "Completion",
                  value:
                    statistics.completionRate != null
                      ? `${statistics.completionRate.toFixed(0)}%`
                      : "—",
                  highlight: true,
                },
                {
                  label: "Highest",
                  value: statistics.highestScore != null ? statistics.highestScore.toFixed(1) : "—",
                },
                {
                  label: "Lowest",
                  value: statistics.lowestScore != null ? statistics.lowestScore.toFixed(1) : "—",
                },
                { label: "Notes added", value: String(statistics.notesCount) },
              ]}
            />
          </div>
        ) : null}
      </section>

      <section className={`${sectionClass}`} id="teams" aria-label="Teams">
        <div className="mb-5 flex items-start gap-3 border-b border-white/10 pb-4">
          <span className="dash-icon-chip" aria-hidden>
            <Users className="h-4 w-4" />
          </span>
          <div>
            <p className="dash-eyebrow">Roster</p>
            <h2 className="dash-title">Teams</h2>
            <p className="dash-subtitle">
              Team names are listed separately for quick review before scoring.
            </p>
          </div>
        </div>
        {isLoadingSubmissions ? (
          <p className="text-sm text-muted-foreground">Loading teams…</p>
        ) : teams.length === 0 ? (
          <p className="dash-empty">
            No teams available yet for {selectedHackathon.name}.
          </p>
        ) : filteredTeams.length === 0 ? (
          <p className="dash-empty">
            No teams match your search.
          </p>
        ) : (
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
              {filteredTeams.map((team) => {
                const isActive = activeTeam?.name === team.name;
                const accentStyle = getTeamAccentStyle(team.name);
                const progress = getTeamScoringProgress(team);
                const isFullyScored = progress.scored === progress.total && progress.total > 0;
                return (
                  <button
                    key={team.name}
                    type="button"
                    onClick={() => setSelectedTeamName(team.name)}
                    className={`rounded-lg border px-4 py-3 text-left transition ${
                      isActive
                        ? accentStyle.active
                        : accentStyle.inactive
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <p className={`text-base font-semibold ${accentStyle.teamName}`}>{team.name}</p>
                      <span
                        className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.08em] ${
                          isFullyScored
                            ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-200"
                            : progress.scored > 0
                              ? accentStyle.pill
                              : "border-border/50 bg-muted/30 text-muted-foreground"
                        }`}
                      >
                        {isFullyScored
                          ? "Done"
                          : progress.scored > 0
                            ? `${progress.scored}/${progress.total} scored`
                            : "Pending"}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {team.submissions.length}{" "}
                      {team.submissions.length === 1 ? "submission" : "submissions"}{" "}
                      · {team.members.length} {team.members.length === 1 ? "member" : "members"}
                    </p>
                  </button>
                );
              })}
            </div>

            <div
              className={`rounded-lg border p-4 ${
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
                      {activeTeam.submissions.map((submission) => {
                        const ideaAccent = getSubmissionAccentStyle(submission);
                        return (
                        <div
                          key={`${activeTeam.name}-${submission.id}`}
                          className={`space-y-3 rounded-lg border px-3 py-3 ${ideaAccent.panel}`}
                        >
                          <p className={`text-sm font-semibold ${ideaAccent.teamName}`}>
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
                                {formatSubmissionDateTime(submission.created_at, "Unknown")}
                              </p>
                            </div>
                            <div className="rounded-md border border-border/60 bg-muted/30 px-2.5 py-2">
                              <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                                Current Score
                              </p>
                              <p className="mt-1 font-medium text-foreground">
                                {submission.judge_criteria_scores &&
                                typeof submission.judge_criteria_scores === "object"
                                  ? `${calculateTotalFromCriteria(submission.judge_criteria_scores, judgingCriteria)}/100`
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
                        );
                      })}
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        )}
      </section>

      <ProjectThemeMarksPanel
        hackathon={selectedHackathon}
        submissions={submissions}
        isLoading={isLoadingSubmissions}
      />

      <section
        className={`${sectionClass} overflow-hidden border-violet-500/20 bg-gradient-to-b from-violet-500/5 via-card/95 to-card/95 p-0`}
        id="top-3-ranking"
        aria-label="Top 3 idea ranking"
      >
        <div className="border-b border-white/10 px-4 py-5 sm:px-6 sm:py-6 md:px-8">
          <div className="flex items-center gap-2 text-violet-300">
            <Trophy className="h-4 w-4" aria-hidden />
            <p className="text-xs font-semibold uppercase tracking-[0.14em]">Ballot</p>
          </div>
        </div>
        <div className="p-4 sm:p-6 md:p-8">
          {isLoadingSubmissions ? (
            <p className="text-sm text-muted-foreground">Loading submissions…</p>
          ) : submissions.length === 0 ? (
            <p className="dash-empty">
              No submissions yet. Top 3 ranking will be available once teams submit.
            </p>
          ) : (
            <JudgeTop3RankingSection
              submissions={submissions}
              ranks={top3Ranks}
              savedAt={top3SavedAt}
              isSaving={isSavingTop3}
              onRankChange={onTop3RankChange}
              onSave={onSaveTop3Ranking}
            />
          )}
        </div>
      </section>

      {/* Submissions & scoring */}
      <section
        className={`${sectionClass} overflow-hidden border-primary/20 bg-gradient-to-b from-primary/5 via-card/95 to-card/95 p-0`}
        id="submissions"
        aria-labelledby="scoring-heading"
      >
        <div className="border-b border-white/10 px-4 py-5 sm:px-6 sm:py-6 md:px-8 md:py-7">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="dash-eyebrow">Live scoring</p>
              <h2
                id="scoring-heading"
                className="mt-1 font-display text-xl font-bold tracking-normal sm:text-2xl md:text-3xl"
              >
                <span className="bg-gradient-to-r from-foreground via-primary to-secondary bg-clip-text text-transparent">
                  Submissions & live scoring
                </span>
              </h2>
              <p className="mt-2 text-sm text-muted-foreground sm:text-base">
                Score one idea at a time. Change any mark, go back a step, or redo scoring
                before and after you save.
              </p>
            </div>
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3.5 py-1.5 font-display text-xs font-semibold uppercase tracking-[0.14em] text-primary shadow-[0_0_16px_-6px_hsl(199_100%_50%/0.45)]">
              <Gavel className="h-3.5 w-3.5" aria-hidden />
              Judge panel
            </span>
          </div>
        </div>
        <div className="p-4 sm:p-5 md:p-8">
          {isLoadingSubmissions ? (
            <p className="text-sm text-muted-foreground">
              Loading submissions…
            </p>
          ) : submissions.length === 0 ? (
            <p className="dash-empty">
              No submissions yet. Scores will appear here as teams submit.
            </p>
          ) : filteredSubmissions.length === 0 ? (
            <p className="dash-empty">
              No submissions match your search.
            </p>
          ) : (
            <JudgeScoringWorkspace
              submissions={filteredSubmissions}
              judgingCriteria={judgingCriteria}
              onCriterionScoreChange={onCriterionScoreChange}
              onNotesChange={onNotesChange}
              onSave={onSave}
              savingSubmissionId={savingSubmissionId}
            />
          )}
        </div>
      </section>
    </div>
  );
}
