import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, expect, it, vi } from "vitest";
import { JudgeDashboard } from "@/components/dashboard/JudgeDashboard";
import { IMPACT_OSAKA, IMPACT_OSAKA_DEFAULT_CRITERIA } from "@/lib/impactOsaka";
import type { Submission } from "@/types/portal";

vi.mock("@/components/dashboard/JudgeMarksChartPanel", () => ({ JudgeMarksChartPanel: () => null }));
vi.mock("@/components/dashboard/ProjectThemeMarksPanel", () => ({ ProjectThemeMarksPanel: () => null }));
vi.mock("@/components/dashboard/JudgeScoringWorkspace", () => ({
  JudgeScoringWorkspace: ({ submissions }: { submissions: Submission[] }) => <div data-testid="scoring-projects">
    {submissions.map((submission) => <p key={submission.id}>{submission.title}</p>)}
  </div>,
}));
afterEach(cleanup);

it("shows all Osaka video entries without a redundant track filter, including older and unassigned entries", () => {
  const project = (id: string, title: string, track_id?: string): Submission => ({
    id, title, track_id, hackathon_id: IMPACT_OSAKA.id, user_id: id, team_name: id,
    short_description: "", project_url: null, submission_pdf_url: null, demo_video_url: null,
    created_at: null, judge_score: null, judge_notes: null,
  });
  render(<MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
    <JudgeDashboard selectedHackathon={IMPACT_OSAKA} judgingCriteria={IMPACT_OSAKA_DEFAULT_CRITERIA}
      submissions={[project("video", "AI video entry", "ai-video"), project("older", "Older entry", "working-agent"), project("legacy", "Unassigned entry")]}
      isLoadingSubmissions={false} judgeMessage={null} summary={{ total: 3, scored: 0, averageScore: null }}
      finalSummary={{ total: 0, scored: 0, averageScore: null }} statistics={null}
      onCriterionScoreChange={vi.fn()} onNotesChange={vi.fn()} onSave={vi.fn()}
    />
  </MemoryRouter>);
  const list = () => within(screen.getByTestId("scoring-projects"));
  expect(screen.queryByLabelText("Submission track")).not.toBeInTheDocument();
  expect(list().getAllByRole("paragraph")).toHaveLength(3);
  expect(list().getByText("AI video entry")).toBeInTheDocument();
  expect(list().getByText("Older entry")).toBeInTheDocument();
  expect(list().getByText("Unassigned entry")).toBeInTheDocument();
  fireEvent.change(screen.getByPlaceholderText("Search projects, teams, or members..."), { target: { value: "AI video" } });
  expect(list().getByText("AI video entry")).toBeInTheDocument();
  expect(list().queryByText("Older entry")).not.toBeInTheDocument();
  fireEvent.change(screen.getByPlaceholderText("Search projects, teams, or members..."), { target: { value: "" } });
  expect(list().getAllByRole("paragraph")).toHaveLength(3);
});
