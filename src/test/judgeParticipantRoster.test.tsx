import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { JudgeParticipantRoster } from "@/components/dashboard/JudgeParticipantRoster";
import { JudgeDashboard } from "@/components/dashboard/JudgeDashboard";
import type { EventParticipant } from "@/lib/eventParticipants";
import { IMPACT_OSAKA } from "@/lib/impactOsaka";

const participants: EventParticipant[] = Array.from({ length: 80 }, (_, index) => ({
  id: `registration-${index + 1}`, displayName: `Builder ${String(index + 1).padStart(2, "0")}`,
  attendanceMode: index % 2 === 0 ? "online" : "onsite",
}));
afterEach(cleanup);

describe("judge registered participant roster", () => {
  it("paginates all 80 approved names and filters by name and attendance", () => {
    render(<JudgeParticipantRoster eventName="Impact Osaka" participants={participants} />);
    expect(screen.getByText("80 approved registrations")).toBeInTheDocument();
    const list = () => within(screen.getByRole("list", { name: "Registered participant list" }));
    expect(list().getAllByRole("listitem")).toHaveLength(20);
    expect(list().getByText("Builder 01")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Next participants" }));
    expect(list().getByText("Builder 21")).toBeInTheDocument();
    fireEvent.change(screen.getByRole("textbox", { name: "Search registered participants" }), { target: { value: "Builder 80" } });
    expect(list().getAllByRole("listitem")).toHaveLength(1);
    expect(list().getByText("Builder 80")).toBeInTheDocument();
    fireEvent.change(screen.getByRole("combobox", { name: "Attendance" }), { target: { value: "online" } });
    expect(screen.getByText("No registered participants match these filters.")).toBeInTheDocument();
    fireEvent.change(screen.getByRole("textbox", { name: "Search registered participants" }), { target: { value: "" } });
    expect(screen.getByText("Showing 1–20 of 40 registered participants")).toBeInTheDocument();
    expect(list().queryByText("Builder 02")).not.toBeInTheDocument();
  });

  it("shows loading, retryable errors and empty registrations without implying teams exist", () => {
    const retry = vi.fn();
    const view = render(<JudgeParticipantRoster eventName="Impact Osaka" participants={[]} isLoading />);
    expect(screen.getByRole("status")).toHaveTextContent("Loading registered participants");
    view.rerender(<JudgeParticipantRoster eventName="Impact Osaka" participants={[]} error="Could not load registered participants." onRetry={retry} />);
    expect(screen.getByRole("alert")).toHaveTextContent("Could not load registered participants.");
    fireEvent.click(screen.getByRole("button", { name: "Retry participant roster" }));
    expect(retry).toHaveBeenCalledOnce();
    view.rerender(<JudgeParticipantRoster eventName="Impact Osaka" participants={[]} />);
    expect(screen.getByText("No approved registrations are available for this event yet.")).toBeInTheDocument();
  });

  it("renders the registration section before Teams even when no projects have been submitted", () => {
    render(<MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <JudgeDashboard selectedHackathon={IMPACT_OSAKA} judgingCriteria={[]} submissions={[]} participants={participants}
        isLoadingSubmissions={false} judgeMessage={null} summary={{ total: 0, scored: 0, averageScore: null }}
        finalSummary={{ total: 0, scored: 0, averageScore: null }} statistics={null}
        onCriterionScoreChange={vi.fn()} onNotesChange={vi.fn()} onSave={vi.fn().mockResolvedValue(undefined)} />
    </MemoryRouter>);
    const roster = screen.getByRole("region", { name: "Registered participants" });
    const teams = screen.getByRole("region", { name: "Teams" });
    expect(roster.compareDocumentPosition(teams) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(within(roster).getByText("80 approved registrations")).toBeInTheDocument();
    expect(within(teams).getByText(/No teams available yet/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "1. Participants" })).toHaveAttribute("href", "#participants");
  });

  it("renders only safe names and attendance, including a neutral fallback for an email-like name", () => {
    const rows = [{ id: "opaque-registration", displayName: "hidden@example.test", attendanceMode: "online" as const, email: "private@example.test" }];
    const { container } = render(<JudgeParticipantRoster eventName="Impact Osaka" participants={rows} />);
    expect(screen.getByText("Participant", { exact: true })).toBeInTheDocument();
    expect(container.innerHTML).not.toMatch(/hidden@example|private@example|mailto:/);
  });
});
