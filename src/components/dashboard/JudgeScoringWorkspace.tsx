import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { Submission } from "@/types/portal";
import {
  calculateTotalFromCriteria,
  clampCriterionScore,
  type JudgingCriterion,
  type JudgingCriterionId,
} from "@/components/dashboard/judgingCriteria";
import {
  getCriterionAccentStyle,
  getSubmissionAccentStyle,
  SCORE_BUTTON_STOPS_BY_WEIGHT,
} from "@/components/dashboard/judgeDashboardAccents";

type JudgeScoringWorkspaceProps = {
  submissions: Submission[];
  judgingCriteria: JudgingCriterion[];
  onCriterionScoreChange: (
    id: string,
    criterionId: JudgingCriterionId,
    value: number | null
  ) => void;
  onNotesChange: (id: string, value: string) => void;
  onSave: (submission: Submission) => Promise<void>;
};

function getSubmissionTotal(submission: Submission) {
  if (submission.judge_criteria_scores && typeof submission.judge_criteria_scores === "object") {
    return calculateTotalFromCriteria(submission.judge_criteria_scores);
  }
  return submission.judge_score ?? 0;
}

function isCriterionScored(
  submission: Submission,
  criterionId: JudgingCriterionId
): boolean {
  const score = submission.judge_criteria_scores?.[criterionId];
  return score != null && score >= 0;
}

