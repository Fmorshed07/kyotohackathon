import { BarChart3, ClipboardCheck, ClipboardList, ListChecks, Medal, Trophy } from "lucide-react";
import { MarkingCriteriaSection } from "@/components/dashboard/MarkingCriteriaSection";
import { JudgingStatsPanel } from "@/components/dashboard/JudgingStatsPanel";
import { AdminJudgeMarksPanel } from "@/components/dashboard/AdminJudgeMarksPanel";
import { AdminTop3MarksPanel } from "@/components/dashboard/AdminTop3MarksPanel";
import { AdminTop3RankingPanel } from "@/components/dashboard/AdminTop3RankingPanel";
import { AdminSubmissionsPanel } from "@/components/dashboard/AdminSubmissionsPanel";
import { sectionClass } from "@/components/dashboard/DashboardLayout";
import type { AdminSubmissionRow, AdminUser, NewSubmissionInput } from "@/components/dashboard/AdminDashboard";
import type { JudgingCriterion } from "@/components/dashboard/judgingCriteria";
import type { AdminJudgingStatistics } from "@/lib/judgingStatistics";
import type { AdminTop3RankingSummary } from "@/lib/judgeTop3Rankings";
import type { PortalHackathon } from "@/lib/hackathons";
import { cn } from "@/lib/utils";

const JUDGING_JUMP_LINKS = [
  { href: "#marking-criteria", label: "Criteria", icon: ListChecks },
  { href: "#analytics", label: "Analytics", icon: BarChart3 },
  { href: "#judge-marks", label: "Mark check", icon: ClipboardCheck },
  { href: "#top-3-marks", label: "Top 3 by score", icon: Medal },
  { href: "#top-3-ranking", label: "Top 3 ballots", icon: Trophy },
  { href: "#submission-marks", label: "Submissions", icon: ClipboardList },
] as const;

type AdminJudgingSectionProps = {
  selectedHackathon: PortalHackathon;
  judgingCriteria: JudgingCriterion[];
  isLoadingCriteria: boolean;
  isSavingCriteria: boolean;
  onSaveCriteria: (criteria: JudgingCriterion[]) => Promise<void>;
  participants: AdminUser[];
  submissions: AdminSubmissionRow[];
  isLoadingSubmissions: boolean;
  isLoadingUsers: boolean;
  analytics: AdminJudgingStatistics;
  isCreatingSubmission: boolean;
  deletingSubmissionId: string | null;
  newSubmission: NewSubmissionInput;
  onNewSubmissionChange: (value: NewSubmissionInput) => void;
  onCreateSubmission: (payload: NewSubmissionInput) => Promise<void>;
  onDeleteSubmission: (submissionId: string) => Promise<void>;
  top3RankingSummary: AdminTop3RankingSummary;
  isLoadingTop3Rankings: boolean;
  top3SubmissionLookup: Map<
    string,
    { id: string; title: string | null; team_name?: string | null; participantEmail: string }
  >;
};

