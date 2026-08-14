import { describe, expect, it } from "vitest";
import {
  buildProjectMarksAnalytics,
  classifyProjectMark,
  filterRankedMarks,
  rankProjectMarks,
  sortRankedMarks,
} from "@/lib/projectMarksAnalytics";
import type { ProjectMarkAnalyticsInput } from "@/lib/projectMarksAnalytics";

const row = (
  overrides: Partial<ProjectMarkAnalyticsInput> & Pick<ProjectMarkAnalyticsInput, "id" | "title" | "score">,
): ProjectMarkAnalyticsInput => ({
  participantName: "Builder",
  teamName: null,
  source: "submission",
  status: "pending",
  themeFit: 60,
  conceptQuality: 60,
  ...overrides,
});

describe("projectMarksAnalytics", () => {
  it("ranks by total, then theme, then concept", () => {
    const ranked = rankProjectMarks([
      row({ id: "b", title: "Beta", score: 80, themeFit: 70, conceptQuality: 90 }),
      row({ id: "a", title: "Alpha", score: 90, themeFit: 88, conceptQuality: 84 }),
      row({ id: "c", title: "Gamma", score: 80, themeFit: 82, conceptQuality: 70 }),
    ]);
    expect(ranked.map((item) => item.id)).toEqual(["a", "c", "b"]);
    expect(ranked[0].position).toBe(1);
    expect(ranked[1].gap).toBe(70 - 82);
  });

  it("classifies theme-weak, concept-thin, and shortlist shapes", () => {
    expect(classifyProjectMark({ score: 61, themeFit: 42, conceptQuality: 96 })).toBe("theme-weak");
    expect(classifyProjectMark({ score: 62, themeFit: 80, conceptQuality: 40 })).toBe("concept-thin");
    expect(classifyProjectMark({ score: 88, themeFit: 90, conceptQuality: 84 })).toBe("shortlist");
    expect(classifyProjectMark({ score: 40, themeFit: 30, conceptQuality: 40 })).toBe("below");
    expect(classifyProjectMark({ score: 62, themeFit: 58, conceptQuality: 66 })).toBe("mid");
  });

  it("summarizes the field and explains a theme-weak cohort", () => {
    const analytics = buildProjectMarksAnalytics([
      row({ id: "a", title: "Agosh", score: 96, themeFit: 42, conceptQuality: 61, status: "shortlisted" }),
      row({ id: "b", title: "Router", score: 61, themeFit: 10, conceptQuality: 80 }),
      row({ id: "c", title: "Phoenix", score: 28, themeFit: 18, conceptQuality: 28, status: "passed" }),
    ]);
    expect(analytics.count).toBe(3);
    expect(analytics.avgScore).toBe(61.7);
    expect(analytics.medianScore).toBe(61);
    expect(analytics.spread).toBe(68);
    expect(analytics.themeWeak).toBe(1);
    expect(analytics.shortlistReady).toBe(0);
    expect(analytics.belowCount).toBe(1);
    expect(analytics.bands[0].count).toBe(1);
    expect(analytics.bands[2].count).toBe(1);
    expect(analytics.insight.toLowerCase()).toContain("theme");
    expect(analytics.insight).toContain("strong on idea");
    expect(analytics.statusCounts.shortlisted).toBe(1);
  });

  it("filters by shape and search without changing original rank", () => {
    const ranked = rankProjectMarks([
      row({ id: "a", title: "Agosh", score: 90, themeFit: 88, conceptQuality: 80 }),
      row({ id: "b", title: "Router", score: 61, themeFit: 42, conceptQuality: 80 }),
    ]);
    expect(filterRankedMarks(ranked, "theme-weak").map((item) => item.id)).toEqual(["b"]);
    expect(filterRankedMarks(ranked, "all", "ago").map((item) => item.id)).toEqual(["a"]);
    expect(filterRankedMarks(ranked, "theme-weak")[0].position).toBe(2);
  });

  it("sorts by gap magnitude while keeping rank numbers", () => {
    const ranked = rankProjectMarks([
      row({ id: "even", title: "Even", score: 80, themeFit: 78, conceptQuality: 82 }),
      row({ id: "gap", title: "Gap", score: 70, themeFit: 20, conceptQuality: 90 }),
    ]);
    expect(sortRankedMarks(ranked, "gap").map((item) => item.id)).toEqual(["gap", "even"]);
    expect(sortRankedMarks(ranked, "gap")[0].position).toBe(2);
  });
});
