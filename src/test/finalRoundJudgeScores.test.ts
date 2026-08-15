import { describe, expect, it } from "vitest";
import {
  buildHumanFinalJudgeMarks,
  buildFinalJudgeScoreFirestoreUpdate,
  mapSubmissionForFinalJudge,
} from "@/lib/judgeSubmissionScores";
import type { Submission } from "@/types/portal";

const criteria = [{ id: "impact", title: "Impact", weight: 100, questions: [] }];

const submission: Submission = {
  id: "project-1",
  user_id: "owner-1",
  hackathon_id: "ai-ideathon-2026",
  title: "Project One",
  team_name: "Team One",
  short_description: "Description",
  project_url: null,
  submission_pdf_url: null,
  demo_video_url: null,
  created_at: null,
  judge_score: 73,
  judge_notes: "Preliminary notes",
  judge_scores: { "judge-1": 73 },
  judge_notes_by_judge: { "judge-1": "Preliminary notes" },
  judge_criteria_scores_by_judge: { "judge-1": { impact: 73 } },
  final_judge_scores: { "judge-1": 91 },
  final_judge_notes_by_judge: { "judge-1": "Final-round notes" },
  final_judge_criteria_scores_by_judge: { "judge-1": { impact: 91 } },
};

describe("final-round judge marks", () => {
  it("maps final marks for scoring without replacing the preliminary marks", () => {
    const finalRoundView = mapSubmissionForFinalJudge(submission, "judge-1", criteria);

    expect(finalRoundView.judge_score).toBe(91);
    expect(finalRoundView.judge_notes).toBe("Final-round notes");
    expect(finalRoundView.judge_criteria_scores).toEqual({ impact: 91 });
    expect(finalRoundView.judge_scores?.["judge-1"]).toBe(73);
    expect(finalRoundView.final_judge_scores?.["judge-1"]).toBe(91);
  });

  it("writes final marks to dedicated fields", () => {
    expect(
      buildFinalJudgeScoreFirestoreUpdate("judge-1", 91, "Final-round notes", {
        impact: 91,
      })
    ).toEqual({
      "final_judge_scores.judge-1": 91,
      "final_judge_notes_by_judge.judge-1": "Final-round notes",
      "final_judge_criteria_scores_by_judge.judge-1": { impact: 91 },
    });
  });

  it("keeps only real human judge accounts out of mixed final score data", () => {
    const mixedSubmission: Submission = {
      ...submission,
      final_judge_scores: { "judge-1": 91, "project-agent": 99 },
      final_judge_criteria_scores_by_judge: {
        "judge-1": { impact: 91 },
        "project-agent": { impact: 99 },
      },
    };

    const marks = buildHumanFinalJudgeMarks(mixedSubmission, criteria, {
      "judge-1": { email: "judge@example.com", role: "judge" },
      "project-agent": { email: "agent@system.local", role: "admin" },
    });

    expect(marks).toEqual([
      expect.objectContaining({ judgeId: "judge-1", judgeEmail: "judge@example.com", score: 91 }),
    ]);
  });
});
