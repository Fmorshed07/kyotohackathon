import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { EventReportSection } from "@/components/hackathons/EventReportSection";
import EventReportsPage from "@/pages/EventReportsPage";
import { IMPACT_OSAKA } from "@/lib/impactOsaka";
import type { HostedHackathon } from "@/lib/aiHackathons";
import type { PublicEventReport } from "@/lib/eventReports";

const mocks = vi.hoisted(() => ({ reports: vi.fn(), catalog: vi.fn(), retry: vi.fn() }));
vi.mock("@/lib/eventReports", async original => ({
  ...await original<typeof import("@/lib/eventReports")>(),
  getEventReport: mocks.reports,
  getEventReportHref: (id: string) => `/reports?event=${encodeURIComponent(id)}`,
}));
vi.mock("@/hooks/useCommunityEvents", () => ({ useCommunityEvents: mocks.catalog }));
vi.mock("@/components/AnimatedBackground", () => ({ default: () => null }));
vi.mock("@/components/SiteHeader", () => ({ default: () => <header>Public navigation</header> }));

function report(event: HostedHackathon, patch: Partial<PublicEventReport> = {}): PublicEventReport {
  return {
    eventId: event.id, eventName: event.name, eventDate: event.eventDate, location: event.location,
    summary: "A review based on published event records and organizer reporting.", checkedAt: "2026-11-03",
    metrics: [
      { id: "registrations", label: "Approved registrations", value: 80, definition: "Approved event registrations, not confirmed attendance.", sourceLabel: "Organizer registration summary", sourceUrl: "https://luma.com/jnwil7tv", asOf: "2026-10-18" },
      { id: "attendance", label: "Confirmed attendance", value: null, definition: "A confirmed attendance count has not been published.", sourceLabel: "Not measured", asOf: "2026-11-03" },
      { id: "projects", label: "Published projects", value: 0, definition: "Projects included in this dated public snapshot.", sourceLabel: "Public project snapshot", asOf: "2026-11-03" },
    ],
    sources: [{ id: "official", platform: "Luma", title: "Official event listing", url: "https://luma.com/jnwil7tv", note: "Programme and registration context.", checkedAt: "2026-11-03" }],
    review: { strengths: ["One shared challenge made the brief easy to follow."], improvements: ["Publish a clearly defined attendance count."] },
    coverage: { instagram: "Event reach has not been published.", linkedin: "The official post documents the event; impressions are unavailable." },
    ...patch,
  };
}

const tokyo = { ...IMPACT_OSAKA, id: "impact-tokyo", name: "Impact Tokyo 2026", shortName: "Tokyo", location: "Tokyo, Japan" };
function Location() { const location = useLocation(); return <span aria-label="Current URL">{location.pathname}{location.search}</span>; }
function showPage(path = "/reports") {
  return render(<MemoryRouter initialEntries={[path]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><EventReportsPage /><Location /></MemoryRouter>);
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.reports.mockImplementation((event: HostedHackathon) => report(event));
  mocks.catalog.mockReturnValue({ events: [IMPACT_OSAKA, tokyo], isLoading: false, isError: false, refetch: mocks.retry });
});
afterEach(cleanup);

