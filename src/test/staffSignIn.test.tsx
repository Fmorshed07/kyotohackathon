import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { SessionUser } from "@/types/portal";
import HostSignIn from "@/pages/HostSignIn";
import AdminSignIn from "@/pages/AdminSignIn";

const mocks = vi.hoisted(() => ({
  auth: { currentUser: null as { uid: string; email: string } | null },
  sessionUser: null as SessionUser | null,
  popup: vi.fn(),
  getDoc: vi.fn(),
  setDoc: vi.fn(),
  signOut: vi.fn(),
  hasGrant: vi.fn(),
}));
vi.mock("@/lib/firebaseClient", () => ({ getFirebaseAuth: () => mocks.auth, getFirestoreDb: () => ({}) }));
vi.mock("@/hooks/usePortalAuth", () => ({ usePortalAuth: () => ({ sessionUser: mocks.sessionUser, loading: false }) }));
vi.mock("firebase/auth", async (original) => ({ ...await original<typeof import("firebase/auth")>(), signInWithPopup: mocks.popup, signOut: mocks.signOut }));
vi.mock("firebase/firestore", async (original) => ({ ...await original<typeof import("firebase/firestore")>(), doc: (_db: unknown, collection: string, id: string) => ({ path: `${collection}/${id}` }), getDoc: mocks.getDoc, setDoc: mocks.setDoc }));
vi.mock("@/lib/adminGrants", () => ({ hasPendingAdminGrant: mocks.hasGrant, consumePendingAdminGrant: vi.fn() }));
vi.mock("@/components/AnimatedBackground", () => ({ default: () => null }));
vi.mock("@/components/BrandLogo", () => ({ default: () => <span>Cognisor</span> }));

const accountA = { uid: "account-a", email: "a@example.com" };
const accountB = { uid: "account-b", email: "b@example.com" };
const configurations = [
  { role: "host" as const, path: "/host/signin", Component: HostSignIn },
  { role: "admin" as const, path: "/admin", Component: AdminSignIn },
];

function page({ path, role, Component }: typeof configurations[number]) {
  return <MemoryRouter initialEntries={[path]}><Routes>
    <Route path={path} element={<Component />} />
    <Route path={`/dashboard/${role}`} element={<h1>Staff workspace</h1>} />
  </Routes></MemoryRouter>;
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.auth.currentUser = null;
  mocks.sessionUser = null;
  mocks.popup.mockImplementation(async () => { mocks.auth.currentUser = accountA; return { user: accountA }; });
  mocks.signOut.mockImplementation(async () => { mocks.auth.currentUser = null; });
  mocks.setDoc.mockResolvedValue(undefined);
  mocks.hasGrant.mockResolvedValue(false);
});
afterEach(cleanup);

describe.each(configurations)("$role sign-in", (configuration) => {
  it("keeps the form mounted until account checks finish even when its live role arrives first", async () => {
    let resolve!: (snapshot: { data: () => { role: string } }) => void;
    mocks.getDoc.mockReturnValue(new Promise((settle) => { resolve = settle; }));
    const view = render(page(configuration));
    fireEvent.click(screen.getByRole("button", { name: "Continue with Google" }));
    await waitFor(() => expect(mocks.getDoc).toHaveBeenCalledOnce());
    mocks.sessionUser = { id: accountA.uid, email: accountA.email, role: configuration.role };
    view.rerender(page(configuration));
    expect(screen.queryByRole("heading", { name: "Staff workspace" })).not.toBeInTheDocument();
    await act(async () => { resolve({ data: () => ({ role: configuration.role }) }); });
    expect(await screen.findByRole("heading", { name: "Staff workspace" })).toBeInTheDocument();
    expect(mocks.popup).toHaveBeenCalledWith(mocks.auth, expect.objectContaining({ customParameters: { prompt: "select_account" } }));
  });

  it("does not sign out a newer account when a previous account check finishes", async () => {
    let resolve!: (snapshot: { data: () => { role: string } }) => void;
    mocks.getDoc.mockReturnValue(new Promise((settle) => { resolve = settle; }));
    render(page(configuration));
    fireEvent.click(screen.getByRole("button", { name: "Continue with Google" }));
    await waitFor(() => expect(mocks.getDoc).toHaveBeenCalledOnce());
    mocks.auth.currentUser = accountB;
    await act(async () => { resolve({ data: () => ({ role: "participant" }) }); });
    expect(mocks.signOut).not.toHaveBeenCalled();
    expect(mocks.setDoc).not.toHaveBeenCalled();
    expect(mocks.auth.currentUser).toBe(accountB);
    expect(screen.queryByRole("heading", { name: "Staff workspace" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Continue with Google" })).toBeEnabled();
  });

  it("keeps the current account when the Google chooser is cancelled", async () => {
    mocks.auth.currentUser = accountB;
    mocks.popup.mockRejectedValueOnce(new Error("The account chooser was closed."));
    render(page(configuration));
    fireEvent.click(screen.getByRole("button", { name: "Continue with Google" }));
    expect(await screen.findByText("The account chooser was closed.")).toBeInTheDocument();
    expect(mocks.signOut).not.toHaveBeenCalled();
    expect(mocks.auth.currentUser).toBe(accountB);
  });
});
