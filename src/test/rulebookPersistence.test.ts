import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Firestore } from "firebase/firestore";
import {
  publishAiHackathon,
  publishHostEventPublicly,
  publishManualHackathon,
  updateHostedHackathon,
  type AiHackathonDraft,
  type ManualHackathonDraft,
} from "@/lib/aiHackathons";
import { mapHostEventFromFirestore } from "@/lib/hostEvents";
import { isValidRulebookUrl, normalizeRulebookUrl, RULEBOOK_URL_ERROR, validateRulebookUrl } from "@/lib/rulebook";

const backend = vi.hoisted(() => ({
  documents: new Map<string, Record<string, unknown>>(),
  getDoc: vi.fn(), setDoc: vi.fn(), updateDoc: vi.fn(), writeBatch: vi.fn(),
}));
vi.mock("firebase/firestore", async (original) => ({
  ...await original<typeof import("firebase/firestore")>(),
  doc: (_db: unknown, collection: string, id: string) => ({ path: `${collection}/${id}` }),
  getDoc: backend.getDoc, setDoc: backend.setDoc, updateDoc: backend.updateDoc, writeBatch: backend.writeBatch,
  runTransaction: async (_db: unknown, update: (transaction: unknown) => Promise<unknown>) => update({ get: backend.getDoc, set: backend.setDoc }),
}));

const db = {} as Firestore;
const listingId = "rulebook-test";
const hostId = "host-rulebook";
const originalUrl = "https://example.test/old-rules.pdf";

beforeEach(() => {
  vi.clearAllMocks();
  backend.documents.clear();
  backend.documents.set(`hackathons/${listingId}`, { createdBy: "host-id", hostEventId: hostId, published: true, status: "past", rulebookUrl: originalUrl });
  backend.documents.set(`host_events/${hostId}`, {
    owner_id: "host-id", name: "Existing hackathon", location: "Tokyo", start_at: "2026-08-01T09:00:00Z",
    status: "published", public_hackathon_id: listingId, rulebookUrl: originalUrl,
  });
  backend.getDoc.mockImplementation(async ({ path }: { path: string }) => ({
    exists: () => backend.documents.has(path), data: () => backend.documents.get(path),
  }));
  backend.setDoc.mockImplementation(async ({ path }: { path: string }, payload: Record<string, unknown>, options?: { merge?: boolean }) => {
    backend.documents.set(path, { ...(options?.merge ? backend.documents.get(path) : {}), ...payload });
  });
  backend.updateDoc.mockImplementation(async ({ path }: { path: string }, payload: Record<string, unknown>) => {
    backend.documents.set(path, { ...backend.documents.get(path), ...payload });
  });
});

describe("rule book links", () => {
  it.each([
    ["", ""], ["   ", ""], [" https://example.test/rules.pdf#entry ", "https://example.test/rules.pdf#entry"],
    ["http://example.test/rules", "http://example.test/rules"], ["/documents/rules.pdf", "/documents/rules.pdf"],
  ])("accepts optional safe link %j", (input, expected) => {
    expect(validateRulebookUrl(input)).toBe(expected);
  });

  it.each(["javascript:alert(1)", "data:text/html,hello", "//outside.test/rules", "/\\outside.test/rules", "example.test/rules", "https://example.test/rules\n.pdf"])("rejects unsafe or malformed link %j", (input) => {
    expect(isValidRulebookUrl(input)).toBe(false);
    expect(normalizeRulebookUrl(input)).toBe("");
    expect(() => validateRulebookUrl(input)).toThrow(RULEBOOK_URL_ERROR);
  });

  it.each([" https://example.test/new-rules.pdf ", ""])("mirrors changed or cleared rule book URLs so host republishing preserves %j", async (input) => {
    const expected = input.trim();
    await updateHostedHackathon(db, listingId, { rulebookUrl: input });
    expect(backend.documents.get(`hackathons/${listingId}`)?.rulebookUrl).toBe(expected);
    expect(backend.documents.get(`host_events/${hostId}`)?.rulebookUrl).toBe(expected);

    const host = mapHostEventFromFirestore(hostId, backend.documents.get(`host_events/${hostId}`)!);
    await publishHostEventPublicly(db, host, "host-id");

    expect(backend.documents.get(`hackathons/${listingId}`)?.rulebookUrl).toBe(expected);
  });

  it("rejects invalid admin rule book edits before reads or writes, including catalog seeding", async () => {
    await expect(updateHostedHackathon(db, "impact-kyoto", { rulebookUrl: "not a URL" })).rejects.toThrow(RULEBOOK_URL_ERROR);
    expect(backend.getDoc).not.toHaveBeenCalled();
    expect(backend.setDoc).not.toHaveBeenCalled();
    expect(backend.updateDoc).not.toHaveBeenCalled();
  });

  it("rejects invalid AI, manual, and host publishing links before writes", async () => {
    const invalid = "javascript:alert(1)";
    await expect(publishAiHackathon(db, {} as AiHackathonDraft, invalid, "admin")).rejects.toThrow(RULEBOOK_URL_ERROR);
    await expect(publishManualHackathon(db, {} as ManualHackathonDraft, invalid, "admin")).rejects.toThrow(RULEBOOK_URL_ERROR);
    const host = mapHostEventFromFirestore(hostId, { ...backend.documents.get(`host_events/${hostId}`), rulebookUrl: invalid });
    await expect(publishHostEventPublicly(db, host, "host-id")).rejects.toThrow(RULEBOOK_URL_ERROR);
    expect(backend.writeBatch).not.toHaveBeenCalled();
    expect(backend.setDoc).not.toHaveBeenCalled();
    expect(backend.updateDoc).not.toHaveBeenCalled();
  });
});
