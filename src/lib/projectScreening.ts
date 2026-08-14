import type {
  ApplicantOpsStatus,
  ProjectScreenRecord,
  ScreeningConfidence,
  ScreeningSignal,
} from "@/lib/platformOps";
import { getApplicantDisplayName } from "@/lib/platformOps";
import type { UserProfile } from "@/types/portal";

export { parseAiScreeningEvaluations } from "./projectScreeningParse";

export type ProjectConceptSource = "submission" | "pitch";

export type ProjectConceptInput = {
  id: string;
  source: ProjectConceptSource;
  participantId: string;
  participantEmail: string;
  participantName: string;
  teamName: string | null;
  title: string;
  concept: string;
  projectUrl: string | null;
  submissionPdfUrl: string | null;
  demoVideoUrl: string | null;
};

export type ProjectAnalysisMode = "heuristic" | "ai" | "blended";

export type ProjectScreeningResult = {
  score: number;
  themeFit: number;
  conceptQuality: number;
  problemClarity: number;
  solutionDepth: number;
  feasibility: number;
  originality: number;
  impact: number;
  recommendation: ApplicantOpsStatus;
  confidence: ScreeningConfidence;
  summary: string;
  strengths: string[];
  gaps: string[];
  matchedKeywords: string[];
  missingKeywords: string[];
  signals: ScreeningSignal[];
  analysisMode: ProjectAnalysisMode;
};

export const SHORTLIST_THRESHOLD = 75;
export const PASS_THRESHOLD = 50;
export const SHORTLIST_THEME_FIT = 55;

const STOPWORDS = new Set([
  "a",
  "an",
  "and",
  "are",
  "as",
  "at",
  "be",
  "by",
  "for",
  "from",
  "in",
  "into",
  "is",
  "it",
  "its",
  "of",
  "on",
  "or",
  "our",
  "that",
  "the",
  "this",
  "to",
  "via",
  "vs",
  "we",
  "will",
  "with",
]);

/** Common hackathon filler — still useful, but should not dominate theme fit. */
const GENERIC_THEME_TOKENS = new Set([
  "ai",
  "digital",
  "future",
  "hackathon",
  "impact",
  "innovation",
  "tech",
  "technology",
]);

const THEME_FAMILIES: Array<{ id: string; tokens: string[] }> = [
  {
    id: "agentic",
    tokens: ["agent", "agents", "agentic", "autonomous", "copilot", "orchestrat", "workflow", "multiagent"],
  },
  {
    id: "ai",
    tokens: ["ai", "llm", "gpt", "model", "machine", "learning", "generative", "intelligence"],
  },
  {
    id: "civic",
    tokens: ["civic", "city", "cities", "urban", "public", "government", "municipal", "citizen", "community", "policy"],
  },
  {
    id: "climate",
    tokens: ["climate", "energy", "carbon", "sustain", "environment", "resilience", "green", "emissions"],
  },
  {
    id: "health",
    tokens: ["health", "medical", "care", "clinic", "patient", "wellness", "hospital"],
  },
  {
    id: "education",
    tokens: ["education", "learning", "student", "tutor", "school", "classroom", "teacher"],
  },
  {
    id: "urban",
    tokens: ["urban", "city", "cities", "transport", "transit", "mobility", "housing", "infrastructure", "commute"],
  },
  {
    id: "japan",
    tokens: ["japan", "japanese", "kyoto", "tokyo", "osaka", "kansai"],
  },
  {
    id: "business",
    tokens: ["sales", "ops", "operations", "market", "startup", "venture", "enterprise"],
  },
];

const TOKEN_EXPANSIONS: Record<string, string[]> = {
  agentic: ["agentic", "agent", "agents", "multiagent"],
  japan: ["japan", "japanese", "kyoto", "tokyo", "osaka", "kansai"],
  urban: ["urban", "city", "cities", "civic", "transit", "mobility"],
  transformation: ["transformation", "transform", "city", "cities"],
  global: ["global", "worldwide", "international"],
  climate: ["climate", "carbon", "emissions", "sustainability"],
  health: ["health", "care", "clinic", "medical"],
  education: ["education", "learning", "student", "tutor"],
};

