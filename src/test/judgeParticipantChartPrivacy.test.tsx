import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { JudgeMarksChartPanel } from "@/components/dashboard/JudgeMarksChartPanel";
import { downloadCsv } from "@/lib/submissionCsv";
import type { Submission } from "@/types/portal";
import type { AdminSubmissionRow } from "@/components/dashboard/AdminDashboard";

vi.mock("@/lib/submissionCsv", async (original) => ({
  ...await original<typeof import("@/lib/submissionCsv")>(), downloadCsv: vi.fn(),
}));
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} });
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({
    x: 0, y: 0, top: 0, left: 0, bottom: 400, right: 800, width: 800, height: 400, toJSON: () => ({}),
  });
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

function project(patch: Partial<Submission> = {}): Submission {
  return { id: "project-one", user_id: "opaque-owner", title: "Community helper", team_name: "Builder team",
    owner_name: "Sample Builder", owner_email: "private-owner@example.test", short_description: null,
    project_url: null, submission_pdf_url: null, demo_video_url: null, created_at: null, judge_score: 85, judge_notes: null,
    ...patch,
  };
}

describe("judge participant chart privacy", () => {
  it("uses names for judge labels and CSV without exposing the owner email", () => {
    const { container } = render(<JudgeMarksChartPanel eventLabel="Impact Osaka" judgingCriteria={[]} judgeSubmissions={[project()]} />);
    expect(screen.getAllByText("Sample Builder").length).toBeGreaterThan(0);
    expect(container.innerHTML).not.toContain("private-owner@example.test");
    fireEvent.click(screen.getByRole("button", { name: "Download CSV" }));
    const csv = vi.mocked(downloadCsv).mock.calls[0][1];
    expect(csv).toContain("Sample Builder");
    expect(csv).not.toContain("private-owner@example.test");
  });

  it("uses a neutral label when both name and team contain email addresses", () => {
    const { container } = render(<JudgeMarksChartPanel eventLabel="Impact Osaka" judgingCriteria={[]} judgeSubmissions={[
      project({ owner_name: "name-field@example.test", team_name: "team-field@example.test" }),
    ]} />);
    expect(screen.getAllByText("Participant").length).toBeGreaterThan(0);
    expect(container.innerHTML).not.toMatch(/name-field@example|team-field@example|private-owner@example/);
    fireEvent.click(screen.getByRole("button", { name: "Download CSV" }));
    expect(vi.mocked(downloadCsv).mock.calls[0][1]).not.toMatch(/@example/);
  });

  it("preserves the separate admin label and CSV behavior", () => {
    const adminRow = { id: "admin-row", title: "Community helper", teamName: null, participantEmail: "admin-contact@example.test",
      averageScore: 85, scoredByCount: 1, judgeMarks: [], createdAt: null,
    } as AdminSubmissionRow;
    render(<JudgeMarksChartPanel eventLabel="Impact Osaka" judgingCriteria={[]} submissions={[adminRow]} />);
    expect(screen.getAllByText("admin-contact@example.test").length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole("button", { name: "Download CSV" }));
    expect(vi.mocked(downloadCsv).mock.calls[0][1]).toContain("admin-contact@example.test");
  });
});
