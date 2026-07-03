import { useEffect, useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { sectionClass } from "@/components/dashboard/DashboardLayout";
import {
  DEFAULT_JUDGING_CRITERIA,
  getCriteriaStats,
  slugifyCriterionId,
  type JudgingCriterion,
} from "@/components/dashboard/judgingCriteria";
import type { PortalHackathon } from "@/lib/hackathons";

type MarkingCriteriaSectionProps = {
  selectedHackathon: PortalHackathon;
  criteria: JudgingCriterion[];
  isLoading: boolean;
  isSaving: boolean;
  onSave: (criteria: JudgingCriterion[]) => Promise<void>;
};

const createEmptyCriterion = (existing: JudgingCriterion[]): JudgingCriterion => {
  const existingIds = new Set(existing.map((criterion) => criterion.id));
  const title = "New criterion";
  return {
    id: slugifyCriterionId(title, existingIds),
    title,
    weight: 10,
    questions: ["Add a guiding question for judges."],
  };
};

export function MarkingCriteriaSection({
  selectedHackathon,
  criteria,
  isLoading,
  isSaving,
  onSave,
}: MarkingCriteriaSectionProps) {
  const [draftCriteria, setDraftCriteria] = useState<JudgingCriterion[]>(criteria);
  const [localMessage, setLocalMessage] = useState<string | null>(null);

  useEffect(() => {
    setDraftCriteria(criteria);
    setLocalMessage(null);
  }, [criteria, selectedHackathon.id]);

  const totalWeight = useMemo(
    () => draftCriteria.reduce((sum, criterion) => sum + criterion.weight, 0),
    [draftCriteria]
  );
  const stats = useMemo(() => getCriteriaStats(draftCriteria), [draftCriteria]);
  const isValidTotal = totalWeight === 100;
  const hasEmptyFields = draftCriteria.some(
    (criterion) =>
      !criterion.title.trim() ||
      criterion.weight <= 0 ||
      criterion.questions.length === 0 ||
      criterion.questions.some((question) => !question.trim())
  );

  const updateCriterion = (index: number, patch: Partial<JudgingCriterion>) => {
    setDraftCriteria((current) =>
      current.map((criterion, criterionIndex) =>
        criterionIndex === index ? { ...criterion, ...patch } : criterion
      )
    );
  };

  const handleTitleChange = (index: number, title: string) => {
    setDraftCriteria((current) =>
      current.map((criterion, criterionIndex) => {
        if (criterionIndex !== index) return criterion;
        const existingIds = new Set(
          current.filter((_, itemIndex) => itemIndex !== index).map((item) => item.id)
        );
        return {
          ...criterion,
          title,
          id: slugifyCriterionId(title || "criterion", existingIds),
        };
      })
    );
  };

  const handleQuestionChange = (criterionIndex: number, questionIndex: number, value: string) => {
    setDraftCriteria((current) =>
      current.map((criterion, index) => {
        if (index !== criterionIndex) return criterion;
        const questions = [...criterion.questions];
        questions[questionIndex] = value;
        return { ...criterion, questions };
      })
    );
  };

  const handleAddQuestion = (criterionIndex: number) => {
    setDraftCriteria((current) =>
      current.map((criterion, index) =>
        index === criterionIndex
          ? { ...criterion, questions: [...criterion.questions, ""] }
          : criterion
      )
    );
  };

  const handleRemoveQuestion = (criterionIndex: number, questionIndex: number) => {
    setDraftCriteria((current) =>
      current.map((criterion, index) => {
        if (index !== criterionIndex || criterion.questions.length <= 1) return criterion;
        return {
          ...criterion,
          questions: criterion.questions.filter((_, itemIndex) => itemIndex !== questionIndex),
        };
      })
    );
  };

  const handleRemoveCriterion = (index: number) => {
    setDraftCriteria((current) => current.filter((_, criterionIndex) => criterionIndex !== index));
  };

  const handleSave = async () => {
    if (!isValidTotal || hasEmptyFields) return;

    setLocalMessage(null);
    const sanitized = draftCriteria.map((criterion) => ({
      ...criterion,
      title: criterion.title.trim(),
      questions: criterion.questions.map((question) => question.trim()).filter(Boolean),
    }));

    try {
      await onSave(sanitized);
      setLocalMessage("Marking criteria saved for this event.");
    } catch {
      setLocalMessage("Failed to save marking criteria.");
    }
  };

  return (
    <section className={`${sectionClass}`} id="marking-criteria">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="font-display text-sm uppercase tracking-[0.28em] text-foreground">
            Event marking criteria
          </h2>
          <p className="mt-1 max-w-2xl text-xs text-muted-foreground">
            Configure how judges score projects for {selectedHackathon.name}. Criteria appear on the
            public site and in the judge dashboard for this event.
          </p>
        </div>
        <Badge
          variant={isValidTotal ? "outline" : "destructive"}
          className="uppercase tracking-[0.14em]"
        >
          Total weight {totalWeight}%
        </Badge>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-primary/30 bg-gradient-to-b from-primary/10 to-transparent px-4 py-3 text-center">
          <p className="font-display text-xl font-semibold tabular-nums text-primary">
            {isLoading ? "—" : stats.criteriaCount}
          </p>
          <p className="text-[0.65rem] uppercase tracking-[0.18em] text-muted-foreground">Criteria</p>
        </div>
        <div className="rounded-xl border border-border/50 bg-muted/20 px-4 py-3 text-center">
          <p className="font-display text-xl font-semibold tabular-nums text-primary">
            {isLoading ? "—" : stats.totalPoints}
          </p>
          <p className="text-[0.65rem] uppercase tracking-[0.18em] text-muted-foreground">Points</p>
        </div>
        <div className="rounded-xl border border-border/50 bg-muted/20 px-4 py-3 text-center">
          <p className="font-display text-xl font-semibold tabular-nums text-primary">
            {isLoading ? "—" : `${stats.highestWeight}%`}
          </p>
          <p className="text-[0.65rem] uppercase tracking-[0.18em] text-muted-foreground">Top weight</p>
        </div>
        <div className="rounded-xl border border-border/50 bg-muted/20 px-4 py-3 text-center">
          <p className="font-display text-xl font-semibold tabular-nums text-primary">
            {isLoading ? "—" : `${stats.lowestWeight}%`}
          </p>
          <p className="text-[0.65rem] uppercase tracking-[0.18em] text-muted-foreground">Min weight</p>
        </div>
      </div>

      {localMessage ? (
        <p className="mt-4 rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-xs text-primary">
          {localMessage}
        </p>
      ) : null}

      {!isValidTotal ? (
        <p className="mt-4 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          Weights must add up to exactly 100% before saving.
        </p>
      ) : null}

      {isLoading ? (
        <p className="mt-6 text-sm text-muted-foreground">Loading marking criteria...</p>
      ) : (
        <div className="mt-6 space-y-4">
          {draftCriteria.map((criterion, index) => (
            <div
              key={`${criterion.id}-${index}`}
              className="rounded-xl border border-border/50 bg-muted/15 p-4 sm:p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="grid flex-1 gap-3 md:grid-cols-[minmax(0,1fr)_120px]">
                  <div>
                    <label className="text-[0.65rem] uppercase tracking-[0.18em] text-muted-foreground">
                      Criterion title
                    </label>
                    <Input
                      value={criterion.title}
                      onChange={(event) => handleTitleChange(index, event.target.value)}
                      className="mt-1 h-10"
                      placeholder="e.g. Innovation & Idea Quality"
                    />
                    <p className="mt-1 text-[0.65rem] text-muted-foreground">ID: {criterion.id}</p>
                  </div>
                  <div>
                    <label className="text-[0.65rem] uppercase tracking-[0.18em] text-muted-foreground">
                      Weight (%)
                    </label>
                    <Input
                      type="number"
                      min={1}
                      max={100}
                      value={criterion.weight}
                      onChange={(event) =>
                        updateCriterion(index, {
                          weight: Math.max(0, Math.round(Number(event.target.value) || 0)),
                        })
                      }
                      className="mt-1 h-10"
                    />
                  </div>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-8 px-2 text-destructive hover:bg-destructive/10 hover:text-destructive"
                  disabled={draftCriteria.length <= 1}
                  onClick={() => handleRemoveCriterion(index)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>

              <div className="mt-4 space-y-2">
                <p className="text-[0.65rem] uppercase tracking-[0.18em] text-muted-foreground">
                  Guiding questions
                </p>
                {criterion.questions.map((question, questionIndex) => (
                  <div key={`${criterion.id}-question-${questionIndex}`} className="flex gap-2">
                    <Textarea
                      value={question}
                      onChange={(event) =>
                        handleQuestionChange(index, questionIndex, event.target.value)
                      }
                      rows={2}
                      className="min-h-[72px] resize-y"
                      placeholder="Question judges should consider"
                    />
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="h-9 shrink-0 px-2 text-muted-foreground hover:text-destructive"
                      disabled={criterion.questions.length <= 1}
                      onClick={() => handleRemoveQuestion(index, questionIndex)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-8 px-3 text-[0.65rem] uppercase tracking-[0.18em]"
                  onClick={() => handleAddQuestion(index)}
                >
                  Add question
                </Button>
              </div>
            </div>
          ))}

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              className="h-9 gap-2 px-4 text-[0.7rem] uppercase tracking-[0.18em]"
              onClick={() => setDraftCriteria((current) => [...current, createEmptyCriterion(current)])}
            >
              <Plus className="h-4 w-4" />
              Add criterion
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-9 px-4 text-[0.7rem] uppercase tracking-[0.18em]"
              onClick={() => setDraftCriteria(DEFAULT_JUDGING_CRITERIA)}
            >
              Reset to defaults
            </Button>
            <Button
              type="button"
              className="h-9 px-4 text-[0.7rem] uppercase tracking-[0.18em]"
              disabled={isSaving || !isValidTotal || hasEmptyFields}
              onClick={() => void handleSave()}
            >
              {isSaving ? "Saving..." : "Save criteria"}
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}
