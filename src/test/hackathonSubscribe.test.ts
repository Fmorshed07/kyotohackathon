import { describe, expect, it } from "vitest";
import { isValidSubscribeEmail, normalizeSubscribeEmail, parseNewsletterSubscriber, buildNewsletterCsv } from "@/lib/hackathonSubscribe";

describe("hackathon subscribe", () => {
  it("normalizes and accepts public waitlist emails", () => {
    expect(normalizeSubscribeEmail("  Ada@Cognisor.AI ")).toBe("ada@cognisor.ai");
    expect(isValidSubscribeEmail("builder@example.com")).toBe(true);
    expect(isValidSubscribeEmail("not-an-email")).toBe(false);
    expect(isValidSubscribeEmail("a@b")).toBe(false);
  });

  it("parses newsletter rows for admin", () => {
    expect(
      parseNewsletterSubscriber("ada@cognisor.ai", {
        email: "Ada@Cognisor.AI",
        source: "project-star",
        created_at: "2026-08-14T00:00:00.000Z",
      }),
    ).toEqual({
      email: "ada@cognisor.ai",
      source: "project-star",
      createdAt: "2026-08-14T00:00:00.000Z",
    });
    expect(buildNewsletterCsv([
      { email: "ada@cognisor.ai", source: "project-star", createdAt: "2026-08-14T00:00:00.000Z" },
    ])).toContain("ada@cognisor.ai");
  });
});
