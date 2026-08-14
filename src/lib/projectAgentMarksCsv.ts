import { explainProjectMark } from "@/lib/projectScreening";
import { csvFilename, escapeCsvValue } from "@/lib/submissionCsv";

export type ProjectAgentMarksCsvRow = {
  title: string;
  teamName: string | null;
  participantName: string;
  source: string;
  status: string;
  score: number;
  themeFit: number;
  conceptQuality: number;
  summary?: string | null;
  strengths?: string[] | null;
  gaps?: string[] | null;
};

export function projectAgentMarksCsvFilename(label: string, now = new Date()): string {
  return csvFilename("project-agent-marks", label, now);
}

export function buildProjectAgentMarksCsv(rows: ProjectAgentMarksCsvRow[]): string {
  const ranked = [...rows].sort(
    (left, right) => right.score - left.score || left.title.localeCompare(right.title),
  );
  const headers = [
    "Position",
    "Project",
    "Team",
    "Builder",
    "Source",
    "Theme fit",
    "Concept quality",
    "Total mark",
    "Status",
    "Why",
  ];
  const lines = [
    headers.join(","),
    ...ranked.map((row, index) =>
      [
        index + 1,
        row.title,
        row.teamName,
        row.participantName,
        row.source,
        row.themeFit,
        row.conceptQuality,
        row.score,
        row.status,
        explainProjectMark(row),
      ]
        .map((value) => escapeCsvValue(value))
        .join(","),
    ),
  ];
  return lines.join("\r\n");
}
