import { doc, getDoc, setDoc, type Firestore } from "firebase/firestore";
import type { HackathonId } from "@/lib/hackathons";
import type { UserProfile } from "@/types/portal";

export type ApplicantOpsStatus = "pending" | "shortlisted" | "passed";
export type RoleFit = "Builder" | "Designer" | "Domain";

export type ApplicantOpsRecord = {
  status: ApplicantOpsStatus;
  score: number | null;
  teamName: string | null;
  checkedIn: boolean;
};

export type ProjectScreenRecord = {
  status: ApplicantOpsStatus;
  score: number | null;
};

export type PlatformOpsState = {
  applicants: Record<string, ApplicantOpsRecord>;
  projectScores: Record<string, number>;
  projectCriteria: Record<string, Record<string, number>>;
  projectScreens: Record<string, ProjectScreenRecord>;
  lastBroadcast: string | null;
  replayedTo: HackathonId | null;
  screenedAt: string | null;
  projectsScreenedAt: string | null;
  updatedAt: string | null;
};

export const emptyPlatformOps = (): PlatformOpsState => ({
  applicants: {},
  projectScores: {},
  projectCriteria: {},
  projectScreens: {},
  lastBroadcast: null,
  replayedTo: null,
  screenedAt: null,
  projectsScreenedAt: null,
  updatedAt: null,
});

const TEAM_NAMES = ["Nova", "Delta", "Horizon", "Kumo", "Sora", "Hana", "Ivy", "Orbit"];

const hasText = (value: string | null | undefined) => Boolean(value?.trim());

export const getApplicantDisplayName = (profile?: UserProfile | null, email?: string) => {
  const name = profile?.fullName?.trim();
  if (name) return name;
  const fromEmail = email?.split("@")[0]?.replace(/[._-]+/g, " ").trim();
  if (fromEmail) {
    return fromEmail.replace(/\b\w/g, (char) => char.toUpperCase());
  }
  return "Unnamed builder";
};

