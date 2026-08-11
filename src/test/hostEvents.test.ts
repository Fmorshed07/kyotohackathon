import { describe, expect, it } from "vitest";
import { createTicketCode, createTicketQrPayload, extractTicketCode } from "@/lib/hostEvents";

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
