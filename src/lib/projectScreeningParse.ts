/** Alias-free parser so Vite can load this from server code at config time. */

export type ParsedAiScreeningEvaluation = {
  themeFit?: number;
  conceptQuality?: number;
  problemClarity?: number;
  solutionDepth?: number;
  feasibility?: number;
  originality?: number;
  impact?: number;
  score?: number;
  recommendation?: "pending" | "shortlisted" | "passed";
  confidence?: "high" | "medium" | "low";
  summary?: string;
  strengths: string[];
  gaps: string[];
  matchedKeywords: string[];
  missingKeywords: string[];
  analysisMode: "ai";
};

const clampScore = (value: number, min = 0, max = 100) => Math.max(min, Math.min(max, Math.round(value)));

const clampAiScore = (value: unknown) =>
  typeof value === "number" && Number.isFinite(value) ? clampScore(value) : null;

const cleanStringList = (value: unknown, limit: number) =>
  Array.isArray(value)
    ? value
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.trim())
        .filter(Boolean)
        .slice(0, limit)
    : [];

export const parseAiScreeningEvaluations = (
  payload: unknown,
): Record<string, ParsedAiScreeningEvaluation> => {
  const source = payload && typeof payload === "object" ? (payload as Record<string, unknown>) : {};
  const rows = Array.isArray(source.evaluations) ? source.evaluations : [];
  const mapped: Record<string, ParsedAiScreeningEvaluation> = {};
  for (const row of rows) {
    if (!row || typeof row !== "object") continue;
    const record = row as Record<string, unknown>;
    const id = typeof record.id === "string" ? record.id.trim() : "";
    if (!id) continue;
    const recommendation =
      record.recommendation === "shortlisted" ||
      record.recommendation === "passed" ||
      record.recommendation === "pending"
        ? record.recommendation
        : undefined;
    const confidence =
      record.confidence === "high" || record.confidence === "medium" || record.confidence === "low"
        ? record.confidence
        : undefined;
    mapped[id] = {
      themeFit: clampAiScore(record.themeFit) ?? undefined,
      conceptQuality: clampAiScore(record.conceptQuality) ?? undefined,
      problemClarity: clampAiScore(record.problemClarity) ?? undefined,
      solutionDepth: clampAiScore(record.solutionDepth) ?? undefined,
      feasibility: clampAiScore(record.feasibility) ?? undefined,
      originality: clampAiScore(record.originality) ?? undefined,
      impact: clampAiScore(record.impact) ?? undefined,
      score: clampAiScore(record.score) ?? undefined,
      recommendation,
      confidence,
      summary: typeof record.summary === "string" ? record.summary.trim() : undefined,
      strengths: cleanStringList(record.strengths, 4),
      gaps: cleanStringList(record.gaps, 4),
      matchedKeywords: cleanStringList(record.matchedKeywords, 8),
      missingKeywords: cleanStringList(record.missingKeywords, 4),
      analysisMode: "ai",
    };
  }
  return mapped;
};
