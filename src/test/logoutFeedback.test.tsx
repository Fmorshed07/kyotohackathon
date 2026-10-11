import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import SiteHeader from "@/components/SiteHeader";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";

const mocks = vi.hoisted(() => ({ signOut: vi.fn(), error: vi.fn() }));
vi.mock("sonner", () => ({ toast: { error: mocks.error } }));
vi.mock("@/hooks/usePortalAuth", () => ({ usePortalAuth: () => ({ sessionUser: { id: "judge", email: "judge@example.com", role: "judge" }, signOut: mocks.signOut }) }));
vi.mock("@/components/GoogleTranslate", () => ({ default: () => null }));
vi.mock("@/components/BrandLogo", () => ({ default: () => <span>Cognisor</span> }));

function CurrentPath() { return <p data-testid="current-path">{useLocation().pathname}</p>; }

beforeEach(() => { vi.clearAllMocks(); mocks.signOut.mockRejectedValue(new Error("Network unavailable")); });
afterEach(cleanup);

describe("sign-out failures", () => {
  it("shows a retry message and keeps the header on the current page", async () => {
    render(<MemoryRouter initialEntries={["/work"]}><SiteHeader /><CurrentPath /></MemoryRouter>);
    fireEvent.click(screen.getByRole("button", { name: "Log out" }));
    await waitFor(() => expect(mocks.error).toHaveBeenCalledWith("Could not sign out. Please try again."));
    expect(screen.getByRole("button", { name: "Log out" })).toBeEnabled();
    expect(screen.getByTestId("current-path")).toHaveTextContent("/work");
  });

  it("keeps dashboard sign-out retryable when Firebase rejects the request", async () => {
    render(<MemoryRouter initialEntries={["/dashboard/judge"]}><DashboardLayout sessionUser={{ id: "judge", email: "judge@example.com", role: "judge" }} role="judge" onSignOut={mocks.signOut}><p>Scoring workspace</p></DashboardLayout><CurrentPath /></MemoryRouter>);
    fireEvent.click(screen.getByRole("button", { name: "Sign out" }));
    await waitFor(() => expect(mocks.error).toHaveBeenCalledWith("Could not sign out. Please try again."));
    expect(screen.getByRole("button", { name: "Sign out" })).toBeEnabled();
    expect(screen.getByTestId("current-path")).toHaveTextContent("/dashboard/judge");
  });
});
