import type { ApplicantOpsStatus } from "@/lib/platformOps";
import {
  compareProjectScreenScores,
  PASS_THRESHOLD,
  SHORTLIST_THEME_FIT,
  SHORTLIST_THRESHOLD,
} from "@/lib/projectScreening";

export type ProjectMarkAnalyticsInput = {
  id: string;
  title: string;
  participantName: string;
  teamName: string | null;
  source: string;
  status: ApplicantOpsStatus;
  score: number;
  themeFit: number;
  conceptQuality: number;
};

export type ProjectMarkShape = "shortlist" | "theme-weak" | "concept-thin" | "mid" | "below";

export type RankedProjectMark = ProjectMarkAnalyticsInput & {
  position: number;
  gap: number;
  shape: ProjectMarkShape;
};

export type MarksFilter = "all" | "shortlist" | "theme-weak" | "concept-thin" | "below";
export type MarksSort = "total" | "theme" | "concept" | "gap";

export type MarkScoreBand = {
  id: "shortlist" | "mid" | "below";
  label: string;
  hint: string;
  min: number;
  count: number;
  percent: number;
};

export type ProjectMarksAnalytics = {
  ranked: RankedProjectMark[];
  count: number;
  scoredCount: number;
  avgScore: number;
  avgThemeFit: number;
  avgConceptQuality: number;
  medianScore: number;
  minScore: number;
  maxScore: number;
  spread: number;
  shortlistReady: number;
  themeWeak: number;
  conceptThin: number;
  belowCount: number;
  statusCounts: Record<ApplicantOpsStatus, number>;
  bands: MarkScoreBand[];
  insight: string;
};

const round1 = (value: number) => Math.round(value * 10) / 10;

const mean = (values: number[]) =>
  values.length === 0 ? 0 : values.reduce((total, value) => total + value, 0) / values.length;

const median = (values: number[]) => {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((left, right) => left - right);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
};

export function classifyProjectMark(row: {
  score: number;
  themeFit: number;
  conceptQuality: number;
}): ProjectMarkShape {
  if (row.themeFit < 50 && row.conceptQuality >= 70) return "theme-weak";
  if (row.themeFit >= 70 && row.conceptQuality < 50) return "concept-thin";
  if (row.score >= SHORTLIST_THRESHOLD && row.themeFit >= SHORTLIST_THEME_FIT) return "shortlist";
  if (row.score < PASS_THRESHOLD) return "below";
  return "mid";
}

export function rankProjectMarks(rows: ProjectMarkAnalyticsInput[]): RankedProjectMark[] {
  return [...rows]
    .sort((left, right) =>
      compareProjectScreenScores(
        { score: left.score, themeFit: left.themeFit, conceptQuality: left.conceptQuality, title: left.title },
        { score: right.score, themeFit: right.themeFit, conceptQuality: right.conceptQuality, title: right.title },
      ),
    )
    .map((row, index) => ({
      ...row,
      position: index + 1,
      gap: row.conceptQuality - row.themeFit,
      shape: classifyProjectMark(row),
    }));
}

export function filterRankedMarks(
  rows: RankedProjectMark[],
  filter: MarksFilter,
  query = "",
): RankedProjectMark[] {
  const needle = query.trim().toLowerCase();
  return rows.filter((row) => {
    if (filter === "shortlist" && row.shape !== "shortlist") return false;
    if (filter === "theme-weak" && row.shape !== "theme-weak") return false;
    if (filter === "concept-thin" && row.shape !== "concept-thin") return false;
    if (filter === "below" && row.shape !== "below") return false;
    if (!needle) return true;
    return [row.title, row.teamName ?? "", row.participantName]
      .join(" ")
      .toLowerCase()
      .includes(needle);
  });
}

export function sortRankedMarks(rows: RankedProjectMark[], sort: MarksSort): RankedProjectMark[] {
  const copy = [...rows];
  if (sort === "theme") {
    copy.sort((left, right) => right.themeFit - left.themeFit || left.position - right.position);
  } else if (sort === "concept") {
    copy.sort((left, right) => right.conceptQuality - left.conceptQuality || left.position - right.position);
  } else if (sort === "gap") {
    copy.sort((left, right) => Math.abs(right.gap) - Math.abs(left.gap) || left.position - right.position);
  } else {
    copy.sort((left, right) => left.position - right.position);
  }
  return copy;
}

