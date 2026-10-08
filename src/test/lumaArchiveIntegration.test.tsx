import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import LiveEventsSection from "@/components/sections/LiveEventsSection";

const mocks = vi.hoisted(() => ({ published: vi.fn(), catalog: vi.fn() }));
vi.mock("@/lib/firebaseClient", () => ({ getFirestoreDb: () => ({}) }));
vi.mock("@/lib/aiHackathons", async original => ({ ...await original<typeof import("@/lib/aiHackathons")>(), fetchPublishedHackathons: mocks.published, fetchPortalHackathonCatalog: mocks.catalog }));
beforeEach(() => { vi.spyOn(Date, "now").mockReturnValue(Date.parse("2026-10-09T00:00:00Z")); mocks.published.mockResolvedValue([]); mocks.catalog.mockResolvedValue([]); });
afterEach(() => { cleanup(); vi.restoreAllMocks(); });
const show = () => render(<MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><LiveEventsSection /></MemoryRouter>);

describe("Luma archive on the homepage", () => {
  it("renders the source archive without putting past events in the live spotlight", async () => {
    show();
    await waitFor(() => expect(screen.getByText("No events are live right now")).toBeVisible());
    expect(within(document.getElementById("past-events")!).getAllByRole("article")).toHaveLength(3);
    expect(screen.getByRole("button", { name: "Show all 10 past events" })).toBeVisible();
    expect(screen.queryByRole("link", { name: "View event" })).toBeNull();
  });
  it("retains public past-event links when the live catalog cannot load", async () => {
    mocks.published.mockRejectedValue(new Error("Offline"));
    show();
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("couldn’t load current events"));
    expect(screen.getAllByRole("link", { name: "View on Luma" })).toHaveLength(3);
    expect(screen.getByRole("button", { name: "Show all 10 past events" })).toBeVisible();
  });
});
