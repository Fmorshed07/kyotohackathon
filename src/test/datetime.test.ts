import { describe, expect, it } from "vitest";
import {
  formatSubmissionDateTime,
  formatSubmissionTime,
  parseTimestamp,
} from "@/lib/datetime";

describe("parseTimestamp", () => {
  it("parses ISO strings", () => {
    expect(parseTimestamp("2026-08-14T11:24:00.000Z")?.toISOString()).toBe(
      "2026-08-14T11:24:00.000Z",
    );
  });

  it("parses Firestore Timestamp-like objects", () => {
    expect(parseTimestamp({ seconds: 1_755_165_840, nanoseconds: 0 })?.getTime()).toBe(
      1_755_165_840 * 1000,
    );
  });

  it("returns null for missing or invalid values", () => {
    expect(parseTimestamp(null)).toBeNull();
    expect(parseTimestamp("")).toBeNull();
    expect(parseTimestamp("not-a-date")).toBeNull();
  });
});

describe("formatSubmissionDateTime", () => {
  it("includes both the calendar date and a clock time", () => {
    const label = formatSubmissionDateTime("2026-08-14T11:24:00.000Z");
    expect(label).toMatch(/2026/);
    expect(label).toMatch(/\d/);
    expect(formatSubmissionTime("2026-08-14T11:24:00.000Z")).toMatch(/\d/);
  });

  it("returns the fallback when the timestamp is missing", () => {
    expect(formatSubmissionDateTime(null, "Unknown")).toBe("Unknown");
  });
});
