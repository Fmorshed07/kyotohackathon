import { BarChart3, ClipboardCheck, ClipboardList, Gavel, ListChecks, Medal, ScanSearch, Star, Trophy } from "lucide-react";
import { MarkingCriteriaSection } from "@/components/dashboard/MarkingCriteriaSection";
import { JudgingStatsPanel } from "@/components/dashboard/JudgingStatsPanel";
import { AdminJudgeMarksPanel } from "@/components/dashboard/AdminJudgeMarksPanel";
import { AdminTop3MarksPanel } from "@/components/dashboard/AdminTop3MarksPanel";
import { AdminTop3RankingPanel } from "@/components/dashboard/AdminTop3RankingPanel";
import { AdminSubmissionsPanel } from "@/components/dashboard/AdminSubmissionsPanel";
import { AdminFinalShortlistPanel } from "@/components/dashboard/AdminFinalShortlistPanel";
import { JudgeMarksChartPanel } from "@/components/dashboard/JudgeMarksChartPanel";
import { ProjectThemeMarksPanel } from "@/components/dashboard/ProjectThemeMarksPanel";
import { dashJumpLinkClass, sectionClass } from "@/components/dashboard/DashboardLayout";
import type { AdminSubmissionRow, AdminUser, NewSubmissionInput } from "@/components/dashboard/AdminDashboard";
import type { JudgingCriterion } from "@/components/dashboard/judgingCriteria";
import type { AdminJudgingStatistics } from "@/lib/judgingStatistics";
import type { AdminTop3RankingSummary } from "@/lib/judgeTop3Rankings";
import type { PortalHackathon } from "@/lib/hackathons";

const JUDGING_JUMP_LINKS = [
  { href: "#marking-criteria", label: "1. Criteria", icon: ListChecks },
  { href: "#submission-marks", label: "2. Submissions", icon: ClipboardList },
  { href: "#final-shortlist", label: "3. Final shortlist", icon: Star },
  { href: "#judge-marks", label: "4. Mark check", icon: ClipboardCheck },
  { href: "#judge-marks-chart", label: "5. Judge chart", icon: Gavel },
  { href: "#analytics", label: "6. Analytics", icon: BarChart3 },
  { href: "#project-marks", label: "7. Agent marks", icon: ScanSearch },
  { href: "#top-3-marks", label: "8. Top 3 by score", icon: Medal },
  { href: "#top-3-ranking", label: "9. Top 3 ballots", icon: Trophy },
] as const;

type AdminJudgingSectionProps = {
  selectedHackathon: PortalHackathon;
  hackathons?: PortalHackathon[];
  judgingCriteria: JudgingCriterion[];
  isLoadingCriteria: boolean;
  isSavingCriteria: boolean;
  onSaveCriteria: (criteria: JudgingCriterion[]) => Promise<void>;
  participants: AdminUser[];
  submissions: AdminSubmissionRow[];
  allSubmissions?: AdminSubmissionRow[];
  isLoadingSubmissions: boolean;
  isLoadingUsers: boolean;
  analytics: AdminJudgingStatistics;
  isCreatingSubmission: boolean;
  deletingSubmissionId: string | null;
  publishingSubmissionId: string | null;
  shortlistingSubmissionId: string | null;
  newSubmission: NewSubmissionInput;
  onNewSubmissionChange: (value: NewSubmissionInput) => void;
  onCreateSubmission: (payload: NewSubmissionInput) => Promise<void>;
  onDeleteSubmission: (submissionId: string) => Promise<void>;
  onSetSubmissionPublic: (submissionId: string, makePublic: boolean) => Promise<void>;
  onSetFinalShortlisted: (submissionId: string, shortlisted: boolean) => Promise<void>;
  top3RankingSummary: AdminTop3RankingSummary;
  isLoadingTop3Rankings: boolean;
  top3SubmissionLookup: Map<
    string,
    { id: string; title: string | null; team_name?: string | null; participantEmail: string }
  >;
};

export function AdminJudgingSection({
  selectedHackathon,
  hackathons,
  judgingCriteria,
  isLoadingCriteria,
  isSavingCriteria,
  onSaveCriteria,
  participants,
  submissions,
  allSubmissions,
  isLoadingSubmissions,
  isLoadingUsers,
  analytics,
  isCreatingSubmission,
  deletingSubmissionId,
  publishingSubmissionId,
  shortlistingSubmissionId,
  newSubmission,
  onNewSubmissionChange,
  onCreateSubmission,
  onDeleteSubmission,
  onSetSubmissionPublic,
  onSetFinalShortlisted,
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
                Work in order for {selectedHackathon.name}: set criteria, review submissions, check
                judge marks, then read analytics and lock top 3. Agent scores stay on a separate chart.
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
              className={dashJumpLinkClass}
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

      <AdminSubmissionsPanel
        selectedHackathon={selectedHackathon}
        hackathons={hackathons}
        participants={participants}
        submissions={allSubmissions ?? submissions}
        isLoading={isLoadingSubmissions}
        isCreatingSubmission={isCreatingSubmission}
        deletingSubmissionId={deletingSubmissionId}
        publishingSubmissionId={publishingSubmissionId}
        shortlistingSubmissionId={shortlistingSubmissionId}
        newSubmission={newSubmission}
        onNewSubmissionChange={onNewSubmissionChange}
        onCreateSubmission={onCreateSubmission}
        onDeleteSubmission={onDeleteSubmission}
        onSetSubmissionPublic={onSetSubmissionPublic}
        onSetFinalShortlisted={onSetFinalShortlisted}
      />

      <AdminFinalShortlistPanel
        selectedHackathon={selectedHackathon}
        submissions={submissions}
        isLoading={isLoadingSubmissions}
        shortlistingSubmissionId={shortlistingSubmissionId}
        onSetFinalShortlisted={onSetFinalShortlisted}
      />

      <AdminJudgeMarksPanel
        selectedHackathon={selectedHackathon}
        submissions={submissions}
        judgingCriteria={judgingCriteria}
        isLoading={isLoadingSubmissions}
      />

      <JudgeMarksChartPanel
        eventLabel={selectedHackathon.name}
        judgingCriteria={judgingCriteria}
        submissions={submissions}
        isLoading={isLoadingSubmissions}
      />

      <section className={`${sectionClass} scroll-mt-24`} id="analytics">
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

      <ProjectThemeMarksPanel
        hackathon={selectedHackathon}
        submissions={submissions}
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
    </div>
  );
}
