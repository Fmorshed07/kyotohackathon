export const JUDGING_CRITERIA = [
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