export function JudgeScoringWorkspace({
  submissions,
  judgingCriteria,
  onCriterionScoreChange,
  onNotesChange,
  onSave,
}: JudgeScoringWorkspaceProps) {
  const [selectedSubmissionId, setSelectedSubmissionId] = useState<string | null>(null);
  const [criterionStep, setCriterionStep] = useState(0);

  const reviewStepIndex = judgingCriteria.length;
  const totalSteps = reviewStepIndex + 1;
  const isReviewStep = criterionStep >= reviewStepIndex;

  useEffect(() => {
    if (submissions.length === 0) {
      setSelectedSubmissionId(null);
      return;
    }
    if (!selectedSubmissionId || !submissions.some((s) => s.id === selectedSubmissionId)) {
      setSelectedSubmissionId(submissions[0].id);
    }
  }, [submissions, selectedSubmissionId]);

  useEffect(() => {
    setCriterionStep(0);
  }, [selectedSubmissionId]);

  const activeSubmission =
    submissions.find((submission) => submission.id === selectedSubmissionId) ?? null;
  const activeCriterion = judgingCriteria[criterionStep] ?? null;

  if (!activeSubmission) {
    return null;
  }

  const ideaAccent = getSubmissionAccentStyle(activeSubmission);
  const teamName = activeSubmission.team_name?.trim() || "Unnamed team";
  const totalScore = getSubmissionTotal(activeSubmission);

  const goToStep = (step: number) => {
    setCriterionStep(Math.max(0, Math.min(step, reviewStepIndex)));
  };

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <p className="dash-eyebrow">Ideas to score</p>
          <p className="text-xs text-muted-foreground">
            {submissions.length} {submissions.length === 1 ? "project" : "projects"}
          </p>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:thin]">
          {submissions.map((submission, index) => {
            const isActive = submission.id === selectedSubmissionId;
            const accent = getSubmissionAccentStyle(submission);
            const scoredCount = judgingCriteria.filter((criterion) =>
              isCriterionScored(submission, criterion.id)
            ).length;
            const isComplete = scoredCount === judgingCriteria.length;

            return (
              <button
                key={submission.id}
                type="button"
                onClick={() => setSelectedSubmissionId(submission.id)}
                className={cn(
                  "min-w-[200px] max-w-[240px] shrink-0 rounded-xl border px-3 py-2.5 text-left transition",
                  isActive ? accent.active : accent.inactive
                )}
              >
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  Idea {index + 1}
                </p>
                <p className={cn("mt-0.5 truncate text-sm font-semibold", accent.teamName)}>
                  {submission.title || "Untitled Project"}
                </p>
                <p className="mt-0.5 truncate text-xs text-muted-foreground">
                  {submission.team_name?.trim() || "Unnamed team"}
                </p>
                <p className="mt-1.5 text-[10px] font-medium uppercase tracking-[0.1em] text-muted-foreground">
                  {isComplete ? "Ready to save" : `${scoredCount}/${judgingCriteria.length} criteria`}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      <article className={cn("rounded-2xl border p-4 sm:p-6", ideaAccent.panel)}>
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-white/10 pb-4">
          <div className="min-w-0 space-y-1">
            <span
              className={cn(
                "inline-flex rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em]",
                ideaAccent.pill
              )}
            >
              {teamName}
            </span>
            <h3 className={cn("text-lg font-semibold sm:text-xl", ideaAccent.teamName)}>
              {activeSubmission.title || "Untitled Project"}
            </h3>
            <p className="line-clamp-2 text-sm text-muted-foreground">
              {activeSubmission.short_description || "No description provided."}
            </p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            {activeSubmission.project_url ? (
              <a
                href={activeSubmission.project_url}
                target="_blank"
                rel="noreferrer"
                className="rounded-md border border-border/60 px-2.5 py-1 text-primary hover:bg-primary/10"
              >
                Project
              </a>
            ) : null}
            {activeSubmission.submission_pdf_url ? (
              <a
                href={activeSubmission.submission_pdf_url}
                target="_blank"
                rel="noreferrer"
                className="rounded-md border border-border/60 px-2.5 py-1 text-primary hover:bg-primary/10"
              >
                PDF
              </a>
            ) : null}
            {activeSubmission.demo_video_url ? (
              <a
                href={activeSubmission.demo_video_url}
                target="_blank"
                rel="noreferrer"
                className="rounded-md border border-border/60 px-2.5 py-1 text-primary hover:bg-primary/10"
              >
                Demo
              </a>
            ) : null}
          </div>
        </div>

        <div className="mt-5 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Scoring steps
            </p>
            <p className="text-xs text-muted-foreground">
              Step {criterionStep + 1} of {totalSteps}
            </p>
          </div>
          <div className="flex gap-1.5 overflow-x-auto pb-1 [scrollbar-width:thin]">
            {judgingCriteria.map((criterion, index) => {
              const scored = isCriterionScored(activeSubmission, criterion.id);
              const isActive = criterionStep === index;
              return (
                <button
                  key={criterion.id}
                  type="button"
                  onClick={() => goToStep(index)}
                  className={cn(
                    "shrink-0 rounded-lg border px-3 py-2 text-left text-xs transition",
                    isActive
                      ? "border-primary/50 bg-primary/15 text-primary"
                      : scored
                        ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-200"
                        : "border-border/50 bg-muted/20 text-muted-foreground hover:border-primary/30"
                  )}
                >
                  <span className="block font-semibold">{index + 1}</span>
                  <span className="mt-0.5 block max-w-[120px] truncate">{criterion.title}</span>
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => goToStep(reviewStepIndex)}
              className={cn(
                "shrink-0 rounded-lg border px-3 py-2 text-left text-xs transition",
                isReviewStep
                  ? "border-primary/50 bg-primary/15 text-primary"
                  : "border-border/50 bg-muted/20 text-muted-foreground hover:border-primary/30"
              )}
            >
              <span className="block font-semibold">✓</span>
              <span className="mt-0.5 block">Review</span>
            </button>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-muted/40">
            <div
              className="h-full rounded-full bg-gradient-to-r from-primary to-secondary transition-all duration-300"
              style={{ width: `${((criterionStep + 1) / totalSteps) * 100}%` }}
            />
          </div>
        </div>

        {!isReviewStep && activeCriterion ? (
          <CriterionStepPanel
            submission={activeSubmission}
            criterion={activeCriterion}
            onCriterionScoreChange={onCriterionScoreChange}
          />
        ) : (
          <div className="mt-6 space-y-5">
            <div className="grid gap-3 sm:grid-cols-2">
              {judgingCriteria.map((criterion) => {
                const accent = getCriterionAccentStyle(criterion.id);
                const score = activeSubmission.judge_criteria_scores?.[criterion.id];
                return (
                  <div
                    key={criterion.id}
                    className={cn("rounded-xl border px-3 py-2.5", accent.card)}
                  >
                    <p className="text-xs font-medium text-muted-foreground">{criterion.title}</p>
                    <p className="mt-1 font-mono text-lg font-bold tabular-nums text-foreground">
                      {score ?? "—"}/{criterion.weight}
                    </p>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-between rounded-xl border border-primary/35 bg-gradient-to-r from-primary/15 to-secondary/10 px-4 py-3">
              <p className="font-display text-sm font-semibold text-primary/90">Total score</p>
              <p className="font-mono text-2xl font-bold tabular-nums text-primary">
                {totalScore}/100
              </p>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Judge notes
              </p>
              <Textarea
                rows={4}
                value={activeSubmission.judge_notes ?? ""}
                onChange={(e) => onNotesChange(activeSubmission.id, e.target.value)}
                className="resize-y text-base"
                placeholder="Add feedback for this team..."
              />
            </div>

            <Button
              size="lg"
              className="h-11 w-full text-sm font-semibold sm:w-auto"
              onClick={() => onSave(activeSubmission)}
            >
              <Save className="h-4 w-4" />
              Save scores for this idea
            </Button>
          </div>
        )}

        {!isReviewStep ? (
          <div className="mt-6 flex items-center justify-between gap-3 border-t border-white/10 pt-4">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-10 gap-1"
              disabled={criterionStep === 0}
              onClick={() => goToStep(criterionStep - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <Button
              type="button"
              size="sm"
              className="h-10 gap-1"
              onClick={() =>
                criterionStep < reviewStepIndex
                  ? goToStep(criterionStep + 1)
                  : goToStep(reviewStepIndex)
              }
            >
              {criterionStep < reviewStepIndex - 1
                ? "Next criterion"
                : criterionStep === reviewStepIndex - 1
                  ? "Review & save"
                  : "Review"}
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        ) : null}
      </article>
    </div>
  );
}

type CriterionStepPanelProps = {
  submission: Submission;
  criterion: JudgingCriterion;
  onCriterionScoreChange: (
    id: string,
    criterionId: JudgingCriterionId,
    value: number | null
  ) => void;
};

function CriterionStepPanel({
  submission,
  criterion,
  onCriterionScoreChange,
}: CriterionStepPanelProps) {
  const scoreStops =
    SCORE_BUTTON_STOPS_BY_WEIGHT[criterion.weight] ?? [0, criterion.weight];
  const activeScore = submission.judge_criteria_scores?.[criterion.id] ?? null;
  const criterionAccent = getCriterionAccentStyle(criterion.id);

  return (
    <div className={cn("mt-6 rounded-xl border p-4 sm:p-5", criterionAccent.card)}>
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
            Current criterion
          </p>
          <h4 className="mt-1 text-base font-semibold text-foreground sm:text-lg">
            {criterion.title}
          </h4>
        </div>
        <span
          className={cn(
            "rounded-full border px-2.5 py-0.5 text-sm font-medium",
            criterionAccent.pill
          )}
        >
          {activeScore ?? 0}/{criterion.weight} pts
        </span>
      </div>

      <ul className="mb-4 space-y-2.5">
        {criterion.questions.map((question) => (
          <li
            key={question}
            className="flex gap-2.5 text-sm leading-relaxed text-muted-foreground"
          >
            <span
              className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/70"
              aria-hidden
            />
            <span>{question}</span>
          </li>
        ))}
      </ul>

      <div className="grid grid-cols-3 gap-2 sm:flex sm:flex-wrap sm:gap-1.5">
        {scoreStops.map((value) => {
          const isActive = activeScore === value;
          return (
            <button
              key={`${criterion.id}-${value}`}
              type="button"
              className={cn(
                "min-h-11 rounded-md border text-sm font-semibold transition active:scale-[0.97] sm:h-10 sm:min-w-12",
                isActive ? criterionAccent.activeButton : criterionAccent.inactiveButton
              )}
              onClick={() => onCriterionScoreChange(submission.id, criterion.id, value)}
            >
              {value}
            </button>
          );
        })}
      </div>

      <div className="mt-3 flex justify-stretch sm:justify-end">
        <Input
          type="number"
          min={0}
          max={criterion.weight}
          inputMode="numeric"
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
          className={cn("h-10 w-full text-base sm:w-28 sm:text-right sm:text-sm", criterionAccent.input)}
          placeholder="Custom"
        />
      </div>
    </div>
  );
}
