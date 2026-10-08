import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { SessionUser } from "@/types/portal";
import SignIn from "@/pages/SignIn";

const mocks = vi.hoisted(() => ({
  sessionUser: null as SessionUser | null,
  db: {},
  auth: {},
  fetchEvent: vi.fn(),
  setDoc: vi.fn(),
  popup: vi.fn(),
}));

vi.mock("@/lib/firebaseClient", () => ({ getFirebaseAuth: () => mocks.auth, getFirestoreDb: () => mocks.db }));
vi.mock("@/hooks/usePortalAuth", () => ({ usePortalAuth: () => ({ sessionUser: mocks.sessionUser, loading: false }) }));
vi.mock("@/lib/aiHackathons", () => ({ fetchAiHackathon: mocks.fetchEvent }));
vi.mock("firebase/firestore", async (importOriginal) => ({ ...await importOriginal<typeof import("firebase/firestore")>(), doc: vi.fn(), setDoc: mocks.setDoc }));
vi.mock("firebase/auth", async (importOriginal) => ({ ...await importOriginal<typeof import("firebase/auth")>(), signInWithPopup: mocks.popup }));
vi.mock("@/components/AnimatedBackground", () => ({ default: () => null }));
vi.mock("@/components/BrandLogo", () => ({ default: () => <span>Cognisor</span> }));

const renderSignup = () => render(<MemoryRouter initialEntries={["/signup?hackathon=ended-ideathon"]}><Routes><Route path="/signup" element={<SignIn />} /><Route path="/dashboard/participant" element={<p>Participant workspace</p>} /></Routes></MemoryRouter>);

describe("closed-event signup", () => {
  beforeEach(() => {
    mocks.sessionUser = null;
    mocks.fetchEvent.mockReset().mockResolvedValue({ id: "ended-ideathon", published: true, status: "past", registrationStatus: "closed" });
    mocks.popup.mockReset();
    mocks.setDoc.mockReset();
    sessionStorage.clear();
  });
  afterEach(cleanup);

  it("shows closure before Google signup and performs no enrollment write", async () => {
    renderSignup();
    expect(await screen.findByRole("alert")).toHaveTextContent("This event has ended. Registration is closed.");
    expect(screen.getByRole("button", { name: "Sign up as participant" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Sign up as participant" }));
    expect(mocks.popup).not.toHaveBeenCalled();
    expect(mocks.setDoc).not.toHaveBeenCalled();
  });

  it("reports closure for a signed-in participant without adding event membership", async () => {
    mocks.sessionUser = { id: "builder", email: "builder@example.com", role: "participant", hackathonIds: ["another-event"], onboardingCompletedAt: "2026-01-01" };
    renderSignup();
    expect(await screen.findByRole("alert")).toHaveTextContent("This event has ended. Registration is closed.");
    expect(screen.getByRole("link", { name: "Open your workspace" })).toHaveAttribute("href", "/dashboard/participant");
    expect(mocks.setDoc).not.toHaveBeenCalled();
    expect(mocks.popup).not.toHaveBeenCalled();
  });

  it("opens the workspace for an already-enrolled participant without a registration write", async () => {
    mocks.sessionUser = { id: "builder", email: "builder@example.com", role: "participant", hackathonIds: ["ended-ideathon"], onboardingCompletedAt: "2026-01-01" };
    renderSignup();
    await waitFor(() => expect(screen.getByText("Participant workspace")).toBeInTheDocument());
    expect(mocks.setDoc).not.toHaveBeenCalled();
    expect(mocks.popup).not.toHaveBeenCalled();
  });

  it("keeps ordinary Google login available after a closed signup selection", async () => {
    renderSignup();
    await screen.findByRole("alert");
    fireEvent.click(screen.getByRole("button", { name: "Log In" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Log in as participant" })).toBeEnabled());
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(mocks.popup).not.toHaveBeenCalled();
  });
});
