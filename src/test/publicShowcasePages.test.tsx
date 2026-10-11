import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ProjectGalleryPage from "@/pages/ProjectGalleryPage";
import ProjectFeedPage from "@/pages/ProjectFeedPage";
import { ELEVENLABS_SUBMISSIONS } from "@/data/elevenLabsSubmissions";
import { ELEVENLABS_MEETUP, ELEVENLABS_MEETUP_ID } from "@/lib/elevenLabsMeetup";

const backend = vi.hoisted(() => ({
  db: {}, getDocs: vi.fn(), publishedEvents: vi.fn(), rate: vi.fn(), recordShare: vi.fn(), copy: vi.fn(),
}));
vi.mock("firebase/firestore", async original => ({
  ...await original<typeof import("firebase/firestore")>(),
  collection: (_db: unknown, name: string) => name,
  getDocs: backend.getDocs,
}));
vi.mock("@/lib/firebaseClient", () => ({ getFirestoreDb: () => backend.db }));
vi.mock("@/lib/aiHackathons", () => ({ fetchPublishedHackathons: backend.publishedEvents, isAiIdeathonEvent: () => false }));
vi.mock("@/components/AnimatedBackground", () => ({ default: () => null }));
vi.mock("@/components/SiteHeader", () => ({ default: () => null }));
vi.mock("@/components/hackathons/HackathonSubscribeForm", () => ({ HackathonSubscribeForm: () => null }));
vi.mock("@/components/projects/ProjectStarEmailDialog", () => ({ ProjectStarEmailDialog: () => null }));
vi.mock("@/hooks/useProjectCommunityStars", () => ({
  useProjectCommunityStars: () => ({
    statsById: {}, myRatingById: {}, pendingId: null, emailPrompt: null,
    communityFill: () => 0, rate: backend.rate, cancelStarEmail: vi.fn(), submitStarEmail: vi.fn(),
  }),
}));
vi.mock("@/hooks/useProjectShareCounts", () => ({
  useProjectShareCounts: () => ({ shareCount: () => 0, recordShare: backend.recordShare }),
}));

const remoteProject = {
  id: "published-project",
  data: () => ({
    user_id: "registered-builder", hackathon_id: "impact-kyoto", title: "Published cloud project",
    team_name: "Cloud builders", created_at: "2026-10-10T12:00:00Z", public_preview_consent: true,
    demo_video_url: "https://youtu.be/cloudvideo123", short_description: "An existing participant project.",
  }),
};
const driveProject = ELEVENLABS_SUBMISSIONS.find(project => project.participantName === "Mark Oguro")!;
const kentoProject = ELEVENLABS_SUBMISSIONS.find(project => project.participantName === "Kento Ishizeki")!;
const originalClipboard = Object.getOwnPropertyDescriptor(navigator, "clipboard");

beforeEach(() => {
  vi.clearAllMocks();
  backend.getDocs.mockResolvedValue({ docs: [remoteProject] });
  backend.publishedEvents.mockResolvedValue([ELEVENLABS_MEETUP]);
  backend.copy.mockResolvedValue(undefined);
  Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: backend.copy } });
  vi.stubGlobal("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} });
  vi.stubGlobal("IntersectionObserver", class { observe() {} unobserve() {} disconnect() {} });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  if (originalClipboard) Object.defineProperty(navigator, "clipboard", originalClipboard);
  else Reflect.deleteProperty(navigator, "clipboard");
});

function Location() {
  const location = useLocation();
  return <output data-testid="location">{location.pathname}{location.search}</output>;
}

