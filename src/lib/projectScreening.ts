import type { ApplicantOpsStatus, ScreeningConfidence, ScreeningSignal } from "@/lib/platformOps";
import { getApplicantDisplayName } from "@/lib/platformOps";
import type { UserProfile } from "@/types/portal";

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

export type ProjectScreeningResult = {
  score: number;
  themeFit: number;
  conceptQuality: number;
  recommendation: ApplicantOpsStatus;
  confidence: ScreeningConfidence;
  summary: string;
  matchedKeywords: string[];
  missingKeywords: string[];
  signals: ScreeningSignal[];
};

const SHORTLIST_THRESHOLD = 75;
const PASS_THRESHOLD = 50;

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

const PROBLEM_SOLUTION_RE =
  /\b(problem|solve|help|reduce|enable|improve|build|platform|prototype|agent|app|system|for)\b/i;

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

const hasText = (value: string | null | undefined) => Boolean(value?.trim());

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
  const title = concept.title?.trim() ?? "";
  const description = concept.description?.trim() ?? "";
  const support = [concept.interests, concept.bio].filter(hasText).join(" ");
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
  const problemSolutionPoints = PROBLEM_SOLUTION_RE.test(primaryBlob) ? 8 : 0;
  const urlPoints = hasText(concept.projectUrl) ? 6 : 0;
  const pdfPoints = hasText(concept.submissionPdfUrl) ? 4 : 0;
  const demoPoints = hasText(concept.demoVideoUrl) ? 6 : 0;
  const conceptQuality = Math.max(
    0,
    Math.min(100, Math.round((titlePoints + substancePoints + problemSolutionPoints + urlPoints + pdfPoints + demoPoints) * 2)),
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
      id: "substance",
      label: descLen >= 80 ? "Concept write-up has depth" : "Concept write-up",
      points: substancePoints,
      present: substancePoints > 0,
    },
    {
      id: "problem-solution",
      label: "Problem / solution language",
      points: problemSolutionPoints,
      present: problemSolutionPoints > 0,
    },
    {
      id: "demo-pack",
      label: "Link, deck, or demo",
      points: urlPoints + pdfPoints + demoPoints,
      present: urlPoints + pdfPoints + demoPoints > 0,
    },
  ];

  let score = Math.round(themeFit * 0.64 + conceptQuality * 0.36);
  if (noThemeSignal) score = Math.min(score, PASS_THRESHOLD - 1);
  if (!primaryBlob) score = Math.min(score, 36);
  score = Math.max(18, Math.min(99, score));

  const recommendation: ApplicantOpsStatus =
    score >= SHORTLIST_THRESHOLD && themeFit >= 55
      ? "shortlisted"
      : score < PASS_THRESHOLD
        ? "passed"
        : "pending";

  const confidence: ScreeningConfidence =
    score >= 88 || score < 40 ? "high" : score >= SHORTLIST_THRESHOLD || score < 58 ? "medium" : "low";

  const missingKeywords = distinctive.filter((token) => !matchedDistinctive.includes(token)).slice(0, 4);
  const matchedKeywords = [...matchedDistinctive, ...matchedGeneric].slice(0, 8);

  const summary =
    recommendation === "shortlisted"
      ? `Strong fit for “${theme}”. Hits ${matchedKeywords.slice(0, 3).join(", ") || "core theme language"} with a usable concept write-up.`
      : recommendation === "passed"
        ? noThemeSignal
          ? `Off-theme for “${theme}”. Missing ${missingKeywords.slice(0, 3).join(", ") || "the event’s core language"}.`
          : `Thin concept. Needs a clearer write-up against “${theme}”.`
        : `Partial fit for “${theme}”. Review manually — ${
            missingKeywords.length ? `weak on ${missingKeywords.slice(0, 2).join(" and ")}` : "theme is close but the write-up is light"
          }.`;

  return {
    score,
    themeFit,
    conceptQuality,
    recommendation,
    confidence,
    summary,
    matchedKeywords,
    missingKeywords,
    signals,
  };
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
    .map((value) => value?.trim())
    .filter(Boolean)
    .join("\n");

export const buildProjectConceptQueue = (
  submissions: QueueSubmission[],
  participants: QueueParticipant[],
): ProjectConceptInput[] => {
  const nameById = Object.fromEntries(
    participants.map((person) => [person.id, getApplicantDisplayName(person.profile, person.email)]),
  );
  const fromSubmissions: ProjectConceptInput[] = submissions.map((submission) => ({
    id: submission.id,
    source: "submission",
    participantId: submission.participantId,
    participantEmail: submission.participantEmail,
    participantName: nameById[submission.participantId] ?? submission.participantEmail.split("@")[0] ?? "Builder",
    teamName: submission.teamName,
    title: submission.title?.trim() || "Untitled project",
    concept: submission.shortDescription?.trim() || "",
    projectUrl: submission.projectUrl,
    submissionPdfUrl: submission.submissionPdfUrl,
    demoVideoUrl: submission.demoVideoUrl,
  }));

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
        title: person.profile?.headline?.trim() || "Concept pitch",
        concept,
        projectUrl: person.profile?.portfolioUrl ?? null,
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
