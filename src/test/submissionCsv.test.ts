import { describe, expect, it } from "vitest";
import {
  buildSubmissionsCsv,
  escapeCsvValue,
  submissionsCsvFilename,
  type SubmissionCsvInput,
} from "@/lib/submissionCsv";

const sample = (overrides: Partial<SubmissionCsvInput> = {}): SubmissionCsvInput => ({
  eventName: "AI Ideathon 2026",
  participantEmail: "fenil@example.com",
  teamName: "Fenil Modi",
  teamLeaderName: "Fenil Modi",
  teamLeaderEmail: "fenil@example.com",
  memberCount: 1,
  members: [{ name: "Fenil Modi", email: "fenil@example.com" }],
  extraMemberNames: [],
  title: "AIAND/Router",
  shortDescription: "Routes prompts, tools, and models.",
  projectUrl: "https://example.com/project",
  submissionPdfUrl: "https://example.com/deck.pdf",
  demoVideoUrl: "https://example.com/demo",
  isPublic: false,
  averageScore: 93,
  scoredByCount: 1,
  judgeMarks: [{ judgeEmail: "judge@example.com", score: 93 }],
  createdAt: "2026-08-14T05:35:00.000Z",
  updatedAt: "2026-08-14T06:00:00.000Z",
  ...overrides,
});

describe("submissionCsv", () => {
  it("quotes commas, quotes, and newlines", () => {
    expect(escapeCsvValue("hello")).toBe("hello");
    expect(escapeCsvValue("hello, world")).toBe('"hello, world"');
    expect(escapeCsvValue('say "hi"')).toBe('"say ""hi"""');
    expect(escapeCsvValue("line\nbreak")).toBe('"line\nbreak"');
    expect(escapeCsvValue(null)).toBe("");
  });

  it("builds a spreadsheet-safe filename from the event label", () => {
    expect(submissionsCsvFilename("AI Ideathon 2026", new Date("2026-08-14T12:00:00.000Z"))).toBe(
      "submissions-ai-ideathon-2026-2026-08-14.csv",
    );
    expect(submissionsCsvFilename("All events", new Date("2026-08-14T12:00:00.000Z"))).toBe(
      "submissions-all-events-2026-08-14.csv",
    );
  });

  it("exports table fields plus emails and links", () => {
    const csv = buildSubmissionsCsv([sample()]);
    const [header, row] = csv.split("\r\n");

    expect(header).toContain("Event,Team,Team leader");
    expect(header).toContain("Average score,Judges scored,Judges total,Judge scores");
    expect(row).toContain("AI Ideathon 2026");
    expect(row).toContain("Fenil Modi");
    expect(row).toContain("AIAND/Router");
    expect(row).toContain("Private");
    expect(row).toContain("2026-08-14T05:35:00.000Z");
    expect(row).toContain("https://example.com/project");
    expect(row).toContain("93");
    expect(row).toContain("judge@example.com: 93");
  });

  it("quotes descriptions that contain commas", () => {
    const csv = buildSubmissionsCsv([
      sample({ shortDescription: "Routes prompts, tools, and models." }),
    ]);
    expect(csv).toContain('"Routes prompts, tools, and models."');
  });
});
