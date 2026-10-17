import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { afterEach, describe, expect, it } from "vitest";
import LegacyCommunityRedirect from "@/components/community/LegacyCommunityRedirect";

function DashboardCommunityDestination() {
  const location = useLocation();
  return <main>
    <h1>Dashboard community destination</h1>
    <p data-testid="community-destination">{location.pathname}{location.search}{location.hash}</p>
  </main>;
}

afterEach(cleanup);

describe("legacy community dashboard routing", () => {
  it.each([
    ["/community", "/dashboard/community"],
    ["/community?channel=judges&hackathon=past-ai&ref=dashboard#latest", "/dashboard/community?channel=judges&hackathon=past-ai&ref=dashboard#latest"],
  ])("redirects %s to the dashboard without dropping its channel or event context", (legacyPath, destination) => {
    render(<MemoryRouter initialEntries={[legacyPath]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Routes>
        <Route path="/community" element={<LegacyCommunityRedirect />} />
        <Route path="/dashboard/community" element={<DashboardCommunityDestination />} />
      </Routes>
    </MemoryRouter>);

    expect(screen.getByRole("heading", { name: "Dashboard community destination" })).toBeInTheDocument();
    expect(screen.getByTestId("community-destination")).toHaveTextContent(destination);
  });
});
