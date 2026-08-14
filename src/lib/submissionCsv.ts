import { parseTimestamp } from "@/lib/datetime";

export type SubmissionCsvInput = {
  eventName: string;
  participantEmail: string;
  teamName: string | null;
  teamLeaderName: string | null;
  teamLeaderEmail: string | null;
  memberCount: number;
  members: Array<{ name: string; email: string }>;
  extraMemberNames: string[];
  title: string | null;
  shortDescription: string | null;
  projectUrl: string | null;
  submissionPdfUrl: string | null;
  demoVideoUrl: string | null;
  isPublic: boolean;
  averageScore: number | null;
  scoredByCount: number;
  judgeMarks: Array<{ judgeEmail: string; score: number | null }>;
  createdAt: string | null;
  updatedAt: string | null;
};

export const SUBMISSION_CSV_HEADERS = [
  "Event",
  "Team",
  "Team leader",
  "Team leader email",
  "Members",
  "Member emails",
  "Member count",
  "Participant email",
  "Project",
  "Description",
  "Visibility",
  "Submitted",
  "Updated",
  "Project URL",
  "PDF URL",
  "Demo video URL",
  "Average score",
  "Judges scored",
  "Judges total",
  "Judge scores",
] as const;

export function escapeCsvValue(value: string | number | null | undefined): string {
  if (value == null) return "";
  const str = String(value);
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function csvFilename(prefix: string, label: string, now = new Date()): string {
  const safe = label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  const date = now.toISOString().slice(0, 10);
  return `${prefix}-${safe || "export"}-${date}.csv`;
}

export function submissionsCsvFilename(label: string, now = new Date()): string {
  return csvFilename("submissions", label, now);
}

function isoTimestamp(value: string | null): string {
  const date = parseTimestamp(value);
  return date ? date.toISOString() : "";
}

function memberNames(row: SubmissionCsvInput): string {
  const names = [
    ...row.members.map((member) => member.name.trim()).filter(Boolean),
    ...row.extraMemberNames.map((name) => name.trim()).filter(Boolean),
  ];
  return names.join("; ");
}

function memberEmails(row: SubmissionCsvInput): string {
  return row.members
    .map((member) => member.email.trim())
    .filter(Boolean)
    .join("; ");
}

function judgeScores(row: SubmissionCsvInput): string {
  return row.judgeMarks
    .map((mark) => `${mark.judgeEmail}: ${mark.score == null ? "" : mark.score}`)
    .join("; ");
}

export function buildSubmissionsCsv(rows: SubmissionCsvInput[]): string {
  const lines = [
    SUBMISSION_CSV_HEADERS.join(","),
    ...rows.map((row) =>
      [
        row.eventName,
        row.teamName?.trim() || "Unnamed team",
        row.teamLeaderName,
        row.teamLeaderEmail,
        memberNames(row),
        memberEmails(row),
        row.memberCount,
        row.participantEmail,
        row.title?.trim() || "Untitled Project",
        row.shortDescription,
        row.isPublic ? "Public" : "Private",
        isoTimestamp(row.createdAt),
        isoTimestamp(row.updatedAt),
        row.projectUrl,
        row.submissionPdfUrl,
        row.demoVideoUrl,
        row.averageScore,
        row.scoredByCount,
        row.judgeMarks.length,
        judgeScores(row),
      ]
        .map((value) => escapeCsvValue(value))
        .join(","),
    ),
  ];
  return lines.join("\r\n");
}

export function downloadCsv(filename: string, csv: string) {
  const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
