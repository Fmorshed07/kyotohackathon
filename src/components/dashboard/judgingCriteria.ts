export type JudgingCriterion = {
  id: string;
  title: string;
  weight: number;
  questions: string[];
};

export type JudgingCriterionId = string;

export type CriteriaScores = Partial<Record<JudgingCriterionId, number | null>> | null;

export const DEFAULT_JUDGING_CRITERIA: JudgingCriterion[] = [
  {
    id: "social_impact",
    title: "Social Impact & Problem Fit",
    weight: 25,
    questions: [
      "Is the problem clearly defined and relevant to real-world challenges?",
      "Does the solution create meaningful impact for society, communities, or industries?",
    ],
  },
  {
    id: "innovation",
    title: "Innovation & Idea Quality",
    weight: 20,
    questions: [
      "Is the idea creative and different from existing solutions?",
      "Does the project present a novel way of using AI to solve the problem?",
    ],
  },
  {
    id: "implementation",
    title: "Technical Implementation",
    weight: 20,
    questions: [
      "Does the team demonstrate a functional prototype or technical concept?",
      "Is the system design logical and feasible?",
    ],
  },
  {
    id: "investment_scalability",
    title: "Investment Potential & Scalability",
    weight: 20,
    questions: [
      "Does the solution have the potential to become a scalable product, startup, or business?",
      "Is the project venture backable and attractive for future investment?",
    ],
  },
  {
    id: "demo",
    title: "Demo & Presentation",
    weight: 15,
    questions: [
      "Is the problem, solution, and impact clearly communicated?",
      "Does the demo effectively showcase the core functionality of the project?",
    ],
  },
];

/** @deprecated Use DEFAULT_JUDGING_CRITERIA or fetchHackathonCriteria instead */
export const JUDGING_CRITERIA = DEFAULT_JUDGING_CRITERIA;

export const clampCriterionScore = (score: number, maxScore: number) =>
  Math.max(0, Math.min(maxScore, Math.round(score)));

export const calculateTotalFromCriteria = (
  criteriaScores: CriteriaScores,
  criteria: JudgingCriterion[] = DEFAULT_JUDGING_CRITERIA
) =>
  criteria.reduce((sum, criterion) => {
    const score = criteriaScores?.[criterion.id];
    return sum + (typeof score === "number" ? clampCriterionScore(score, criterion.weight) : 0);
  }, 0);

export const getCriteriaStats = (criteria: JudgingCriterion[]) => {
  if (!criteria.length) {
    return { criteriaCount: 0, totalPoints: 0, highestWeight: 0, lowestWeight: 0 };
  }
  const weights = criteria.map((criterion) => criterion.weight);
  return {
    criteriaCount: criteria.length,
    totalPoints: weights.reduce((sum, weight) => sum + weight, 0),
    highestWeight: Math.max(...weights),
    lowestWeight: Math.min(...weights),
  };
};

export const slugifyCriterionId = (title: string, existingIds: Set<string>): string => {
  const base =
    title
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_|_$/g, "") || "criterion";

  if (!existingIds.has(base)) return base;

  let index = 2;
  while (existingIds.has(`${base}_${index}`)) {
    index += 1;
  }
  return `${base}_${index}`;
};

export const normalizeJudgingCriteria = (value: unknown): JudgingCriterion[] | null => {
  if (!Array.isArray(value)) return null;

  const normalized = value
    .map((entry) => {
      if (!entry || typeof entry !== "object") return null;
      const record = entry as Record<string, unknown>;
      const id = typeof record.id === "string" ? record.id.trim() : "";
      const title = typeof record.title === "string" ? record.title.trim() : "";
      const weight = typeof record.weight === "number" ? record.weight : Number(record.weight);
      const questions = Array.isArray(record.questions)
        ? record.questions
            .filter((question): question is string => typeof question === "string")
            .map((question) => question.trim())
            .filter(Boolean)
        : [];

      if (!id || !title || !Number.isFinite(weight) || weight <= 0) return null;

      return { id, title, weight: Math.round(weight), questions };
    })
    .filter((entry): entry is JudgingCriterion => entry !== null);

  return normalized.length ? normalized : null;
};
