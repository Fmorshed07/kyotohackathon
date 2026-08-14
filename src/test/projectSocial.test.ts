import { describe, expect, it } from "vitest";
import {
  buildProjectPermalink,
  buildProjectShareText,
  buildPublicProjectWritePayload,
  buildSocialShareTargets,
  demoLinkLabel,
  documentLinkLabel,
  listPublicProjectLinks,
  normalizeHttpUrl,
  projectLinkLabel,
  toPublicGallerySubmission,
  youtubeVideoId,
} from "@/lib/projectSocial";
import {
  clampStarRating,
  communityStarFill,
  compareStarStats,
  isValidPublicVoterId,
  parseStarStats,
  ratingDocId,
  starRatingDelta,
  voterIdFromEmail,
} from "@/lib/projectStars";
import { parseShareStats, shareDocId } from "@/lib/projectShares";

describe("project stars", () => {
  it("clamps ratings to whole stars from 1 to 5", () => {
    expect(clampStarRating(0)).toBe(1);
    expect(clampStarRating(4.4)).toBe(4);
    expect(clampStarRating(9)).toBe(5);
  });

  it("fills public ratings with stars only, never a raw average", () => {
    expect(communityStarFill({ sum: 0, count: 0 })).toBe(0);
    expect(communityStarFill({ sum: 10, count: 2 })).toBe(5);
    expect(communityStarFill({ sum: 9, count: 2 })).toBe(5);
    expect(communityStarFill({ sum: 8, count: 2 })).toBe(4);
  });

  it("computes rating deltas for new, changed, and cleared stars", () => {
    expect(starRatingDelta(0, 4)).toEqual({ sum: 4, count: 1 });
    expect(starRatingDelta(4, 5)).toEqual({ sum: 1, count: 0 });
    expect(starRatingDelta(5, 2)).toEqual({ sum: -3, count: 0 });
    expect(starRatingDelta(3, 0)).toEqual({ sum: -3, count: -1 });
    expect(starRatingDelta(4, 4)).toEqual({ sum: 0, count: 0 });
  });

  it("accepts guest voter ids used for public starring", () => {
    expect(isValidPublicVoterId("abcdefghijklmnop")).toBe(true);
    expect(isValidPublicVoterId("short")).toBe(false);
    expect(isValidPublicVoterId("bad id with spaces!!!!")).toBe(false);
  });

  it("maps an email to a stable one-time voter id", async () => {
    const first = await voterIdFromEmail("Ada@Cognisor.AI");
    const second = await voterIdFromEmail("ada@cognisor.ai");
    expect(first).toBe(second);
    expect(isValidPublicVoterId(first)).toBe(true);
  });

  it("sorts by filled stars, then how many people rated", () => {
    expect(
      compareStarStats({ sum: 8, count: 2 }, { sum: 15, count: 3 }),
    ).toBeGreaterThan(0);
    expect(ratingDocId("proj-1", "user-9")).toBe("proj-1_user-9");
    expect(parseStarStats({ star_sum: 12, star_count: 3 })).toEqual({ sum: 12, count: 3 });
  });

  it("parses distinct project share counts", () => {
    expect(shareDocId("proj-1", "sharer-9")).toBe("proj-1_sharer-9");
    expect(parseShareStats({ share_count: 4 })).toEqual({ count: 4 });
    expect(parseShareStats({ share_count: -2 })).toEqual({ count: 0 });
    expect(parseShareStats(null)).toEqual({ count: 0 });
  });
});

describe("project social links", () => {
  it("normalizes and labels public project links", () => {
    expect(normalizeHttpUrl("github.com/acme/app")).toBe("https://github.com/acme/app");
    expect(projectLinkLabel("https://github.com/acme/app")).toBe("GitHub");
    expect(demoLinkLabel("https://youtu.be/abc123xyz")).toBe("YouTube");
    expect(documentLinkLabel("https://drive.google.com/file/d/1/view")).toBe("Google Drive");
    expect(youtubeVideoId("https://www.youtube.com/watch?v=abc123xyz")).toBe("abc123xyz");

    const links = listPublicProjectLinks({
      demo_video_url: "youtu.be/abc123xyz",
      project_url: "github.com/acme/app",
      submission_pdf_url: "https://example.com/brief.pdf",
    });
    expect(links.map((link) => link.label)).toEqual(["YouTube", "GitHub", "PDF"]);
  });

  it("builds share permalinks and social targets", () => {
    expect(buildProjectPermalink("proj-1", "https://cognisor.test")).toBe(
      "https://cognisor.test/projects/proj-1",
    );
    expect(buildProjectShareText({ title: "KyoCare", teamName: "Nova" })).toContain("KyoCare");
    const targets = buildSocialShareTargets({
      url: "https://cognisor.test/projects/proj-1",
      title: "KyoCare",
      text: "Check out KyoCare on Cognisor",
    });
    expect(targets.map((target) => target.id)).toEqual([
      "x",
      "linkedin",
      "facebook",
      "whatsapp",
      "email",
    ]);
    expect(targets[0]?.href).toContain("twitter.com/intent/tweet");
    expect(targets[1]?.href).toContain("linkedin.com/sharing");
  });

  it("strips judge scores from public gallery copies", () => {
    const publicProject = toPublicGallerySubmission("proj-1", {
      owner_id: "owner-1",
      title: "KyoCare",
      short_description: "Clinic agent",
      project_url: "https://github.com/acme/app",
      submission_pdf_url: null,
      demo_video_url: null,
      created_at: "2026-08-14T00:00:00.000Z",
      public_preview_consent: true,
      judge_score: 91,
      judge_notes: "private",
      judge_scores: { judge: 91 },
    });
    expect(publicProject?.judge_score).toBeNull();
    expect(publicProject?.judge_notes).toBeNull();
    expect(publicProject?.judge_scores).toBeNull();
    expect(toPublicGallerySubmission("proj-2", { public_preview_consent: false })).toBeNull();
  });

  it("builds a public gallery write payload without judging fields", () => {
    const payload = buildPublicProjectWritePayload(
      {
        user_id: "owner-1",
        hackathon_id: "event-1",
        title: "KyoCare",
        short_description: "Clinic agent",
        project_url: "https://github.com/acme/app",
        submission_pdf_url: null,
        demo_video_url: null,
        cover_url: "https://cdn.test/cover.jpg",
        gallery_urls: ["https://cdn.test/shot.jpg"],
        team_name: "Nova",
        member_names: "Asha",
        member_name_list: ["Asha"],
        team_members: [],
        member_user_ids: ["owner-1"],
        team_leader_id: "owner-1",
        owner_name: "Asha",
        owner_email: "asha@test.dev",
        created_at: "2026-08-14T00:00:00.000Z",
        updated_at: "2026-08-14T00:00:00.000Z",
      },
      "2026-08-14T12:00:00.000Z",
    );
    expect(payload.public_preview_consent).toBe(true);
    expect(payload.owner_id).toBe("owner-1");
    expect(payload.hackathon_id).toBe("event-1");
    expect(payload.cover_url).toBe("https://cdn.test/cover.jpg");
    expect(payload).not.toHaveProperty("judge_score");
    expect(payload).not.toHaveProperty("judge_notes");
  });
});
