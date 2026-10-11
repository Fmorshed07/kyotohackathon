import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import ElevenLabsParticipantShowcase from "@/components/hackathons/ElevenLabsParticipantShowcase";
import { ELEVENLABS_SUBMISSIONS, type ElevenLabsSubmission } from "@/data/elevenLabsSubmissions";
import { ELEVENLABS_MEETUP } from "@/lib/elevenLabsMeetup";
import GeneratedHackathonPage from "@/pages/GeneratedHackathonPage";
import Index from "@/pages/Index";

const mocks = vi.hoisted(() => ({ fetchEvent: vi.fn(), getDoc: vi.fn(), scroll: vi.fn() }));
vi.mock("@/lib/aiHackathons", () => ({ fetchAiHackathon: mocks.fetchEvent }));
vi.mock("@/lib/firebaseClient", () => ({ getFirestoreDb: () => ({}) }));
vi.mock("firebase/firestore", async (original) => ({
  ...await original<typeof import("firebase/firestore")>(),
  doc: (_db: unknown, _collection: string, id: string) => ({ id }),
  getDoc: mocks.getDoc,
}));
vi.mock("@/components/AnimatedBackground", () => ({ default: () => null }));
vi.mock("@/components/SiteHeader", () => ({ default: () => null }));
vi.mock("@/components/sections/HeroSection", () => ({ default: () => null }));
vi.mock("@/components/ecosystem/JapanHeroSection", () => ({ default: () => null }));
vi.mock("@/components/ecosystem/PartnersSection", () => ({ default: () => null }));
vi.mock("@/components/ecosystem/EventShowcase", () => ({ default: () => <section data-testid="event-showcase" /> }));
vi.mock("@/components/ecosystem/CommunityFooter", () => ({ default: () => null }));
vi.mock("@/components/sections/LiveEventsSection", () => ({ default: () => null }));
vi.mock("@/components/sections/HostSection", () => ({ default: () => null }));
vi.mock("@/components/sections/AboutSection", () => ({ default: () => null }));
vi.mock("@/components/sections/PlatformSection", () => ({ default: () => null }));
vi.mock("@/components/sections/FeaturePreviewSection", () => ({ default: () => null }));
vi.mock("@/components/sections/CommunitySection", () => ({ default: () => null }));
vi.mock("@/components/sections/LookingForJobsSection", () => ({ default: () => null }));
vi.mock("@/components/sections/FinalCTASection", () => ({ default: () => null }));

