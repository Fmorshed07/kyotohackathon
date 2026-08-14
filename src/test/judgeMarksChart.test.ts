import { describe, expect, it } from "vitest";
import {
  buildJudgeMarkChartRows,
  buildJudgeMarksCsv,
  judgeMarksCsvFilename,
} from "@/lib/judgeMarksChart";
import { buildProjectAgentMarksCsv, projectAgentMarksCsvFilename } from "@/lib/projectAgentMarksCsv";
import type { JudgingCriterion } from "@/components/dashboard/judgingCriteria";

const criteria: JudgingCriterion[] = [
  { id: "impact", title: "Impact", weight: 50, questions: [] },
  { id: "demo", title: "Demo", weight: 50, questions: [] },
];

describe("judgeMarksChart", () => {
  it("ranks by average judge score and keeps criterion averages separate from agent fields", () => {
    const rows = buildJudgeMarkChartRows(
      [
        {
          id: "low",
          title: "Quiet tool",
          teamName: "B",
          participantLabel: "b@example.com",
          averageScore: 40,
          scoredByCount: 1,
          judgeMarks: [{ judgeEmail: "judge@example.com", score: 40, criteriaScores: { impact: 20, demo: 20 } }],
        },
        {
          id: "high",
          title: "Civic agent",
          teamName: "A",
          participantLabel: "a@example.com",
          averageScore: 90,
          scoredByCount: 2,
          judgeMarks: [
            { judgeEmail: "one@example.com", score: 88, criteriaScores: { impact: 44, demo: 44 } },
            { judgeEmail: "two@example.com", score: 92, criteriaScores: { impact: 46, demo: 46 } },
          ],
          createdAt: "2026-08-14T11:24:00.000Z",
        },
      ],
      criteria,
    );

    expect(rows.map((row) => row.id)).toEqual(["high", "low"]);
    expect(rows[0].position).toBe(1);
    expect(rows[0].averageScore).toBe(90);
    expect(rows[0].criterionAverages.impact).toBe(45);
    expect(rows[0].chartScore).toBe(90);
    expect(JSON.stringify(rows[0])).not.toMatch(/themeFit|conceptQuality/);
  });

  it("exports judge marks CSV without project-agent columns", () => {
    const rows = buildJudgeMarkChartRows(
      [
        {
          id: "high",
          title: "Civic agent",
          teamName: "A",
          participantLabel: "a@example.com",
          averageScore: 90,
          scoredByCount: 1,
          judgeMarks: [{ judgeEmail: "judge@example.com", score: 90, criteriaScores: { impact: 50, demo: 40 } }],
          createdAt: "2026-08-14T11:24:00.000Z",
        },
      ],
      criteria,
    );
    const csv = buildJudgeMarksCsv(rows, criteria);
    expect(csv).toContain("Average judge score");
    expect(csv).toContain("Impact avg,Demo avg");
    expect(csv).not.toContain("Theme fit");
    expect(csv).toContain("Civic agent");
    expect(csv).toContain("90");
    expect(judgeMarksCsvFilename("AI Ideathon", new Date("2026-08-14T12:00:00.000Z"))).toBe(
      "judge-marks-ai-ideathon-2026-08-14.csv",
    );
  });
});

describe("projectAgentMarksCsv", () => {
  it("exports agent marks without judge score columns", () => {
    const rows = [
      {
        id: "a",
        title: "Civic agent",
        participantName: "Asha",
        teamName: "A",
        source: "submission",
        status: "shortlisted",
        score: 88,
        themeFit: 90,
        conceptQuality: 80,
        summary: "Strong theme match.",
      },
    ];
    const csv = buildProjectAgentMarksCsv(rows);
    expect(csv).toContain("Theme fit,Concept quality,Total mark");
    expect(csv).not.toContain("Average judge score");
    expect(csv).toContain("Civic agent");
    expect(projectAgentMarksCsvFilename("AI Ideathon", new Date("2026-08-14T12:00:00.000Z"))).toBe(
      "project-agent-marks-ai-ideathon-2026-08-14.csv",
    );
  });
});
