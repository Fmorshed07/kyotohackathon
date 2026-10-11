import { describe, expect, it } from "vitest";
import {
  areAllCriteriaScored,
  buildJudgeScoreFirestoreUpdate,
  buildFinalJudgeScoreFirestoreUpdate,
  mapSubmissionForJudge,
  sanitizeCriteriaScores,
} from "@/lib/judgeSubmissionScores";
import type { Submission } from "@/types/portal";

const criteria = [
  { id: "idea", title: "Idea", weight: 60, questions: [] },
  { id: "execution", title: "Execution", weight: 40, questions: [] },
];

describe("judge marks validation and ownership", () => {
  it("accepts zero marks, but requires all configured criteria", () => {
    expect(areAllCriteriaScored({ idea: 0, execution: 0 }, criteria)).toBe(true);
    expect(areAllCriteriaScored({ idea: 60 }, criteria)).toBe(false);
    expect(areAllCriteriaScored({}, [])).toBe(false);
  });

  it.each([NaN, Infinity, -Infinity, -1, 61])("rejects invalid/out-of-range idea marks: %s", (idea) => {
    expect(areAllCriteriaScored({ idea, execution: 40 }, criteria)).toBe(false);
  });

  it("does not send non-finite or missing marks to Firestore", () => {
    expect(sanitizeCriteriaScores({ zero: 0, valid: 25, invalid: NaN, infinite: Infinity, pending: null })).toEqual({ zero: 0, valid: 25 });
  });

  it("writes only the current judge's dotted fields for each round", () => {
    const marks = { idea: 50, execution: 35 };
    expect(buildJudgeScoreFirestoreUpdate("judge-1", 85, "Notes", marks)).toEqual({
      "judge_scores.judge-1": 85,
      "judge_notes_by_judge.judge-1": "Notes",
      "judge_criteria_scores_by_judge.judge-1": marks,
    });
    expect(Object.keys(buildFinalJudgeScoreFirestoreUpdate("judge-1", 85, "Notes", marks)))
      .toEqual(["final_judge_scores.judge-1", "final_judge_notes_by_judge.judge-1", "final_judge_criteria_scores_by_judge.judge-1"]);
  });

  it("keeps other judges' marks intact and never treats another judge's legacy mark as mine", () => {
    const submission: Submission = {
      id: "entry", user_id: "participant", judge_id: "legacy-judge", judge_score: 99,
      title: "Video", short_description: null, project_url: null,
      submission_pdf_url: null, demo_video_url: null, created_at: null,
      judge_notes: "Legacy notes", judge_criteria_scores: { idea: 59, execution: 40 },
      judge_scores: { "judge-1": 85, "judge-2": 72 },
      judge_criteria_scores_by_judge: { "judge-1": { idea: 50, execution: 35 } },
    };
    const own = mapSubmissionForJudge(submission, "judge-1", criteria);
    expect(own.judge_score).toBe(85);
    expect(own.judge_scores?.["judge-2"]).toBe(72);
    expect(mapSubmissionForJudge(submission, "new-judge", criteria).judge_score).toBeNull();
    expect(mapSubmissionForJudge(submission, "new-judge", criteria).judge_notes).toBe("");
  });
});
