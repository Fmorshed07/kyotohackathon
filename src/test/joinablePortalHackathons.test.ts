import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Firestore } from "firebase/firestore";
import { fetchJoinablePortalHackathons, hostedToPortalHackathon, type HostedHackathon } from "@/lib/aiHackathons";

const backend = vi.hoisted(() => ({ getDocs: vi.fn() }));

vi.mock("firebase/firestore", async (importOriginal) => ({
  ...await importOriginal<typeof import("firebase/firestore")>(),
  collection: () => ({}),
  query: () => ({}),
  getDocs: backend.getDocs,
}));
vi.mock("@/lib/bundledHackathons", async (importOriginal) => ({
  ...await importOriginal<typeof import("@/lib/bundledHackathons")>(),
  // This suite exercises cloud discovery independently of the curated catalog.
  getBundledHackathons: () => [],
  mergeBundledHackathons: (events: HostedHackathon[]) => events,
}));

const db = {} as Firestore;
const event = (id: string, patch: Partial<HostedHackathon> = {}): HostedHackathon => ({
  id,
  name: `Event ${id}`,
  shortName: id,
  eventDate: "20 October 2026",
  location: "Tokyo, Japan",
  theme: "Community ideas",
  status: "upcoming",
  submissionMode: "open",
  summary: "An event for returning participants.",
  format: "In person",
  eligibility: "Open to everyone",
  teamSize: "Solo or team",
  prize: "Community awards",
  requirements: [],
  schedule: [],
  rulebookUrl: "",
  coverImageUrl: "",
  bannerImageUrl: "",
  galleryUrls: [],
  guests: [],
  lumaUrl: "",
  published: true,
  createdAt: "2026-10-01T00:00:00Z",
  createdBy: "organiser",
  aiGenerated: false,
  createdManually: true,
  ...patch,
});

function publishedRows(events: HostedHackathon[]) {
  backend.getDocs.mockResolvedValue({ docs: events.map((entry) => ({ id: entry.id, data: () => entry })) });
}

beforeEach(() => { backend.getDocs.mockReset(); publishedRows([]); });

describe("participant discovery artwork", () => {
  it("preserves both cover and banner images from a hosted event", () => {
    const hosted = event("with-artwork", {
      coverImageUrl: "https://example.test/cover.png",
      bannerImageUrl: "/event-banners/discovery.webp",
    });
    expect(hostedToPortalHackathon(hosted)).toMatchObject({
      id: hosted.id,
      coverImageUrl: hosted.coverImageUrl,
      bannerImageUrl: hosted.bannerImageUrl,
      submissionMode: "open",
    });
  });

  it.each(["coverImageUrl", "bannerImageUrl"] as const)("retains a lone %s without adding an empty sibling image", (field) => {
    const result = hostedToPortalHackathon(event("single-image", { [field]: "https://example.test/event.png" }));
    expect(result[field]).toBe("https://example.test/event.png");
    expect(result).not.toHaveProperty(field === "coverImageUrl" ? "bannerImageUrl" : "coverImageUrl");
  });

  it("keeps the original portal object shape when artwork is empty", () => {
    const hosted = event("without-artwork", { bannerImageUrl: "  " });
    expect(hostedToPortalHackathon(hosted)).toEqual({
      id: hosted.id,
      name: hosted.name,
      shortName: hosted.shortName,
      eventDate: hosted.eventDate,
      location: hosted.location,
      theme: hosted.theme,
      status: hosted.status,
      submissionMode: hosted.submissionMode,
    });
  });
});

describe("participant guide rule book metadata", () => {
  it("preserves trimmed public URLs and safe local rule book assets", () => {
    expect(hostedToPortalHackathon(event("public-rules", { rulebookUrl: "  https://example.test/rules.pdf?lang=en#eligibility  " })))
      .toHaveProperty("rulebookUrl", "https://example.test/rules.pdf?lang=en#eligibility");
    expect(hostedToPortalHackathon(event("local-rules", { rulebookUrl: "/documents/hackathon-rules.pdf" })))
      .toHaveProperty("rulebookUrl", "/documents/hackathon-rules.pdf");
  });

  it("omits empty, missing and unsafe rule book links", () => {
    for (const rulebookUrl of ["", undefined, "javascript:alert(1)", "//example.test/rules.pdf"]) {
      expect(hostedToPortalHackathon(event("no-public-rules", { rulebookUrl }))).not.toHaveProperty("rulebookUrl");
    }
  });
});

describe("events available for participant enrollment", () => {
  it("excludes closed registrations, finished events and unpublished listings while retaining live/upcoming open events", async () => {
    publishedRows([
      event("upcoming-open", { registrationStatus: "open", createdAt: "2026-10-03T00:00:00Z", coverImageUrl: "/event-cover.png" }),
      event("active-open", { status: "active", registrationStatus: "open", createdAt: "2026-10-01T00:00:00Z" }),
      event("active-closed", { status: "active", registrationStatus: "closed" }),
      event("upcoming-closed", { registrationStatus: "closed" }),
      event("past-open-metadata", { status: "past", registrationStatus: "open" }),
      event("unpublished", { published: false, status: "active", registrationStatus: "open" }),
      event("legacy-no-registration-gate", { createdAt: "2026-10-02T00:00:00Z" }),
    ]);

    const results = await fetchJoinablePortalHackathons(db);

    expect(results.map((entry) => entry.id)).toEqual(["active-open", "upcoming-open", "legacy-no-registration-gate"]);
    expect(results.find((entry) => entry.id === "upcoming-open")).toMatchObject({ coverImageUrl: "/event-cover.png", bannerImageUrl: "/event-cover.png" });
  });

  it("follows the existing registration helper for waitlists and preserves newest-first ordering within lifecycle", async () => {
    publishedRows([
      event("older-active", { status: "active", registrationStatus: "open" }),
      event("active-waitlist", { status: "active", registrationStatus: "waitlist", createdAt: "2026-10-02T00:00:00Z" }),
      event("upcoming-waitlist", { registrationStatus: "waitlist", createdAt: "2026-10-05T00:00:00Z" }),
    ]);

    expect((await fetchJoinablePortalHackathons(db)).map((entry) => entry.id)).toEqual([
      "active-waitlist", "older-active", "upcoming-waitlist",
    ]);
  });
});