export function AdminJudgingSection({
  selectedHackathon,
  judgingCriteria,
  isLoadingCriteria,
  isSavingCriteria,
  onSaveCriteria,
  participants,
  submissions,
  isLoadingSubmissions,
  isLoadingUsers,
  analytics,
  isCreatingSubmission,
  deletingSubmissionId,
  newSubmission,
  onNewSubmissionChange,
  onCreateSubmission,
  onDeleteSubmission,
  top3RankingSummary,
  isLoadingTop3Rankings,
  top3SubmissionLookup,
}: AdminJudgingSectionProps) {
  return (
    <div id="judging" className="scroll-mt-24 space-y-6 sm:space-y-8 md:space-y-10">
      <header className={`${sectionClass} !py-5`}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-3">
            <span className="dash-icon-chip dash-icon-chip--violet shrink-0" aria-hidden>
              <ClipboardCheck className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <p className="dash-eyebrow">Judging</p>
              <h2 className="dash-title">Scoring & mark check</h2>
              <p className="dash-subtitle">
                Criteria, live analytics, per-judge mark verification, leaderboards, and project
                submissions for {selectedHackathon.name}.
              </p>
            </div>
          </div>
        </div>

        <nav
          aria-label="Judging sections"
          className="mt-4 flex flex-wrap gap-1.5 border-t border-white/10 pt-4"
        >
          {JUDGING_JUMP_LINKS.map(({ href, label, icon: Icon }) => (
            <a
              key={href}
              href={href}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-muted/20 px-2.5 py-1.5",
                "text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground",
                "transition-colors hover:border-primary/35 hover:bg-primary/10 hover:text-primary"
              )}
            >
              <Icon className="h-3.5 w-3.5" aria-hidden />
              {label}
            </a>
          ))}
        </nav>
      </header>

      <MarkingCriteriaSection
        selectedHackathon={selectedHackathon}
        criteria={judgingCriteria}
        isLoading={isLoadingCriteria}
        isSaving={isSavingCriteria}
        onSave={onSaveCriteria}
      />

      <section className={sectionClass} id="analytics">
        <div className="mb-5 flex items-start gap-3 border-b border-white/10 pb-4">
          <span className="dash-icon-chip" aria-hidden>
            <BarChart3 className="h-4 w-4" />
          </span>
          <div>
            <p className="dash-eyebrow">Analytics</p>
            <h2 className="dash-title">Judging statistics</h2>
            <p className="dash-subtitle">
              Live scoring analytics for {selectedHackathon.name}.
            </p>
          </div>
        </div>
        <JudgingStatsPanel
          isLoading={isLoadingSubmissions}
          completionRate={analytics.completionRate}
          criterionAverages={analytics.criterionAverages}
          title="Event scoring overview"
          description="Aggregated across all judges and submissions for this hackathon."
          stats={[
            { label: "Submissions", value: String(analytics.totalSubmissions), highlight: true },
            { label: "Scored", value: String(analytics.scoredSubmissions) },
            { label: "Pending", value: String(analytics.unscoredSubmissions) },
            {
              label: "Avg score",
              value: analytics.averageScore != null ? analytics.averageScore.toFixed(1) : "—",
            },
            { label: "Teams", value: String(analytics.teamsCount) },
            { label: "Judge marks", value: String(analytics.totalJudgeMarks) },
            { label: "Judges active", value: String(analytics.activeJudgeCount) },
            {
              label: "Judges registered",
              value: isLoadingUsers ? "—" : String(analytics.registeredJudgeCount),
            },
            {
              label: "Top project",
              value:
                analytics.highestProjectScore != null
                  ? analytics.highestProjectScore.toFixed(1)
                  : "—",
            },
            {
              label: "Lowest project",
              value:
                analytics.lowestProjectScore != null
                  ? analytics.lowestProjectScore.toFixed(1)
                  : "—",
            },
          ]}
        />
      </section>

      <AdminJudgeMarksPanel
        selectedHackathon={selectedHackathon}
        submissions={submissions}
        judgingCriteria={judgingCriteria}
        isLoading={isLoadingSubmissions}
      />

      <AdminTop3MarksPanel
        selectedHackathon={selectedHackathon}
        submissions={submissions}
        isLoading={isLoadingSubmissions}
      />

      <AdminTop3RankingPanel
        selectedHackathon={selectedHackathon}
        summary={top3RankingSummary}
        isLoading={isLoadingTop3Rankings || isLoadingSubmissions}
        submissionLookup={top3SubmissionLookup}
      />

      <AdminSubmissionsPanel
        selectedHackathon={selectedHackathon}
        participants={participants}
        submissions={submissions}
        isLoading={isLoadingSubmissions}
        isCreatingSubmission={isCreatingSubmission}
        deletingSubmissionId={deletingSubmissionId}
        newSubmission={newSubmission}
        onNewSubmissionChange={onNewSubmissionChange}
        onCreateSubmission={onCreateSubmission}
        onDeleteSubmission={onDeleteSubmission}
      />
    </div>
  );
}
