import { describe, expect, it } from "vitest";
import { ELEVENLABS_SUBMISSIONS } from "@/data/elevenLabsSubmissions";
import { ELEVENLABS_MEETUP_ID } from "@/lib/elevenLabsMeetup";
import { ELEVENLABS_GALLERY_SUBMISSIONS, mergePublicShowcaseProjects } from "@/lib/publicShowcaseProjects";
import { countTeamBuilders } from "@/lib/teamRoster";
import { toPublicGallerySubmission } from "@/lib/projectSocial";

describe("public meetup gallery projects", () => {
  it("includes all 14 curated projects in the meetup and preserves all 15 original links", () => {
    expect(ELEVENLABS_GALLERY_SUBMISSIONS).toHaveLength(14);
    expect(new Set(ELEVENLABS_GALLERY_SUBMISSIONS.map(project => project.hackathon_id))).toEqual(new Set([ELEVENLABS_MEETUP_ID]));
    const urls = ELEVENLABS_GALLERY_SUBMISSIONS.flatMap(project => [
      project.demo_video_url, project.project_url, ...project.showcase!.additionalLinks.map(link => link.url),
    ]).filter(Boolean);
    const sourceUrls = ELEVENLABS_SUBMISSIONS.flatMap(project => [project.videoUrl, ...project.additionalLinks.map(link => link.url)]);
    expect(new Set(urls)).toEqual(new Set(sourceUrls));
    expect(new Set(urls).size).toBe(15);
    expect(ELEVENLABS_GALLERY_SUBMISSIONS.filter(project => project.demo_video_url)).toHaveLength(13);
    expect(ELEVENLABS_GALLERY_SUBMISSIONS.find(project => project.id === "elevenlabs-tokyo-11")?.project_url)
      .toBe("https://action-changes-the-future.vercel.app/");
  });

  it("preserves participant attribution without inventing accounts or counting tools as people", () => {
    const byId = new Map(ELEVENLABS_GALLERY_SUBMISSIONS.map(project => [project.id, project]));
    expect(byId.get("elevenlabs-tokyo-4")?.member_name_list).toEqual(["Jake Laddis", "Yuki Takashima"]);
    expect(byId.get("elevenlabs-tokyo-15")?.member_name_list).toEqual(["Taira Sakakibara", "Emiko Sato"]);
    expect(countTeamBuilders(byId.get("elevenlabs-tokyo-5")!)).toBe(3);
    expect(countTeamBuilders(byId.get("elevenlabs-tokyo-8")!)).toBe(1);
    expect(byId.get("elevenlabs-tokyo-8")?.showcase?.toolsUsed).toContain("OpenAI, claude");
    for (const project of ELEVENLABS_GALLERY_SUBMISSIONS) {
      expect(project.user_id).toBe("");
      expect(project).not.toHaveProperty("owner_email");
      expect(project).not.toHaveProperty("team_members");
      expect(project).not.toHaveProperty("sourceRows");
      expect(project.judge_score).toBeNull();
      expect(project.judge_notes).toBeNull();
      expect(project.created_at).toBeNull();
    }
    expect(JSON.stringify(ELEVENLABS_GALLERY_SUBMISSIONS)).not.toMatch(/[\w.+-]+@[\w.-]+\.[a-z]{2,}/i);
  });

  it("retains unavailable-preview notes and corrected versus earlier video links", () => {
    expect(ELEVENLABS_GALLERY_SUBMISSIONS.filter(project => project.showcase?.previewStatus === "unavailable").map(project => project.id))
      .toEqual(["elevenlabs-tokyo-2", "elevenlabs-tokyo-11"]);
    const twin = ELEVENLABS_GALLERY_SUBMISSIONS.find(project => project.id === "elevenlabs-tokyo-7")!;
    expect(twin.demo_video_url).toBe("https://youtu.be/xDaCJC97xEM");
    expect(twin.project_url).toBeNull();
    expect(twin.showcase?.additionalLinks[0].url).toMatch(/^https:\/\/elevenlabs.io\//);
    expect(twin.showcase?.additionalLinks[0].note).toContain("corrected link");
  });

  it("keeps existing public projects and uses persisted versions without duplicate cards or display-only restrictions", () => {
    const live = toPublicGallerySubmission("ai-ideathon-demo", { title: "Existing demo" })!;
    const replacement = toPublicGallerySubmission("elevenlabs-tokyo-7", { title: "Updated Twin", user_id: "real-owner" })!;
    const merged = mergePublicShowcaseProjects([live, replacement]);
    expect(merged).toHaveLength(15);
    expect(merged.find(project => project.id === live.id)).toBe(live);
    const twin = merged.find(project => project.id === replacement.id);
    expect(twin).toBe(replacement);
    expect(twin?.showcase).toBeUndefined();
    expect(mergePublicShowcaseProjects([])).toHaveLength(14);
    expect(ELEVENLABS_GALLERY_SUBMISSIONS.find(project => project.id === replacement.id)?.title).toBe("Dijital Twin");
  });

  it("honors explicit catalog opt-outs instead of resurrecting their bundled fallback", () => {
    const hiddenId = "elevenlabs-tokyo-7";
    const merged = mergePublicShowcaseProjects([], [hiddenId]);
    expect(merged).toHaveLength(13);
    expect(merged.some(project => project.id === hiddenId)).toBe(false);
    expect(ELEVENLABS_GALLERY_SUBMISSIONS.some(project => project.id === hiddenId)).toBe(true);
  });
});
