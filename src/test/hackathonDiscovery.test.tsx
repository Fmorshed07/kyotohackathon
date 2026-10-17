import type { ComponentProps } from "react";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { HackathonDiscoveryDialog } from "@/components/dashboard/HackathonDiscoveryDialog";
import type { PortalHackathon } from "@/lib/hackathons";

const events: PortalHackathon[] = [
  {
    id: "impact-osaka-2026",
    name: "Impact Osaka 2026",
    shortName: "Impact Osaka",
    eventDate: "18 October 2026 · 10:00–19:00 JST",
    location: "Osaka, Japan",
    theme: "Create AI video for local communities",
    status: "active",
    bannerImageUrl: "https://images.example.test/osaka-banner.webp",
    coverImageUrl: "https://images.example.test/osaka-cover.webp",
  },
  {
    id: "global-builders-sprint",
    name: "Global Builders Sprint",
    shortName: "Builders Sprint",
    eventDate: "24 October 2026",
    location: "Singapore",
    theme: "Climate agents",
    status: "upcoming",
  },
];

function showDialog(overrides: Partial<ComponentProps<typeof HackathonDiscoveryDialog>> = {}) {
  const props: ComponentProps<typeof HackathonDiscoveryDialog> = {
    open: true,
    onOpenChange: vi.fn(),
    hackathons: events,
    onJoin: vi.fn().mockResolvedValue(true),
    ...overrides,
  };
  const view = render(<HackathonDiscoveryDialog {...props} />);
  return { ...view, props };
}

function deferred() {
  let resolve!: (joined: boolean) => void;
  const promise = new Promise<boolean>((done) => { resolve = done; });
  return { promise, resolve };
}

afterEach(cleanup);