function buildInsight(input: {
  count: number;
  avgScore: number;
  avgThemeFit: number;
  avgConceptQuality: number;
  shortlistReady: number;
  themeWeak: number;
  conceptThin: number;
}): string {
  const parts: string[] = [];
  if (input.avgThemeFit + 8 < input.avgConceptQuality) {
    parts.push(
      `Field average is theme ${input.avgThemeFit} vs concept ${input.avgConceptQuality} — ideas are ahead of theme match.`,
    );
  } else if (input.avgConceptQuality + 8 < input.avgThemeFit) {
    parts.push(
      `Field average is theme ${input.avgThemeFit} vs concept ${input.avgConceptQuality} — theme match is ahead of write-up depth.`,
    );
  } else {
    parts.push(
      `Field averages sit close together: theme ${input.avgThemeFit}, concept ${input.avgConceptQuality}, total ${input.avgScore}.`,
    );
  }
  if (input.themeWeak > 0) {
    parts.push(
      `${input.themeWeak} ${input.themeWeak === 1 ? "concept is" : "concepts are"} strong on idea but weak on theme fit.`,
    );
  }
  if (input.conceptThin > 0) {
    parts.push(
      `${input.conceptThin} ${input.conceptThin === 1 ? "is" : "are"} on-theme with a thin write-up.`,
    );
  }
  parts.push(
    `${input.shortlistReady} of ${input.count} ${input.count === 1 ? "sits" : "sit"} in the shortlist band (${SHORTLIST_THRESHOLD}+ with theme ${SHORTLIST_THEME_FIT}+).`,
  );
  return parts.join(" ");
}

export function buildProjectMarksAnalytics(rows: ProjectMarkAnalyticsInput[]): ProjectMarksAnalytics {
  const ranked = rankProjectMarks(rows);
  const scores = ranked.map((row) => row.score);
  const themeFits = ranked.map((row) => row.themeFit);
  const concepts = ranked.map((row) => row.conceptQuality);
  const count = ranked.length;
  const avgScore = round1(mean(scores));
  const avgThemeFit = round1(mean(themeFits));
  const avgConceptQuality = round1(mean(concepts));
  const shortlistReady = ranked.filter((row) => row.shape === "shortlist").length;
  const themeWeak = ranked.filter((row) => row.shape === "theme-weak").length;
  const conceptThin = ranked.filter((row) => row.shape === "concept-thin").length;
  const minScore = scores.length ? Math.min(...scores) : 0;
  const maxScore = scores.length ? Math.max(...scores) : 0;
  const statusCounts: Record<ApplicantOpsStatus, number> = {
    pending: 0,
    shortlisted: 0,
    passed: 0,
  };
  for (const row of ranked) {
    statusCounts[row.status] += 1;
  }
  const bandDefs: Array<Omit<MarkScoreBand, "count" | "percent">> = [
    { id: "shortlist", label: "Shortlist band", hint: `${SHORTLIST_THRESHOLD}–100`, min: SHORTLIST_THRESHOLD },
    { id: "mid", label: "Mid pack", hint: `${PASS_THRESHOLD}–${SHORTLIST_THRESHOLD - 1}`, min: PASS_THRESHOLD },
    { id: "below", label: "Below pass", hint: `0–${PASS_THRESHOLD - 1}`, min: 0 },
  ];
  const bands: MarkScoreBand[] = bandDefs.map((band, index) => {
    const nextMin = index === 0 ? 101 : bandDefs[index - 1].min;
    const bandCount = ranked.filter((row) => row.score >= band.min && row.score < nextMin).length;
    return {
      ...band,
      count: bandCount,
      percent: count === 0 ? 0 : Math.round((bandCount / count) * 100),
    };
  });

  return {
    ranked,
    count,
    scoredCount: count,
    avgScore,
    avgThemeFit,
    avgConceptQuality,
    medianScore: round1(median(scores)),
    minScore,
    maxScore,
    spread: round1(maxScore - minScore),
    shortlistReady,
    themeWeak,
    conceptThin,
    belowCount: ranked.filter((row) => row.shape === "below").length,
    statusCounts,
    bands,
    insight: count === 0 ? "" : buildInsight({
      count,
      avgScore,
      avgThemeFit,
      avgConceptQuality,
      shortlistReady,
      themeWeak,
      conceptThin,
    }),
  };
}
