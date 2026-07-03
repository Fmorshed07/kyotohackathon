import { useEffect, useMemo, useState } from "react";
import { Gavel, Users } from "lucide-react";
import { sectionClass } from "@/components/dashboard/DashboardLayout";
import { SubmissionSearchInput } from "@/components/dashboard/SubmissionSearchInput";
import { HackathonContextBanner } from "@/components/dashboard/HackathonSelector";
import { JudgingStatsPanel } from "@/components/dashboard/JudgingStatsPanel";
import { JudgeScoringWorkspace } from "@/components/dashboard/JudgeScoringWorkspace";
import {
  getSubmissionAccentStyle,
  getTeamAccentStyle,
} from "@/components/dashboard/judgeDashboardAccents";
import { submissionMatchesSearch } from "@/lib/submissionSearch";
import type { JudgeStatistics } from "@/lib/judgingStatistics";
import type { PortalHackathon } from "@/lib/hackathons";
import type { Submission } from "@/types/portal";
import {
  calculateTotalFromCriteria,
  type JudgingCriterion,
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

const formatSubmittedAt = (createdAt: string | null | undefined) => {
  if (!createdAt) return null;
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) return createdAt;
  return date.toLocaleString();
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

  return (
    <div className="space-y-8" id="overview">
      <HackathonContextBanner hackathon={selectedHackathon} role="judge" />

      {/* Overview */}
      <section className={`${sectionClass}`} aria-label="Judge overview">
        <div className="dash-stack-header flex flex-wrap items-center justify-between gap-4">
          <div className="flex min-w-0 items-start gap-3">
            <span className="dash-icon-chip dash-icon-chip--violet" aria-hidden>
              <Gavel className="h-4 w-4" />
            </span>
            <div>
              <p className="dash-eyebrow">Judge panel</p>
              <h2 className="dash-title">Overview</h2>
              <p className="dash-subtitle">
                Track submissions and scoring progress for {selectedHackathon.name}.
              </p>
            </div>
          </div>
          <div className="dash-stat-grid grid w-full gap-2 sm:grid-cols-3 sm:gap-3 lg:w-auto lg:gap-4">
            <div className="dash-stat-tile dash-stat-tile--highlight">
              <p className="dash-stat-value">
                {isLoadingSubmissions ? "—" : summary.total}
              </p>
              <p className="dash-stat-label">
                Submissions
              </p>
            </div>
            <div className="dash-stat-tile">
              <p className="dash-stat-value">
                {isLoadingSubmissions ? "—" : summary.scored}
              </p>
              <p className="dash-stat-label">
                Scored
              </p>
            </div>
            <div className="dash-stat-tile sm:col-span-1 col-span-2">
              <p className="dash-stat-value">
                {isLoadingSubmissions
                  ? "—"
                  : summary.averageScore != null
                    ? summary.averageScore.toFixed(1)
                    : "—"}
              </p>
              <p className="dash-stat-label">
                Avg Score
              </p>
            </div>
          </div>
        </div>
        {judgeMessage && (
          <p className="dash-message mt-4">
            {judgeMessage}
          </p>
        )}
        {!isLoadingSubmissions && submissions.length > 0 ? (
          <div className="mt-4 max-w-xl">
            <SubmissionSearchInput
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Search teams, projects, or members..."
            />
            {hasSearchQuery ? (
              <p className="mt-2 text-xs text-muted-foreground">
                Showing {filteredTeams.length} of {teams.length} teams and{" "}
                {filteredSubmissions.length} of {submissions.length} submissions.
              </p>
            ) : null}
          </div>
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
                className="mt-1 font-display text-xl font-bold tracking-tight sm:text-2xl md:text-3xl"
              >
                <span className="bg-gradient-to-r from-foreground via-primary to-secondary bg-clip-text text-transparent">
                  Submissions & live scoring
                </span>
              </h2>
              <p className="mt-2 text-sm text-muted-foreground sm:text-base">
                Score one idea at a time, criterion by criterion, then review and save.
              </p>
            </div>
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3.5 py-1.5 font-display text-xs font-semibold uppercase tracking-[0.14em] text-primary shadow-[0_0_16px_-6px_hsl(199_89%_68%/0.5)]">
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
