import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Firestore } from "firebase/firestore";
import {
  fetchPortalHackathonCatalog,
  getHostedHackathonUrl,
  hostedToPortalHackathon,
  mergePublicEventPreviews,
  portalHackathonAsHosted,
  type HostedHackathon,
} from "@/lib/aiHackathons";
import { HACKATHON_PUBLIC_URLS, PORTAL_HACKATHONS, type PortalHackathon } from "@/lib/hackathons";

const firestore = vi.hoisted(() => ({ getDoc: vi.fn(), getDocs: vi.fn() }));
vi.mock("firebase/firestore", async (original) => ({
  ...await original<typeof import("firebase/firestore")>(),
  doc: (_db: unknown, _collection: string, id: string) => ({ id }),
  collection: () => ({}),
  query: () => ({}),
  getDoc: firestore.getDoc,
  getDocs: firestore.getDocs,
}));

const db = {} as Firestore;
const portal = (id: string): PortalHackathon => PORTAL_HACKATHONS.find((event) => event.id === id)!;
const cloud = (id: string, patch: Partial<HostedHackathon> = {}): HostedHackathon => ({
  ...portalHackathonAsHosted(portal("impact-tokyo")),
  id,
  name: "Published event",
  createdBy: "organiser",
  ...patch,
});
const missing = () => ({ exists: () => false });

beforeEach(() => {
  vi.clearAllMocks();
  firestore.getDoc.mockResolvedValue(missing());
  firestore.getDocs.mockResolvedValue({ docs: [] });
});

describe("public homepage preview catalog", () => {
  it("adds past Tokyo and Dhaka archives with their existing official external URLs", () => {
    const events = mergePublicEventPreviews([], PORTAL_HACKATHONS);
    expect(events.map((event) => event.id)).toEqual(["impact-tokyo", "impact-dhaka"]);
    for (const event of events) {
      expect(getHostedHackathonUrl(event.id)).toBe(HACKATHON_PUBLIC_URLS[event.id]);
      expect(getHostedHackathonUrl(event.id)).toMatch(/^https:\/\//);
      expect(event.startAt).toBeUndefined();
      expect(event.endAt).toBeUndefined();
      expect(event.coverImageUrl).toBe("");
      expect(event.bannerImageUrl).toBe("");
    }
  });

  it("keeps published cloud content and removes duplicate catalog rows", () => {
    const tokyo = cloud("impact-tokyo", { name: "Organiser-edited Tokyo", summary: "Saved event brief", coverImageUrl: "https://example.test/poster.png" });
    const events = mergePublicEventPreviews([tokyo, tokyo], [portal("impact-tokyo"), portal("impact-tokyo")]);
    expect(events).toEqual([tokyo]);
    expect(events[0]).toBe(tokyo);
  });

  it("excludes ids omitted by the public catalog even when a stale published row exists", () => {
    const excluded = cloud("impact-tokyo");
    expect(mergePublicEventPreviews([excluded], [portal("impact-dhaka")]).map((event) => event.id)).toEqual(["impact-dhaka"]);
  });

  it("never restores a static fallback over an explicit unpublished row", () => {
    expect(mergePublicEventPreviews([cloud("impact-tokyo", { published: false })], [portal("impact-tokyo")])).toEqual([]);
  });

  it("does not manufacture a broken Kyoto internal event page without a cloud listing", () => {
    expect(mergePublicEventPreviews([], [portal("impact-kyoto")])).toEqual([]);
    const kyoto = cloud("impact-kyoto", { name: "Published Kyoto archive" });
    expect(mergePublicEventPreviews([kyoto], [portal("impact-kyoto")])).toEqual([kyoto]);
    expect(getHostedHackathonUrl(kyoto.id)).toBe("/events/impact-kyoto");
  });

  it("adds no future static fallbacks and retains allowed hosted events", () => {
    const current = cloud("hosted-meetup", { status: "upcoming" });
    expect(mergePublicEventPreviews([current], [
      { ...portal("impact-tokyo"), status: "upcoming" },
      hostedToPortalHackathon(current),
    ])).toEqual([current]);
  });
});

describe("reusing an already-loaded public event query", () => {
  it("accepts loaded events without querying the published collection again", async () => {
    const ideathon = cloud("ai-ideathon-2026-q9pxii", { name: "AI Ideathon 2026", status: "past" });
    const catalog = await fetchPortalHackathonCatalog(db, [ideathon]);
    expect(catalog.some((event) => event.id === ideathon.id)).toBe(true);
    expect(firestore.getDocs).not.toHaveBeenCalled();
    expect(firestore.getDoc).toHaveBeenCalledTimes(PORTAL_HACKATHONS.length);
  });

  it("respects hidden and unreadable portal overrides with loaded events", async () => {
    const tokyo = cloud("impact-tokyo");
    firestore.getDoc.mockImplementation(async ({ id }: { id: string }) => {
      if (id === "impact-tokyo") return { exists: () => true, data: () => ({ ...tokyo, published: false }) };
      if (id === "impact-dhaka") throw { code: "permission-denied" };
      return missing();
    });
    const catalog = await fetchPortalHackathonCatalog(db, [tokyo]);
    expect(catalog.map((event) => event.id)).toEqual(["impact-kyoto"]);
    expect(mergePublicEventPreviews([tokyo], catalog)).toEqual([]);
    expect(firestore.getDocs).not.toHaveBeenCalled();
  });
});
