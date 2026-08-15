import {
  calculateTotalFromCriteria,
  type CriteriaScores,
  type JudgingCriterion,
  DEFAULT_JUDGING_CRITERIA,
} from "@/components/dashboard/judgingCriteria";
import type { Submission } from "@/types/portal";
import type { PortalRole } from "@/types/portal";

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

export function getFinalJudgeCriteriaScoresForJudge(
  submission: Submission,
  judgeId: string
): CriteriaScores {
  const scores = submission.final_judge_criteria_scores_by_judge?.[judgeId];
  return scores && typeof scores === "object" ? scores : null;
}

export function getFinalJudgeNotesForJudge(submission: Submission, judgeId: string): string {
  const notes = submission.final_judge_notes_by_judge?.[judgeId];
  return typeof notes === "string" ? notes : "";
}

export function getFinalJudgeTotalScoreForJudge(
  submission: Submission,
  judgeId: string,
  criteria: JudgingCriterion[] = DEFAULT_JUDGING_CRITERIA
): number | null {
  const criteriaScores = getFinalJudgeCriteriaScoresForJudge(submission, judgeId);
  if (criteriaScores && Object.keys(criteriaScores).length > 0) {
    return calculateTotalFromCriteria(criteriaScores, criteria);
  }
  const score = submission.final_judge_scores?.[judgeId];
  return typeof score === "number" ? score : null;
}

export type HumanFinalJudgeMark = {
  judgeId: string;
  judgeEmail: string;
  score: number | null;
  notes: string | null;
  criteriaScores?: Record<string, number | null>;
};

/**
 * Reads final-round marks only from judge-owned final fields.
 * Project-agent/theme scores are intentionally excluded, and every id must resolve
 * to a real judge or mentor account before it can appear in organizer reports.
 */
export function buildHumanFinalJudgeMarks(
  submission: Submission,
  criteria: JudgingCriterion[],
  judgeDirectory: Record<string, { email: string; role: PortalRole } | undefined>,
): HumanFinalJudgeMark[] {
  const judgeIds = new Set([
    ...Object.keys(submission.final_judge_scores ?? {}),
    ...Object.keys(submission.final_judge_criteria_scores_by_judge ?? {}),
    ...Object.keys(submission.final_judge_notes_by_judge ?? {}),
  ]);

  return [...judgeIds]
    .filter((judgeId) => {
      const account = judgeDirectory[judgeId];
      return account?.role === "judge" || account?.role === "mentor";
    })
    .map((judgeId) => {
      const criteriaScores = submission.final_judge_criteria_scores_by_judge?.[judgeId];
      return {
        judgeId,
        judgeEmail: judgeDirectory[judgeId]?.email ?? "Unknown judge",
        score: getFinalJudgeTotalScoreForJudge(submission, judgeId, criteria),
        notes: submission.final_judge_notes_by_judge?.[judgeId] ?? null,
        criteriaScores:
          criteriaScores && typeof criteriaScores === "object" ? criteriaScores : undefined,
      };
    })
    .sort((left, right) => left.judgeEmail.localeCompare(right.judgeEmail));
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

/** Flatten this judge's final-round marks without replacing their preliminary marks. */
export function mapSubmissionForFinalJudge(
  submission: Submission,
  judgeId: string,
  criteria: JudgingCriterion[] = DEFAULT_JUDGING_CRITERIA
): Submission {
  return {
    ...submission,
    judge_criteria_scores: getFinalJudgeCriteriaScoresForJudge(submission, judgeId),
    judge_notes: getFinalJudgeNotesForJudge(submission, judgeId),
    judge_score: getFinalJudgeTotalScoreForJudge(submission, judgeId, criteria),
  };
}

export function sanitizeCriteriaScores(
  criteriaScores: Record<string, number | null | undefined>
): Record<string, number> {
  return Object.fromEntries(
    Object.entries(criteriaScores).filter(
      (entry): entry is [string, number] => typeof entry[1] === "number"
    )
  );
}

export function areAllCriteriaScored(
  criteriaScores: Record<string, number | null | undefined>,
  criteria: JudgingCriterion[]
): boolean {
  return criteria.every((criterion) => typeof criteriaScores[criterion.id] === "number");
}

export function buildJudgeScoreFirestoreUpdate(
  judgeId: string,
  score: number | null,
  notes: string,
  criteriaScores: Record<string, number | null | undefined>
): Record<string, unknown> {
  const cleanedCriteriaScores = sanitizeCriteriaScores(criteriaScores);

  return {
    [`judge_scores.${judgeId}`]: score,
    [`judge_notes_by_judge.${judgeId}`]: notes,
    [`judge_criteria_scores_by_judge.${judgeId}`]: cleanedCriteriaScores,
  };
}

export function buildFinalJudgeScoreFirestoreUpdate(
  judgeId: string,
  score: number | null,
  notes: string,
  criteriaScores: Record<string, number | null | undefined>
): Record<string, unknown> {
  const cleanedCriteriaScores = sanitizeCriteriaScores(criteriaScores);

  return {
    [`final_judge_scores.${judgeId}`]: score,
    [`final_judge_notes_by_judge.${judgeId}`]: notes,
    [`final_judge_criteria_scores_by_judge.${judgeId}`]: cleanedCriteriaScores,
  };
}
