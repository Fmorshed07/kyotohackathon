import { describe, expect, it } from "vitest";
import {
  evaluateApplicant,
  inferRoleFit,
  matchApplicantsIntoTeams,
  parsePlatformOps,
  scoreApplicantProfile,
  suggestCriteriaScores,
  submissionQuality,
} from "@/lib/platformOps";

describe("platformOps", () => {
  it("scores a complete profile higher than an empty one", () => {
    const empty = scoreApplicantProfile({});
    const complete = scoreApplicantProfile({
      fullName: "Aiko Tanaka",
      headline: "Agent builder",
      publicRole: "Builder",
      bio: "Building civic agents for Kyoto public services with production RAG.",
      githubUsername: "aiko",
      linkedinUrl: "https://linkedin.com/in/aiko",
      skills: "LangGraph, TypeScript",
      interests: "Public services",
      avatarUrl: "https://example.com/a.png",
    });
    expect(complete).toBeGreaterThan(empty);
    expect(complete).toBeGreaterThanOrEqual(80);
  });

  it("evaluates an individual applicant with rationale and recommendation", () => {
    const result = evaluateApplicant({
      fullName: "Kenji Mori",
      publicRole: "Product designer",
      skills: "UX, Figma",
      interests: "Healthcare",
      bio: "Designing care pathways for clinics across Kansai with strong research.",
      githubUsername: "kenji",
      linkedinUrl: "https://linkedin.com/in/kenji",
      avatarUrl: "https://example.com/k.png",
      headline: "Healthcare designer",
    });
    expect(result.role).toBe("Designer");
    expect(result.recommendation).toBe("shortlisted");
    expect(result.signals.length).toBeGreaterThan(3);
    expect(result.summary.toLowerCase()).toContain("designer");
  });

  it("infers complementary roles and matches mixed teams", () => {
    expect(inferRoleFit({ publicRole: "Product designer", skills: "UX" })).toBe("Designer");
    expect(inferRoleFit({ interests: "climate policy" })).toBe("Domain");
    expect(inferRoleFit({ skills: "LangGraph" })).toBe("Builder");

    const teams = matchApplicantsIntoTeams([
      { id: "1", role: "Builder" as const },
      { id: "2", role: "Domain" as const },
      { id: "3", role: "Designer" as const },
      { id: "4", role: "Builder" as const },
    ]);
    expect(teams).toHaveLength(2);
    expect(teams.every((team) => team.members.length === 2)).toBe(true);
    expect(teams[0].members.map((member) => member.role)).toContain("Builder");
  });

  it("suggests rubric marks from submission quality", () => {
    const scores = suggestCriteriaScores(
      [
        { id: "impact", weight: 25 },
        { id: "build", weight: 20 },
      ],
      1,
    );
    expect(scores.impact).toBeGreaterThan(15);
    expect(scores.build).toBeLessThanOrEqual(20);
    expect(
      submissionQuality({
        title: "KyoCare",
        shortDescription: "A civic care agent for Kyoto clinics with live routing and follow-up.",
        projectUrl: "https://example.com",
        submissionPdfUrl: "https://example.com/deck.pdf",
        demoVideoUrl: "https://example.com/demo",
      }),
    ).toBe(1);
  });

  it("parses persisted ops documents", () => {
    const parsed = parsePlatformOps({
      applicants: {
        u1: { status: "shortlisted", score: 91, teamName: "Team Nova", checkedIn: true },
      },
      projectScores: { s1: 54 },
      projectScreens: {
        s1: {
          status: "shortlisted",
          score: 88,
          themeFit: 91,
          conceptQuality: 80,
          summary: "Strong civic agent for Kyoto clinics.",
          strengths: ["Named users"],
          gaps: ["No demo"],
          analysisMode: "blended",
          rankedPosition: 1,
        },
      },
      lastBroadcast: "Doors open",
      replayedTo: "impact-dhaka",
      projectsScreenedAt: "2026-08-14T00:00:00.000Z",
    });
    expect(parsed.applicants.u1.status).toBe("shortlisted");
    expect(parsed.projectScores.s1).toBe(54);
    expect(parsed.projectScreens.s1).toMatchObject({
      status: "shortlisted",
      score: 88,
      themeFit: 91,
      analysisMode: "blended",
      rankedPosition: 1,
    });
    expect(parsed.projectsScreenedAt).toBe("2026-08-14T00:00:00.000Z");
    expect(parsed.replayedTo).toBe("impact-dhaka");
  });
});
