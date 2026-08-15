import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { JudgeDashboard } from "@/components/dashboard/JudgeDashboard";
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
      <JudgeDashboard
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
        submissions={[
          submission("alpha", "Finalist project", true),
          submission("beta", "Preliminary project", false),
        ]}
        isLoadingSubmissions={false}
        judgeMessage={null}
        summary={{ total: 2, scored: 0, averageScore: null }}
        statistics={null}
        onCriterionScoreChange={vi.fn()}
        onNotesChange={vi.fn()}
        onSave={vi.fn()}
        savingSubmissionId={null}
        top3Ranks={{ first: null, second: null, third: null }}
        top3SavedAt={null}
        isSavingTop3={false}
        onTop3RankChange={vi.fn()}
        onSaveTop3Ranking={vi.fn()}
      />,
    );

    const finalSection = screen.getByRole("region", { name: "Final shortlist" });
    expect(within(finalSection).getByText("Finalist project")).toBeInTheDocument();
    expect(within(finalSection).queryByText("Preliminary project")).not.toBeInTheDocument();
    expect(within(finalSection).getByText("1 finalist")).toBeInTheDocument();
  });
});
