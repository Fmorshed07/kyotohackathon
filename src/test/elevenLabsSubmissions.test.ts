import { describe, expect, it } from "vitest";
import { ELEVENLABS_SUBMISSIONS, ELEVENLABS_WINNERS } from "@/data/elevenLabsSubmissions";
import { getProjectFeedVideo } from "@/lib/projectFeedMedia";

describe("ElevenLabs meetup spreadsheet import", () => {
  it("preserves the five explicit ranks and resolves the ranked original to its corrected project", () => {
    const rankedProjects = ELEVENLABS_WINNERS.map(winner => ({
      rank: winner.rank,
      project: ELEVENLABS_SUBMISSIONS.find(project => project.id === winner.submissionId)!,
    }));
    expect(rankedProjects.map(({ rank, project }) => [rank, project.participantName])).toEqual([
      [1, "Wesley Kao"],
      [2, "Kento Ishizeki"],
      [3, "Keiichi Ogawa"],
      [4, "Jyan Zarate"],
      [5, "Mohana Das"],
    ]);
    expect(new Set(ELEVENLABS_WINNERS.map(winner => winner.submissionId)).size).toBe(5);
    expect(rankedProjects[1].project.sourceRows).toEqual([7, 14]);
    expect(rankedProjects[1].project.videoUrl).toBe("https://youtu.be/xDaCJC97xEM");
    expect(rankedProjects[4].project.additionalTeamMembers).toEqual(["Bryony Edgell", "Keito Ochi"]);
    expect(JSON.stringify(ELEVENLABS_WINNERS)).not.toMatch(/score|email/i);
  });

  it("retains every requested source row once while merging repeat submissions", () => {
    expect(ELEVENLABS_SUBMISSIONS).toHaveLength(14);
    expect(new Set(ELEVENLABS_SUBMISSIONS.map((project) => project.id)).size).toBe(14);
    const rows = ELEVENLABS_SUBMISSIONS.flatMap((project) => project.sourceRows).sort((a, b) => a - b);
    expect(rows).toEqual([2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 14, 15, 16, 17, 18]);
    expect(ELEVENLABS_SUBMISSIONS.some((project) => /BEYOND N2/i.test(project.title))).toBe(false);
  });

  it("uses the corrected video while retaining the earlier link and deduplicates Career Bridge", () => {
    const twin = ELEVENLABS_SUBMISSIONS.filter((project) => project.participantName === "Kento Ishizeki");
    expect(twin).toHaveLength(1);
    expect(twin[0].videoUrl).toBe("https://youtu.be/xDaCJC97xEM");
    expect(twin[0].additionalLinks[0].url).toBe("https://elevenlabs.io/app/image-video?generationId=yCEMQrj9jjSMXk7Wd4fw");
    const careerBridge = ELEVENLABS_SUBMISSIONS.filter((project) => project.title.startsWith("Career Bridge JP"));
    expect(careerBridge).toHaveLength(1);
    expect(careerBridge[0].sourceRows).toEqual([15, 16]);
    expect(careerBridge[0].videoUrl).toBe("https://drive.google.com/file/d/1ql9qqXbAehom5XTbXiZY9XdHKkvd5QOh/view?usp=sharing");
  });

  it("keeps all 15 distinct web links and marks the two unavailable previews", () => {
    const links = ELEVENLABS_SUBMISSIONS.flatMap((project) => [project.videoUrl!, ...project.additionalLinks.map((link) => link.url)]);
    expect(new Set(links).size).toBe(15);
    for (const value of links) {
      const url = new URL(value);
      expect(url.protocol).toBe("https:");
      expect(url.username || url.password).toBe("");
    }
    expect(ELEVENLABS_SUBMISSIONS.filter((project) => project.previewStatus === "unavailable").map((project) => project.participantName))
      .toEqual(["Preston Lau", "Toru Ito"]);
    const playable = ELEVENLABS_SUBMISSIONS.filter((project) => project.previewStatus !== "unavailable");
    expect(playable.map((project) => getProjectFeedVideo(project.videoUrl)?.kind).sort())
      .toEqual([...Array(5).fill("drive"), ...Array(7).fill("youtube")]);
  });

  it("includes showcase details without exposing contact or review information", () => {
    for (const project of ELEVENLABS_SUBMISSIONS) {
      expect(project.participantName.trim()).not.toBe("");
      expect(project.title.trim()).not.toBe("");
      expect(project.description.trim()).not.toBe("");
      expect(project.toolsUsed.trim()).not.toBe("");
      expect(project).not.toHaveProperty("email");
      expect(project).not.toHaveProperty("score");
      expect(project).not.toHaveProperty("rank");
    }
    expect(JSON.stringify(ELEVENLABS_SUBMISSIONS)).not.toMatch(/[\w.+-]+@[\w.-]+\.[a-z]{2,}/i);
    expect(JSON.stringify(ELEVENLABS_SUBMISSIONS)).not.toContain("ElevenLabs_Beyond_N2_film.mp4");
  });
});
