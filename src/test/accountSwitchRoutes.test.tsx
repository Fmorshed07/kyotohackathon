import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "@/App";
import { readPendingHackathon } from "@/lib/hackathons";

type AuthUser = { uid: string; email: string; displayName: string };
type ProfileSnapshot = { data: () => Record<string, unknown> };

const mocks = vi.hoisted(() => ({
  auth: { currentUser: null as AuthUser | null },
  db: {},
  authListeners: new Set<(user: AuthUser | null) => void>(),
  profileListeners: new Map<string, Set<(snapshot: ProfileSnapshot) => void>>(),
  popup: vi.fn(),
  getDoc: vi.fn(),
  setDoc: vi.fn(),
  signOut: vi.fn(),
  hasPendingAdminGrant: vi.fn(),
  checkEnrollment: vi.fn(),
}));

vi.mock("@/lib/firebaseClient", () => ({
  getFirebaseAuth: () => mocks.auth,
  getFirestoreDb: () => mocks.db,
}));
vi.mock("firebase/auth", async (importOriginal) => ({
  ...await importOriginal<typeof import("firebase/auth")>(),
  onAuthStateChanged: vi.fn((_auth, callback) => {
    mocks.authListeners.add(callback);
    callback(mocks.auth.currentUser);
    return () => mocks.authListeners.delete(callback);
  }),
  signInWithPopup: mocks.popup,
  signOut: mocks.signOut,
}));
vi.mock("firebase/firestore", async (importOriginal) => ({
  ...await importOriginal<typeof import("firebase/firestore")>(),
  doc: vi.fn((_db, collection: string, id: string) => ({ path: `${collection}/${id}` })),
  onSnapshot: vi.fn((reference: { path: string }, callback) => {
    const listeners = mocks.profileListeners.get(reference.path) ?? new Set();
    listeners.add(callback);
    mocks.profileListeners.set(reference.path, listeners);
    return () => listeners.delete(callback);
  }),
  getDoc: mocks.getDoc,
  setDoc: mocks.setDoc,
}));
vi.mock("@/lib/adminGrants", () => ({
  hasPendingAdminGrant: mocks.hasPendingAdminGrant,
  consumePendingAdminGrant: vi.fn(),
}));
vi.mock("@/lib/participantEventEnrollment", () => ({
  checkParticipantEventEnrollment: mocks.checkEnrollment,
}));
vi.mock("@/components/AnimatedBackground", () => ({ default: () => null }));
vi.mock("@/components/BrandLogo", () => ({ default: () => <span>Cognisor</span> }));
vi.mock("@/components/WebsiteAnalyticsTracker", () => ({ WebsiteAnalyticsTracker: () => null }));
vi.mock("@/components/AiIdeathonStarNotice", () => ({ AiIdeathonStarNotice: () => null }));
vi.mock("@/components/ui/toaster", () => ({ Toaster: () => null }));
vi.mock("@/components/ui/sonner", () => ({ Toaster: () => null }));
vi.mock("@/pages/ParticipantDashboardPage", async () => {
  const { useState } = await import("react");
  const { usePortalAuth } = await import("@/hooks/usePortalAuth");
  return {
    default: function ParticipantWorkspace() {
      const { sessionUser } = usePortalAuth();
      const [draft, setDraft] = useState("");
      return (
        <main>
          <h1>Participant workspace</h1>
          <p>{sessionUser?.email}</p>
          <label>Project draft<input value={draft} onChange={(event) => setDraft(event.target.value)} /></label>
        </main>
      );
    },
  };
});
vi.mock("@/pages/Index", () => ({ default: () => null }));
vi.mock("@/pages/CommunityWorkPage", () => ({ default: () => null }));
vi.mock("@/pages/AdminSignIn", () => ({ default: () => null }));
vi.mock("@/pages/HostSignIn", () => ({ default: () => null }));
vi.mock("@/pages/Dashboard", () => ({ default: () => null }));
vi.mock("@/pages/ParticipantProfilePage", () => ({ default: () => null }));
vi.mock("@/pages/ParticipantTeamPage", () => ({ default: () => null }));
vi.mock("@/pages/ParticipantOnboardingPage", () => ({ default: () => null }));
vi.mock("@/pages/JudgeDashboardPage", async () => import("@/pages/ParticipantDashboardPage"));
vi.mock("@/pages/AdminDashboardPage", async () => import("@/pages/ParticipantDashboardPage"));
vi.mock("@/pages/HostDashboardPage", async () => import("@/pages/ParticipantDashboardPage"));
vi.mock("@/pages/ScreeningAgentPage", () => ({ default: () => null }));
vi.mock("@/pages/ProjectScreeningPage", () => ({ default: () => null }));
vi.mock("@/pages/PlatformOperationsPage", () => ({ default: () => null }));
vi.mock("@/pages/EventManagementPage", () => ({ default: () => null }));
vi.mock("@/pages/HackathonsPage", () => ({ default: () => null }));
vi.mock("@/pages/GeneratedHackathonPage", () => ({ default: () => null }));
vi.mock("@/pages/HackathonBoardsPage", () => ({ default: () => null }));
vi.mock("@/pages/ProjectGalleryPage", () => ({ default: () => null }));
vi.mock("@/pages/ProjectFeedPage", () => ({ default: () => null }));
vi.mock("@/pages/ResourcesPage", () => ({ default: () => null }));
vi.mock("@/pages/InviteAcceptPage", () => ({ default: () => null }));
vi.mock("@/pages/NotFound", () => ({ default: () => null }));

