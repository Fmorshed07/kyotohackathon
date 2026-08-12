import { describe, expect, it } from "vitest";
import {
  buildAdminHackathonCatalog,
  collectAccessibleHackathonIds,
  filterCurrentHackathons,
  getAdminEventWorkspacePath,
  getEventBoardPath,
  getHackathonPublicUrl,
  getJudgeEventWorkspacePath,
  getParticipantEventWorkspacePath,
  nextEnrolledHackathonIds,
  pickDefaultHackathonId,
  pickPreferredHackathonId,
  PORTAL_HACKATHONS,
  SITE_HACKATHON_ID,
  withHackathonQuery,
} from "@/lib/hackathons";

/** Dynamic hosted event id — not part of the static Impact catalog. */
const hostedIdeathonId = "ai-ideathon-2026-q9pxii";

describe("withHackathonQuery", () => {
  it("keeps hash after the query string", () => {
    expect(withHackathonQuery("/dashboard/admin/people#manage-judges", hostedIdeathonId)).toBe(
      `/dashboard/admin/people?hackathon=${hostedIdeathonId}#manage-judges`,
    );
  });
});

describe("event paths and enrollment", () => {
  it("builds board and workspace paths for any hosted event id", () => {
    expect(getEventBoardPath(hostedIdeathonId)).toBe(`/boards/${hostedIdeathonId}`);
    expect(getParticipantEventWorkspacePath(hostedIdeathonId)).toBe(
      `/dashboard/participant?hackathon=${hostedIdeathonId}`
    );
    expect(getAdminEventWorkspacePath(hostedIdeathonId)).toBe(
      `/dashboard/admin?hackathon=${hostedIdeathonId}`
    );
    expect(getJudgeEventWorkspacePath(hostedIdeathonId)).toBe(
      `/dashboard/judge?hackathon=${hostedIdeathonId}`
    );
    expect(getHackathonPublicUrl(hostedIdeathonId)).toBe(`/events/${hostedIdeathonId}`);
  });

  it("keeps Impact editions in the static catalog and leaves hosted events dynamic", () => {
    expect(PORTAL_HACKATHONS.every((entry) => entry.id.startsWith("impact-"))).toBe(true);
    expect(PORTAL_HACKATHONS.some((entry) => entry.id === hostedIdeathonId)).toBe(false);
  });

  it("enrolls only the selected event on save, not Impact Kyoto", () => {
    expect(nextEnrolledHackathonIds([hostedIdeathonId], hostedIdeathonId)).toEqual([
      hostedIdeathonId,
    ]);
    expect(nextEnrolledHackathonIds([], hostedIdeathonId)).toEqual([hostedIdeathonId]);
    expect(nextEnrolledHackathonIds([hostedIdeathonId], hostedIdeathonId)).not.toContain(
      SITE_HACKATHON_ID,
    );
  });

  it("keeps Kyoto if the user already joined it, without adding it otherwise", () => {
    expect(nextEnrolledHackathonIds([SITE_HACKATHON_ID], hostedIdeathonId)).toEqual([
      SITE_HACKATHON_ID,
      hostedIdeathonId,
    ]);
  });
});

describe("buildAdminHackathonCatalog", () => {
  it("merges hosted Firebase events dynamically ahead of past Impact editions", () => {
    const catalog = buildAdminHackathonCatalog([
      {
        id: hostedIdeathonId,
        name: "AI Ideathon 2026",
        shortName: "AI Ideathon",
        eventDate: "Aug 12–14, 2026",
        location: "Online",
        theme: "Live theme",
        status: "active",
      },
    ]);
    expect(catalog[0]?.id).toBe(hostedIdeathonId);
    expect(catalog.find((entry) => entry.id === hostedIdeathonId)?.theme).toBe("Live theme");
    expect(pickDefaultHackathonId(catalog)).toBe(hostedIdeathonId);
  });
});

describe("filterCurrentHackathons", () => {
  it("hides past Impact editions and keeps live hosted events", () => {
    const catalog = buildAdminHackathonCatalog([
      {
        id: hostedIdeathonId,
        name: "AI Ideathon 2026",
        shortName: "AI Ideathon",
        eventDate: "Aug 12–14, 2026",
        location: "Online",
        theme: "Live theme",
        status: "active",
      },
    ]);
    const filtered = filterCurrentHackathons(catalog);
    expect(filtered.map((entry) => entry.id)).toEqual([hostedIdeathonId]);
    expect(filtered.some((entry) => entry.id === SITE_HACKATHON_ID)).toBe(false);
  });

  it("returns an empty list when the static catalog is all past", () => {
    expect(filterCurrentHackathons(PORTAL_HACKATHONS)).toEqual([]);
  });

  it("keeps the selected past edition visible when includeId is set", () => {
    const filtered = filterCurrentHackathons(PORTAL_HACKATHONS, {
      includeId: SITE_HACKATHON_ID,
    });
    expect(filtered.map((entry) => entry.id)).toEqual([SITE_HACKATHON_ID]);
  });
});

describe("pickPreferredHackathonId", () => {
  it("uses the requested event when the user can access it", () => {
    expect(
      pickPreferredHackathonId([hostedIdeathonId, SITE_HACKATHON_ID], {
        requestedId: hostedIdeathonId,
        storedId: SITE_HACKATHON_ID,
      })
    ).toBe(hostedIdeathonId);
  });

  it("does not open Impact Kyoto when the only submission is on another event", () => {
    expect(
      pickPreferredHackathonId([hostedIdeathonId, SITE_HACKATHON_ID], {
        storedId: SITE_HACKATHON_ID,
        primaryId: SITE_HACKATHON_ID,
        submissionHackathonIds: [hostedIdeathonId],
      })
    ).toBe(hostedIdeathonId);
  });

  it("keeps Kyoto when the user actually submitted there", () => {
    expect(
      pickPreferredHackathonId([hostedIdeathonId, SITE_HACKATHON_ID], {
        storedId: SITE_HACKATHON_ID,
        submissionHackathonIds: [SITE_HACKATHON_ID],
      })
    ).toBe(SITE_HACKATHON_ID);
  });
});

describe("collectAccessibleHackathonIds", () => {
  it("includes hosted event ids from submissions, not only the static catalog", () => {
    expect(
      collectAccessibleHackathonIds({
        enrolledIds: [hostedIdeathonId],
        submissions: [{ hackathon_id: hostedIdeathonId }],
      })
    ).toEqual([hostedIdeathonId]);
  });
});
