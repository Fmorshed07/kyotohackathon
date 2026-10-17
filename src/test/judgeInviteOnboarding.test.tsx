import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { SessionUser } from "@/types/portal";

const mocks = vi.hoisted(() => ({
  auth: { currentUser: null as { uid: string; email: string; displayName?: string } | null },
  db: {}, session: null as SessionUser | null, authLoading: false,
  getInvite: vi.fn(), redeem: vi.fn(), popup: vi.fn(), signOut: vi.fn(),
}));
vi.mock("@/lib/firebaseClient", () => ({ getFirebaseAuth: () => mocks.auth, getFirestoreDb: () => mocks.db }));
vi.mock("@/hooks/usePortalAuth", () => ({ usePortalAuth: () => ({ sessionUser: mocks.session, loading: mocks.authLoading }) }));
vi.mock("firebase/auth", async original => ({ ...await original<typeof import("firebase/auth")>(), signInWithPopup: mocks.popup, signOut: mocks.signOut }));
vi.mock("@/lib/portalInvites", async original => ({ ...await original<typeof import("@/lib/portalInvites")>(), getJudgeInvite: mocks.getInvite, redeemJudgeInvite: mocks.redeem }));
vi.mock("@/components/BrandLogo", () => ({ default: () => <span>Cognisor</span> }));
import InviteAcceptPage from "@/pages/InviteAcceptPage";
import SignIn from "@/pages/SignIn";

const token = "test-judge-invite-token";
const eventId = "elevenlabs-meetup-tokyo-2026";
const account = { uid: "judge-a", email: "a@example.com", displayName: "Judge A" };
const openInvite = { id: token, token, status: "open", hackathon_ids: [eventId], max_uses: 25, use_count: 0, used_by: [] };
const judgeSession = (approval: "approved" | "pending" = "approved"): SessionUser => ({ id: account.uid, email: account.email, role: "judge", judgeApprovalStatus: approval, hackathonIds: [eventId] });

function page(path = `/invite/judge/${token}`) {
  return <MemoryRouter initialEntries={[path]}><Routes>
    <Route path="/invite/:kind/:token" element={<InviteAcceptPage />} />
    <Route path="/signup" element={<SignIn />} />
    <Route path="/signin" element={<SignIn />} />
    <Route path="/dashboard/judge/*" element={<h1>Assigned judge workspace</h1>} />
    <Route path="/dashboard" element={<h1>Approval waiting room</h1>} />
  </Routes></MemoryRouter>;
}

beforeEach(() => {
  vi.clearAllMocks();
  sessionStorage.clear();
  localStorage.clear();
  mocks.session = null;
  mocks.authLoading = false;
  mocks.auth.currentUser = null;
  mocks.getInvite.mockResolvedValue(openInvite);
  mocks.redeem.mockResolvedValue({ hackathonIds: [eventId], primaryHackathonId: eventId });
  mocks.popup.mockImplementation(async () => { mocks.auth.currentUser = account; return { user: account }; });
});
afterEach(cleanup);

