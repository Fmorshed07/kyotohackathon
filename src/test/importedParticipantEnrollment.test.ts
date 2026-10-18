import { beforeEach, describe, expect, it, vi } from "vitest";
import type { User } from "firebase/auth";
import type { Firestore } from "firebase/firestore";
import { claimImportedParticipantEnrollment } from "@/lib/importedParticipantEnrollment";
import { participantNeedsOnboarding } from "@/lib/portalRoutes";

type Ref = { path: string };
const backend = vi.hoisted(() => ({
  auth: { currentUser: null as User | null },
  documents: new Map<string, Record<string, unknown>>(),
  getDocs: vi.fn(), get: vi.fn(), set: vi.fn(), run: vi.fn(),
  commitError: null as Error | null,
}));
vi.mock("@/lib/firebaseClient", () => ({ getFirebaseAuth: () => backend.auth }));
vi.mock("firebase/firestore", () => ({
  collection: (_db: unknown, path: string) => ({ path }),
  doc: (_db: unknown, collection: string, id: string) => ({ path: `${collection}/${id}` }),
  query: (...args: unknown[]) => args,
  where: (...args: unknown[]) => ({ where: args }),
  limit: (value: number) => ({ limit: value }),
  getDocs: backend.getDocs,
  runTransaction: backend.run,
}));

const db = {} as Firestore;
const user = { uid: "participant-uid", email: "Owner@Example.test", emailVerified: true } as User;
const userPath = `users/${user.uid}`;
const importPath = "participant_registrations/opaque-registration-id";
const imported = {
  email: "owner@example.test", hackathon_id: "impact-osaka-2026", display_name: "  Imported Participant  ",
  attendance_mode: "online", approval_status: "approved", source: "luma",
};

function snapshot(path: string) {
  const value = backend.documents.get(path);
  return { exists: () => value !== undefined, data: () => value };
}

function registrationQuery() {
  return { docs: [...backend.documents.entries()].filter(([path]) => path.startsWith("participant_registrations/")).map(([path, value]) => ({
    ref: { path }, data: () => value,
  })) };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(settle => { resolve = settle; });
  return { promise, resolve };
}

beforeEach(() => {
  vi.clearAllMocks();
  backend.auth.currentUser = user;
  backend.commitError = null;
  backend.documents.clear();
  backend.documents.set(userPath, { role: "participant", hackathon_id: "existing-event", hackathon_ids: ["existing-event"], fullName: "Saved profile name", onboardingCompletedAt: "2026-01-01", email: "profile-email@example.test", bio: "Keep my profile" });
  backend.documents.set(importPath, { ...imported });
  backend.getDocs.mockReset().mockImplementation(async () => registrationQuery());
  backend.get.mockReset().mockImplementation(async ({ path }: Ref) => snapshot(path));
  backend.run.mockReset().mockImplementation(async (_db, update) => {
    const pending: Array<{ ref: Ref; value: Record<string, unknown> }> = [];
    const result = await update({
      get: backend.get,
      set: (ref: Ref, value: Record<string, unknown>, options: unknown) => {
        backend.set(ref, value, options);
        pending.push({ ref, value });
      },
    });
    if (backend.commitError) throw backend.commitError;
    for (const { ref, value } of pending) backend.documents.set(ref.path, { ...backend.documents.get(ref.path), ...value });
    return result;
  });
});

