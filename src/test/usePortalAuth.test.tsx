import { act, cleanup, renderHook } from "@testing-library/react";
import { StrictMode, type ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { usePortalAuth } from "@/hooks/usePortalAuth";

type AuthUser = { uid: string; email: string; emailVerified?: boolean };
type ProfileSnapshot = { data: () => Record<string, unknown> };

const mocks = vi.hoisted(() => ({
  auth: { currentUser: null as AuthUser | null },
  authObservers: [] as Array<{
    next: (user: AuthUser | null) => void;
    active: boolean;
    unsubscribe: ReturnType<typeof vi.fn>;
  }>,
  profiles: [] as Array<{
    uid: string;
    next: (snapshot: ProfileSnapshot) => void;
    error: () => void;
    unsubscribe: ReturnType<typeof vi.fn>;
  }>,
  onAuthStateChanged: vi.fn(),
  onSnapshot: vi.fn(),
  signOut: vi.fn(),
  claimImported: vi.fn(),
}));

vi.mock("firebase/auth", () => ({
  onAuthStateChanged: mocks.onAuthStateChanged,
  signOut: mocks.signOut,
}));
vi.mock("firebase/firestore", () => ({
  doc: (_db: unknown, _collection: string, uid: string) => ({ uid }),
  onSnapshot: mocks.onSnapshot,
}));
vi.mock("@/lib/firebaseClient", () => ({
  getFirebaseAuth: () => mocks.auth,
  getFirestoreDb: () => ({}),
}));
vi.mock("@/lib/importedParticipantEnrollment", () => ({ claimImportedParticipantEnrollment: mocks.claimImported }));

const accountA = { uid: "participant-a", email: "a@example.com" };
const accountB = { uid: "participant-b", email: "b@example.com" };

function emitAuth(user: AuthUser | null) {
  mocks.auth.currentUser = user;
  for (const observer of mocks.authObservers) {
    if (observer.active) observer.next(user);
  }
}

function emitProfile(index: number, fullName: string) {
  mocks.profiles[index].next({
    data: () => ({ role: "participant", fullName, onboardingCompletedAt: "2026-10-01" }),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  window.localStorage.clear();
  mocks.auth.currentUser = null;
  mocks.authObservers.length = 0;
  mocks.profiles.length = 0;
  mocks.onAuthStateChanged.mockImplementation((_auth, next) => {
    const observer = { next, active: true, unsubscribe: vi.fn() };
    observer.unsubscribe.mockImplementation(() => { observer.active = false; });
    mocks.authObservers.push(observer);
    return observer.unsubscribe;
  });
  mocks.onSnapshot.mockImplementation(({ uid }, next, error) => {
    const unsubscribe = vi.fn();
    mocks.profiles.push({ uid, next, error, unsubscribe });
    return unsubscribe;
  });
  mocks.signOut.mockImplementation(async () => { emitAuth(null); });
  mocks.claimImported.mockReset().mockResolvedValue(false);
});

afterEach(async () => {
  cleanup();
  await Promise.resolve();
  vi.restoreAllMocks();
});

describe("shared portal authentication", () => {
  it("does not restore an unauthenticated admin from legacy browser storage", () => {
    localStorage.setItem("portal_admin_override", JSON.stringify({ id: "old-admin", email: "old@example.com", role: "admin" }));
    const view = renderHook(() => usePortalAuth());
    act(() => emitAuth(null));
    expect(view.result.current.sessionUser).toBeNull();
    expect(view.result.current.loading).toBe(false);
  });

  it("finishes auth initialization when browser storage is unavailable", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => { throw new Error("Storage blocked"); });
    const view = renderHook(() => usePortalAuth());
    act(() => emitAuth(null));
    expect(view.result.current.sessionUser).toBeNull();
    expect(view.result.current.loading).toBe(false);
  });

  it("still signs out when legacy storage cleanup fails", async () => {
    const view = renderHook(() => usePortalAuth());
    act(() => { emitAuth(accountA); emitProfile(0, "Participant A"); });
    vi.spyOn(Storage.prototype, "removeItem").mockImplementation(() => { throw new Error("Storage blocked"); });
    await act(async () => { await view.result.current.signOut(); });
    expect(mocks.signOut).toHaveBeenCalledOnce();
    expect(view.result.current.sessionUser).toBeNull();
  });

  it("shares one resolved account between route guards, pages, and later consumers", () => {
    const route = renderHook(() => usePortalAuth());
    const page = renderHook(() => usePortalAuth());

    act(() => { emitAuth(accountA); emitProfile(0, "Participant A"); });
    const header = renderHook(() => usePortalAuth());

    expect(mocks.onAuthStateChanged).toHaveBeenCalledTimes(1);
    expect(mocks.onSnapshot).toHaveBeenCalledTimes(1);
    expect(route.result.current.sessionUser).toBe(page.result.current.sessionUser);
    expect(header.result.current.sessionUser).toBe(page.result.current.sessionUser);
    expect(header.result.current.loading).toBe(false);
    expect(header.result.current.sessionUser?.id).toBe(accountA.uid);
  });

  it("keeps a new participant unenrolled until an event is explicitly joined", () => {
    const view = renderHook(() => usePortalAuth());
    act(() => {
      emitAuth(accountA);
      mocks.profiles[0].next({ data: () => ({ role: "participant" }) });
    });

    expect(view.result.current.sessionUser?.hackathonIds).toEqual([]);
    expect(view.result.current.sessionUser?.hackathonId).toBeUndefined();

    act(() => {
      mocks.profiles[0].next({ data: () => ({
        role: "participant",
        hackathon_id: "impact-osaka-2026",
        hackathon_ids: ["impact-osaka-2026"],
      }) });
    });

    expect(view.result.current.sessionUser?.hackathonIds).toEqual(["impact-osaka-2026"]);
    expect(view.result.current.sessionUser?.hackathonId).toBe("impact-osaka-2026");
  });

  it("preserves an explicit legacy event without adding it to the next account", () => {
    const view = renderHook(() => usePortalAuth());
    act(() => {
      emitAuth(accountA);
      mocks.profiles[0].next({ data: () => ({
        role: "participant",
        hackathon_id: "impact-kyoto",
      }) });
    });

    expect(view.result.current.sessionUser?.hackathonIds).toEqual(["impact-kyoto"]);
    expect(view.result.current.sessionUser?.hackathonId).toBe("impact-kyoto");

    act(() => {
      emitAuth(accountB);
      mocks.profiles[1].next({ data: () => ({ role: "participant", hackathon_ids: [] }) });
    });

    expect(view.result.current.sessionUser?.hackathonIds).toEqual([]);
    expect(view.result.current.sessionUser?.hackathonId).toBeUndefined();
  });

  it("clears the previous identity and ignores late profile updates and errors during a switch", () => {
    const view = renderHook(() => usePortalAuth());
    act(() => { emitAuth(accountA); emitProfile(0, "Participant A"); });

    act(() => emitAuth(accountB));
    expect(view.result.current.sessionUser).toBeNull();
    expect(view.result.current.loading).toBe(true);
    expect(mocks.profiles[0].unsubscribe).toHaveBeenCalledTimes(1);

    act(() => { emitProfile(0, "Stale participant A"); mocks.profiles[0].error(); });
    expect(view.result.current.sessionUser).toBeNull();
    expect(view.result.current.loading).toBe(true);

    act(() => emitProfile(1, "Participant B"));
    act(() => { emitProfile(0, "Stale participant A"); mocks.profiles[0].error(); });
    expect(view.result.current.sessionUser).toMatchObject({
      id: accountB.uid,
      email: accountB.email,
      profile: { fullName: "Participant B" },
    });
    expect(view.result.current.loading).toBe(false);
  });

  it("signs out every consumer and prevents the old profile from returning", async () => {
    const route = renderHook(() => usePortalAuth());
    const page = renderHook(() => usePortalAuth());
    act(() => { emitAuth(accountA); emitProfile(0, "Participant A"); });

    await act(async () => { await page.result.current.signOut(); });
    act(() => { emitProfile(0, "Stale participant A"); mocks.profiles[0].error(); });

    expect(route.result.current.sessionUser).toBeNull();
    expect(page.result.current.sessionUser).toBeNull();
    expect(route.result.current.loading).toBe(false);
    expect(page.result.current.loading).toBe(false);
  });

  it("does not erase a new account when an older sign-out promise finishes", async () => {
    let finishSignOut!: () => void;
    mocks.signOut.mockImplementation(() => new Promise<void>((resolve) => {
      finishSignOut = resolve;
      emitAuth(null);
    }));
    const view = renderHook(() => usePortalAuth());
    act(() => { emitAuth(accountA); emitProfile(0, "Participant A"); });

    let signingOut!: Promise<void>;
    act(() => { signingOut = view.result.current.signOut(); });
    act(() => { emitAuth(accountB); emitProfile(1, "Participant B"); });
    await act(async () => { finishSignOut(); await signingOut; });

    expect(view.result.current.sessionUser?.id).toBe(accountB.uid);
    expect(view.result.current.loading).toBe(false);
  });

  it("keeps the resolved session across route replacements and releases listeners after the last page", async () => {
    const first = renderHook(() => usePortalAuth());
    act(() => { emitAuth(accountA); emitProfile(0, "Participant A"); });

    first.unmount();
    const next = renderHook(() => usePortalAuth());
    await act(async () => { await Promise.resolve(); });
    expect(next.result.current.sessionUser?.id).toBe(accountA.uid);
    expect(next.result.current.loading).toBe(false);
    expect(mocks.onAuthStateChanged).toHaveBeenCalledTimes(1);
    expect(mocks.authObservers[0].unsubscribe).not.toHaveBeenCalled();

    next.unmount();
    await Promise.resolve();
    expect(mocks.authObservers[0].unsubscribe).toHaveBeenCalledTimes(1);
    expect(mocks.profiles[0].unsubscribe).toHaveBeenCalledTimes(1);
  });

  it("ignores callbacks from an auth subscription that has already been released", async () => {
    const first = renderHook(() => usePortalAuth());
    act(() => { emitAuth(accountA); emitProfile(0, "Participant A"); });
    const oldObserver = mocks.authObservers[0];
    first.unmount();
    await Promise.resolve();

    const next = renderHook(() => usePortalAuth());
    expect(next.result.current.sessionUser).toBeNull();
    expect(next.result.current.loading).toBe(true);
    act(() => { emitAuth(accountB); emitProfile(1, "Participant B"); });
    act(() => { oldObserver.next(accountA); emitProfile(0, "Stale participant A"); });
    expect(next.result.current.sessionUser?.id).toBe(accountB.uid);
    expect(mocks.onSnapshot).toHaveBeenCalledTimes(2);
  });

  it("does not duplicate listeners during StrictMode remounts", async () => {
    const wrapper = ({ children }: { children: ReactNode }) => <StrictMode>{children}</StrictMode>;
    const view = renderHook(() => usePortalAuth(), { wrapper });
    act(() => { emitAuth(accountA); emitProfile(0, "Participant A"); });
    await act(async () => { await Promise.resolve(); });

    expect(mocks.onAuthStateChanged).toHaveBeenCalledTimes(1);
    expect(mocks.authObservers[0].unsubscribe).not.toHaveBeenCalled();
    expect(view.result.current.sessionUser?.id).toBe(accountA.uid);
  });

  it("claims private imports once after a verified participant profile resolves and observes membership updates normally", () => {
    const verified = { ...accountA, emailVerified: true };
    const view = renderHook(() => usePortalAuth());
    act(() => emitAuth(verified));
    expect(mocks.claimImported).not.toHaveBeenCalled();
    act(() => mocks.profiles[0].next({ data: () => ({ role: "participant", fullName: "Saved name", hackathon_ids: ["existing-event"] }) }));
    expect(mocks.claimImported).toHaveBeenCalledOnce();
    expect(mocks.claimImported.mock.calls[0][1]).toBe(verified);
    expect(mocks.claimImported.mock.calls[0][2]()).toBe(true);
    expect(view.result.current.loading).toBe(false);
    expect(view.result.current.sessionUser?.onboardingCompletedAt).toBeNull();
    act(() => mocks.profiles[0].next({ data: () => ({ role: "participant", fullName: "Saved name", hackathon_ids: ["existing-event", "impact-osaka-2026"] }) }));
    expect(view.result.current.sessionUser?.hackathonIds).toEqual(["existing-event", "impact-osaka-2026"]);
    expect(view.result.current.sessionUser?.profile?.fullName).toBe("Saved name");
    expect(mocks.claimImported).toHaveBeenCalledOnce();
  });

  it.each(["judge", "mentor", "host", "admin", undefined])("does not request a participant import claim for %s", role => {
    renderHook(() => usePortalAuth());
    act(() => {
      emitAuth({ ...accountA, emailVerified: true });
      mocks.profiles[0].next({ data: () => ({ role }) });
    });
    expect(mocks.claimImported).not.toHaveBeenCalled();
  });

  it("does not match private imports for an unverified participant", () => {
    renderHook(() => usePortalAuth());
    act(() => { emitAuth({ ...accountA, emailVerified: false }); emitProfile(0, "Participant A"); });
    expect(mocks.claimImported).not.toHaveBeenCalled();
  });

  it("does not block the resolved session when optional import enrollment fails", async () => {
    mocks.claimImported.mockRejectedValueOnce(new Error("Import lookup unavailable"));
    const view = renderHook(() => usePortalAuth());
    await act(async () => { emitAuth({ ...accountA, emailVerified: true }); emitProfile(0, "Participant A"); });
    expect(view.result.current.loading).toBe(false);
    expect(view.result.current.sessionUser).toMatchObject({ id: accountA.uid, role: "participant", onboardingCompletedAt: "2026-10-01" });
    expect(mocks.claimImported).toHaveBeenCalledOnce();
  });

  it("invalidates an old claim's scope during account switches and does not replay it from stale profiles", () => {
    renderHook(() => usePortalAuth());
    act(() => { emitAuth({ ...accountA, emailVerified: true }); emitProfile(0, "Participant A"); });
    const oldScope = mocks.claimImported.mock.calls[0][2];
    act(() => emitAuth({ ...accountB, emailVerified: true }));
    expect(oldScope()).toBe(false);
    act(() => { emitProfile(0, "Stale A"); emitProfile(1, "Participant B"); });
    expect(mocks.claimImported).toHaveBeenCalledTimes(2);
    expect(mocks.claimImported.mock.calls[1][1].uid).toBe(accountB.uid);
    expect(mocks.claimImported.mock.calls[1][2]()).toBe(true);
  });
});