const show = (submissions?: ElevenLabsSubmission[]) => render(
  <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
    <ElevenLabsParticipantShowcase submissions={submissions} />
  </MemoryRouter>,
);
const playableYoutube = () => ELEVENLABS_SUBMISSIONS.find(submission => submission.videoUrl?.includes("nwfxpxLwzn4"))!;

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getDoc.mockResolvedValue({ data: () => ({ criteria: [] }) });
  mocks.fetchEvent.mockResolvedValue({ ...ELEVENLABS_MEETUP, status: "past" });
  Object.defineProperty(Element.prototype, "scrollIntoView", { configurable: true, value: mocks.scroll });
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe("ElevenLabs participant submissions", () => {
  it("renders all imported projects with every original link visible and an on-demand gallery", () => {
    const { container } = show();
    expect(screen.getAllByRole("article")).toHaveLength(14);
    expect(container.querySelector(".elevenlabs-submission-grid iframe, .elevenlabs-submission-grid video")).toBeNull();
    expect(container.querySelector("a a")).toBeNull();
    for (const submission of ELEVENLABS_SUBMISSIONS) {
      const card = screen.getByRole("article", { name: submission.title });
      expect(within(card).getByText(submission.participantName, { selector: ".elevenlabs-submission-byline span" })).toBeVisible();
      for (const url of [submission.videoUrl, ...submission.additionalLinks.map(link => link.url)].filter(Boolean)) {
        const original = within(card).getAllByRole("link").find(link => link.getAttribute("href") === url);
        expect(original).toBeVisible();
        expect(original).toHaveAttribute("target", "_blank");
        expect(original).toHaveAttribute("rel", "noopener noreferrer");
        expect(original).toHaveTextContent(url!);
      }
    }
    expect(screen.queryByText("BEYOND N2")).toBeNull();
  });

  it("keeps full descriptions, team members, and tools available in expandable details", () => {
    const submission = ELEVENLABS_SUBMISSIONS.find(project => project.participantName === "Mohana Das")!;
    show([submission]);
    const card = screen.getByRole("article", { name: submission.title });
    const details = within(card).getByText("Project details").closest("details")!;
    expect(details).not.toHaveAttribute("open");
    fireEvent.click(within(card).getByText("Project details"));
    expect(details).toHaveAttribute("open");
    expect(within(details).getByText(submission.description)).toBeVisible();
    expect(within(details).getByText("Mohana Das, Bryony Edgell, Keito Ochi")).toBeVisible();
    expect(within(details).getByText(submission.toolsUsed)).toBeVisible();
  });

  it("loads a provider preview only after a click and keeps at most one mounted", () => {
    const youtube = playableYoutube();
    const drive = ELEVENLABS_SUBMISSIONS.find(submission => submission.videoUrl?.includes("drive.google.com"))!;
    const { container } = show([youtube, drive]);
    fireEvent.click(screen.getByRole("button", { name: `Preview ${youtube.title} video` }));
    const youtubeFrame = screen.getByTitle(`${youtube.title} video preview`);
    expect(youtubeFrame).toHaveAttribute("src", expect.stringContaining("youtube-nocookie.com/embed/nwfxpxLwzn4"));
    expect(youtubeFrame).toHaveAttribute("src", expect.stringContaining("autoplay=0"));
    expect(youtubeFrame).not.toHaveAttribute("allow", expect.stringContaining("autoplay"));
    fireEvent.click(screen.getByRole("button", { name: `Preview ${drive.title} video` }));
    expect(container.querySelectorAll("iframe")).toHaveLength(1);
    expect(screen.queryByTitle(`${youtube.title} video preview`)).toBeNull();
    expect(screen.getByTitle(`${drive.title} video preview`)).toHaveAttribute("src", expect.stringMatching(/^https:\/\/drive\.google\.com\/file\/d\/[^/]+\/preview$/));
    fireEvent.click(screen.getByRole("button", { name: `Close ${drive.title} preview` }));
    expect(container.querySelector("iframe")).toBeNull();
  });

  it("retains original links and a fallback when a provider preview fails", () => {
    const submission = playableYoutube();
    show([submission]);
    fireEvent.click(screen.getByRole("button", { name: `Preview ${submission.title} video` }));
    fireEvent.error(screen.getByTitle(`${submission.title} video preview`));
    expect(screen.getByRole("status")).toHaveTextContent("Use the original link below");
    expect(screen.getByRole("link", { name: /Original video/ })).toHaveAttribute("href", submission.videoUrl);
    fireEvent.click(screen.getByRole("button", { name: `Close ${submission.title} preview` }));
    fireEvent.click(screen.getByRole("button", { name: `Preview ${submission.title} video` }));
    expect(screen.getByTitle(`${submission.title} video preview`)).toBeInTheDocument();
  });

  it("permits only the curated website to open in a restricted sandbox", () => {
    const website: ElevenLabsSubmission = { ...playableYoutube(), videoUrl: "https://action-changes-the-future.vercel.app/", previewStatus: undefined };
    show([website]);
    fireEvent.click(screen.getByRole("button", { name: `Preview ${website.title} website` }));
    expect(screen.getByTitle(`${website.title} website preview`)).toHaveAttribute("sandbox", "allow-scripts allow-forms allow-popups");
    expect(screen.getByRole("link", { name: /Project website/ })).toHaveAttribute("href", website.videoUrl);
  });

  it("shows unavailable notes and preserves their direct URLs without offering a broken preview", () => {
    const unavailable: ElevenLabsSubmission = { ...playableYoutube(), previewStatus: "unavailable", previewNote: "The submitted video is no longer publicly available." };
    const { container } = show([unavailable]);
    expect(screen.getByText("Preview unavailable")).toBeVisible();
    expect(screen.getByText(unavailable.previewNote!)).toBeVisible();
    expect(screen.queryByRole("button", { name: /^Preview / })).toBeNull();
    expect(container.querySelector("iframe")).toBeNull();
    expect(screen.getByRole("link", { name: /Original video/ })).toHaveAttribute("href", unavailable.videoUrl);
  });

  it("keeps unknown sites external and never treats a missing filename or unsafe scheme as an embed", () => {
    const unknown: ElevenLabsSubmission = { ...playableYoutube(), videoUrl: "https://example.com/project", additionalLinks: [{ label: "Unsafe", url: "javascript:alert(1)" }] };
    const { container, unmount } = show([unknown]);
    expect(screen.getByRole("link", { name: /Original submission/ })).toHaveAttribute("href", unknown.videoUrl);
    expect(screen.queryByRole("button", { name: /^Preview / })).toBeNull();
    expect(screen.queryByRole("link", { name: /Unsafe/ })).toBeNull();
    expect(container.querySelector("iframe")).toBeNull();
    unmount();
    show([{ ...unknown, videoUrl: null, additionalLinks: [], missingVideoFilename: "demo.mp4" }]);
    expect(screen.getByText("Video link pending")).toBeVisible();
    expect(screen.getByText("demo.mp4")).toBeVisible();
    expect(screen.queryByRole("link", { name: /demo.mp4/ })).toBeNull();
  });
});

