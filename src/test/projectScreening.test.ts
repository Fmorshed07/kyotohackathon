import { describe, expect, it } from "vitest";
import {
  activeThemeFamilies,
  blendScreeningResults,
  buildProjectConceptQueue,
  compareProjectScreenScores,
  evaluateProjectConcept,
  parseAiScreeningEvaluations,
  tokenizeThemeText,
} from "@/lib/projectScreening";

const KYOTO_THEME = "Agentic AI for Japan's Future";

describe("projectScreening", () => {
  it("tokenizes distinctive theme words and activates families", () => {
    expect(tokenizeThemeText(KYOTO_THEME)).toEqual(["agentic", "ai", "japan", "future"]);
    expect(activeThemeFamilies(KYOTO_THEME)).toEqual(expect.arrayContaining(["agentic", "ai", "japan"]));
  });

  it("scores an on-theme concept higher than an off-theme one", () => {
    const onTheme = evaluateProjectConcept(
      {
        title: "KyoCare Agent",
        description:
          "A civic care agent for Kyoto clinics that routes follow-ups and helps patients navigate public services.",
        projectUrl: "https://example.com/kyocare",
        demoVideoUrl: "https://example.com/demo",
      },
      KYOTO_THEME,
    );
    const offTheme = evaluateProjectConcept(
      {
        title: "Meme Coin Mixer",
        description: "A casino-style token mixer for speculative trading with no civic or Japan angle.",
        projectUrl: "https://example.com/mixer",
      },
      KYOTO_THEME,
    );

    expect(onTheme.score).toBeGreaterThan(offTheme.score);
    expect(onTheme.themeFit).toBeGreaterThan(offTheme.themeFit);
    expect(onTheme.recommendation).toBe("shortlisted");
    expect(offTheme.recommendation).toBe("passed");
    expect(onTheme.matchedKeywords.length).toBeGreaterThan(0);
    expect(onTheme.summary.toLowerCase()).toContain("agentic");
  });

  it("keeps thin or empty concepts out of the shortlist", () => {
    const empty = evaluateProjectConcept({ title: "", description: "" }, KYOTO_THEME);
    const thin = evaluateProjectConcept(
      { title: "Untitled", description: "We will use AI." },
      KYOTO_THEME,
    );
    expect(empty.score).toBeLessThan(50);
    expect(empty.recommendation).toBe("passed");
    expect(thin.recommendation).not.toBe("shortlisted");
  });

  it("matches urban transformation language to city concepts", () => {
    const result = evaluateProjectConcept(
      {
        title: "Transit Copilot",
        description:
          "A mobility platform that helps commuters reroute around congestion using live city transport data.",
        projectUrl: "https://example.com/transit",
      },
      "AI for Urban Transformation",
    );
    expect(result.themeFit).toBeGreaterThan(50);
    expect(result.matchedKeywords.length + result.signals.filter((s) => s.present).length).toBeGreaterThan(1);
    expect(result.recommendation).not.toBe("passed");
  });

  it("builds a queue from submissions and leftover profile pitches", () => {
    const queue = buildProjectConceptQueue(
      [
        {
          id: "s1",
          participantId: "u1",
          participantEmail: "aiko@example.com",
          teamName: "Nova",
          title: "KyoCare",
          shortDescription: "Clinic agent for Kyoto.",
          projectUrl: "https://example.com",
          submissionPdfUrl: null,
          demoVideoUrl: null,
        },
      ],
      [
        { id: "u1", email: "aiko@example.com", profile: { fullName: "Aiko Tanaka" } },
        {
          id: "u2",
          email: "kenji@example.com",
          profile: {
            fullName: "Kenji Mori",
            headline: "Healthcare designer",
            bio: "Designing care pathways for clinics across Kansai.",
            interests: "Healthcare",
          },
        },
      ],
    );

    expect(queue).toHaveLength(2);
    expect(queue[0].source).toBe("submission");
    expect(queue[0].title).toBe("KyoCare");
    expect(queue[1].id).toBe("pitch:u2");
    expect(queue[1].source).toBe("pitch");
    expect(queue[1].concept).toContain("Kansai");
  });

  it("scores a specific mechanism higher than a generic AI slogan", () => {
    const deep = evaluateProjectConcept(
      {
        title: "KyoCare Agent",
        description:
          "A civic care agent for Kyoto clinics that routes follow-ups and helps patients navigate public services after discharge.",
        projectUrl: "https://example.com/kyocare",
        demoVideoUrl: "https://example.com/demo",
      },
      KYOTO_THEME,
    );
    const generic = evaluateProjectConcept(
      {
        title: "AI Helper",
        description: "We will use AI to help people improve their lives with an app.",
      },
      KYOTO_THEME,
    );

    expect(deep.solutionDepth).toBeGreaterThan(generic.solutionDepth);
    expect(deep.problemClarity).toBeGreaterThan(generic.problemClarity);
    expect(deep.score).toBeGreaterThan(generic.score);
    expect(deep.strengths.length).toBeGreaterThan(0);
    expect(generic.recommendation).not.toBe("shortlisted");
  });

  it("blends AI depth scores over the local model and ranks by mark", () => {
    const heuristic = evaluateProjectConcept(
      {
        title: "Transit Copilot",
        description: "A mobility platform that helps commuters reroute around congestion using live city transport data.",
      },
      "AI for Urban Transformation",
    );
    const blended = blendScreeningResults(heuristic, {
      score: 91,
      themeFit: 88,
      conceptQuality: 84,
      problemClarity: 80,
      solutionDepth: 86,
      summary: "Directly serves urban mobility with a concrete routing mechanism.",
      strengths: ["Named commuters", "Live transport data"],
      gaps: ["Needs a prototype link"],
    });
    expect(blended.analysisMode).toBe("blended");
    expect(blended.score).toBeGreaterThan(heuristic.score);
    expect(blended.summary).toContain("urban mobility");

    const parsed = parseAiScreeningEvaluations({
      evaluations: [{ id: "s1", themeFit: 90, score: 88, summary: "On theme.", strengths: ["Clear user"] }],
    });
    expect(parsed.s1.themeFit).toBe(90);
    expect(parsed.s1.summary).toBe("On theme.");

    const ranked = [
      { score: 70, themeFit: 80, title: "B" },
      { score: 91, themeFit: 88, title: "A" },
    ].sort(compareProjectScreenScores);
    expect(ranked[0].title).toBe("A");
  });
});
