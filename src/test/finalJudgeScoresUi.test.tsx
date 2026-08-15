import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AdminFinalJudgeScoresPanel } from "@/components/dashboard/AdminFinalJudgeScoresPanel";
import type { AdminSubmissionRow } from "@/components/dashboard/AdminDashboard";

describe("finalist judge scores organizer section", () => {
  it("shows human final marks separately and excludes non-judge entries", () => {
    const finalist: AdminSubmissionRow = {
      id: "project-1",
      hackathonId: "ai-ideathon-2026",
      participantId: "owner-1",
      participantEmail: "owner@example.com",
      teamName: "Team Final",
      teamLeaderName: "Owner",
      teamLeaderEmail: "owner@example.com",
      memberCount: 1,
      members: [],
      extraMemberNames: [],
      title: "Final Project",
      shortDescription: null,
      projectUrl: null,
      submissionPdfUrl: null,
      demoVideoUrl: null,
      isPublic: true,
      isFinalShortlisted: true,
      finalShortlistedAt: "2026-08-15T00:00:00.000Z",
      judgeMarks: [{ judgeId: "judge-1", judgeEmail: "judge@example.com", score: 70, notes: null }],
      finalJudgeMarks: [
        { judgeId: "judge-1", judgeEmail: "judge@example.com", score: 94, notes: "Strong final demo", criteriaScores: { impact: 94 } },
        { judgeId: "project-agent", judgeEmail: "agent@system.local", score: 99, notes: "Agent score", criteriaScores: { impact: 99 } },
      ],
      averageScore: 70,
      scoredByCount: 1,
      finalAverageScore: 94,
      finalScoredByCount: 1,
      createdAt: null,
      updatedAt: null,
    };

    render(
      <AdminFinalJudgeScoresPanel
        selectedHackathon={{
          id: "ai-ideathon-2026",
          name: "AI Ideathon 2026",
          shortName: "AI Ideathon",
          eventDate: "15 August 2026",
          location: "Online",
          theme: "AI for impact",
          status: "active",
        }}
        submissions={[finalist]}
        judgingCriteria={[{ id: "impact", title: "Impact", weight: 100, questions: [] }]}
        judges={[{ id: "judge-1", email: "judge@example.com" }]}
        isLoading={false}
      />,
    );

    expect(screen.getByRole("heading", { name: "Finalist judge scores" })).toBeInTheDocument();
    expect(screen.getAllByText("94.0")).toHaveLength(2);
    expect(screen.getByText("Strong final demo")).toBeInTheDocument();
    expect(screen.queryByText("agent@system.local")).not.toBeInTheDocument();
    expect(screen.queryByText("Agent score")).not.toBeInTheDocument();
  });
});
