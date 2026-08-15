import { describe, expect, it } from "vitest";
import {
  buildFinalShortlistUpdate,
  getFinalShortlist,
  isFinalShortlisted,
} from "@/lib/finalShortlist";

describe("final shortlist", () => {
  it("only includes submissions explicitly selected by an organizer", () => {
    const submissions = [
      { id: "one", final_shortlisted: true },
      { id: "two", final_shortlisted: false },
      { id: "three" },
    ];

    expect(getFinalShortlist(submissions).map((submission) => submission.id)).toEqual(["one"]);
    expect(isFinalShortlisted(submissions[0])).toBe(true);
    expect(isFinalShortlisted(submissions[2])).toBe(false);
  });

  it("creates auditable add and remove updates", () => {
    const now = "2026-08-15T02:30:00.000Z";
    expect(buildFinalShortlistUpdate(true, now)).toEqual({
      final_shortlisted: true,
      final_shortlisted_at: now,
      updated_at: now,
    });
    expect(buildFinalShortlistUpdate(false, now)).toEqual({
      final_shortlisted: false,
      final_shortlisted_at: null,
      updated_at: now,
    });
  });
});