describe("approved imported participant enrollment", () => {
  it.each([
    { emailVerified: false }, { email: null }, { email: "  " }, { uid: "" },
  ])("does not query private imports without a verified email identity: %j", async patch => {
    const account = { ...user, ...patch } as User;
    backend.auth.currentUser = account;
    await expect(claimImportedParticipantEnrollment(db, account)).resolves.toBe(false);
    expect(backend.getDocs).not.toHaveBeenCalled();
    expect(backend.run).not.toHaveBeenCalled();
  });

  it("queries only the normalized Firebase email and preserves existing events, role, profile and onboarding", async () => {
    await expect(claimImportedParticipantEnrollment(db, user)).resolves.toBe(true);
    expect(backend.getDocs).toHaveBeenCalledExactlyOnceWith([
      { path: "participant_registrations" }, { where: ["email", "==", "owner@example.test"] }, { limit: 100 },
    ]);
    expect(backend.set).toHaveBeenCalledExactlyOnceWith({ path: userPath }, {
      hackathon_ids: ["existing-event", "impact-osaka-2026"],
    }, { merge: true });
    expect(backend.documents.get(userPath)).toMatchObject({
      role: "participant", hackathon_id: "existing-event", fullName: "Saved profile name",
      email: "profile-email@example.test", onboardingCompletedAt: "2026-01-01", bio: "Keep my profile",
    });
  });

  it("preserves a legacy primary missing from an explicit list and deduplicates approved memberships", async () => {
    backend.documents.set(userPath, { role: "participants", hackathon_id: "legacy-primary", hackathon_ids: ["another-event"], fullName: " " });
    backend.documents.set("participant_registrations/duplicate-import", { ...imported });
    await claimImportedParticipantEnrollment(db, user);
    expect(backend.documents.get(userPath)).toEqual({
      role: "participants", hackathon_id: "legacy-primary", hackathon_ids: ["legacy-primary", "another-event", "impact-osaka-2026"], fullName: " ",
    });
    await expect(claimImportedParticipantEnrollment(db, user)).resolves.toBe(false);
    expect(backend.set).toHaveBeenCalledOnce();
  });

  it("retains an existing primary even when the stored enrollment list is empty", async () => {
    backend.documents.set(userPath, { role: "participant", hackathon_id: "legacy-primary", hackathon_ids: [] });
    await claimImportedParticipantEnrollment(db, user);
    expect(backend.documents.get(userPath)?.hackathon_ids).toEqual(["legacy-primary", "impact-osaka-2026"]);
    expect(backend.documents.get(userPath)?.hackathon_id).toBe("legacy-primary");
  });

  it("claims only memberships for a blank-name account and keeps onboarding required", async () => {
    backend.documents.set(userPath, { role: "participant", hackathon_ids: [], fullName: "" });
    await claimImportedParticipantEnrollment(db, user);
    const profile = backend.documents.get(userPath);
    expect(profile).toEqual({ role: "participant", hackathon_id: "impact-osaka-2026", hackathon_ids: ["impact-osaka-2026"], fullName: "" });
    expect(backend.set).toHaveBeenCalledExactlyOnceWith({ path: userPath }, {
      hackathon_id: "impact-osaka-2026", hackathon_ids: ["impact-osaka-2026"],
    }, { merge: true });
    expect(participantNeedsOnboarding({ role: "participant", profile: { fullName: profile?.fullName as string } })).toBe(true);
  });

  it.each(["judge", "mentor", "host", "admin", undefined])("never changes a %s account into a participant", async role => {
    backend.documents.set(userPath, { role, hackathon_ids: ["existing-event"] });
    await expect(claimImportedParticipantEnrollment(db, user)).resolves.toBe(false);
    expect(backend.set).not.toHaveBeenCalled();
  });

  it("does not create a missing profile", async () => {
    backend.documents.delete(userPath);
    await expect(claimImportedParticipantEnrollment(db, user)).resolves.toBe(false);
    expect(backend.set).not.toHaveBeenCalled();
  });

  it.each([
    { approval_status: "pending" }, { source: "other" }, { hackathon_id: "../private" },
    { email: "someone-else@example.test" }, { hackathon_id: "" },
  ])("ignores unapproved, mismatched or malformed import records: %j", async patch => {
    backend.documents.set(importPath, { ...imported, ...patch });
    await expect(claimImportedParticipantEnrollment(db, user)).resolves.toBe(false);
    expect(backend.run).not.toHaveBeenCalled();
  });

  it("keeps an absent profile name absent even when the import includes a valid name", async () => {
    backend.documents.set(userPath, { role: "participant" });
    await claimImportedParticipantEnrollment(db, user);
    expect(backend.documents.get(userPath)).not.toHaveProperty("fullName");
    expect(backend.documents.get(userPath)?.hackathon_ids).toEqual(["impact-osaka-2026"]);
  });

  it("rechecks approval in the transaction instead of claiming a revoked query result", async () => {
    const earlierQuery = registrationQuery();
    backend.getDocs.mockImplementation(async () => {
      backend.documents.set(importPath, { ...imported, approval_status: "rejected" });
      return earlierQuery;
    });
    await expect(claimImportedParticipantEnrollment(db, user)).resolves.toBe(false);
    expect(backend.get).toHaveBeenCalledWith({ path: importPath });
    expect(backend.set).not.toHaveBeenCalled();
  });

  it("ignores a private query result after the Firebase account changes", async () => {
    const query = deferred<ReturnType<typeof registrationQuery>>();
    backend.getDocs.mockReturnValue(query.promise);
    const claiming = claimImportedParticipantEnrollment(db, user);
    backend.auth.currentUser = { ...user, uid: "another-account" } as User;
    query.resolve(registrationQuery());
    await expect(claiming).resolves.toBe(false);
    expect(backend.run).not.toHaveBeenCalled();
  });

  it("stops a transaction when the auth-session guard becomes stale during its reads", async () => {
    let current = true;
    backend.get.mockImplementation(async ({ path }: Ref) => {
      if (path === importPath) current = false;
      return snapshot(path);
    });
    await expect(claimImportedParticipantEnrollment(db, user, () => current)).resolves.toBe(false);
    expect(backend.set).not.toHaveBeenCalled();
  });

  it("makes no partial profile changes if the atomic commit fails", async () => {
    const before = { ...backend.documents.get(userPath), fullName: "" };
    backend.documents.set(userPath, before);
    backend.commitError = new Error("Unavailable");
    await expect(claimImportedParticipantEnrollment(db, user)).rejects.toThrow("Unavailable");
    expect(backend.documents.get(userPath)).toEqual(before);
  });
});