const PROBLEM_RE =
  /\b(problem|pain|need|challenge|lack|shortage|delay|barrier|gap|inefficien|bottleneck|underserved)\b/i;
const WHO_RE =
  /\b(patient|patients|clinic|clinics|commuter|commuters|resident|residents|citizen|citizens|student|students|teacher|teachers|farmer|farmers|nurse|nurses|builder|founder|ngo|city|ward|municip)\b/i;
const MECHANISM_RE =
  /\b(agent|agents|orchestrat\w*|route|routes|routing|match|detect|predict|recommend|automat\w*|workflow|copilot|dashboard|api|sensor|map|rag|llm)\b/i;
const FEASIBILITY_RE =
  /\b(prototype|mvp|demo|dataset|api|pilot|interview|figma|langchain|firebase|openai|next\.js|python)\b/i;
const GENERIC_PITCH_RE =
  /\b(we will use ai|an? ai (?:app|tool|platform) (?:to|that) help|use ai to (?:help|improve|solve))\b/i;
const PLACE_RE = /\b(japan|japanese|kyoto|tokyo|osaka|kansai|dhaka|bangladesh)\b/i;

export const tokenizeThemeText = (value: string): string[] => {
  const seen = new Set<string>();
  const tokens: string[] = [];
  for (const raw of (value ?? "")
    .toLowerCase()
    .replace(/['’]s\b/g, "")
    .replace(/['’]/g, "")
    .split(/[^a-z0-9]+/)) {
    if (raw.length < 2 || STOPWORDS.has(raw) || seen.has(raw)) continue;
    seen.add(raw);
    tokens.push(raw);
  }
  return tokens;
};

const blobHasToken = (blob: string, token: string) =>
  new RegExp(`(?:^|[^a-z0-9])${token}(?:[^a-z0-9]|$)`, "i").test(blob);

const familyHitsBlob = (family: (typeof THEME_FAMILIES)[number], blob: string) =>
  family.tokens.some((token) => blobHasToken(blob, token) || blob.includes(token));

export const activeThemeFamilies = (theme: string): string[] => {
  const themeBlob = (theme ?? "").toLowerCase();
  return THEME_FAMILIES.filter((family) => familyHitsBlob(family, themeBlob)).map((family) => family.id);
};

const asText = (value: unknown): string => {
  if (typeof value === "string") return value;
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    for (const key of ["url", "href", "link", "src", "text", "title", "name"]) {
      if (typeof record[key] === "string" && record[key].trim()) return record[key];
    }
  }
  return "";
};

const asStringList = (value: unknown, limit: number) =>
  Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string").map((item) => item.trim()).filter(Boolean).slice(0, limit)
    : [];

const pickList = (value: unknown, limit: number, fallback: string[]) => {
  const list = asStringList(value, limit);
  return list.length ? list : fallback;
};

const clampScore = (value: number, min = 0, max = 100) => Math.max(min, Math.min(max, Math.round(value)));

const hitCount = (blob: string, pattern: RegExp) => blob.match(new RegExp(pattern.source, "gi"))?.length ?? 0;

export const evaluateProjectConcept = (
  concept: {
    title?: string | null;
    description?: string | null;
    projectUrl?: string | null;
    submissionPdfUrl?: string | null;
    demoVideoUrl?: string | null;
    interests?: string | null;
    bio?: string | null;
  },
  theme: string,
): ProjectScreeningResult => {
  theme = theme ?? "";
  const title = asText(concept.title).trim();
  const description = asText(concept.description).trim();
  const support = [asText(concept.interests), asText(concept.bio)].filter((value) => value.trim()).join(" ");
  const primaryBlob = `${title} ${description}`.trim().toLowerCase();
  const fullBlob = `${primaryBlob} ${support}`.trim().toLowerCase();
  const themeTokens = tokenizeThemeText(theme);
  const distinctive = themeTokens.filter((token) => !GENERIC_THEME_TOKENS.has(token));
  const generic = themeTokens.filter((token) => GENERIC_THEME_TOKENS.has(token));
  const families = activeThemeFamilies(theme);

  const matchedDistinctive: string[] = [];
  for (const token of distinctive) {
    const variants = TOKEN_EXPANSIONS[token] ?? [token];
    if (variants.some((variant) => blobHasToken(fullBlob, variant))) {
      matchedDistinctive.push(token);
    }
  }
  const matchedGeneric = generic.filter((token) => blobHasToken(fullBlob, token));
  const matchedFamilies = families.filter((id) => {
    const family = THEME_FAMILIES.find((entry) => entry.id === id);
    return family ? familyHitsBlob(family, fullBlob) : false;
  });

  const distinctivePoints = Math.min(36, matchedDistinctive.length * 12);
  const genericPoints = Math.min(8, matchedGeneric.length * 3);
  const familyPoints = Math.min(36, matchedFamilies.length * 12);
  const titleBonus =
    distinctive.some((token) => {
      const variants = TOKEN_EXPANSIONS[token] ?? [token];
      return variants.some((variant) => blobHasToken(title.toLowerCase(), variant));
    })
      ? 8
      : 0;

  let themeFitRaw = distinctivePoints + genericPoints + familyPoints + titleBonus;
  const meaningfulFamilies = matchedFamilies.filter((id) => id !== "ai");
  const noThemeSignal = matchedDistinctive.length === 0 && meaningfulFamilies.length === 0;
  if (noThemeSignal) themeFitRaw = Math.min(themeFitRaw, 18);
  const themeFit = Math.max(0, Math.min(100, Math.round(themeFitRaw * 1.55)));

  const descLen = description.length;
  const substancePoints = descLen >= 160 ? 16 : descLen >= 80 ? 12 : descLen >= 40 ? 8 : descLen > 0 ? 4 : 0;
  const titlePoints = title && !/^untitled/i.test(title) ? 8 : title ? 3 : 0;
  const problemHits = hitCount(primaryBlob, PROBLEM_RE);
  const whoHits = hitCount(fullBlob, WHO_RE);
  const mechanismHits = hitCount(fullBlob, MECHANISM_RE);
  const feasibilityHits = hitCount(fullBlob, FEASIBILITY_RE);
  const urlPoints = asText(concept.projectUrl).trim() ? 6 : 0;
  const pdfPoints = asText(concept.submissionPdfUrl).trim() ? 4 : 0;
  const demoPoints = asText(concept.demoVideoUrl).trim() ? 6 : 0;
  const artifactPoints = urlPoints + pdfPoints + demoPoints;
  const genericPitch = GENERIC_PITCH_RE.test(primaryBlob) && descLen < 120;
  const placeBonus = PLACE_RE.test(fullBlob) && families.includes("japan") ? 12 : 0;

  const problemClarity = clampScore(
    (problemHits > 0 ? 28 : 8) + Math.min(24, whoHits * 12) + (descLen >= 80 ? 18 : descLen >= 40 ? 10 : 0) + titlePoints,
  );
  const solutionDepth = clampScore(
    Math.min(40, mechanismHits * 14) + substancePoints * 2 + (descLen >= 140 ? 16 : descLen >= 80 ? 8 : 0),
  );
  const feasibility = clampScore(
    artifactPoints * 4 + Math.min(28, feasibilityHits * 10) + (descLen >= 60 ? 12 : 4),
  );
  const originality = clampScore(
    42 +
      (genericPitch ? -22 : 10) +
      (mechanismHits >= 2 ? 16 : mechanismHits === 1 ? 8 : 0) +
      (whoHits > 0 ? 10 : 0) +
      (descLen >= 100 ? 12 : 0),
  );
  const impact = clampScore(
    (whoHits > 0 ? 28 : 8) +
      placeBonus +
      (matchedFamilies.filter((id) => id !== "ai").length * 10) +
      (problemHits > 0 ? 14 : 0) +
      (descLen >= 80 ? 12 : 0),
  );

  const conceptQuality = clampScore(
    problemClarity * 0.22 +
      solutionDepth * 0.28 +
      feasibility * 0.18 +
      originality * 0.16 +
      impact * 0.16,
  );

  const signals: ScreeningSignal[] = [
    {
      id: "theme-keywords",
      label:
        matchedDistinctive.length > 0
          ? `Theme keywords: ${matchedDistinctive.join(", ")}`
          : "Distinctive theme keywords",
      points: distinctivePoints,
      present: matchedDistinctive.length > 0,
    },
    {
      id: "theme-families",
      label:
        matchedFamilies.length > 0
          ? `Theme domains: ${matchedFamilies.join(", ")}`
          : "Theme domain overlap",
      points: familyPoints,
      present: matchedFamilies.length > 0,
    },
    {
      id: "title-fit",
      label: "Title echoes the event theme",
      points: titleBonus,
      present: titleBonus > 0,
    },
    {
      id: "problem-clarity",
      label: problemHits > 0 ? "Names a concrete problem and who it hits" : "Problem and user are named",
      points: Math.round(problemClarity / 8),
      present: problemHits > 0 && whoHits > 0,
    },
    {
      id: "solution-depth",
      label: mechanismHits > 0 ? "Explains how the system works" : "Mechanism / how it works",
      points: Math.round(solutionDepth / 8),
      present: mechanismHits > 0 && descLen >= 80,
    },
    {
      id: "feasibility",
      label: artifactPoints > 0 ? "Link, deck, or demo attached" : "Prototype evidence",
      points: artifactPoints + Math.min(8, feasibilityHits * 3),
      present: artifactPoints > 0 || feasibilityHits > 0,
    },
  ];

  let score = clampScore(themeFit * 0.58 + conceptQuality * 0.42, 18, 99);
  if (noThemeSignal) score = Math.min(score, PASS_THRESHOLD - 1);
  if (!primaryBlob) score = Math.min(score, 36);

  const recommendation = recommendationFromScores(score, themeFit);
  const confidence: ScreeningConfidence =
    score >= 88 || score < 40 ? "high" : score >= SHORTLIST_THRESHOLD || score < 58 ? "medium" : "low";

  const missingKeywords = distinctive.filter((token) => !matchedDistinctive.includes(token)).slice(0, 4);
  const matchedKeywords = [...matchedDistinctive, ...matchedGeneric].slice(0, 8);
  const { strengths, gaps, summary } = buildHeuristicNarrative({
    theme,
    recommendation,
    noThemeSignal,
    matchedKeywords,
    missingKeywords,
    problemClarity,
    solutionDepth,
    feasibility,
    originality,
    impact,
  });

  return {
    score,
    themeFit,
    conceptQuality,
    problemClarity,
    solutionDepth,
    feasibility,
    originality,
    impact,
    recommendation,
    confidence,
    summary,
    strengths,
    gaps,
    matchedKeywords,
    missingKeywords,
    signals,
    analysisMode: "heuristic",
  };
};

export const recommendationFromScores = (score: number, themeFit: number): ApplicantOpsStatus =>
  score >= SHORTLIST_THRESHOLD && themeFit >= SHORTLIST_THEME_FIT
    ? "shortlisted"
    : score < PASS_THRESHOLD
      ? "passed"
      : "pending";

const buildHeuristicNarrative = (input: {
  theme: string;
  recommendation: ApplicantOpsStatus;
  noThemeSignal: boolean;
  matchedKeywords: string[];
  missingKeywords: string[];
  problemClarity: number;
  solutionDepth: number;
  feasibility: number;
  originality: number;
  impact: number;
}): { strengths: string[]; gaps: string[]; summary: string } => {
  const strengths: string[] = [];
  const gaps: string[] = [];
  if (input.matchedKeywords.length > 0) strengths.push(`Theme language: ${input.matchedKeywords.slice(0, 3).join(", ")}`);
  if (input.problemClarity >= 60) strengths.push("Clear problem and user");
  if (input.solutionDepth >= 60) strengths.push("Mechanism is spelled out");
  if (input.feasibility >= 55) strengths.push("Some prototype evidence");
  if (input.impact >= 60) strengths.push("Named beneficiaries / local impact");
  if (input.missingKeywords.length > 0) gaps.push(`Weak on ${input.missingKeywords.slice(0, 3).join(", ")}`);
  if (input.problemClarity < 50) gaps.push("Problem and user are vague");
  if (input.solutionDepth < 50) gaps.push("How it works is thin");
  if (input.feasibility < 45) gaps.push("Little evidence it can ship in the event");
  if (input.originality < 45) gaps.push("Reads like a generic AI pitch");

  const summary =
    input.recommendation === "shortlisted"
      ? `Strong fit for “${input.theme}”. Hits ${input.matchedKeywords.slice(0, 3).join(", ") || "core theme language"} with a usable concept write-up.`
      : input.recommendation === "passed"
        ? input.noThemeSignal
          ? `Off-theme for “${input.theme}”. Missing ${input.missingKeywords.slice(0, 3).join(", ") || "the event’s core language"}.`
          : `Thin concept. Needs a clearer write-up against “${input.theme}”.`
        : `Partial fit for “${input.theme}”. Review manually — ${
            input.missingKeywords.length
              ? `weak on ${input.missingKeywords.slice(0, 2).join(" and ")}`
              : "theme is close but the write-up is light"
          }.`;

  return { strengths: strengths.slice(0, 4), gaps: gaps.slice(0, 4), summary };
};

export const blendScreeningResults = (
  heuristic: ProjectScreeningResult,
  ai?: Partial<ProjectScreeningResult> | null,
): ProjectScreeningResult => {
  if (!ai) return heuristic;
  const pick = (aiValue: number | undefined, heuristicValue: number, aiWeight = 0.74) =>
    typeof aiValue === "number"
      ? clampScore(aiValue * aiWeight + heuristicValue * (1 - aiWeight))
      : heuristicValue;

  const themeFit = pick(ai.themeFit, heuristic.themeFit, 0.78);
  const problemClarity = pick(ai.problemClarity, heuristic.problemClarity);
  const solutionDepth = pick(ai.solutionDepth, heuristic.solutionDepth);
  const feasibility = pick(ai.feasibility, heuristic.feasibility);
  const originality = pick(ai.originality, heuristic.originality);
  const impact = pick(ai.impact, heuristic.impact);
  const conceptQuality = pick(
    ai.conceptQuality,
    clampScore(
      problemClarity * 0.22 +
        solutionDepth * 0.28 +
        feasibility * 0.18 +
        originality * 0.16 +
        impact * 0.16,
    ),
  );
  let score = pick(ai.score, clampScore(themeFit * 0.58 + conceptQuality * 0.42, 18, 99), 0.76);
  if (themeFit < 32) score = Math.min(score, PASS_THRESHOLD - 1);
  score = clampScore(score, 18, 99);

  return {
    score,
    themeFit,
    conceptQuality,
    problemClarity,
    solutionDepth,
    feasibility,
    originality,
    impact,
    recommendation: recommendationFromScores(score, themeFit),
    confidence: ai.confidence ?? heuristic.confidence,
    summary: typeof ai.summary === "string" && ai.summary.trim() ? ai.summary.trim() : heuristic.summary,
    strengths: pickList(ai.strengths, 4, heuristic.strengths),
    gaps: pickList(ai.gaps, 4, heuristic.gaps),
    matchedKeywords: pickList(ai.matchedKeywords, 8, heuristic.matchedKeywords),
    missingKeywords: pickList(ai.missingKeywords, 4, heuristic.missingKeywords),
    signals: heuristic.signals,
    analysisMode: "blended",
  };
};

export const applyPersistedProjectScreen = (
  heuristic: ProjectScreeningResult,
  record?: {
    score?: number | null;
    themeFit?: number | null;
    conceptQuality?: number | null;
    problemClarity?: number | null;
    solutionDepth?: number | null;
    feasibility?: number | null;
    originality?: number | null;
    impact?: number | null;
    summary?: string | null;
    strengths?: string[] | null;
    gaps?: string[] | null;
    analysisMode?: ProjectAnalysisMode | null;
  } | null,
): ProjectScreeningResult => {
  if (!record) return heuristic;
  const hasAi =
    record.analysisMode === "ai" ||
    record.analysisMode === "blended" ||
    typeof record.themeFit === "number" ||
    (typeof record.summary === "string" && Boolean(record.summary.trim()));
  if (!hasAi) {
    return {
      ...heuristic,
      score: typeof record.score === "number" ? record.score : heuristic.score,
    };
  }
  return blendScreeningResults(heuristic, {
    score: record.score ?? undefined,
    themeFit: record.themeFit ?? undefined,
    conceptQuality: record.conceptQuality ?? undefined,
    problemClarity: record.problemClarity ?? undefined,
    solutionDepth: record.solutionDepth ?? undefined,
    feasibility: record.feasibility ?? undefined,
    originality: record.originality ?? undefined,
    impact: record.impact ?? undefined,
    summary: record.summary ?? undefined,
    strengths: record.strengths ?? undefined,
    gaps: record.gaps ?? undefined,
    analysisMode: record.analysisMode ?? "blended",
  });
};

export const compareProjectScreenScores = (
  left: { score: number; themeFit?: number; conceptQuality?: number; title?: string },
  right: { score: number; themeFit?: number; conceptQuality?: number; title?: string },
) =>
  right.score - left.score ||
  (right.themeFit ?? 0) - (left.themeFit ?? 0) ||
  (right.conceptQuality ?? 0) - (left.conceptQuality ?? 0) ||
  (left.title ?? "").localeCompare(right.title ?? "");

export const explainProjectMark = (input: {
  summary?: string | null;
  strengths?: string[] | null;
  gaps?: string[] | null;
  themeFit: number;
  conceptQuality: number;
  score: number;
}): string => {
  const shape =
    input.themeFit < 50 && input.conceptQuality >= 70
      ? "Concept is strong, but weak theme fit is holding the total down."
      : input.themeFit >= 70 && input.conceptQuality < 50
        ? "On-theme, but the write-up is too thin to rank higher."
        : input.score >= 75
          ? "Strong theme match with a usable concept."
          : input.score < 50
            ? "Off-theme or too thin for this event."
            : "Mid-pack: some overlap with the theme, not enough to shortlist yet.";

  const parts = [asText(input.summary).trim(), shape, asText(input.gaps?.[0]).trim()].filter(
    (part): part is string => Boolean(part),
  );
  const unique: string[] = [];
  for (const part of parts) {
    const key = part.toLowerCase();
    if (unique.some((existing) => existing.toLowerCase() === key || existing.toLowerCase().includes(key))) {
      continue;
    }
    unique.push(part);
  }
  return unique.slice(0, 2).join(" ");
};

type QueueParticipant = {
  id: string;
  email: string;
  profile?: UserProfile;
};

type QueueSubmission = {
  id: string;
  participantId: string;
  participantEmail: string;
  teamName: string | null;
  title: string | null;
  shortDescription: string | null;
  projectUrl: string | null;
  submissionPdfUrl: string | null;
  demoVideoUrl: string | null;
};

const conceptFromProfile = (profile?: UserProfile | null) =>
  [profile?.headline, profile?.bio, profile?.interests, profile?.lookingFor]
    .map((value) => asText(value).trim())
    .filter(Boolean)
    .join("\n");

export const buildProjectConceptQueue = (
  submissions: QueueSubmission[],
  participants: QueueParticipant[],
): ProjectConceptInput[] => {
  const nameById = Object.fromEntries(
    participants.map((person) => [person.id, getApplicantDisplayName(person.profile, person.email)]),
  );
  const fromSubmissions: ProjectConceptInput[] = submissions.map((submission) => {
    const email = asText(submission.participantEmail);
    const projectUrl = asText(submission.projectUrl).trim();
    const submissionPdfUrl = asText(submission.submissionPdfUrl).trim();
    const demoVideoUrl = asText(submission.demoVideoUrl).trim();
    const teamName = asText(submission.teamName).trim();
    return {
      id: String(submission.id ?? ""),
      source: "submission" as const,
      participantId: String(submission.participantId ?? ""),
      participantEmail: email,
      participantName: nameById[submission.participantId] ?? email.split("@")[0] ?? "Builder",
      teamName: teamName || null,
      title: asText(submission.title).trim() || "Untitled project",
      concept: asText(submission.shortDescription).trim(),
      projectUrl: projectUrl || null,
      submissionPdfUrl: submissionPdfUrl || null,
      demoVideoUrl: demoVideoUrl || null,
    };
  });

  const submittedParticipantIds = new Set(submissions.map((submission) => submission.participantId));
  const fromPitches: ProjectConceptInput[] = participants
    .filter((person) => !submittedParticipantIds.has(person.id))
    .map((person) => {
      const concept = conceptFromProfile(person.profile);
      return {
        id: `pitch:${person.id}`,
        source: "pitch" as const,
        participantId: person.id,
        participantEmail: person.email,
        participantName: getApplicantDisplayName(person.profile, person.email),
        teamName: null,
        title: asText(person.profile?.headline).trim() || "Concept pitch",
        concept,
        projectUrl: asText(person.profile?.portfolioUrl).trim() || null,
        submissionPdfUrl: null,
        demoVideoUrl: null,
      };
    })
    .filter((entry) => entry.concept.trim().length > 0 || entry.title !== "Concept pitch");

  return [...fromSubmissions, ...fromPitches];
};

export const evaluateQueuedConcept = (
  item: ProjectConceptInput,
  theme: string,
  profile?: UserProfile | null,
): ProjectScreeningResult =>
  evaluateProjectConcept(
    {
      title: item.title,
      description: item.concept,
      projectUrl: item.projectUrl,
      submissionPdfUrl: item.submissionPdfUrl,
      demoVideoUrl: item.demoVideoUrl,
      interests: item.source === "pitch" ? profile?.interests : undefined,
      bio: item.source === "pitch" ? profile?.bio : undefined,
    },
    theme,
  );

export const toProjectScreenRecord = (
  evaluation: ProjectScreeningResult,
  status: ApplicantOpsStatus,
  rankedPosition?: number,
): ProjectScreenRecord => ({
  status,
  score: evaluation.score,
  themeFit: evaluation.themeFit,
  conceptQuality: evaluation.conceptQuality,
  problemClarity: evaluation.problemClarity,
  solutionDepth: evaluation.solutionDepth,
  feasibility: evaluation.feasibility,
  originality: evaluation.originality,
  impact: evaluation.impact,
  summary: evaluation.summary,
  strengths: evaluation.strengths,
  gaps: evaluation.gaps,
  analysisMode: evaluation.analysisMode,
  rankedPosition: rankedPosition ?? null,
});
