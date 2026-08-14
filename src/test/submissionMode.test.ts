import { describe, expect, it } from "vitest";
import {
  areSubmissionsWritable,
  getHackathonSubmissionMode,
  getSubmissionLockCopy,
  getSubmissionModeLabel,
  upsertPortalHackathon,
  type PortalHackathon,
} from "@/lib/hackathons";

const event = (
  overrides: Partial<PortalHackathon> & Pick<PortalHackathon, "status">,
): PortalHackathon => ({
  id: "ai-ideathon-2026",
  name: "AI Ideathon",
  shortName: "Ideathon",
  eventDate: "This weekend",
  location: "Online",
  theme: "Build",
  ...overrides,
});

describe("submission mode", () => {
  it("defaults live and upcoming events to open when the field is missing", () => {
    expect(getHackathonSubmissionMode(event({ status: "active" }))).toBe("open");
    expect(getHackathonSubmissionMode(event({ status: "upcoming" }))).toBe("open");
    expect(areSubmissionsWritable(event({ status: "active" }))).toBe(true);
  });

  it("defaults past events to closed unless organisers reopen them", () => {
    expect(getHackathonSubmissionMode(event({ status: "past" }))).toBe("closed");
    expect(areSubmissionsWritable(event({ status: "past" }))).toBe(false);
    expect(
      areSubmissionsWritable(event({ status: "past", submissionMode: "open" })),
    ).toBe(true);
  });

  it("honours an explicit pause on a live event", () => {
    const paused = event({ status: "active", submissionMode: "paused" });
    expect(getHackathonSubmissionMode(paused)).toBe("paused");
    expect(areSubmissionsWritable(paused)).toBe(false);
    expect(getSubmissionModeLabel("paused")).toBe("Submissions paused");
    expect(getSubmissionLockCopy("paused")).toMatch(/paused/i);
  });

  it("treats close as a deadline lock that can still be reversed", () => {
    const closed = event({ status: "active", submissionMode: "closed" });
    expect(areSubmissionsWritable(closed)).toBe(false);
    expect(getSubmissionModeLabel("closed")).toBe("Submissions closed");
    expect(getSubmissionLockCopy("open")).toBeNull();
  });

  it("merges a live listing update into the participant catalog", () => {
    const catalog = [event({ status: "active" })];
    const next = upsertPortalHackathon(catalog, {
      ...catalog[0],
      submissionMode: "paused",
    });
    expect(next).toHaveLength(1);
    expect(next[0].submissionMode).toBe("paused");
    expect(areSubmissionsWritable(next[0])).toBe(false);
  });
});
