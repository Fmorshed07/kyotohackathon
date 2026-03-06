export const JUDGING_CRITERIA = [
  {
    id: "social_impact",
    title: "Social Impact & Problem Fit",
    weight: 25,
    description:
      "Problem clarity, real-world relevance, and meaningful societal or industry impact.",
  },
  {
    id: "innovation",
    title: "Innovation & Idea Quality",
    weight: 20,
    description:
      "Creativity, differentiation from existing solutions, and novelty of the concept.",
  },
  {
    id: "implementation",
    title: "Technical Implementation",
    weight: 20,
    description:
      "Prototype functionality plus logical, feasible system design and execution quality.",
  },
  {
    id: "ai_usage",
    title: "Use of AI Tools",
    weight: 20,
    description:
      "Meaningful AI integration and effective use of tools like Alibaba Cloud, Lovable, n8n, or similar.",
  },
  {
    id: "demo",
    title: "Demo & Presentation",
    weight: 15,
    description:
      "Clear communication of problem, solution, and impact with an effective demo of core features.",
  },
] as const;

export type JudgingCriterionId = (typeof JUDGING_CRITERIA)[number]["id"];

export type CriteriaScores = Partial<Record<JudgingCriterionId, number | null>> | null;

export const clampCriterionScore = (score: number, maxScore: number) =>
  Math.max(0, Math.min(maxScore, Math.round(score)));

export const calculateTotalFromCriteria = (criteriaScores: CriteriaScores) =>
  JUDGING_CRITERIA.reduce((sum, criterion) => {
    const score = criteriaScores?.[criterion.id];
    return sum + (typeof score === "number" ? clampCriterionScore(score, criterion.weight) : 0);
  }, 0);