describe("ElevenLabs winners", () => {
  it("presents the spreadsheet's top five in rank order, including Mohana rather than the tied-score Preston", () => {
    const { container } = show();
    const winners = screen.getByRole("region", { name: "Top 5 winners" });
    const list = within(winners).getByRole("list", { name: "Top 5 winning projects" });
    expect(list.tagName).toBe("OL");
    const entries = within(list).getAllByRole("listitem");
    const rankedProjects = [
      ["elevenlabs-tokyo-10", "Wesley Kao"],
      ["elevenlabs-tokyo-7", "Kento Ishizeki"],
      ["elevenlabs-tokyo-6", "Keiichi Ogawa"],
      ["elevenlabs-tokyo-18", "Jyan Zarate"],
      ["elevenlabs-tokyo-5", "Mohana Das, Bryony Edgell, Keito Ochi"],
    ];
    expect(entries).toHaveLength(5);
    rankedProjects.forEach(([id, people], index) => {
      const submission = ELEVENLABS_SUBMISSIONS.find(project => project.id === id)!;
      expect(entries[index]).toHaveAttribute("value", String(index + 1));
      expect(within(entries[index]).getByText(people)).toBeVisible();
      expect(within(entries[index]).getByText(submission.title)).toBeVisible();
      expect(screen.getAllByRole("heading", { name: submission.title })).toHaveLength(1);
    });
    expect(entries[0]).toHaveClass("elevenlabs-winner--first");
    expect(within(winners).queryByText(/Preston Lau/)).toBeNull();
    expect(within(winners).queryByText(/score/i)).toBeNull();
    expect(container.querySelectorAll('.elevenlabs-submission-links a[target="_blank"]')).toHaveLength(15);
    expect(winners.querySelectorAll("iframe")).toHaveLength(5);
    expect(within(winners).queryByRole("button", { name: /^(Preview|Close) / })).toBeNull();
    const expectedPreviews = [
      "https://drive.google.com/file/d/1fZBeddpnRKH0HJV_dgE8nMjxopGAsfRe/preview",
      "https://www.youtube-nocookie.com/embed/xDaCJC97xEM",
      "https://www.youtube-nocookie.com/embed/kjaNAsoMgiI",
      "https://www.youtube-nocookie.com/embed/JEP3DVNbI9s",
      "https://drive.google.com/file/d/1PDyP6Rmb8GovbzjUHvVeCzwNwQcm5rJk/preview",
    ];
    rankedProjects.forEach(([id], index) => {
      const project = ELEVENLABS_SUBMISSIONS.find(project => project.id === id)!;
      const frame = within(entries[index]).getByTitle(`${project.title} winner video preview`);
      expect(frame).toBeVisible();
      expect(frame).toHaveAttribute("src", expect.stringContaining(expectedPreviews[index]));
      expect(frame).toHaveAttribute("loading", "lazy");
      expect(frame).not.toHaveAttribute("allow", expect.stringContaining("autoplay"));
      const original = within(entries[index]).getAllByRole("link").find(link => link.getAttribute("href") === project.videoUrl)!;
      expect(original).toBeVisible();
      expect(original).toHaveAttribute("rel", "noopener noreferrer");
    });
    expect(container.querySelector(".elevenlabs-submission-grid iframe, .elevenlabs-submission-grid video")).toBeNull();
  });

  it("places winners before the complete collection and links each winner to exactly one existing card", () => {
    const { container } = show();
    const winners = screen.getByRole("region", { name: "Top 5 winners" });
    const cards = screen.getAllByRole("article");
    expect(cards).toHaveLength(14);
    expect(winners.compareDocumentPosition(cards[0]) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    for (const link of within(winners).getAllByRole("link", { name: /^Explore \w+ place project/ })) {
      const id = new URL(link.getAttribute("href")!, "https://example.com").hash.slice(1);
      const card = document.getElementById(id)!;
      expect(cards).toContain(card);
      expect(link).toHaveAccessibleName(expect.stringContaining(within(card).getByRole("heading").textContent!));
    }
    const ids = [...container.querySelectorAll("[id]")].map(element => element.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("keeps a direct original link when an automatically shown winner preview fails", () => {
    const project = ELEVENLABS_SUBMISSIONS.find(project => project.id === "elevenlabs-tokyo-7")!;
    show([project]);
    const winners = screen.getByRole("region", { name: "Top 5 winners" });
    fireEvent.error(within(winners).getByTitle(`${project.title} winner video preview`));
    expect(within(winners).queryByTitle(`${project.title} winner video preview`)).toBeNull();
    expect(within(winners).getByRole("status")).toBeVisible();
    expect(within(winners).getAllByRole("link").find(link => link.getAttribute("href") === project.videoUrl)).toBeVisible();
    const gallery = screen.getByRole("article", { name: project.title });
    fireEvent.click(within(gallery).getByRole("button", { name: `Preview ${project.title} video` }));
    expect(within(gallery).getByTitle(`${project.title} video preview`)).toBeVisible();
  });

  it("filters winners to available submissions without renumbering or inventing winners", () => {
    const { unmount } = show([playableYoutube()]);
    expect(screen.queryByRole("region", { name: "Top 5 winners" })).toBeNull();
    unmount();
    show(ELEVENLABS_SUBMISSIONS.filter(project => ["elevenlabs-tokyo-18", "elevenlabs-tokyo-5"].includes(project.id)).reverse());
    const entries = within(screen.getByRole("list", { name: "Top 5 winning projects" })).getAllByRole("listitem");
    expect(entries.map(entry => entry.getAttribute("value"))).toEqual(["4", "5"]);
    expect(entries[0]).toHaveTextContent("Jyan Zarate");
    expect(entries[1]).toHaveTextContent("Mohana Das");
    expect(screen.getAllByRole("article")).toHaveLength(2);
  });
});

describe("ElevenLabs showcase page integration", () => {
  it("shows winners and the entire collection on the homepage with working project navigation", async () => {
    render(<MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><Index /></MemoryRouter>);
    const collection = document.getElementById("elevenlabs-participants")!;
    expect(screen.getByTestId("event-showcase").nextElementSibling).toBe(collection);
    expect(within(collection).getAllByRole("article")).toHaveLength(14);
    expect(screen.getByRole("link", { name: "Explore the meetup" })).toHaveAttribute("href", `/events/${ELEVENLABS_MEETUP.id}`);
    const winners = within(collection).getByRole("region", { name: "Top 5 winners" });
    const winnerLink = within(winners).getByRole("link", { name: /^Explore 1st place project/ });
    fireEvent.click(winnerLink);
    const card = document.getElementById("elevenlabs-participants-elevenlabs-tokyo-10")!;
    await waitFor(() => expect(mocks.scroll.mock.instances[mocks.scroll.mock.instances.length - 1]).toBe(card));
    mocks.scroll.mockClear();
    fireEvent.click(winnerLink);
    expect(mocks.scroll.mock.instances).toEqual([card]);
  });

  it("links event project CTAs and direct hash navigation to the imported participants", async () => {
    render(<MemoryRouter initialEntries={[`/events/${ELEVENLABS_MEETUP.id}#participants`]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Routes><Route path="/events/:hackathonId" element={<GeneratedHackathonPage />} /></Routes>
    </MemoryRouter>);
    const collection = document.getElementById("participants")!;
    expect(within(collection).getAllByRole("article")).toHaveLength(14);
    await waitFor(() => expect(mocks.scroll).toHaveBeenCalled());
    expect(mocks.scroll.mock.instances).toContain(collection);
    expect(screen.getByRole("link", { name: "Participant projects" })).toHaveAttribute("href", "#participants");
    await waitFor(() => expect(screen.getAllByRole("link", { name: "Browse event projects" })).toHaveLength(2));
    for (const link of screen.getAllByRole("link", { name: "Browse event projects" })) expect(link).toHaveAttribute("href", `/events/${ELEVENLABS_MEETUP.id}#participants`);
    const winners = within(collection).getByRole("region", { name: "Top 5 winners" });
    fireEvent.click(within(winners).getByRole("link", { name: /^Explore 5th place project/ }));
    const card = document.getElementById("participants-elevenlabs-tokyo-5")!;
    await waitFor(() => expect(mocks.scroll.mock.instances[mocks.scroll.mock.instances.length - 1]).toBe(card));
    expect(within(card).getByRole("heading", { name: "Keigo sitcom" })).toBeVisible();
  });

  it("does not attach these participants to another event or replace its projects destination", async () => {
    mocks.fetchEvent.mockResolvedValue({ ...ELEVENLABS_MEETUP, id: "another-event", name: "Another event", status: "past" });
    render(<MemoryRouter initialEntries={["/events/another-event"]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Routes><Route path="/events/:hackathonId" element={<GeneratedHackathonPage />} /></Routes>
    </MemoryRouter>);
    await screen.findByRole("heading", { name: "Another event", level: 1 });
    expect(document.getElementById("participants")).toBeNull();
    expect(screen.queryByRole("link", { name: "Participant projects" })).toBeNull();
    for (const link of screen.getAllByRole("link", { name: "Browse event projects" })) expect(link).toHaveAttribute("href", "/projects?event=another-event");
  });
});
