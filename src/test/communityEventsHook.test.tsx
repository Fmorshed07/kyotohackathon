import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useCommunityEvents } from "@/hooks/useCommunityEvents";
import { ELEVENLABS_MEETUP } from "@/lib/elevenLabsMeetup";
import { hostedToPortalHackathon } from "@/lib/aiHackathons";

const mocks = vi.hoisted(() => ({ published: vi.fn(), catalog: vi.fn() }));
vi.mock("@/lib/aiHackathons", async original => ({ ...await original<typeof import("@/lib/aiHackathons")>(), fetchPublishedHackathons: mocks.published, fetchPortalHackathonCatalog: mocks.catalog }));
vi.mock("@/lib/firebaseClient", () => ({ getFirestoreDb: () => ({}) }));
afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); vi.clearAllMocks(); });

function setup() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  return { client, ...renderHook(() => useCommunityEvents(), { wrapper }) };
}

describe("shared community catalog", () => {
  it("keeps organiser artwork and excludes events omitted by the approved public catalog", async () => {
    vi.spyOn(Date, "now").mockReturnValue(Date.parse("2026-10-09T00:00:00Z"));
    mocks.published.mockResolvedValue([ELEVENLABS_MEETUP, { ...ELEVENLABS_MEETUP, id: "hidden-event" }]);
    mocks.catalog.mockResolvedValue([hostedToPortalHackathon(ELEVENLABS_MEETUP)]);
    const view = setup();
    await waitFor(() => expect(view.result.current.isSuccess).toBe(true));
    expect(view.result.current.events).toHaveLength(11);
    expect(view.result.current.events.some(event => event.id === "hidden-event")).toBe(false);
    expect(view.result.current.events[0].coverImageUrl).toBe(ELEVENLABS_MEETUP.coverImageUrl);
    view.unmount(); view.client.clear();
  });
  it("updates the clock at a start boundary without requiring a page refresh", async () => {
    mocks.published.mockResolvedValue([ELEVENLABS_MEETUP]);
    mocks.catalog.mockResolvedValue([hostedToPortalHackathon(ELEVENLABS_MEETUP)]);
    const view = setup();
    await waitFor(() => expect(view.result.current.isSuccess).toBe(true));
    vi.useFakeTimers();
    const start = Date.parse(ELEVENLABS_MEETUP.startAt!);
    vi.setSystemTime(start - 1000);
    act(() => document.dispatchEvent(new Event("visibilitychange")));
    expect(view.result.current.now).toBe(start - 1000);
    act(() => vi.advanceTimersByTime(1000));
    expect(view.result.current.now).toBe(start);
    view.unmount(); view.client.clear();
  });
});