function show(path = "/projects") {
  return render(<MemoryRouter initialEntries={[path]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
    <Location />
    <Routes>
      <Route path="/projects/:projectId?" element={<ProjectGalleryPage />} />
      <Route path="/feed" element={<ProjectFeedPage />} />
      <Route path="/videos" element={<ProjectFeedPage videoOnly />} />
    </Routes>
  </MemoryRouter>);
}

function cardFor(title: string) {
  const card = screen.getAllByRole("article").find(article =>
    within(article).queryByRole("heading", { name: title }) ||
    within(article).queryByRole("link", { name: title }));
  expect(card, `project card: ${title}`).toBeDefined();
  return card!;
}

describe("bundled submissions across the public project pages", () => {
  it("shows all 14 immediately, retains cloud projects, and filters by event and teammate", async () => {
    let resolveProjects!: (value: { docs: typeof remoteProject[] }) => void;
    backend.getDocs.mockReturnValue(new Promise(resolve => { resolveProjects = resolve; }));
    show();
    expect(screen.getAllByRole("article")).toHaveLength(14);
    expect(screen.queryByText("Loading submitted projects...")).not.toBeInTheDocument();

    await act(async () => { resolveProjects({ docs: [remoteProject] }); });
    expect(screen.getAllByRole("article")).toHaveLength(15);
    expect(cardFor("Published cloud project")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: new RegExp(ELEVENLABS_MEETUP.shortName) }));
    expect(screen.getAllByRole("article")).toHaveLength(14);
    expect(screen.getByText("14 of 15 projects")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Published cloud project" })).not.toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText("Search projects, teams, members, or themes"), { target: { value: "Bryony Edgell" } });
    expect(screen.getAllByRole("article")).toHaveLength(1);
    expect(cardFor("Keigo sitcom")).toBeInTheDocument();
  });

  it("opens Drive previews from cards and creates a direct project URL", async () => {
    show();
    await act(async () => {});
    fireEvent.click(within(cardFor(driveProject.title)).getByRole("button", { name: "Preview" }));
    const preview = screen.getByRole("dialog", { name: driveProject.title });
    expect(within(preview).getByTitle(`${driveProject.title} demo preview`)).toHaveAttribute("src", "https://drive.google.com/file/d/1798kmNpM9OOEoUSLqm8UNrJKdHfGVIpl/preview");
    expect(within(preview).getByText(/Participants:/).parentElement).toHaveTextContent(driveProject.participantName);
    expect(within(preview).getByText(/Tools used:/).parentElement).toHaveTextContent(driveProject.toolsUsed);
    expect(within(preview).getByRole("link", { name: "Open original" })).toHaveAttribute("href", driveProject.videoUrl);
    expect(screen.getByTestId("location")).toHaveTextContent(`/projects/${driveProject.id}`);
  });

  it("opens bundled deep links before cloud data arrives and retains corrected and earlier links", () => {
    backend.getDocs.mockReturnValue(new Promise(() => {}));
    show(`/projects/${kentoProject.id}`);
    const preview = screen.getByRole("dialog", { name: kentoProject.title });
    expect(within(preview).getByTitle(`${kentoProject.title} demo preview`)).toHaveAttribute("src", expect.stringContaining("youtube-nocookie.com/embed/xDaCJC97xEM"));
    expect(within(preview).getByRole("link", { name: "Open original" })).toHaveAttribute("href", "https://www.youtube.com/watch?v=xDaCJC97xEM");
    expect(within(preview).getByRole("link", { name: /Earlier ElevenLabs submission/ })).toHaveAttribute("href", kentoProject.additionalLinks[0].url);
    expect(within(preview).queryByRole("radiogroup")).not.toBeInTheDocument();
  });

  it.each(ELEVENLABS_SUBMISSIONS.filter(project => project.previewStatus === "unavailable"))(
    "keeps $participantName's unavailable preview out of an iframe while preserving its original link",
    async project => {
      show(`/projects/${project.id}`);
      await act(async () => {});
      const preview = screen.getByRole("dialog", { name: project.title });
      expect(within(preview).getByText("Preview unavailable")).toBeVisible();
      expect(within(preview).getByText(project.previewNote!)).toBeVisible();
      expect(preview.querySelector("iframe")).toBeNull();
      expect(within(preview).getByRole("link", { name: "Open original" })).toHaveAttribute("href", project.participantName === "Preston Lau" ? "https://www.youtube.com/watch?v=FSTDBS5I_YA" : project.videoUrl);
    },
  );

  it.each([
    ["/projects", 14], ["/feed", 14], ["/videos", 13],
  ] as const)("retains bundled projects on %s when cloud reads fail", async (path, count) => {
    backend.getDocs.mockRejectedValue(new Error("permission-denied"));
    show(`${path}?event=${ELEVENLABS_MEETUP_ID}`);
    expect(await screen.findByRole("alert")).toHaveTextContent("Some projects couldn’t be loaded.");
    expect(screen.getAllByRole("article")).toHaveLength(count);
    expect(cardFor("Japan Career Video")).toHaveTextContent("Preview unavailable");
    expect(cardFor("Japan Career Video").querySelector("iframe, video")).toBeNull();
    if (path === "/videos") expect(screen.queryByRole("article", { name: /Action Changes the Future/ })).not.toBeInTheDocument();
  });

  it.each(["/feed", "/videos"])("keeps cloud projects and direct gallery links in %s", async path => {
    show(path);
    await act(async () => {});
    expect(screen.getAllByRole("article")).toHaveLength(path === "/videos" ? 14 : 15);
    expect(cardFor("Published cloud project")).toBeInTheDocument();
    expect(within(cardFor(driveProject.title)).getByRole("link", { name: "Explore project" })).toHaveAttribute("href", `/projects/${driveProject.id}`);
    fireEvent.change(screen.getByRole("textbox", { name: "Search projects" }), { target: { value: "Bryony Edgell" } });
    expect(screen.getAllByRole("article")).toHaveLength(1);
    expect(cardFor("Keigo sitcom")).toBeInTheDocument();
  });

  it.each(["/projects", "/feed", "/videos"])("honors cloud opt-outs for imported projects on %s", async path => {
    backend.getDocs.mockResolvedValue({ docs: [remoteProject, {
      id: driveProject.id, data: () => ({ public_preview_consent: false }),
    }] });
    show(path === "/projects" ? `${path}/${driveProject.id}` : path);
    await act(async () => {});
    expect(screen.getAllByRole("article")).toHaveLength(path === "/videos" ? 13 : 14);
    expect(screen.queryByRole("dialog", { name: driveProject.title })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: driveProject.title })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: driveProject.title })).not.toBeInTheDocument();
    expect(cardFor("Published cloud project")).toBeInTheDocument();
  });

  it.each(["/projects", "/feed", "/videos"])("hides bundled projects on %s when the successfully loaded catalog omits their event", async path => {
    backend.publishedEvents.mockResolvedValue([]);
    show(path === "/projects" ? `${path}/${driveProject.id}` : path);
    await act(async () => {});
    expect(screen.getAllByRole("article")).toHaveLength(1);
    expect(cardFor("Published cloud project")).toBeInTheDocument();
    expect(screen.queryByRole("dialog", { name: driveProject.title })).not.toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("retains bundled projects alongside cloud projects when the event catalog fails", async () => {
    backend.publishedEvents.mockRejectedValue(new Error("catalog unavailable"));
    show();
    await act(async () => {});
    expect(screen.getAllByRole("article")).toHaveLength(15);
    expect(cardFor(driveProject.title)).toBeInTheDocument();
    expect(cardFor("Published cloud project")).toBeInTheDocument();
  });

  it.each(["/projects", "/feed"])("shares bundled links without ratings or analytics on %s, while keeping cloud interactions", async path => {
    show(path);
    await act(async () => {});
    const bundled = cardFor(driveProject.title);
    expect(within(bundled).queryByRole("radiogroup")).not.toBeInTheDocument();
    fireEvent.click(within(bundled).getByRole("button", { name: "Share" }));
    const share = screen.getByRole("dialog", { name: "Help this project travel" });
    expect(within(share).queryByText(/give their stars/)).not.toBeInTheDocument();
    fireEvent.click(within(share).getByRole("button", { name: "Copy" }));
    await waitFor(() => expect(backend.copy).toHaveBeenCalledWith(expect.stringContaining(`/projects/${driveProject.id}`)));
    expect(backend.recordShare).not.toHaveBeenCalled();
    expect(backend.rate).not.toHaveBeenCalled();
    fireEvent.click(within(share).getByRole("button", { name: "Close" }));

    const remote = cardFor("Published cloud project");
    fireEvent.click(within(remote).getByRole("radio", { name: "5 stars" }));
    expect(backend.rate).toHaveBeenCalledWith(remoteProject.id, 5);
    fireEvent.click(within(remote).getByRole("button", { name: "Share" }));
    fireEvent.click(within(screen.getByRole("dialog", { name: "Help this project travel" })).getByRole("button", { name: "Copy" }));
    await waitFor(() => expect(backend.recordShare).toHaveBeenCalledWith(remoteProject.id));
  });
});
