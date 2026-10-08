import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Firestore } from "firebase/firestore";
import type { HostedHackathon } from "@/lib/aiHackathons";
import { fetchAiHackathon } from "@/lib/aiHackathons";
import { checkParticipantEventEnrollment } from "@/lib/participantEventEnrollment";

vi.mock("@/lib/aiHackathons", () => ({ fetchAiHackathon: vi.fn() }));

const db = {} as Firestore;
const event = (overrides: Partial<HostedHackathon> = {}) => ({ id: "event-one", published: true, status: "active", registrationStatus: "open", ...overrides } as HostedHackathon);

describe("participant event enrollment eligibility", () => {
  beforeEach(() => { vi.mocked(fetchAiHackathon).mockReset(); });

  it.each(["active", "upcoming"] as const)("permits published %s events with open registration", async (status) => {
    vi.mocked(fetchAiHackathon).mockResolvedValue(event({ status }));
    await expect(checkParticipantEventEnrollment(db, "event-one")).resolves.toBe("new");
    expect(fetchAiHackathon).toHaveBeenCalledWith(db, "event-one");
  });

  it("blocks ended events even if their old registration field still says open", async () => {
    vi.mocked(fetchAiHackathon).mockResolvedValue(event({ status: "past" }));
    await expect(checkParticipantEventEnrollment(db, "event-one")).rejects.toThrow("This event has ended. Registration is closed.");
  });

  it("blocks closed registration without calling an upcoming event ended", async () => {
    vi.mocked(fetchAiHackathon).mockResolvedValue(event({ status: "upcoming", registrationStatus: "closed" }));
    await expect(checkParticipantEventEnrollment(db, "event-one")).rejects.toThrow("Registration for this event is closed.");
  });

  it.each([null, event({ published: false })])("blocks missing and unpublished events", async (value) => {
    vi.mocked(fetchAiHackathon).mockResolvedValue(value);
    await expect(checkParticipantEventEnrollment(db, "event-one")).rejects.toThrow("This event is unavailable for registration.");
  });

  it("fails closed when a current event cannot be fetched", async () => {
    vi.mocked(fetchAiHackathon).mockRejectedValue(new Error("Connection unavailable"));
    await expect(checkParticipantEventEnrollment(db, "event-one")).rejects.toThrow("Connection unavailable");
  });

  it.each([
    [["event-one"], "another-event"],
    [undefined, "event-one"],
  ])("preserves already-enrolled read access without another registration check", async (ids, primary) => {
    await expect(checkParticipantEventEnrollment(db, "event-one", ids, primary)).resolves.toBe("existing");
    expect(fetchAiHackathon).not.toHaveBeenCalled();
  });
});
