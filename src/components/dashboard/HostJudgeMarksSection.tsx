import { AdminJudgeMarksPanel } from "@/components/dashboard/AdminJudgeMarksPanel";
import type { AdminSubmissionRow } from "@/components/dashboard/AdminDashboard";
import type { JudgingCriterion } from "@/components/dashboard/judgingCriteria";
import type { PortalHackathon } from "@/lib/hackathons";

type HostJudgeMarksSectionProps = {
  selectedHackathon: PortalHackathon;
  submissions: AdminSubmissionRow[];
  judgingCriteria: JudgingCriterion[];
  isLoading: boolean;
};

/** Keeps the host mark-check destination mounted inside the host scoring workspace. */
export function HostJudgeMarksSection(props: HostJudgeMarksSectionProps) {
  return <AdminJudgeMarksPanel {...props} />;
}
