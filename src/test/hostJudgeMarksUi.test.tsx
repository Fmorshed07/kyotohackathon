import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { HostJudgeMarksSection } from "@/components/dashboard/HostJudgeMarksSection";
import type { AdminSubmissionRow } from "@/components/dashboard/AdminDashboard";

describe("host judge mark check", () => {
  it("shows every saved human judge mark in the host workspace", () => {
    const submission: AdminSubmissionRow = {
      id: "project-1",
      hackathonId: "ai-ideathon-2026",
      participantId: "owner-1",
      participantEmail: "owner@example.com",
      teamName: "Team One",
      teamLeaderName: "Owner",
      teamLeaderEmail: "owner@example.com",
      memberCount: 1,
      members: [],
      extraMemberNames: [],
      title: "Project One",
      shortDescription: null,
      projectUrl: null,
      submissionPdfUrl: null,
      demoVideoUrl: null,
      isPublic: true,
      isFinalShortlisted: false,
      finalShortlistedAt: null,
      judgeMarks: [
        { judgeId: "judge-1", judgeEmail: "one@example.com", score: 88, notes: "Good impact" },
        { judgeId: "judge-2", judgeEmail: "two@example.com", score: 91, notes: "Strong demo" },
      ],
      finalJudgeMarks: [],
      averageScore: 89.5,
      scoredByCount: 2,
      finalAverageScore: null,
      finalScoredByCount: 0,
      createdAt: null,
      updatedAt: null,
    };

    render(
      <HostJudgeMarksSection
        selectedHackathon={{
          id: "ai-ideathon-2026",
          name: "AI Ideathon 2026",
          shortName: "AI Ideathon",
          eventDate: "August 2026",
          location: "Online",
          theme: "AI for impact",
          status: "active",
        }}
        submissions={[submission]}
        judgingCriteria={[]}
        isLoading={false}
      />,
    );

    expect(screen.getByRole("heading", { name: "Judge marks" })).toBeInTheDocument();
    expect(screen.getByText("one@example.com")).toBeInTheDocument();
    expect(screen.getByText("two@example.com")).toBeInTheDocument();
    expect(screen.getByText("89.5")).toBeInTheDocument();
  });
});
