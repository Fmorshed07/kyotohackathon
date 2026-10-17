import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import ProjectScreeningPage from "@/pages/ProjectScreeningPage";

const mocks = vi.hoisted(() => ({
  db: {},
  event: {
    id: "ai-ideathon-2026",
    name: "AI Ideathon 2026",
    shortName: "AI Ideathon",
    eventDate: "13–15 August 2026",
    location: "Online",
    theme: "AI for impact",
    status: "past",
  },
  user: {
    id: "judge-navigation",
    email: "judge@example.test",
    role: "judge",
    judgeApprovalStatus: "approved",
    hackathonIds: ["ai-ideathon-2026", "impact-osaka-2026"],
  },
}));

vi.mock("@/lib/firebaseClient", () => ({ getFirestoreDb: () => mocks.db }));
vi.mock("@/hooks/usePortalAuth", () => ({
  usePortalAuth: () => ({ sessionUser: mocks.user, loading: false, signOut: vi.fn() }),
}));
vi.mock("@/hooks/useHostOpsCatalog", () => ({
  useHostOpsCatalog: () => ({ catalog: [], isLoading: false, error: null }),
}));
vi.mock("@/lib/aiHackathons", () => ({ fetchPortalHackathonCatalog: async () => [mocks.event] }));
vi.mock("@/hooks/useAdminPlatformOps", () => ({
  useAdminPlatformOps: () => ({
    hackathons: [mocks.event],
    selectedHackathonId: mocks.event.id,
    selectedHackathon: mocks.event,
    setSelectedHackathonId: vi.fn(),
    participants: [],
    submissionRows: [],
    platformOps: {},
    isLoading: false,
    isSavingOps: false,
    statusMessage: null,
    handleRunProjectScreening: vi.fn(),
    handleSetProjectScreenStatus: vi.fn(),
  }),
}));
vi.mock("@/components/dashboard/DashboardLayout", () => ({
  DashboardLayout: ({ children }: { children: ReactNode }) => <main>{children}</main>,
  sectionClass: "",
}));
vi.mock("@/components/dashboard/ProjectScreeningWorkspace", () => ({
  ProjectScreeningWorkspace: () => <p>Project screening workspace</p>,
}));

function CurrentLocation() {
  const { pathname, search, hash } = useLocation();
  return <output data-testid="screening-location">{pathname}{search}{hash}</output>;
}

afterEach(cleanup);

describe("judge project screening navigation", () => {
  it("keeps the assigned past hackathon when opening Judge overview", async () => {
    render(
      <MemoryRouter
        initialEntries={[`/dashboard/judge/project-screening?hackathon=${mocks.event.id}`]}
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <ProjectScreeningPage />
        <CurrentLocation />
      </MemoryRouter>,
    );
    await screen.findByText("Project screening workspace");
    const link = screen.getByRole("link", { name: "Judge overview" });
    const destination = `/dashboard/judge?hackathon=${mocks.event.id}`;
    expect(link).toHaveAttribute("href", destination);

    fireEvent.click(link);

    expect(screen.getByTestId("screening-location")).toHaveTextContent(destination);
  });

  it("keeps the screening workspace available without a shortcut to admin theme marks", async () => {
    render(
      <MemoryRouter
        initialEntries={[`/dashboard/judge/project-screening?hackathon=${mocks.event.id}`]}
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <ProjectScreeningPage />
      </MemoryRouter>,
    );

    expect(await screen.findByText("Project screening workspace")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Theme marks" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Judge overview" })).toHaveAttribute(
      "href",
      `/dashboard/judge?hackathon=${mocks.event.id}`,
    );
  });
});
