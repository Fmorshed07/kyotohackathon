import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { Link, MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Dashboard from "@/pages/Dashboard";
import type { SessionUser } from "@/types/portal";
import { readPendingHackathon, stashPendingHackathon } from "@/lib/hackathons";

const mocks = vi.hoisted(() => ({
  auth: { currentUser: { uid: "account-a" } as { uid: string } | null },
  user: { id: "account-a", email: "a@example.com" } as SessionUser,
  db: {},
  setDoc: vi.fn(),
  signOut: vi.fn(),
}));
vi.mock("@/lib/firebaseClient", () => ({ getFirebaseAuth: () => mocks.auth, getFirestoreDb: () => mocks.db }));
vi.mock("@/hooks/usePortalAuth", () => ({ usePortalAuth: () => ({ sessionUser: mocks.user, loading: false, signOut: mocks.signOut }) }));
vi.mock("firebase/firestore", () => ({
  doc: (_db: unknown, collection: string, id: string) => ({ path: `${collection}/${id}` }),
  setDoc: mocks.setDoc,
  deleteField: () => "delete-field",
}));

function CurrentPath() { const location = useLocation(); return <p data-testid="path">{location.pathname}{location.search}</p>; }
function page() {
  return <MemoryRouter initialEntries={["/dashboard"]}>
    <Link to="/other">Leave setup</Link>
    <Routes>
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/onboarding" element={<p>Participant onboarding</p>} />
      <Route path="/other" element={<p>Another page</p>} />
    </Routes>
    <CurrentPath />
  </MemoryRouter>;
}
function deferred() {
  let resolve!: () => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<void>((done, fail) => { resolve = done; reject = fail; });
  return { promise, resolve, reject };
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.auth.currentUser = { uid: "account-a" };
  mocks.user = { id: "account-a", email: "a@example.com" };
  mocks.setDoc.mockReset().mockResolvedValue(undefined);
  mocks.signOut.mockReset().mockResolvedValue(undefined);
  sessionStorage.clear();
});
afterEach(cleanup);

describe("dashboard account actions", () => {
  it("completes enrollment for the current account and clears its pending event", async () => {
    stashPendingHackathon("event-a");
    render(page());
    fireEvent.click(screen.getByRole("button", { name: "Continue as participant" }));
    expect(await screen.findByText("Participant onboarding")).toBeInTheDocument();
    expect(screen.getByTestId("path")).toHaveTextContent("/onboarding?hackathon=event-a");
    expect(readPendingHackathon()).toBeNull();
    expect(mocks.setDoc).toHaveBeenCalledWith({ path: "users/account-a" }, expect.objectContaining({ role: "participant", hackathon_id: "event-a" }), { merge: true });
  });

  it("ignores enrollment completion after switching accounts and preserves the new pending event", async () => {
    const saving = deferred();
    mocks.setDoc.mockReturnValue(saving.promise);
    stashPendingHackathon("event-a");
    const view = render(page());
    fireEvent.click(screen.getByRole("button", { name: "Continue as participant" }));
    expect(mocks.setDoc).toHaveBeenCalledOnce();
    mocks.auth.currentUser = { uid: "account-b" };
    mocks.user = { id: "account-b", email: "b@example.com" };
    stashPendingHackathon("event-b");
    view.rerender(page());
    await act(async () => { saving.resolve(); });
    expect(screen.getByTestId("path")).toHaveTextContent("/dashboard");
    expect(readPendingHackathon()).toBe("event-b");
    expect(screen.getByRole("button", { name: "Continue as participant" })).toBeEnabled();
  });

  it("does not navigate or clear the pending event after leaving account setup", async () => {
    const saving = deferred();
    mocks.setDoc.mockReturnValue(saving.promise);
    stashPendingHackathon("event-a");
    render(page());
    fireEvent.click(screen.getByRole("button", { name: "Continue as participant" }));
    fireEvent.click(screen.getByRole("link", { name: "Leave setup" }));
    await act(async () => { saving.resolve(); });
    expect(screen.getByText("Another page")).toBeInTheDocument();
    expect(screen.getByTestId("path")).toHaveTextContent("/other");
    expect(readPendingHackathon()).toBe("event-a");
  });

  it("does not show the previous account's enrollment error on the new account", async () => {
    const saving = deferred();
    mocks.setDoc.mockReturnValue(saving.promise);
    const view = render(page());
    fireEvent.click(screen.getByRole("button", { name: "Continue as participant" }));
    mocks.auth.currentUser = { uid: "account-b" };
    mocks.user = { id: "account-b", email: "b@example.com" };
    view.rerender(page());
    await act(async () => { saving.reject(new Error("Account A request failed")); });
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Continue as participant" })).toBeEnabled();
  });

  it.each([undefined, "host", "judge"] as const)("handles sign-out failure and blocks duplicate actions for role %s", async (role) => {
    mocks.user = { ...mocks.user, role, hostApprovalStatus: "pending", judgeApprovalStatus: "pending" };
    const signingOut = deferred();
    mocks.signOut.mockReturnValue(signingOut.promise);
    render(page());
    fireEvent.click(screen.getByRole("button", { name: "Sign out" }));
    expect(screen.getByRole("button", { name: "Signing out…" })).toBeDisabled();
    expect(screen.getByRole("button", { name: /Continue as participant|Open participant dashboard/ })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Signing out…" }));
    expect(mocks.signOut).toHaveBeenCalledOnce();
    await act(async () => { signingOut.reject(new Error("Connection failed")); });
    expect(await screen.findByRole("alert")).toHaveTextContent("Could not sign out. Please try again.");
    await waitFor(() => expect(screen.getByRole("button", { name: "Sign out" })).toBeEnabled());
    expect(screen.getByTestId("path")).toHaveTextContent("/dashboard");
  });
});