describe("one-step judge onboarding", () => {
  it.each([`/invite/judge/${token}`, `/signup?role=judge&invite=${token}`, `/signin?role=judge&invite=${token}`])("offers a single Google action at %s", async path => {
    render(page(path));
    expect(await screen.findByRole("button", { name: "Continue with Google" })).toBeEnabled();
    expect(screen.queryByRole("tab")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Sign up as judge" })).not.toBeInTheDocument();
    expect(mocks.redeem).not.toHaveBeenCalled();
  });

  it("creates access with one Google action, waits for the profile, then opens the event", async () => {
    const view = render(page());
    fireEvent.click(await screen.findByRole("button", { name: "Continue with Google" }));
    await waitFor(() => expect(mocks.redeem).toHaveBeenCalledWith(mocks.db, token, { userId: account.uid, email: account.email, displayName: "Judge A" }));
    expect(await screen.findByText(/Access activated/)).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Assigned judge workspace" })).not.toBeInTheDocument();
    mocks.session = judgeSession();
    view.rerender(page());
    expect(await screen.findByRole("heading", { name: "Assigned judge workspace" })).toBeInTheDocument();
    expect(mocks.popup).toHaveBeenCalledOnce();
    expect(mocks.redeem).toHaveBeenCalledOnce();
    expect(mocks.popup).toHaveBeenCalledWith(mocks.auth, expect.objectContaining({ customParameters: { prompt: "select_account" } }));
  });

  it.each(["approved", "pending"] as const)("automatically activates an already signed-in %s judge", async approval => {
    mocks.auth.currentUser = account;
    mocks.session = judgeSession(approval);
    const view = render(page());
    await waitFor(() => expect(mocks.redeem).toHaveBeenCalledOnce());
    if (approval === "pending") {
      expect(screen.queryByRole("heading", { name: "Approval waiting room" })).not.toBeInTheDocument();
      mocks.session = judgeSession();
      view.rerender(page());
    }
    expect(await screen.findByRole("heading", { name: "Assigned judge workspace" })).toBeInTheDocument();
    expect(mocks.popup).not.toHaveBeenCalled();
  });

  it("does not redirect a signed-in judge on a legacy signup URL before redeeming", async () => {
    mocks.auth.currentUser = account;
    mocks.session = judgeSession("pending");
    render(page(`/signup?role=judge&invite=${token}`));
    await waitFor(() => expect(mocks.redeem).toHaveBeenCalledOnce());
    expect(screen.queryByRole("heading", { name: "Approval waiting room" })).not.toBeInTheDocument();
  });

  it.each([null, { ...openInvite, status: "revoked" }])("blocks an unavailable invitation before opening Google", async invite => {
    mocks.getInvite.mockResolvedValue(invite);
    render(page());
    expect(await screen.findByRole("alert")).toHaveTextContent(/invalid|revoked|limit/);
    expect(screen.queryByRole("button", { name: "Continue with Google" })).not.toBeInTheDocument();
    expect(mocks.popup).not.toHaveBeenCalled();
    expect(mocks.redeem).not.toHaveBeenCalled();
  });

  it("allows sign-in on a full link so returning invitees can identify themselves", async () => {
    mocks.getInvite.mockResolvedValue({ ...openInvite, use_count: 25, used_by: [account.uid] });
    render(page());
    fireEvent.click(await screen.findByRole("button", { name: "Continue with Google" }));
    await waitFor(() => expect(mocks.redeem).toHaveBeenCalledOnce());
  });

  it("blocks a full link for a signed-in new invitee", async () => {
    mocks.auth.currentUser = account;
    mocks.session = judgeSession("pending");
    mocks.getInvite.mockResolvedValue({ ...openInvite, use_count: 25 });
    render(page());
    expect(await screen.findByRole("alert")).toHaveTextContent(/use limit/);
    expect(mocks.redeem).not.toHaveBeenCalled();
  });

  it("lets an existing invitee reopen a full link", async () => {
    mocks.auth.currentUser = account;
    mocks.session = judgeSession();
    mocks.getInvite.mockResolvedValue({ ...openInvite, use_count: 25, used_by: [account.uid] });
    render(page());
    expect(await screen.findByRole("heading", { name: "Assigned judge workspace" })).toBeInTheDocument();
  });

  it("preserves participant accounts and offers the account chooser", async () => {
    mocks.auth.currentUser = account;
    mocks.session = { ...judgeSession(), role: "participant" };
    render(page());
    expect(await screen.findByRole("button", { name: "Use another Google account" })).toBeEnabled();
    expect(screen.getByText(/existing role won't be changed/)).toBeInTheDocument();
    expect(mocks.redeem).not.toHaveBeenCalled();
    expect(mocks.signOut).not.toHaveBeenCalled();
  });

  it("supports retry after a failed activation without another Google login", async () => {
    mocks.auth.currentUser = account;
    mocks.session = judgeSession("pending");
    mocks.redeem.mockRejectedValueOnce(new Error("Temporary connection problem"));
    render(page());
    expect(await screen.findByRole("alert")).toHaveTextContent("Temporary connection problem");
    fireEvent.click(screen.getByRole("button", { name: /Retry opening workspace/ }));
    await waitFor(() => expect(mocks.redeem).toHaveBeenCalledTimes(2));
    expect(mocks.popup).not.toHaveBeenCalled();
  });

  it("does not redeem or navigate after the Google account changes", async () => {
    let resolve!: (value: { user: typeof account }) => void;
    mocks.popup.mockReturnValue(new Promise(settle => { resolve = settle; }));
    render(page());
    fireEvent.click(await screen.findByRole("button", { name: "Continue with Google" }));
    mocks.auth.currentUser = { uid: "newer-account", email: "newer@example.com" };
    await act(async () => resolve({ user: account }));
    expect(mocks.redeem).not.toHaveBeenCalled();
    expect(mocks.signOut).not.toHaveBeenCalled();
    expect(screen.queryByRole("heading", { name: "Assigned judge workspace" })).not.toBeInTheDocument();
  });

  it("does not navigate on a stale redemption result after account switching", async () => {
    let resolve!: (value: { primaryHackathonId: string }) => void;
    mocks.redeem.mockReturnValue(new Promise(settle => { resolve = settle; }));
    render(page());
    fireEvent.click(await screen.findByRole("button", { name: "Continue with Google" }));
    await waitFor(() => expect(mocks.redeem).toHaveBeenCalledOnce());
    mocks.auth.currentUser = { uid: "newer-account", email: "newer@example.com" };
    await act(async () => resolve({ primaryHackathonId: eventId }));
    expect(screen.queryByText(/Access activated/)).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Assigned judge workspace" })).not.toBeInTheDocument();
  });

  it("prevents double clicks and reports popup cancellation without signing out", async () => {
    let reject!: (error: unknown) => void;
    mocks.popup.mockReturnValue(new Promise((_resolve, fail) => { reject = fail; }));
    render(page());
    const button = await screen.findByRole("button", { name: "Continue with Google" });
    fireEvent.click(button);
    fireEvent.click(button);
    expect(mocks.popup).toHaveBeenCalledOnce();
    await act(async () => reject({ code: "auth/popup-closed-by-user" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/cancelled/);
    expect(mocks.signOut).not.toHaveBeenCalled();
  });
});
