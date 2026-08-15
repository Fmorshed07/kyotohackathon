import { Star } from "lucide-react";
import { sectionClass } from "@/components/dashboard/DashboardLayout";
import { JudgeScoringWorkspace } from "@/components/dashboard/JudgeScoringWorkspace";
import type {
  JudgingCriterion,
  JudgingCriterionId,
} from "@/components/dashboard/judgingCriteria";
import type { PortalHackathon } from "@/lib/hackathons";
import type { Submission } from "@/types/portal";

type JudgeFinalShortlistPanelProps = {
  selectedHackathon: PortalHackathon;
  submissions: Submission[];
  judgingCriteria: JudgingCriterion[];
  isLoading: boolean;
  onCriterionScoreChange: (
    submissionId: string,
    criterionId: JudgingCriterionId,
    value: number | null
  ) => void;
  onNotesChange: (submissionId: string, value: string) => void;
  onSave: (submissionId: string) => Promise<void>;
  savingSubmissionId: string | null;
};

export function JudgeFinalShortlistPanel({
  selectedHackathon,
  submissions,
  judgingCriteria,
  isLoading,
  onCriterionScoreChange,
  onNotesChange,
  onSave,
  savingSubmissionId,
}: JudgeFinalShortlistPanelProps) {
  return (
    <section
      className={`${sectionClass} overflow-hidden border-amber-400/20 bg-gradient-to-b from-amber-500/[0.07] via-card/95 to-card/95 p-0`}
      aria-labelledby="final-shortlist-heading"
    >
      <div className="border-b border-white/10 px-4 py-5 sm:px-6 sm:py-6 md:px-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="dash-icon-chip dash-icon-chip--sunset shrink-0" aria-hidden>
              <Star className="h-4 w-4" />
            </span>
            <div>
              <p className="dash-eyebrow">Final round</p>
              <h2 id="final-shortlist-heading" className="dash-title">
                Final shortlist
              </h2>
              <p className="dash-subtitle">
                Final-round marks are stored separately and do not change the overall score.
              </p>
            </div>
          </div>
          <span className="inline-flex w-fit rounded-full border border-amber-400/30 bg-amber-500/10 px-3 py-1.5 text-xs font-semibold text-amber-200">
            {submissions.length} finalist{submissions.length === 1 ? "" : "s"}
          </span>
        </div>
      </div>
      <div className="p-4 sm:p-5 md:p-8">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading final shortlist...</p>
        ) : submissions.length === 0 ? (
          <div className="dash-empty">
            The organizers have not selected finalists for {selectedHackathon.name} yet.
          </div>
        ) : (
          <JudgeScoringWorkspace
            submissions={submissions}
            judgingCriteria={judgingCriteria}
            onCriterionScoreChange={onCriterionScoreChange}
            onNotesChange={onNotesChange}
            onSave={onSave}
            savingSubmissionId={savingSubmissionId}
            round="final"
          />
        )}
      </div>
    </section>
  );
}
