import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { JudgeFinalShortlistPanel } from "@/components/dashboard/JudgeFinalShortlistPanel";
import { AdminFinalShortlistPanel } from "@/components/dashboard/AdminFinalShortlistPanel";
import type { AdminSubmissionRow } from "@/components/dashboard/AdminDashboard";
import type { Submission } from "@/types/portal";

vi.mock("@/components/dashboard/JudgeScoringWorkspace", () => ({
  JudgeScoringWorkspace: ({ submissions }: { submissions: Submission[] }) => (
    <div data-testid="scoring-workspace">
      {submissions.map((submission) => (
        <span key={submission.id}>{submission.title}</span>
      ))}
    </div>
  ),
}));

vi.mock("@/components/dashboard/JudgeMarksChartPanel", () => ({
  JudgeMarksChartPanel: () => null,
}));

vi.mock("@/components/dashboard/ProjectThemeMarksPanel", () => ({
  ProjectThemeMarksPanel: () => null,
}));

vi.mock("@/components/dashboard/JudgeTop3RankingSection", () => ({
  JudgeTop3RankingSection: () => null,
}));

const submission = (id: string, title: string, shortlisted: boolean): Submission => ({
  id,
  user_id: `owner-${id}`,
  hackathon_id: "ai-ideathon-2026",
  title,
  team_name: `Team ${id}`,
  short_description: `${title} description`,
  project_url: null,
  submission_pdf_url: null,
  demo_video_url: null,
  created_at: "2026-08-15T02:30:00.000Z",
  judge_score: null,
  judge_notes: null,
  final_shortlisted: shortlisted,
});

describe("judge final shortlist section", () => {
  it("shows only organizer-selected teams in the finalist scoring queue", () => {
    render(
      <JudgeFinalShortlistPanel
        selectedHackathon={{
          id: "ai-ideathon-2026",
          name: "AI Ideathon 2026",
          shortName: "AI Ideathon",
          eventDate: "15 August 2026",
          location: "Online",
          theme: "AI for impact",
          status: "active",
        }}
        judgingCriteria={[{ id: "impact", title: "Impact", weight: 100, questions: [] }]}
        submissions={[submission("alpha", "Finalist project", true)]}
        isLoading={false}
        onCriterionScoreChange={vi.fn()}
        onNotesChange={vi.fn()}
        onSave={vi.fn()}
        savingSubmissionId={null}
      />,
    );

    const finalSection = screen.getByRole("region", { name: "Final shortlist" });
    expect(within(finalSection).getByText("Finalist project")).toBeInTheDocument();
    expect(within(finalSection).getByText("1 finalist")).toBeInTheDocument();
  });
});

describe("organizer final shortlist controls", () => {
  it("shows an always-visible add finalist button for an Ideathon team", () => {
    const onSetFinalShortlisted = vi.fn().mockResolvedValue(undefined);
    const candidate: AdminSubmissionRow = {
      id: "alpha",
      hackathonId: "ai-ideathon-2026",
      participantId: "owner-alpha",
      participantEmail: "alpha@example.com",
      teamName: "Team Alpha",
      teamLeaderName: "Asha",
      teamLeaderEmail: "alpha@example.com",
      memberCount: 2,
      members: [],
      extraMemberNames: [],
      title: "Impact Agent",
      shortDescription: "An AI project for social impact.",
      projectUrl: null,
      submissionPdfUrl: null,
      demoVideoUrl: null,
      isPublic: false,
      isFinalShortlisted: false,
      finalShortlistedAt: null,
      judgeMarks: [],
      averageScore: null,
      scoredByCount: 0,
      createdAt: "2026-08-15T02:30:00.000Z",
      updatedAt: null,
    };

    render(
      <AdminFinalShortlistPanel
        selectedHackathon={{
          id: "ai-ideathon-2026",
          name: "AI Ideathon 2026",
          shortName: "AI Ideathon",
          eventDate: "15 August 2026",
          location: "Online",
          theme: "AI for impact",
          status: "active",
        }}
        submissions={[candidate]}
        isLoading={false}
        shortlistingSubmissionId={null}
        onSetFinalShortlisted={onSetFinalShortlisted}
      />,
    );

    const addButton = screen.getByRole("button", { name: "Add finalist" });
    expect(addButton).toBeVisible();
    fireEvent.click(addButton);
    expect(onSetFinalShortlisted).toHaveBeenCalledWith("alpha", true);
  });
});
