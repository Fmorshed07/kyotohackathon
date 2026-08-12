import { describe, expect, it, beforeEach } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useSearchParams } from "react-router-dom";
import type { ReactNode } from "react";
import { useHackathonSelection } from "@/hooks/useHackathonSelection";
import {
  PORTAL_HACKATHONS,
  SITE_HACKATHON_ID,
  type PortalHackathon,
} from "@/lib/hackathons";

const hostedIdeathonId = "ai-ideathon-2026-q9pxii";

const catalogWithIdeathon: PortalHackathon[] = [
  ...PORTAL_HACKATHONS,
  {
    id: hostedIdeathonId,
    name: "AI Ideathon 2026",
    shortName: "AI Ideathon",
    eventDate: "Aug 12–14, 2026",
    location: "Online",
    theme: "Live theme",
    status: "active",
  },
];

function wrapperFor(initialEntry: string) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <MemoryRouter initialEntries={[initialEntry]}>
        <Routes>
          <Route path="*" element={children} />
        </Routes>
      </MemoryRouter>
    );
  };
}

describe("useHackathonSelection url sync", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("keeps URL and selection aligned when the URL pins a past edition", async () => {
    const { result } = renderHook(
      () =>
        useHackathonSelection("test_admin", undefined, catalogWithIdeathon, {
          syncUrl: true,
          preferCurrent: true,
        }),
      { wrapper: wrapperFor(`/dashboard/admin?hackathon=${SITE_HACKATHON_ID}`) },
    );

    await waitFor(() => {
      expect(result.current.selectedHackathonId).toBe(SITE_HACKATHON_ID);
      expect(result.current.selectedHackathon.name).toBe("Impact Kyoto 2026");
    });
  });

  it("updates the URL when the user switches events", async () => {
    const { result } = renderHook(
      () => {
        const selection = useHackathonSelection("test_admin", undefined, catalogWithIdeathon, {
          syncUrl: true,
          preferCurrent: true,
        });
        const [params] = useSearchParams();
        return { ...selection, urlHackathon: params.get("hackathon") };
      },
      { wrapper: wrapperFor(`/dashboard/admin?hackathon=${SITE_HACKATHON_ID}`) },
    );

    await waitFor(() => {
      expect(result.current.selectedHackathonId).toBe(SITE_HACKATHON_ID);
    });

    act(() => {
      result.current.setSelectedHackathonId(hostedIdeathonId);
    });

    await waitFor(() => {
      expect(result.current.selectedHackathonId).toBe(hostedIdeathonId);
      expect(result.current.urlHackathon).toBe(hostedIdeathonId);
      expect(result.current.selectedHackathon.name).toBe("AI Ideathon 2026");
    });
  });

  it("does not leave URL on Kyoto while selection shows Ideathon", async () => {
    window.localStorage.setItem("test_admin", hostedIdeathonId);

    const { result } = renderHook(
      () => {
        const selection = useHackathonSelection("test_admin", undefined, catalogWithIdeathon, {
          syncUrl: true,
          preferCurrent: true,
        });
        const [params] = useSearchParams();
        return { ...selection, urlHackathon: params.get("hackathon") };
      },
      { wrapper: wrapperFor(`/dashboard/admin?hackathon=${SITE_HACKATHON_ID}`) },
    );

    await waitFor(() => {
      expect(result.current.selectedHackathonId).toBe(SITE_HACKATHON_ID);
      expect(result.current.urlHackathon).toBe(SITE_HACKATHON_ID);
    });

    // Stays matched — never Ideathon-in-UI with Kyoto-in-URL.
    expect(result.current.selectedHackathonId).toBe(result.current.urlHackathon);
  });

  it("upgrades to the live event when no URL pin is present", async () => {
    window.localStorage.setItem("test_admin", SITE_HACKATHON_ID);

    const { result } = renderHook(
      () => {
        const selection = useHackathonSelection("test_admin", undefined, catalogWithIdeathon, {
          syncUrl: true,
          preferCurrent: true,
        });
        const [params] = useSearchParams();
        return { ...selection, urlHackathon: params.get("hackathon") };
      },
      { wrapper: wrapperFor("/dashboard/admin") },
    );

    await waitFor(() => {
      expect(result.current.selectedHackathonId).toBe(hostedIdeathonId);
      expect(result.current.urlHackathon).toBe(hostedIdeathonId);
    });
  });

  it("keeps a user switch even before the URL write lands", async () => {
    const { result } = renderHook(
      () => {
        const selection = useHackathonSelection("test_admin", undefined, catalogWithIdeathon, {
          syncUrl: true,
          preferCurrent: true,
        });
        const [params] = useSearchParams();
        return { ...selection, urlHackathon: params.get("hackathon") };
      },
      { wrapper: wrapperFor(`/dashboard/admin?hackathon=${SITE_HACKATHON_ID}`) },
    );

    await waitFor(() => {
      expect(result.current.selectedHackathonId).toBe(SITE_HACKATHON_ID);
    });

    act(() => {
      result.current.setSelectedHackathonId(hostedIdeathonId);
    });

    // Immediate: UI must show the click target (not snap back to Kyoto).
    expect(result.current.selectedHackathonId).toBe(hostedIdeathonId);

    await waitFor(() => {
      expect(result.current.urlHackathon).toBe(hostedIdeathonId);
      expect(result.current.selectedHackathonId).toBe(hostedIdeathonId);
    });
  });

  it("can switch back to a past edition from a live one", async () => {
    const { result } = renderHook(
      () => {
        const selection = useHackathonSelection("test_admin", undefined, catalogWithIdeathon, {
          syncUrl: true,
          preferCurrent: true,
        });
        const [params] = useSearchParams();
        return { ...selection, urlHackathon: params.get("hackathon") };
      },
      { wrapper: wrapperFor(`/dashboard/admin?hackathon=${hostedIdeathonId}`) },
    );

    await waitFor(() => {
      expect(result.current.selectedHackathonId).toBe(hostedIdeathonId);
    });

    act(() => {
      result.current.setSelectedHackathonId(SITE_HACKATHON_ID);
    });

    await waitFor(() => {
      expect(result.current.selectedHackathonId).toBe(SITE_HACKATHON_ID);
      expect(result.current.urlHackathon).toBe(SITE_HACKATHON_ID);
      expect(result.current.selectedHackathon.name).toBe("Impact Kyoto 2026");
    });
  });
});
