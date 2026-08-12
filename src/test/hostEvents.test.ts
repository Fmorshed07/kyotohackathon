import { describe, expect, it } from "vitest";
import {
  buildHostEventSummary,
  createTicketCode,
  createTicketQrPayload,
  extractTicketCode,
  normalizeFocusAreas,
} from "@/lib/hostEvents";

describe("host ticket helpers", () => {
  it("creates a compact ticket code", () => {
    expect(createTicketCode()).toMatch(/^CGN-[A-HJ-NP-Z2-9]{8}$/);
  });

  it("round-trips the ticket code from a QR payload", () => {
    const code = "CGN-ABCD2345";
    const payload = createTicketQrPayload("event-123", code);

    expect(extractTicketCode(payload)).toBe(code);
    expect(extractTicketCode(code.toLowerCase())).toBe(code);
  });
});

describe("host event brief helpers", () => {
  it("normalizes focus areas from comma text", () => {
    expect(normalizeFocusAreas("Education, Healthcare\nFinance")).toEqual([
      "Education",
      "Healthcare",
      "Finance",
    ]);
  });

  it("builds a structured public summary with hierarchy markers", () => {
    const summary = buildHostEventSummary({
      name: "AI Ideathon 2026",
      tagline: "Build AI Solutions That Solve Real World Problems",
      description: "A three-day online ideathon.",
      highlightNote: "Late registration is open.",
      theme: "AI for Real World Impact",
      focusAreas: ["Education", "Healthcare"],
    });

    expect(summary).toContain("Build AI Solutions That Solve Real World Problems");
    expect(summary).toContain("**Late registration is open.**");
    expect(summary).toContain("### Theme");
    expect(summary).toContain("- Education");
  });
});
