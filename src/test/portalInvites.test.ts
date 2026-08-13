import { beforeEach, describe, expect, it, vi } from "vitest";

const getDocMock = vi.fn();
const getDocsMock = vi.fn();
const addDocMock = vi.fn();
const updateDocMock = vi.fn();
const setDocMock = vi.fn();
const incrementMock = vi.fn((value: number) => ({ __increment: value }));
const arrayUnionMock = vi.fn((...values: unknown[]) => ({ __arrayUnion: values }));

vi.mock("firebase/firestore", () => ({
  doc: (_db: unknown, col: string, id: string) => ({ col, id, path: `${col}/${id}` }),
  collection: (_db: unknown, col: string) => ({ col }),
  query: (colRef: { col: string }, ...constraints: unknown[]) => ({ col: colRef.col, constraints }),
  where: (field: string, op: string, value: unknown) => ({ field, op, value }),
  getDoc: (...args: unknown[]) => getDocMock(...args),
  getDocs: (...args: unknown[]) => getDocsMock(...args),
  addDoc: (...args: unknown[]) => addDocMock(...args),
  updateDoc: (...args: unknown[]) => updateDocMock(...args),
  setDoc: (...args: unknown[]) => setDocMock(...args),
  increment: (value: number) => incrementMock(value),
  arrayUnion: (...values: unknown[]) => arrayUnionMock(...values),
}));

import { acceptTeamInvite } from "@/lib/portalInvites";

const openInvite = {
  token: "invite-token",
  type: "team",
  submission_id: "sub-1",
  owner_id: "owner-1",
  hackathon_id: "kyoto-2026",
  team_name: "BridgeRevolution",
  owner_name: "Fatima",
  owner_email: "fmisbah.fatima@gmail.com",
  status: "open",
  created_at: "2026-08-13T00:00:00.000Z",
  max_uses: 8,
  use_count: 0,
};

describe("acceptTeamInvite", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getDocMock.mockImplementation(async (ref: { col: string; id: string }) => {
      if (ref.col === "team_invites") {
        return {
          exists: () => true,
          id: ref.id,
          data: () => openInvite,
        };
      }
      throw new Error(`Unexpected getDoc on ${ref.col}/${ref.id}`);
    });
    getDocsMock.mockResolvedValue({ docs: [] });
    addDocMock.mockResolvedValue({ id: "membership-1" });
    updateDocMock.mockResolvedValue(undefined);
    setDocMock.mockResolvedValue(undefined);
  });

  it("joins without reading the owner's private submission", async () => {
    const result = await acceptTeamInvite({} as never, "invite-token", {
      userId: "teammate-1",
      name: "Alex",
      email: "alex@example.com",
      enrolledHackathonIds: [],
    });

    expect(result).toEqual({
      teamName: "BridgeRevolution",
      hackathonId: "kyoto-2026",
      submissionId: "sub-1",
    });

    const getDocCols = getDocMock.mock.calls.map((call: Array<{ col: string }>) => call[0]?.col);
    expect(getDocCols).toEqual(["team_invites"]);
    expect(getDocCols).not.toContain("submissions");

    expect(addDocMock).toHaveBeenCalledTimes(1);
    expect(updateDocMock).toHaveBeenCalled();
    expect(setDocMock).toHaveBeenCalled();
  });

  it("still succeeds when the submission member-field sync is denied", async () => {
    updateDocMock.mockImplementation(async (ref: { col: string }) => {
      if (ref.col === "submissions") {
        throw new Error("Missing or insufficient permissions.");
      }
    });

    await expect(
      acceptTeamInvite({} as never, "invite-token", {
        userId: "teammate-1",
        name: "Alex",
        email: "alex@example.com",
      })
    ).resolves.toMatchObject({ teamName: "BridgeRevolution" });

    expect(addDocMock).toHaveBeenCalledTimes(1);
    expect(setDocMock).toHaveBeenCalledTimes(1);
  });
});