export const inferRoleFit = (profile?: UserProfile | null): RoleFit => {
  const blob = [
    profile?.publicRole,
    profile?.skills,
    profile?.interests,
    profile?.lookingFor,
    profile?.headline,
    profile?.bio,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (/design|ux|ui|product design|visual|brand/.test(blob)) return "Designer";
  if (/policy|climate|health|domain|research|education|urban|civic|impact lead/.test(blob)) {
    return "Domain";
  }
  return "Builder";
};

export type ScreeningSignal = {
  id: string;
  label: string;
  points: number;
  present: boolean;
};

export type ScreeningConfidence = "high" | "medium" | "low";

export type ScreeningAgentResult = {
  score: number;
  role: RoleFit;
  recommendation: ApplicantOpsStatus;
  confidence: ScreeningConfidence;
  summary: string;
  track: string;
  signals: ScreeningSignal[];
};

const SHORTLIST_THRESHOLD = 80;
const PASS_THRESHOLD = 55;

export const scoreApplicantProfile = (profile?: UserProfile | null): number =>
  evaluateApplicant(profile).score;

export const evaluateApplicant = (
  profile?: UserProfile | null,
  email?: string,
): ScreeningAgentResult => {
  const role = inferRoleFit(profile);
  const track =
    profile?.interests?.trim() ||
    profile?.lookingFor?.trim() ||
    profile?.publicRole?.trim() ||
    email?.split("@")[1] ||
    "General";

  const completionSignals = [
    profile?.avatarUrl,
    profile?.fullName,
    profile?.headline || profile?.publicRole,
    profile?.bio,
    profile?.githubUsername || profile?.githubProfileUrl,
    profile?.linkedinUrl || profile?.portfolioUrl,
    profile?.skills,
    profile?.interests || profile?.lookingFor,
  ];
  const completionCount = completionSignals.filter(hasText).length;
  const completionPoints = Math.round((completionCount / completionSignals.length) * 40);
  const githubPoints = hasText(profile?.githubUsername) || hasText(profile?.githubProfileUrl) ? 12 : 0;
  const skillsPoints = hasText(profile?.skills) ? 14 : 0;
  const bioLength = profile?.bio?.trim().length ?? 0;
  const bioPoints = bioLength >= 40 ? 10 : hasText(profile?.bio) ? 5 : 0;
  const socialPoints =
    hasText(profile?.linkedinUrl) || hasText(profile?.portfolioUrl) || hasText(profile?.xUrl) ? 10 : 0;
  const rolePoints = hasText(profile?.publicRole) || hasText(profile?.headline) ? 8 : 0;

  const signals: ScreeningSignal[] = [
    {
      id: "profile",
      label: `Profile completeness (${completionCount}/${completionSignals.length})`,
      points: completionPoints,
      present: completionCount > 0,
    },
    {
      id: "github",
      label: "GitHub presence",
      points: githubPoints,
      present: githubPoints > 0,
    },
    {
      id: "skills",
      label: "Skills declared",
      points: skillsPoints,
      present: skillsPoints > 0,
    },
    {
      id: "bio",
      label: bioLength >= 40 ? "Strong bio" : "Bio present",
      points: bioPoints,
      present: bioPoints > 0,
    },
    {
      id: "social",
      label: "LinkedIn / portfolio / X",
      points: socialPoints,
      present: socialPoints > 0,
    },
    {
      id: "role",
      label: "Role or headline",
      points: rolePoints,
      present: rolePoints > 0,
    },
  ];

  const score = Math.max(
    32,
    Math.min(99, 6 + completionPoints + githubPoints + skillsPoints + bioPoints + socialPoints + rolePoints),
  );

  const recommendation: ApplicantOpsStatus =
    score >= SHORTLIST_THRESHOLD ? "shortlisted" : score < PASS_THRESHOLD ? "passed" : "pending";

  const confidence: ScreeningConfidence =
    score >= 90 || score < 45 ? "high" : score >= SHORTLIST_THRESHOLD || score < 65 ? "medium" : "low";

  const present = signals.filter((signal) => signal.present).map((signal) => signal.label);
  const missing = signals.filter((signal) => !signal.present).map((signal) => signal.label);
  const summary =
    recommendation === "shortlisted"
      ? `${role} fit for ${track}. Strong signals: ${present.slice(0, 3).join(", ") || "profile depth"}.`
      : recommendation === "passed"
        ? `Weak fit so far. Missing: ${missing.slice(0, 3).join(", ") || "core profile fields"}.`
        : `Borderline ${role}. Review manually — missing ${missing.slice(0, 2).join(" and ") || "a few signals"}.`;

  return { score, role, recommendation, confidence, summary, track, signals };
};

export const matchApplicantsIntoTeams = <T extends { id: string; role: RoleFit }>(
  applicants: T[],
): Array<{ name: string; members: T[] }> => {
  const remaining = [...applicants];
  const formed: Array<{ name: string; members: T[] }> = [];

  while (remaining.length > 0) {
    const lead = remaining.shift();
    if (!lead) break;
    const partnerIndex = remaining.findIndex((person) => person.role !== lead.role);
    const partner = partnerIndex >= 0 ? remaining.splice(partnerIndex, 1)[0] : remaining.shift();
    formed.push({
      name: `Team ${TEAM_NAMES[formed.length] ?? formed.length + 1}`,
      members: partner ? [lead, partner] : [lead],
    });
  }

  return formed;
};

export const suggestCriteriaScores = (
  criteria: Array<{ id: string; weight: number }>,
  quality: number,
): Record<string, number> => {
  const clamped = Math.max(0, Math.min(1, quality));
  return Object.fromEntries(
    criteria.map((item) => {
      const ratio = 0.58 + clamped * 0.38;
      return [item.id, Math.max(1, Math.round(item.weight * ratio))];
    }),
  );
};

export const submissionQuality = (submission: {
  title: string | null;
  shortDescription: string | null;
  projectUrl: string | null;
  submissionPdfUrl: string | null;
  demoVideoUrl: string | null;
}): number => {
  const checks = [
    Boolean(submission.title?.trim()),
    (submission.shortDescription?.trim().length ?? 0) >= 40,
    Boolean(submission.projectUrl?.trim()),
    Boolean(submission.submissionPdfUrl?.trim()),
    Boolean(submission.demoVideoUrl?.trim()),
  ];
  return checks.filter(Boolean).length / checks.length;
};

export const parsePlatformOps = (value: unknown): PlatformOpsState => {
  const base = emptyPlatformOps();
  if (!value || typeof value !== "object") return base;
  const record = value as Record<string, unknown>;

  if (record.applicants && typeof record.applicants === "object") {
    for (const [id, entry] of Object.entries(record.applicants as Record<string, unknown>)) {
      if (!entry || typeof entry !== "object") continue;
      const row = entry as Record<string, unknown>;
      const status =
        row.status === "shortlisted" || row.status === "passed" || row.status === "pending"
          ? row.status
          : "pending";
      base.applicants[id] = {
        status,
        score: typeof row.score === "number" ? row.score : null,
        teamName: typeof row.teamName === "string" ? row.teamName : null,
        checkedIn: row.checkedIn === true,
      };
    }
  }

  if (record.projectScores && typeof record.projectScores === "object") {
    for (const [id, score] of Object.entries(record.projectScores as Record<string, unknown>)) {
      if (typeof score === "number") base.projectScores[id] = score;
    }
  }

  if (record.projectCriteria && typeof record.projectCriteria === "object") {
    for (const [id, scores] of Object.entries(record.projectCriteria as Record<string, unknown>)) {
      if (!scores || typeof scores !== "object") continue;
      const mapped: Record<string, number> = {};
      for (const [key, value] of Object.entries(scores as Record<string, unknown>)) {
        if (typeof value === "number") mapped[key] = value;
      }
      base.projectCriteria[id] = mapped;
    }
  }

  if (record.projectScreens && typeof record.projectScreens === "object") {
    for (const [id, entry] of Object.entries(record.projectScreens as Record<string, unknown>)) {
      if (!entry || typeof entry !== "object") continue;
      const row = entry as Record<string, unknown>;
      const status =
        row.status === "shortlisted" || row.status === "passed" || row.status === "pending"
          ? row.status
          : "pending";
      base.projectScreens[id] = {
        status,
        score: typeof row.score === "number" ? row.score : null,
      };
    }
  }

  base.lastBroadcast = typeof record.lastBroadcast === "string" ? record.lastBroadcast : null;
  base.replayedTo =
    record.replayedTo === "impact-kyoto" ||
    record.replayedTo === "impact-tokyo" ||
    record.replayedTo === "impact-dhaka"
      ? record.replayedTo
      : null;
  base.screenedAt = typeof record.screenedAt === "string" ? record.screenedAt : null;
  base.projectsScreenedAt =
    typeof record.projectsScreenedAt === "string" ? record.projectsScreenedAt : null;
  base.updatedAt = typeof record.updatedAt === "string" ? record.updatedAt : null;
  return base;
};

export async function fetchPlatformOps(
  db: Firestore,
  hackathonId: HackathonId,
): Promise<PlatformOpsState> {
  const snapshot = await getDoc(doc(db, "hackathon_ops", hackathonId));
  if (!snapshot.exists()) return emptyPlatformOps();
  return parsePlatformOps(snapshot.data());
}

export async function savePlatformOps(
  db: Firestore,
  hackathonId: HackathonId,
  state: PlatformOpsState,
): Promise<void> {
  await setDoc(
    doc(db, "hackathon_ops", hackathonId),
    { ...state, updatedAt: new Date().toISOString() },
    { merge: true },
  );
}
