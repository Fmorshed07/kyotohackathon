import { describe, expect, it } from "vitest";
import {
  buildHostApplication,
  emptyHostApplicationDraft,
  getHostApplicationStepError,
  parseHostApplication,
} from "@/lib/hostApplication";

describe("host application onboarding", () => {
  it("requires the core host and event details at each step", () => {
    const draft = emptyHostApplicationDraft();

    expect(getHostApplicationStepError(0, { fullName: "", organization: "Community", draft })).toBe(
      "Enter your name to continue.",
    );
    expect(getHostApplicationStepError(1, { fullName: "Host", organization: "Community", draft })).toBe(
      "Enter a working event name.",
    );
    expect(getHostApplicationStepError(2, { fullName: "Host", organization: "Community", draft })).toBe(
      "Describe the event theme or challenge.",
    );
  });

  it("cleans the event brief and normalizes the host website", () => {
    const result = buildHostApplication(
      {
        ...emptyHostApplicationDraft(),
        organizerTitle: "  Community lead  ",
        website: "example.org/events",
        eventName: "  AI Community Day  ",
        audience: " Builders ",
        targetDate: " October 2026 ",
        theme: " Responsible AI ",
        goals: " Launch useful projects ",
      },
      "2026-08-15T00:00:00.000Z",
    );

    expect(result).toMatchObject({
      organizerTitle: "Community lead",
      website: "https://example.org/events",
      eventName: "AI Community Day",
      audience: "Builders",
      theme: "Responsible AI",
      goals: "Launch useful projects",
      submittedAt: "2026-08-15T00:00:00.000Z",
    });
  });

  it("parses valid saved applications and ignores empty legacy values", () => {
    expect(parseHostApplication(null)).toBeUndefined();
    expect(parseHostApplication({})).toBeUndefined();

    expect(
      parseHostApplication({
        eventName: "AI Ideathon",
        eventType: "Ideathon",
        format: "Hybrid",
        theme: "Health access",
        goals: "Prototype new services",
      }),
    ).toMatchObject({
      eventName: "AI Ideathon",
      eventType: "Ideathon",
      format: "Hybrid",
      theme: "Health access",
      goals: "Prototype new services",
    });
  });
});
