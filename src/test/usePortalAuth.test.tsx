import { act, cleanup, renderHook } from "@testing-library/react";
import { StrictMode, type ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { usePortalAuth } from "@/hooks/usePortalAuth";

type AuthUser = { uid: string; email: string };
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
});