describe("public event report", () => {
  it("distinguishes unavailable values from measured zero and shows each figure's basis and date", () => {
    render(<MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><EventReportSection event={IMPACT_OSAKA} /></MemoryRouter>);
    const metrics = within(screen.getByLabelText("Event report metrics"));
    const approved = within(metrics.getByRole("article", { name: "Approved registrations" }));
    expect(approved.getByText("80")).toBeVisible();
    expect(approved.getByText(/not confirmed attendance/)).toBeVisible();
    expect(approved.getByText("Oct 18, 2026")).toHaveAttribute("datetime", "2026-10-18");
    expect(approved.getByRole("link", { name: "Organizer registration summary" })).toHaveAttribute("href", "https://luma.com/jnwil7tv");
    const attendance = within(metrics.getByRole("article", { name: "Confirmed attendance" }));
    expect(attendance.getByText("Not available")).toBeVisible();
    expect(attendance.queryByText("0")).not.toBeInTheDocument();
    const projects = within(metrics.getByRole("article", { name: "Published projects" }));
    expect(projects.getAllByText("0")).toHaveLength(2);
    expect(within(projects.getByRole("group", { name: /3× planning target/ })).getByText("0")).toBeVisible();
    expect(screen.getByRole("heading", { name: "Social coverage" })).toBeVisible();
    expect(screen.getByText("Event reach has not been published.")).toBeVisible();
    expect(screen.getByText("One shared challenge made the brief easy to follow.")).toBeVisible();
    expect(screen.getByText("Publish a clearly defined attendance count.")).toBeVisible();
    expect(screen.getByText(/Social views and interactions may overlap/)).toBeVisible();
  });

  it("places illustrative threefold targets beside recorded figures without inventing missing baselines", () => {
    const baseline = report(IMPACT_OSAKA, { metrics: [
      ...report(IMPACT_OSAKA).metrics,
      { id: "programme-hours", label: "Scheduled programme hours", value: 4, definition: "Published programme duration.", sourceLabel: "Programme", asOf: "2026-10-18" },
    ] });
    const before = JSON.stringify(baseline);
    mocks.reports.mockReturnValue(baseline);
    render(<MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><EventReportSection event={IMPACT_OSAKA} /></MemoryRouter>);
    const registrations = within(screen.getByRole("article", { name: "Approved registrations" }));
    expect(registrations.getByText("80")).toBeVisible();
    const target = within(registrations.getByRole("group", { name: /3× planning target/ }));
    expect(target.getByText("240")).toBeVisible();
    expect(target.getByText(/Baseline × 3 · illustrative/)).toBeVisible();
    expect(registrations.getByText("Oct 18, 2026")).toHaveAttribute("datetime", "2026-10-18");
    expect(within(screen.getByRole("article", { name: "Confirmed attendance" })).queryByRole("group", { name: /3× planning target/ })).toBeNull();
    const programme = within(screen.getByRole("article", { name: "Scheduled programme hours" }));
    expect(programme.getByText("4")).toBeVisible();
    expect(within(programme.getByRole("group", { name: /3× planning target/ })).getByText("12")).toBeVisible();
    expect(JSON.stringify(baseline)).toBe(before);
  });

  it("links reviewed HTTPS sources safely and ignores private fields on the supplied event", () => {
    const event = { ...IMPACT_OSAKA, participantEmail: "private@example.test", registrationEmails: ["hidden@example.test"] };
    const { container } = render(<MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><EventReportSection event={event} /></MemoryRouter>);
    const source = screen.getByRole("link", { name: "Official event listing" });
    expect(source).toHaveAttribute("target", "_blank");
    expect(source).toHaveAttribute("rel", "noreferrer");
    expect(container.innerHTML).not.toMatch(/private@example|hidden@example|mailto:/);
    expect(screen.getByRole("link", { name: "All event reports" })).toHaveAttribute("href", "/reports");
  });

  it("leaves unsafe source URLs unlinked and provides honest empty evidence and review states", () => {
    mocks.reports.mockReturnValue(report(IMPACT_OSAKA, {
      metrics: [{ id: "unknown", label: "Reach", value: null, definition: "Reach was not measured.", sourceLabel: "Unverified link", sourceUrl: "javascript:alert(1)", asOf: "" }],
      sources: [{ id: "unsafe", platform: "Organizer", title: "Unverified source", url: "https://user:password@example.test", note: "No safe public link.", checkedAt: "invalid" }],
      review: { strengths: [], improvements: [] },
    }));
    const view = render(<MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><EventReportSection event={IMPACT_OSAKA} /></MemoryRouter>);
    expect(screen.queryByRole("link", { name: "Unverified link" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Unverified source" })).toBeNull();
    expect(screen.getAllByText("A review has not been published yet.")).toHaveLength(2);
    mocks.reports.mockReturnValue(report(IMPACT_OSAKA, { sources: [] }));
    view.rerender(<MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><EventReportSection event={IMPACT_OSAKA} /></MemoryRouter>);
    expect(screen.getByText("Supporting sources have not been published for this event yet.")).toBeVisible();
  });
});

describe("all public event reports", () => {
  it("opens a legacy event by query and switches reports without retaining the previous event", () => {
    showPage("/reports?event=impact-tokyo&source=events");
    expect(screen.getByRole("region", { name: "Impact Tokyo 2026 — report" })).toBeVisible();
    fireEvent.change(screen.getByRole("combobox", { name: "Choose an event report" }), { target: { value: IMPACT_OSAKA.id } });
    expect(screen.getByRole("region", { name: `${IMPACT_OSAKA.name} — report` })).toBeVisible();
    expect(screen.queryByRole("region", { name: "Impact Tokyo 2026 — report" })).toBeNull();
    expect(screen.getByLabelText("Current URL")).toHaveTextContent(`/reports?event=${IMPACT_OSAKA.id}&source=events`);
    fireEvent.click(screen.getByRole("button", { name: "Show all event reports" }));
    expect(screen.getByLabelText("Current URL")).toHaveTextContent("/reports?source=events");
    expect(screen.queryByRole("region", { name: `${IMPACT_OSAKA.name} — report` })).toBeNull();
  });

  it("lists every catalog event, including reports with no published figures, and searches by location", () => {
    mocks.reports.mockImplementation((event: HostedHackathon) => report(event, { metrics: [] }));
    showPage();
    expect(screen.getByRole("link", { name: "View report for Impact Tokyo 2026" })).toHaveAttribute("href", "/reports?event=impact-tokyo");
    expect(screen.getAllByText("Event context and evidence availability")).toHaveLength(2);
    fireEvent.change(screen.getByRole("textbox", { name: "Search events" }), { target: { value: "Tokyo, Japan" } });
    expect(screen.getByRole("link", { name: "View report for Impact Tokyo 2026" })).toBeVisible();
    expect(screen.queryByRole("link", { name: `View report for ${IMPACT_OSAKA.name}` })).toBeNull();
    fireEvent.change(screen.getByRole("textbox", { name: "Search events" }), { target: { value: "No matching place" } });
    expect(screen.getByText("No event reports match your search.")).toBeVisible();
  });

  it("does not resolve a report outside the public catalog and offers catalog retry", () => {
    mocks.catalog.mockReturnValue({ events: [IMPACT_OSAKA], isLoading: false, isError: true, refetch: mocks.retry });
    showPage("/reports?event=unpublished-event");
    expect(screen.getByText("This event report is unavailable")).toBeVisible();
    expect(screen.queryByRole("region", { name: /— report/ })).toBeNull();
    expect(mocks.reports.mock.calls.every(([event]: [HostedHackathon]) => event.id === IMPACT_OSAKA.id)).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "Retry event reports" }));
    expect(mocks.retry).toHaveBeenCalledOnce();
  });

  it("resolves a legacy report link to its verified public archive alias when the live catalog is unavailable", () => {
    const archive = { ...tokyo, id: "luma-2f3omvqa", lumaUrl: "https://luma.com/2f3omvqa" };
    mocks.catalog.mockReturnValue({ events: [archive], isLoading: false, isError: true, refetch: mocks.retry });
    showPage("/reports?event=impact-tokyo");
    expect(screen.getByRole("region", { name: "Impact Tokyo 2026 — report" })).toBeVisible();
    expect(screen.getByRole("combobox", { name: "Choose an event report" })).toHaveValue(archive.id);
    expect(screen.getByRole("link", { name: "View report for Impact Tokyo 2026" })).toHaveAttribute("aria-current", "page");
  });

  it("shows loading and an empty public catalog without inventing an event", () => {
    mocks.catalog.mockReturnValue({ events: [], isLoading: true, isError: false, refetch: mocks.retry });
    const view = showPage();
    expect(screen.getByRole("status")).toHaveTextContent("Loading event reports");
    expect(screen.getByRole("combobox", { name: "Choose an event report" })).toBeDisabled();
    mocks.catalog.mockReturnValue({ events: [], isLoading: false, isError: false, refetch: mocks.retry });
    view.rerender(<MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><EventReportsPage /></MemoryRouter>);
    expect(screen.getByText("No event reports are available yet.")).toBeVisible();
    expect(mocks.reports).not.toHaveBeenCalled();
  });

  it("compares six sourced Luma Went labels without mixing other metrics or adding an audience total", () => {
    const values = [126, 66, 65, 52, 47, 46];
    const comparable = values.map((_, index) => ({ ...tokyo, id: `comparable-${index}`, name: `Source event ${index + 1}` }));
    const unknown = { ...tokyo, id: "unknown-went", name: "Unknown Went event" };
    const programmeOnly = { ...tokyo, id: "programme-only", name: "Programme only event" };
    mocks.catalog.mockReturnValue({ events: [...comparable, unknown, programmeOnly], isLoading: false, isError: false, refetch: mocks.retry });
    mocks.reports.mockImplementation((event: HostedHackathon) => report(event, { metrics: [
      { id: "luma-went", label: "Luma Went", value: comparable.findIndex(row => row.id === event.id) >= 0 ? values[comparable.findIndex(row => row.id === event.id)] : null, definition: "A public platform label.", sourceLabel: "Luma listing", sourceUrl: `https://luma.com/${event.id}`, asOf: "2026-11-03" },
      { id: "programme-hours", label: "Programme hours", value: 4, definition: "Scheduled duration.", sourceLabel: "Programme", asOf: "2026-11-03" },
      { id: "portalParticipantAccounts", label: "Portal participant accounts", value: 80, definition: "Recorded platform membership.", sourceLabel: "Snapshot", asOf: "2026-11-03" },
    ] }));
    showPage();
    const comparison = within(screen.getByRole("region", { name: "Published Luma figures" }));
    const rows = within(comparison.getByRole("list", { name: "Published Luma Went figures" })).getAllByRole("listitem");
    expect(rows).toHaveLength(6);
    values.forEach((value, index) => {
      const row = within(rows[index]);
      expect(row.getByRole("heading", { name: comparable[index].name })).toBeVisible();
      expect(row.getByText(String(value))).toBeVisible();
      expect(within(row.getByRole("group", { name: /3× planning target/ })).getByText(String(value * 3))).toBeVisible();
      expect(row.getByText("Nov 3, 2026")).toHaveAttribute("datetime", "2026-11-03");
      expect(row.getByRole("link", { name: `Luma source for ${comparable[index].name}` })).toHaveAttribute("href", `https://luma.com/${comparable[index].id}`);
      expect(row.getByRole("link", { name: `Open report for ${comparable[index].name}` })).toHaveAttribute("href", `/reports?event=${comparable[index].id}`);
    });
    expect(comparison.queryByText("Unknown Went event")).toBeNull();
    expect(comparison.queryByText("Programme only event")).toBeNull();
    expect(comparison.queryByText(/Programme hours|Portal participant accounts|Total audience/)).toBeNull();
    expect(comparison.queryByText("402")).toBeNull();
    expect(comparison.getByText(/audiences may overlap. These are not audited attendance/)).toBeVisible();
    fireEvent.change(screen.getByRole("combobox", { name: "Choose an event report" }), { target: { value: comparable[0].id } });
    expect(screen.queryByRole("region", { name: "Published Luma figures" })).toBeNull();
  });
});
