import type { JudgingCriterion } from "@/components/dashboard/judgingCriteria";
import { parseTimestamp } from "@/lib/datetime";
import { csvFilename, escapeCsvValue } from "@/lib/submissionCsv";

export type JudgeMarkChartInput = {
  id: string;
  title: string | null;
  teamName: string | null;
  participantLabel: string;
  averageScore: number | null;
  scoredByCount: number;
  judgeMarks: Array<{
    judgeEmail: string;
    score: number | null;
    criteriaScores?: Record<string, number | null>;
  }>;
  createdAt?: string | null;
};

export type JudgeMarkChartRow = {
  id: string;
  title: string;
  teamName: string | null;
  participantLabel: string;
  averageScore: number | null;
  scoredByCount: number;
  judgeCount: number;
  criterionAverages: Record<string, number | null>;
  judgeScoresLabel: string;
  createdAt: string | null;
  position: number;
  axisLabel: string;
  chartScore: number;
};

function average(values: number[]): number | null {
  if (!values.length) return null;
  return values.reduce((total, value) => total + value, 0) / values.length;
}

function truncate(value: string, max = 22) {
  return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}

export function criterionAverage(
  marks: JudgeMarkChartInput["judgeMarks"],
  criterionId: string,
): number | null {
  return average(
    marks
      .map((mark) => mark.criteriaScores?.[criterionId])
      .filter((value): value is number => typeof value === "number"),
  );
}

export function buildJudgeMarkChartRows(
  submissions: JudgeMarkChartInput[],
  criteria: JudgingCriterion[],
): JudgeMarkChartRow[] {
  return [...submissions]
    .map((row) => {
      const criterionAverages: Record<string, number | null> = {};
      for (const criterion of criteria) {
        criterionAverages[criterion.id] = criterionAverage(row.judgeMarks, criterion.id);
      }
      return {
        id: row.id,
        title: row.title?.trim() || "Untitled Project",
        teamName: row.teamName,
        participantLabel: row.participantLabel,
        averageScore: row.averageScore,
        scoredByCount: row.scoredByCount,
        judgeCount: row.judgeMarks.length,
        criterionAverages,
        judgeScoresLabel: row.judgeMarks
          .map((mark) => `${mark.judgeEmail}: ${mark.score == null ? "" : mark.score}`)
          .join("; "),
        createdAt: row.createdAt ?? null,
      };
    })
    .sort((left, right) => {
      const scoreDelta = (right.averageScore ?? -1) - (left.averageScore ?? -1);
      if (scoreDelta !== 0) return scoreDelta;
      return left.title.localeCompare(right.title);
    })
    .map((row, index) => {
      const position = index + 1;
      return {
        ...row,
        position,
        axisLabel: `#${position} ${truncate(row.title)}`,
        chartScore: row.averageScore ?? 0,
      };
    });
}

export function judgeMarksCsvFilename(label: string, now = new Date()): string {
  return csvFilename("judge-marks", label, now);
}

export function buildJudgeMarksCsv(
  rows: JudgeMarkChartRow[],
  criteria: JudgingCriterion[],
): string {
  const headers = [
    "Position",
    "Project",
    "Team",
    "Participant",
    "Average judge score",
    "Judges scored",
    "Judges total",
    ...criteria.map((criterion) => `${criterion.title} avg`),
    "Judge scores",
    "Submitted",
  ];
  const lines = [
    headers.map((header) => escapeCsvValue(header)).join(","),
    ...rows.map((row) => {
      const submitted = parseTimestamp(row.createdAt)?.toISOString() ?? "";
      return [
        row.position,
        row.title,
        row.teamName,
        row.participantLabel,
        row.averageScore,
        row.scoredByCount,
        row.judgeCount,
        ...criteria.map((criterion) => row.criterionAverages[criterion.id]),
        row.judgeScoresLabel,
        submitted,
      ]
        .map((value) => escapeCsvValue(value))
        .join(",");
    }),
  ];
  return lines.join("\r\n");
}
