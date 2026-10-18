import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import JudgeDashboardPage from "@/pages/JudgeDashboardPage";
import type { JudgeDashboardProps } from "@/components/dashboard/JudgeDashboard";
import type { EventParticipant } from "@/lib/eventParticipants";
import type { SessionUser } from "@/types/portal";

const backend = vi.hoisted(() => ({
  db: {}, selected: "event-a", authLoading: false,
  user: {} as SessionUser,
  events: ["event-a", "event-b"].map((id) => ({ id, name: id, shortName: id, eventDate: "", location: "", theme: "", status: "active" })),
  criteria: [{ id: "impact", title: "Impact", weight: 100, questions: [] }],
  subscribe: vi.fn(),
}));
vi.mock("@/hooks/usePortalAuth", () => ({ usePortalAuth: () => ({ sessionUser: backend.user, loading: backend.authLoading, signOut: vi.fn() }) }));
vi.mock("@/lib/firebaseClient", () => ({ getFirestoreDb: () => backend.db }));
vi.mock("@/lib/eventParticipants", () => ({ subscribeToEventParticipants: backend.subscribe }));
vi.mock("@/hooks/useHackathonCriteria", () => ({ useHackathonCriteria: () => ({ criteria: backend.criteria, isLoading: false }) }));
vi.mock("@/hooks/useHackathonSelection", () => ({ useHackathonSelection: () => ({ selectedHackathonId: backend.selected, selectedHackathon: backend.events.find((event) => event.id === backend.selected), setSelectedHackathonId: vi.fn() }) }));
vi.mock("@/hooks/useUnsavedChangesGuard", () => ({ useUnsavedChangesGuard: vi.fn() }));
vi.mock("@/lib/aiHackathons", () => ({ fetchPortalHackathonCatalog: async () => backend.events }));
vi.mock("@/lib/hackathons", async (original) => ({ ...await original<typeof import("@/lib/hackathons")>(), fetchSubmissionsForHackathon: async () => [] }));
vi.mock("firebase/firestore", async (original) => ({
  ...await original<typeof import("firebase/firestore")>(),
  doc: (_db: unknown, collection: string, id: string) => ({ path: `${collection}/${id}` }),
  getDoc: async () => ({ exists: () => false }),
}));
vi.mock("@/components/dashboard/DashboardLayout", () => ({ DashboardLayout: ({ children }: { children: ReactNode }) => <div>{children}</div>, sectionClass: "" }));
vi.mock("@/components/dashboard/JudgeDashboard", () => ({ JudgeDashboard: ({ participants, isLoadingParticipants, participantRosterError, onRetryParticipants }: JudgeDashboardProps) => <section>
  {isLoadingParticipants && <p>Loading participant roster</p>}
  {participantRosterError && <p role="alert">{participantRosterError}</p>}
  <button onClick={onRetryParticipants}>Retry roster</button>
  {participants?.map((participant) => <p key={participant.id}>{participant.displayName}</p>)}
</section> }));

type Subscription = { eventId: string; rows: (rows: EventParticipant[]) => void; error: (error: Error) => void; unsubscribe: ReturnType<typeof vi.fn> };
let subscriptions: Subscription[];
const row = (displayName: string): EventParticipant => ({ id: `opaque-${displayName}`, displayName, attendanceMode: "online" });
const page = () => <MemoryRouter initialEntries={["/dashboard/judge"]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><Routes>
  <Route path="/dashboard/judge" element={<JudgeDashboardPage />} />
  <Route path="/dashboard" element={<p>Account dashboard</p>} />
</Routes></MemoryRouter>;

async function renderPage() {
  let view!: ReturnType<typeof render>;
  await act(async () => { view = render(page()); });
  return view;
}

beforeEach(() => {
  vi.clearAllMocks(); localStorage.clear(); sessionStorage.clear();
  backend.selected = "event-a"; backend.authLoading = false;
  backend.user = { id: "judge-one", email: "judge@example.test", role: "judge", judgeApprovalStatus: "approved", hackathonIds: ["event-a", "event-b"] };
  subscriptions = [];
  backend.subscribe.mockImplementation((_db, eventId, rows, error) => {
    const subscription = { eventId, rows, error, unsubscribe: vi.fn() };
    subscriptions.push(subscription);
    return subscription.unsubscribe;
  });
});
afterEach(() => { cleanup(); localStorage.clear(); });

describe("judge safe participant roster subscription", () => {
  it("loads only the selected assigned event and ignores its late callback after switching events", async () => {
    const view = await renderPage();
    await waitFor(() => expect(subscriptions).toHaveLength(1));
    expect(subscriptions[0].eventId).toBe("event-a");
    expect(screen.getByText("Loading participant roster")).toBeInTheDocument();
    await act(async () => subscriptions[0].rows([row("Sample Builder A")]));
    expect(screen.getByText("Sample Builder A")).toBeInTheDocument();
    backend.selected = "event-b";
    await act(async () => view.rerender(page()));
    expect(screen.queryByText("Sample Builder A")).not.toBeInTheDocument();
    expect(subscriptions[0].unsubscribe).toHaveBeenCalledOnce();
    await act(async () => subscriptions[0].rows([row("Stale Builder")]));
    expect(screen.queryByText("Stale Builder")).not.toBeInTheDocument();
    await act(async () => subscriptions[1].rows([row("Sample Builder B")]));
    expect(screen.getByText("Sample Builder B")).toBeInTheDocument();
  });

  it("shows an isolated retryable roster error and unsubscribes on retry and unmount", async () => {
    const view = await renderPage();
    await waitFor(() => expect(subscriptions).toHaveLength(1));
    await act(async () => subscriptions[0].error(new Error("Unavailable")));
    expect(screen.getByRole("alert")).toHaveTextContent("Could not load registered participants");
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Retry roster" })));
    expect(subscriptions[0].unsubscribe).toHaveBeenCalledOnce();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    await act(async () => subscriptions[1].rows([row("Recovered Builder")]));
    expect(screen.getByText("Recovered Builder")).toBeInTheDocument();
    view.unmount();
    expect(subscriptions[1].unsubscribe).toHaveBeenCalledOnce();
  });

  it("clears previous names on account change and ignores old-account callbacks", async () => {
    const view = await renderPage();
    await waitFor(() => expect(subscriptions).toHaveLength(1));
    await act(async () => subscriptions[0].rows([row("Previous roster")]));
    backend.user = { ...backend.user, id: "judge-two" };
    await act(async () => view.rerender(page()));
    expect(screen.queryByText("Previous roster")).not.toBeInTheDocument();
    await act(async () => subscriptions[0].rows([row("Old callback")]));
    expect(screen.queryByText("Old callback")).not.toBeInTheDocument();
  });

  it.each(["pending", "unassigned", "auth-loading"])("does not subscribe while %s", async (condition) => {
    if (condition === "pending") backend.user.judgeApprovalStatus = "pending";
    if (condition === "unassigned") backend.user.hackathonIds = ["event-b"];
    if (condition === "auth-loading") backend.authLoading = true;
    await renderPage();
    expect(backend.subscribe).not.toHaveBeenCalled();
  });
});
