import {
  DEFAULT_JUDGING_CRITERIA,
  getCriteriaStats,
  type JudgingCriterion,
  type JudgingCriterionId,
} from "@/components/dashboard/judgingCriteria";
import { getJudgeTotalScoreForJudge } from "@/lib/judgeSubmissionScores";
import type { Submission } from "@/types/portal";

export type CriterionAverage = {
  id: JudgingCriterionId;
  title: string;
  weight: number;
  average: number | null;
};

export type JudgeStatistics = {
  totalSubmissions: number;
  scoredSubmissions: number;
  pendingSubmissions: number;
  completionRate: number | null;
  averageScore: number | null;
  highestScore: number | null;
  lowestScore: number | null;
  teamsCount: number;
  notesCount: number;
  criterionAverages: CriterionAverage[];
};

export type AdminJudgingStatistics = {
  totalSubmissions: number;
  scoredSubmissions: number;
  unscoredSubmissions: number;
  completionRate: number | null;
  averageScore: number | null;
  highestProjectScore: number | null;
  lowestProjectScore: number | null;
  activeJudgeCount: number;
  registeredJudgeCount: number;
  totalJudgeMarks: number;
  teamsCount: number;
  criterionAverages: CriterionAverage[];
};

export const JUDGING_CRITERIA_STATS = getCriteriaStats(DEFAULT_JUDGING_CRITERIA);

export function countTeams(submissions: Array<Pick<Submission, "team_name">>): number {
  return new Set(submissions.map((submission) => submission.team_name?.trim() || "Unnamed team")).size;
}

function averageNumbers(values: number[]): number | null {
  if (!values.length) return null;
  return values.reduce((total, value) => total + value, 0) / values.length;
}

function getCriterionScoresFromSubmission(
  submission: Submission,
  criterionId: JudgingCriterionId,
  judgeId?: string
): number[] {
  const scores: number[] = [];

  if (submission.judge_criteria_scores_by_judge) {
    for (const criteria of Object.values(submission.judge_criteria_scores_by_judge)) {
      const score = criteria?.[criterionId];
      if (typeof score === "number") scores.push(score);
    }
  }

  if (scores.length === 0 && submission.judge_criteria_scores) {
    const legacyScore = submission.judge_criteria_scores[criterionId];
    if (typeof legacyScore === "number") scores.push(legacyScore);
  }

  if (judgeId) {
    const judgeScore = submission.judge_criteria_scores_by_judge?.[judgeId]?.[criterionId];
    if (typeof judgeScore === "number") return [judgeScore];
    const localScore = submission.judge_criteria_scores?.[criterionId];
    if (typeof localScore === "number") return [localScore];
    return [];
  }

  return scores;
}

function buildCriterionAverages(
  submissions: Submission[],
  criteria: JudgingCriterion[],
  judgeId?: string
): CriterionAverage[] {
  return criteria.map((criterion) => {
    const values = submissions.flatMap((submission) =>
      getCriterionScoresFromSubmission(submission, criterion.id, judgeId)
    );
    return {
      id: criterion.id,
      title: criterion.title,
      weight: criterion.weight,
      average: averageNumbers(values),
    };
  });
}

export function buildJudgeStatistics(
  submissions: Submission[],
  judgeId: string,
  criteria: JudgingCriterion[] = DEFAULT_JUDGING_CRITERIA
): JudgeStatistics {
  const scores = submissions
    .map((submission) => getJudgeTotalScoreForJudge(submission, judgeId, criteria))
    .filter((score): score is number => typeof score === "number");

  const notesCount = submissions.filter((submission) => {
    const notes =
      submission.judge_notes_by_judge?.[judgeId] ??
      (submission.judge_id === judgeId ? submission.judge_notes : "");
    return typeof notes === "string" && notes.trim().length > 0;
  }).length;

  const totalSubmissions = submissions.length;
  const scoredSubmissions = scores.length;

  return {
    totalSubmissions,
    scoredSubmissions,
    pendingSubmissions: totalSubmissions - scoredSubmissions,
    completionRate: totalSubmissions > 0 ? (scoredSubmissions / totalSubmissions) * 100 : null,
    averageScore: averageNumbers(scores),
    highestScore: scores.length ? Math.max(...scores) : null,
    lowestScore: scores.length ? Math.min(...scores) : null,
    teamsCount: countTeams(submissions),
    notesCount,
    criterionAverages: buildCriterionAverages(submissions, criteria, judgeId),
  };
}

export function buildAdminJudgingStatistics(
  submissions: Submission[],
  projectAverages: Array<number | null>,
  activeJudgeCount: number,
  registeredJudgeCount: number,
  totalJudgeMarks: number,
  criteria: JudgingCriterion[] = DEFAULT_JUDGING_CRITERIA
): AdminJudgingStatistics {
  const validProjectAverages = projectAverages.filter(
    (score): score is number => typeof score === "number"
  );
  const totalSubmissions = submissions.length;
  const scoredSubmissions = validProjectAverages.length;

  return {
    totalSubmissions,
    scoredSubmissions,
    unscoredSubmissions: totalSubmissions - scoredSubmissions,
    completionRate: totalSubmissions > 0 ? (scoredSubmissions / totalSubmissions) * 100 : null,
    averageScore: averageNumbers(validProjectAverages),
    highestProjectScore: validProjectAverages.length ? Math.max(...validProjectAverages) : null,
    lowestProjectScore: validProjectAverages.length ? Math.min(...validProjectAverages) : null,
    activeJudgeCount,
    registeredJudgeCount,
    totalJudgeMarks,
    teamsCount: countTeams(submissions),
    criterionAverages: buildCriterionAverages(submissions, criteria),
  };
}