const accountA: AuthUser = { uid: "participant-a", email: "a@example.com", displayName: "Participant A" };
const accountB: AuthUser = { uid: "participant-b", email: "b@example.com", displayName: "Participant B" };
const participantProfile = { role: "participant", onboardingCompletedAt: "2026-10-01" };

function emitAuth(user: AuthUser | null) {
  mocks.auth.currentUser = user;
  for (const callback of [...mocks.authListeners]) callback(user);
}

function emitProfile(user: AuthUser, data: Record<string, unknown> = participantProfile) {
  const listeners = mocks.profileListeners.get(`users/${user.uid}`);
  expect(listeners?.size).toBeGreaterThan(0);
  for (const callback of [...listeners!]) callback({ data: () => data });
}

function deferredProfile() {
  let resolve!: (snapshot: ProfileSnapshot) => void;
  const promise = new Promise<ProfileSnapshot>((settle) => { resolve = settle; });
  return { promise, resolve: (data: Record<string, unknown>) => resolve({ data: () => data }) };
}

function deferredEnrollment() {
  let resolve!: (outcome: "existing" | "new") => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<"existing" | "new">((settle, fail) => { resolve = settle; reject = fail; });
  return { promise, resolve, reject };
}

describe("account switching routes", () => {
  beforeEach(() => {
    mocks.auth.currentUser = null;
    mocks.authListeners.clear();
    mocks.profileListeners.clear();
    mocks.getDoc.mockReset();
    mocks.setDoc.mockReset().mockResolvedValue(undefined);
    mocks.hasPendingAdminGrant.mockReset().mockResolvedValue(false);
    mocks.checkEnrollment.mockReset().mockResolvedValue("existing");
    mocks.popup.mockReset().mockImplementation(async () => {
      mocks.auth.currentUser = accountB;
      return { user: accountB };
    });
    mocks.signOut.mockReset().mockImplementation(async () => { emitAuth(null); });
    localStorage.clear();
    sessionStorage.clear();
    window.history.replaceState({}, "", "/signin?mode=signin");
  });
  afterEach(cleanup);

  it.each(["/dashboard/participant", "/dashboard/participant/profile", "/onboarding"])("sends an unfinished account from %s to signup instead of redirecting to itself", async (path) => {
    mocks.auth.currentUser = accountA;
    window.history.replaceState({}, "", path);
    render(<App />);
    act(() => emitProfile(accountA, {}));
    expect(await screen.findByRole("button", { name: "Sign up as participant" })).toBeEnabled();
    expect(window.location.pathname).toBe("/signup");
  });

  it.each(["signin", "signup", "admin", "host/signin"])("ignores a next path pointing back to the %s auth screen", async (path) => {
    mocks.auth.currentUser = accountA;
    window.history.replaceState({}, "", `/signin?next=${encodeURIComponent(`/${path}`)}`);
    render(<App />);
    act(() => emitProfile(accountA));
    expect(await screen.findByRole("heading", { name: "Participant workspace" })).toBeInTheDocument();
    expect(window.location.pathname).toBe("/dashboard/participant");
  });

  it.each(["judge", "host", "admin"])("resets %s workspace drafts when two account changes are batched", async (role) => {
    mocks.auth.currentUser = accountA;
    window.history.replaceState({}, "", `/dashboard/${role}`);
    render(<App />);
    act(() => emitProfile(accountA, { role, judgeApprovalStatus: "approved", hostApprovalStatus: "approved" }));
    expect(await screen.findByText(accountA.email)).toBeInTheDocument();
    fireEvent.change(screen.getByRole("textbox", { name: "Project draft" }), { target: { value: "Account A private draft" } });
    act(() => { emitAuth(accountB); emitProfile(accountB, { role, judgeApprovalStatus: "approved", hostApprovalStatus: "approved" }); });
    expect(await screen.findByText(accountB.email)).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Project draft" })).toHaveValue("");
  });

  it("waits for the Google sign-in checks even when the live profile arrives first", async () => {
    const pendingProfile = deferredProfile();
    mocks.getDoc.mockReturnValue(pendingProfile.promise);
    render(<App />);
    fireEvent.click(await screen.findByRole("button", { name: "Log in as participant" }));
    await waitFor(() => expect(mocks.getDoc).toHaveBeenCalled());

    act(() => emitAuth(accountB));
    act(() => emitProfile(accountB));

    expect(window.location.pathname).toBe("/signin");
    expect(screen.queryByRole("heading", { name: "Participant workspace" })).not.toBeInTheDocument();

    await act(async () => { pendingProfile.resolve(participantProfile); });
    expect(await screen.findByRole("heading", { name: "Participant workspace" })).toBeInTheDocument();
    expect(window.location.pathname).toBe("/dashboard/participant");
    expect(screen.getByText(accountB.email)).toBeInTheDocument();
  });

  it("preserves the sign-in form and error when the selected Google account is not enrolled", async () => {
    const pendingProfile = deferredProfile();
    mocks.getDoc.mockReturnValue(pendingProfile.promise);
    render(<App />);
    fireEvent.click(await screen.findByRole("button", { name: "Log in as participant" }));
    await waitFor(() => expect(mocks.getDoc).toHaveBeenCalled());

    act(() => emitAuth(accountB));
    act(() => emitProfile(accountB, {}));
    await act(async () => { pendingProfile.resolve({}); });

    expect(await screen.findByRole("alert")).toHaveTextContent("No Cognisor account found for this Google login");
    expect(screen.getByRole("button", { name: "Sign up as participant" })).toBeEnabled();
    expect(window.location.pathname).toBe("/signin");
    expect(mocks.signOut).toHaveBeenCalledOnce();
  });

  it("clears the previous participant's draft when an account switch settles in one render", async () => {
    mocks.auth.currentUser = accountA;
    window.history.replaceState({}, "", "/dashboard/participant");
    render(<App />);
    act(() => emitProfile(accountA));
    expect(await screen.findByText(accountA.email)).toBeInTheDocument();
    fireEvent.change(screen.getByRole("textbox", { name: "Project draft" }), { target: { value: "Account A private draft" } });

    // Firebase can deliver auth and cached profile data before React renders its loading state.
    act(() => {
      emitAuth(accountB);
      emitProfile(accountB);
    });

    expect(await screen.findByText(accountB.email)).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Project draft" })).toHaveValue("");
    expect(screen.queryByText(accountA.email)).not.toBeInTheDocument();
    expect(window.location.pathname).toBe("/dashboard/participant");
  });

  it("honors an internal next path when an existing signed-in account opens the sign-in page", async () => {
    mocks.auth.currentUser = accountA;
    window.history.replaceState({}, "", "/signin?next=%2Fdashboard%2Fparticipant%2Fprofile");
    render(<App />);
    act(() => emitProfile(accountA));

    await waitFor(() => expect(window.location.pathname).toBe("/dashboard/participant/profile"));
    expect(mocks.popup).not.toHaveBeenCalled();
  });

  it("lets a participant retry after closing the Google account chooser", async () => {
    mocks.popup.mockRejectedValueOnce(new Error("The Google account chooser was closed."));
    render(<App />);
    fireEvent.click(await screen.findByRole("button", { name: "Log in as participant" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("The Google account chooser was closed.");
    expect(screen.getByRole("button", { name: "Log in as participant" })).toBeEnabled();
    expect(window.location.pathname).toBe("/signin");
    expect(mocks.getDoc).not.toHaveBeenCalled();
  });

  it("ignores a pending sign-in result after Firebase switches to another account", async () => {
    const pendingProfile = deferredProfile();
    mocks.getDoc.mockReturnValue(pendingProfile.promise);
    mocks.popup.mockImplementationOnce(async () => {
      mocks.auth.currentUser = accountA;
      return { user: accountA };
    });
    render(<App />);
    fireEvent.click(await screen.findByRole("button", { name: "Log in as participant" }));
    await waitFor(() => expect(mocks.getDoc).toHaveBeenCalled());
    act(() => { emitAuth(accountA); emitProfile(accountA); });
    act(() => { emitAuth(accountB); emitProfile(accountB); });

    await act(async () => { pendingProfile.resolve(participantProfile); });

    expect(await screen.findByRole("heading", { name: "Participant workspace" })).toBeInTheDocument();
    expect(screen.getByText(accountB.email)).toBeInTheDocument();
    expect(mocks.hasPendingAdminGrant).not.toHaveBeenCalled();
    expect(mocks.setDoc).not.toHaveBeenCalled();
    expect(window.location.pathname).toBe("/dashboard/participant");
  });

  it("rechecks enrollment for the new account without writing or redirecting for the previous one", async () => {
    const enrollmentA = deferredEnrollment();
    const enrollmentB = deferredEnrollment();
    mocks.checkEnrollment.mockReturnValueOnce(enrollmentA.promise).mockReturnValueOnce(enrollmentB.promise);
    mocks.auth.currentUser = accountA;
    window.history.replaceState({}, "", "/signin?mode=signin&hackathon=open-event");
    render(<App />);
    act(() => emitProfile(accountA, { role: "participant" }));
    await waitFor(() => expect(mocks.checkEnrollment).toHaveBeenCalledTimes(1));

    act(() => {
      emitAuth(accountB);
      emitProfile(accountB, { ...participantProfile, hackathon_id: "existing-event", hackathon_ids: ["existing-event"] });
    });
    await act(async () => { enrollmentA.resolve("new"); });

    await waitFor(() => expect(mocks.checkEnrollment).toHaveBeenCalledTimes(2));
    expect(mocks.setDoc).not.toHaveBeenCalled();
    expect(readPendingHackathon()).toBe("open-event");
    expect(window.location.pathname).toBe("/signin");

    await act(async () => { enrollmentB.resolve("new"); });

    expect(await screen.findByRole("heading", { name: "Participant workspace" })).toBeInTheDocument();
    expect(screen.getByText(accountB.email)).toBeInTheDocument();
    expect(mocks.setDoc).toHaveBeenCalledOnce();
    expect(mocks.setDoc).toHaveBeenCalledWith(
      { path: `users/${accountB.uid}` },
      { hackathon_id: "open-event", hackathon_ids: ["open-event", "existing-event"] },
      { merge: true },
    );
    expect(readPendingHackathon()).toBeNull();
    expect(window.location.pathname).toBe("/dashboard/participant");
  });

  it("does not sign out the new account when the previous signup's eligibility check fails", async () => {
    const pendingEnrollment = deferredEnrollment();
    mocks.checkEnrollment
      .mockResolvedValueOnce("new") // The signup page checks registration before enabling Google.
      .mockResolvedValueOnce("new") // The click handler checks again before opening the popup.
      .mockReturnValueOnce(pendingEnrollment.promise); // The selected account's final eligibility check.
    mocks.getDoc.mockResolvedValue({ data: () => ({}) });
    mocks.popup.mockImplementationOnce(async () => {
      mocks.auth.currentUser = accountA;
      return { user: accountA };
    });
    window.history.replaceState({}, "", "/signup?hackathon=open-event");
    render(<App />);
    await waitFor(() => expect(screen.getByRole("button", { name: "Sign up as participant" })).toBeEnabled());
    fireEvent.click(screen.getByRole("button", { name: "Sign up as participant" }));
    await waitFor(() => expect(mocks.checkEnrollment).toHaveBeenCalledTimes(3));
    act(() => { emitAuth(accountA); emitProfile(accountA, {}); });
    act(() => { emitAuth(accountB); emitProfile(accountB); });

    await act(async () => { pendingEnrollment.reject(new Error("Registration closed during signup.")); });

    expect(await screen.findByRole("heading", { name: "Participant workspace" })).toBeInTheDocument();
    expect(screen.getByText(accountB.email)).toBeInTheDocument();
    expect(mocks.auth.currentUser).toBe(accountB);
    expect(mocks.signOut).not.toHaveBeenCalled();
    expect(mocks.setDoc).not.toHaveBeenCalled();
    expect(window.location.pathname).toBe("/dashboard/participant");
  });
});
