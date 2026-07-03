import {
  calculateTotalFromCriteria,
  type CriteriaScores,
  type JudgingCriterion,
  DEFAULT_JUDGING_CRITERIA,
} from "@/components/dashboard/judgingCriteria";
import type { Submission } from "@/types/portal";

/** Legacy single-judge fields only apply when judge_id matches this judge. */
function legacyBelongsToJudge(submission: Submission, judgeId: string): boolean {
  return submission.judge_id === judgeId;
}

export function getJudgeCriteriaScoresForJudge(
  submission: Submission,
  judgeId: string
): CriteriaScores {
  const fromMap = submission.judge_criteria_scores_by_judge?.[judgeId];
  if (fromMap && typeof fromMap === "object") {
    return fromMap;
  }
  if (legacyBelongsToJudge(submission, judgeId) && submission.judge_criteria_scores) {
    return submission.judge_criteria_scores;
  }
  return null;
}

export function getJudgeNotesForJudge(submission: Submission, judgeId: string): string {
  const fromMap = submission.judge_notes_by_judge?.[judgeId];
  if (typeof fromMap === "string") {
    return fromMap;
  }
  if (legacyBelongsToJudge(submission, judgeId) && typeof submission.judge_notes === "string") {
    return submission.judge_notes;
  }
  return "";
}

export function getJudgeTotalScoreForJudge(
  submission: Submission,
  judgeId: string,
  criteria: JudgingCriterion[] = DEFAULT_JUDGING_CRITERIA
): number | null {
  const criteriaScores = getJudgeCriteriaScoresForJudge(submission, judgeId);
  if (criteriaScores && Object.keys(criteriaScores).length > 0) {
    return calculateTotalFromCriteria(criteriaScores, criteria);
  }
  const fromMap = submission.judge_scores?.[judgeId];
  if (typeof fromMap === "number") {
    return fromMap;
  }
  if (legacyBelongsToJudge(submission, judgeId) && typeof submission.judge_score === "number") {
    return submission.judge_score;
  }
  return null;
}

/** Flatten this judge's scores/notes onto the submission for the judge UI. */
export function mapSubmissionForJudge(
  submission: Submission,
  judgeId: string,
  criteria: JudgingCriterion[] = DEFAULT_JUDGING_CRITERIA
): Submission {
  const criteriaScores = getJudgeCriteriaScoresForJudge(submission, judgeId);
  const notes = getJudgeNotesForJudge(submission, judgeId);
  const totalScore = getJudgeTotalScoreForJudge(submission, judgeId, criteria);

  return {
    ...submission,
    judge_criteria_scores: criteriaScores,
    judge_notes: notes,
    judge_score: totalScore,
  };
}

export function sanitizeCriteriaScores(
  criteriaScores: Record<string, number | null>
): Record<string, number> {
  return Object.fromEntries(
    Object.entries(criteriaScores).filter(
      (entry): entry is [string, number] => typeof entry[1] === "number"
    )
  );
}

export function buildJudgeScoreFirestoreUpdate(
  judgeId: string,
  score: number | null,
  notes: string,
  criteriaScores: Record<string, number | null>
): Record<string, unknown> {
  const cleanedCriteriaScores = sanitizeCriteriaScores(criteriaScores);

  return {
    [`judge_scores.${judgeId}`]: score,
    [`judge_notes_by_judge.${judgeId}`]: notes,
    [`judge_criteria_scores_by_judge.${judgeId}`]: cleanedCriteriaScores,
  };
}