describe("hackathon discovery", () => {
  it("previews real event artwork and details without enrolling or replacing the current workspace", () => {
    const { props } = showDialog();
    expect(screen.getByRole("dialog", { name: "Join another hackathon" })).toBeInTheDocument();
    const osaka = screen.getByRole("article", { name: events[0].name });
    expect(within(osaka).getByRole("img", { name: "Impact Osaka 2026 poster" })).toHaveAttribute("src", events[0].bannerImageUrl);
    expect(within(osaka).getByText(events[0].eventDate)).toBeInTheDocument();
    expect(within(osaka).getByText(events[0].location)).toBeInTheDocument();
    expect(within(osaka).getByText(events[0].theme)).toBeInTheDocument();
    expect(within(osaka).getByText("Active")).toBeInTheDocument();
    const preview = within(osaka).getByRole("link", { name: "Preview Impact Osaka 2026 (opens in a new tab)" });
    expect(preview).toHaveAttribute("href", "/events/impact-osaka-2026");
    expect(preview).toHaveAttribute("target", "_blank");
    expect(preview).toHaveAttribute("rel", "noopener noreferrer");
    expect(props.onJoin).not.toHaveBeenCalled();
    expect(props.onOpenChange).not.toHaveBeenCalled();
  });

  it("falls back from an unavailable banner to the cover and then to an accessible event card", () => {
    showDialog();
    const osaka = screen.getByRole("article", { name: events[0].name });
    fireEvent.error(within(osaka).getByRole("img"));
    expect(within(osaka).getByRole("img")).toHaveAttribute("src", events[0].coverImageUrl);
    fireEvent.error(within(osaka).getByRole("img"));
    expect(within(osaka).queryByRole("img")).not.toBeInTheDocument();
    expect(within(osaka).getByRole("heading", { name: events[0].name })).toBeInTheDocument();
    expect(within(osaka).getByRole("button", { name: "Join Impact Osaka 2026" })).toBeEnabled();
  });

  it("blocks duplicate and competing joins while pending, then closes only after confirmed success", async () => {
    const pending = deferred();
    const onJoin = vi.fn().mockReturnValue(pending.promise);
    const { props } = showDialog({ onJoin });
    const osaka = screen.getByRole("button", { name: "Join Impact Osaka 2026" });
    const sprint = screen.getByRole("button", { name: "Join Global Builders Sprint" });

    act(() => {
      fireEvent.click(osaka);
      fireEvent.click(sprint);
      fireEvent.click(osaka);
    });
    expect(onJoin).toHaveBeenCalledExactlyOnceWith("impact-osaka-2026");
    expect(osaka).toBeDisabled();
    expect(sprint).toBeDisabled();
    expect(props.onOpenChange).not.toHaveBeenCalled();

    await act(async () => pending.resolve(true));
    expect(props.onOpenChange).toHaveBeenCalledExactlyOnceWith(false);
  });

  it.each(["false", "rejection"])("keeps a %s join retryable instead of closing the discovery dialog", async (failure) => {
    const onJoin = vi.fn();
    if (failure === "false") onJoin.mockResolvedValueOnce(false);
    else onJoin.mockRejectedValueOnce(new Error("Enrollment failed"));
    onJoin.mockResolvedValueOnce(true);
    const { props } = showDialog({ onJoin });

    fireEvent.click(screen.getByRole("button", { name: "Join Impact Osaka 2026" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Could not join this hackathon. Please try again.");
    expect(screen.getByRole("dialog", { name: "Join another hackathon" })).toBeInTheDocument();
    expect(props.onOpenChange).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Join Impact Osaka 2026" })).toBeEnabled();

    fireEvent.click(screen.getByRole("button", { name: "Join Impact Osaka 2026" }));
    await waitFor(() => expect(props.onOpenChange).toHaveBeenCalledExactlyOnceWith(false));
    expect(onJoin).toHaveBeenCalledTimes(2);
  });

  it.each(["Osaka", "jApAn", "video"])("filters by event name, location, or theme using %s", (query) => {
    const { props } = showDialog();
    fireEvent.change(screen.getByRole("searchbox", { name: "Search hackathons" }), { target: { value: query } });
    expect(screen.getByRole("article", { name: events[0].name })).toBeInTheDocument();
    expect(screen.queryByRole("article", { name: events[1].name })).not.toBeInTheDocument();
    expect(props.onJoin).not.toHaveBeenCalled();
  });

  it("distinguishes unmatched search results from an empty catalog and can clear the search", () => {
    showDialog();
    fireEvent.change(screen.getByRole("searchbox", { name: "Search hackathons" }), { target: { value: "astronomy" } });
    expect(screen.getByRole("heading", { name: "No matching hackathons" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^Join / })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Clear search" }));
    expect(screen.getAllByRole("article")).toHaveLength(2);
  });

  it("shows loading without offering stale enrollment actions", () => {
    const { props } = showDialog({ isLoading: true });
    expect(screen.getByRole("status")).toHaveTextContent("Loading open hackathons");
    expect(screen.getByRole("searchbox", { name: "Search hackathons" })).toBeDisabled();
    expect(screen.queryByRole("button", { name: /^Join / })).not.toBeInTheDocument();
    expect(props.onJoin).not.toHaveBeenCalled();
  });

  it("makes a failed catalog load retryable", () => {
    const onRetry = vi.fn();
    showDialog({ error: "Could not load available hackathons.", onRetry });
    expect(screen.getByRole("alert")).toHaveTextContent("Could not load available hackathons.");
    expect(screen.queryByRole("button", { name: /^Join / })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it("does not offer past editions as new enrollments", () => {
    showDialog({ hackathons: [{ ...events[0], status: "past" }] });
    expect(screen.getByRole("heading", { name: "No open hackathons right now" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^Join / })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "View all events" })).toHaveAttribute("target", "_blank");
  });

  it("respects an enrollment already pending elsewhere in the dashboard", () => {
    const { props } = showDialog({ isJoining: true });
    const joins = screen.getAllByRole("button", { name: /^Join / });
    joins.forEach((button) => expect(button).toBeDisabled());
    fireEvent.click(joins[0]);
    expect(props.onJoin).not.toHaveBeenCalled();
  });
});
