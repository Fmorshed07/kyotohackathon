import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import HackathonBoardsPage from "@/pages/HackathonBoardsPage";
import type { PortalHackathon } from "@/lib/hackathons";

const backend = vi.hoisted(() => ({
  db: {},
  user: {
    id: "board-judge", email: "judge@example.test", role: "judge",
    judgeApprovalStatus: "approved", hackathonIds: ["ai-ideathon-2026", "impact-osaka-2026"],
  },
  getDoc: vi.fn(),
  getDocs: vi.fn(),
  catalog: vi.fn(),
}));

const assignedEvents: PortalHackathon[] = [
  { id: "ai-ideathon-2026", name: "AI Ideathon 2026", shortName: "AI Ideathon", eventDate: "August 2026", location: "Online", theme: "AI for impact", status: "past" },
  { id: "impact-osaka-2026", name: "Impact Osaka 2026", shortName: "Impact Osaka", eventDate: "October 2026", location: "Osaka", theme: "Useful AI", status: "active" },
];
const unassignedEvents: PortalHackathon[] = [
  { id: "unassigned-past", name: "Unassigned past event", shortName: "Unassigned past", eventDate: "July 2026", location: "Online", theme: "Restricted event", status: "past" },
  { id: "unassigned-current", name: "Unassigned current event", shortName: "Unassigned current", eventDate: "November 2026", location: "Online", theme: "Restricted event", status: "upcoming" },
];

vi.mock("@/lib/firebaseClient", () => ({ getFirestoreDb: () => backend.db }));
vi.mock("firebase/firestore", async (original) => ({
  ...await original<typeof import("firebase/firestore")>(),
  doc: (_db: unknown, name: string, id: string) => `${name}/${id}`,
  collection: (_db: unknown, name: string) => name,
  getDoc: backend.getDoc,
  getDocs: backend.getDocs,
}));
vi.mock("@/hooks/usePortalAuth", () => ({
  usePortalAuth: () => ({
    sessionUser: backend.user,
    loading: false,
  }),
}));
vi.mock("@/lib/aiHackathons", () => ({ fetchPortalHackathonCatalog: backend.catalog }));
vi.mock("@/lib/portalInvites", () => ({ listAccessibleSubmissions: async () => [] }));
vi.mock("@/components/projects/ProjectStarEmailDialog", () => ({ ProjectStarEmailDialog: () => null }));
vi.mock("@/hooks/useProjectCommunityStars", () => ({
  useProjectCommunityStars: () => ({
    statsById: {}, myRatingById: {}, pendingId: null, emailPrompt: null,
    communityFill: () => 0, rate: vi.fn(), cancelStarEmail: vi.fn(), submitStarEmail: vi.fn(),
  }),
}));
vi.mock("@/hooks/useProjectShareCounts", () => ({
  useProjectShareCounts: () => ({ shareCount: () => 0, recordShare: vi.fn() }),
}));

function CurrentLocation() {
  const { pathname, search } = useLocation();
  return <output data-testid="board-location">{pathname}{search}</output>;
}

function showBoard(id = assignedEvents[0].id) {
  return render(
    <MemoryRouter initialEntries={[`/boards/${id}`]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <CurrentLocation />
      <Routes>
        <Route path="/boards/:hackathonId" element={<HackathonBoardsPage />} />
        <Route path="/dashboard/judge" element={<p>Judge dashboard destination</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  backend.user.role = "judge";
  backend.getDoc.mockResolvedValue({ exists: () => true, data: () => ({ hackathon_ids: assignedEvents.map((event) => event.id) }) });
  backend.getDocs.mockResolvedValue({ docs: [] });
  backend.catalog.mockResolvedValue([...assignedEvents, ...unassignedEvents]);
});
afterEach(cleanup);

describe("judge and mentor board navigation", () => {
  it.each(["judge", "mentor"])("keeps assigned past and current boards reachable for a %s without exposing unassigned events", async (role) => {
    backend.user.role = role;
    showBoard(assignedEvents[1].id);
    await screen.findByRole("heading", { name: assignedEvents[1].name });
    const boardSection = screen.getByText("Boards", { exact: true }).closest("section")!;
    const previousBoard = within(boardSection).getByRole("link", { name: /AI Ideathon/ });
    expect(previousBoard).toHaveAttribute("href", `/boards/${assignedEvents[0].id}`);
    expect(within(boardSection).getByRole("link", { name: /Impact Osaka/ })).toBeInTheDocument();
    expect(screen.queryByText(/Unassigned/)).not.toBeInTheDocument();

    fireEvent.click(previousBoard);

    await screen.findByRole("heading", { name: assignedEvents[0].name });
    expect(screen.getByTestId("board-location")).toHaveTextContent(`/boards/${assignedEvents[0].id}`);
  });

  it.each(["button", "header link", "empty-state link"])("preserves the selected past event through the %s back to judging", async (control) => {
    showBoard();
    await screen.findByRole("heading", { name: assignedEvents[0].name });
    const destination = `/dashboard/judge?hackathon=${assignedEvents[0].id}`;
    const link = control === "button"
      ? screen.getByRole("button", { name: "Back to dashboard" })
      : screen.getByRole("link", { name: control === "header link" ? "Dashboard" : "Back to dashboard" });
    if (control !== "button") expect(link).toHaveAttribute("href", destination);

    fireEvent.click(link);

    await waitFor(() => expect(screen.getByTestId("board-location")).toHaveTextContent(destination));
    expect(screen.getByText("Judge dashboard destination")).toBeInTheDocument();
  });
});
