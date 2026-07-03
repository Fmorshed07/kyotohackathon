import type { Submission } from "@/types/portal";
import type { JudgingCriterionId } from "@/components/dashboard/judgingCriteria";

export type TeamAccentStyle = {
  active: string;
  inactive: string;
  pill: string;
  panel: string;
  teamName: string;
};

export type CriterionAccentStyle = {
  card: string;
  pill: string;
  activeButton: string;
  inactiveButton: string;
  input: string;
};

const TEAM_ACCENT_STYLES: TeamAccentStyle[] = [
  {
    active: "border-sky-400/60 bg-sky-500/15 shadow-[0_0_0_1px_rgba(14,165,233,0.18)]",
    inactive: "border-sky-500/30 bg-sky-500/5 hover:border-sky-400/50 hover:bg-sky-500/10",
    pill: "border-sky-400/40 bg-sky-500/10 text-sky-200",
    panel: "border-sky-500/35 bg-sky-500/5",
    teamName: "text-sky-300",
  },
  {
    active: "border-violet-400/60 bg-violet-500/15 shadow-[0_0_0_1px_rgba(139,92,246,0.2)]",
    inactive: "border-violet-500/30 bg-violet-500/5 hover:border-violet-400/50 hover:bg-violet-500/10",
    pill: "border-violet-400/40 bg-violet-500/10 text-violet-200",
    panel: "border-violet-500/35 bg-violet-500/5",
    teamName: "text-violet-300",
  },
  {
    active: "border-emerald-400/60 bg-emerald-500/15 shadow-[0_0_0_1px_rgba(16,185,129,0.2)]",
    inactive: "border-emerald-500/30 bg-emerald-500/5 hover:border-emerald-400/50 hover:bg-emerald-500/10",
    pill: "border-emerald-400/40 bg-emerald-500/10 text-emerald-200",
    panel: "border-emerald-500/35 bg-emerald-500/5",
    teamName: "text-emerald-300",
  },
  {
    active: "border-amber-400/60 bg-amber-500/15 shadow-[0_0_0_1px_rgba(245,158,11,0.2)]",
    inactive: "border-amber-500/30 bg-amber-500/5 hover:border-amber-400/50 hover:bg-amber-500/10",
    pill: "border-amber-400/40 bg-amber-500/10 text-amber-200",
    panel: "border-amber-500/35 bg-amber-500/5",
    teamName: "text-amber-300",
  },
  {
    active: "border-rose-400/60 bg-rose-500/15 shadow-[0_0_0_1px_rgba(244,63,94,0.2)]",
    inactive: "border-rose-500/30 bg-rose-500/5 hover:border-rose-400/50 hover:bg-rose-500/10",
    pill: "border-rose-400/40 bg-rose-500/10 text-rose-200",
    panel: "border-rose-500/35 bg-rose-500/5",
    teamName: "text-rose-300",
  },
  {
    active: "border-cyan-400/60 bg-cyan-500/15 shadow-[0_0_0_1px_rgba(6,182,212,0.2)]",
    inactive: "border-cyan-500/30 bg-cyan-500/5 hover:border-cyan-400/50 hover:bg-cyan-500/10",
    pill: "border-cyan-400/40 bg-cyan-500/10 text-cyan-200",
    panel: "border-cyan-500/35 bg-cyan-500/5",
    teamName: "text-cyan-300",
  },
];

const CRITERION_ACCENT_STYLES: Record<string, CriterionAccentStyle> = {
  social_impact: {
    card: "border-sky-500/35 bg-sky-500/5",
    pill: "border-sky-400/40 bg-sky-500/15 text-sky-200",
    activeButton: "border-sky-400 bg-sky-500 text-sky-950",
    inactiveButton: "border-sky-500/35 bg-background hover:border-sky-400/55 hover:bg-sky-500/10",
    input: "border-sky-500/35 focus-visible:ring-sky-500/40",
  },
  innovation: {
    card: "border-violet-500/35 bg-violet-500/5",
    pill: "border-violet-400/40 bg-violet-500/15 text-violet-200",
    activeButton: "border-violet-400 bg-violet-500 text-violet-50",
    inactiveButton: "border-violet-500/35 bg-background hover:border-violet-400/55 hover:bg-violet-500/10",
    input: "border-violet-500/35 focus-visible:ring-violet-500/40",
  },
  implementation: {
    card: "border-emerald-500/35 bg-emerald-500/5",
    pill: "border-emerald-400/40 bg-emerald-500/15 text-emerald-200",
    activeButton: "border-emerald-400 bg-emerald-500 text-emerald-50",
    inactiveButton: "border-emerald-500/35 bg-background hover:border-emerald-400/55 hover:bg-emerald-500/10",
    input: "border-emerald-500/35 focus-visible:ring-emerald-500/40",
  },
  investment_scalability: {
    card: "border-amber-500/35 bg-amber-500/5",
    pill: "border-amber-400/40 bg-amber-500/15 text-amber-200",
    activeButton: "border-amber-400 bg-amber-500 text-amber-950",
    inactiveButton: "border-amber-500/35 bg-background hover:border-amber-400/55 hover:bg-amber-500/10",
    input: "border-amber-500/35 focus-visible:ring-amber-500/40",
  },
  demo: {
    card: "border-rose-500/35 bg-rose-500/5",
    pill: "border-rose-400/40 bg-rose-500/15 text-rose-200",
    activeButton: "border-rose-400 bg-rose-500 text-rose-50",
    inactiveButton: "border-rose-500/35 bg-background hover:border-rose-400/55 hover:bg-rose-500/10",
    input: "border-rose-500/35 focus-visible:ring-rose-500/40",
  },
};

const DEFAULT_CRITERION_ACCENT: CriterionAccentStyle = {
  card: "border-primary/35 bg-primary/5",
  pill: "border-primary/40 bg-primary/15 text-primary",
  activeButton: "border-primary bg-primary text-primary-foreground",
  inactiveButton: "border-border/60 bg-background hover:border-primary/40 hover:bg-primary/10",
  input: "border-primary/35 focus-visible:ring-primary/40",
};

const getAccentStyleFromSeed = (seed: string): TeamAccentStyle => {
  const hash = seed
    .split("")
    .reduce((acc, char) => (acc * 31 + char.charCodeAt(0)) % TEAM_ACCENT_STYLES.length, 0);
  return TEAM_ACCENT_STYLES[Math.abs(hash) % TEAM_ACCENT_STYLES.length];
};

export const getTeamAccentStyle = (teamName: string) => getAccentStyleFromSeed(teamName);

export const getSubmissionAccentStyle = (submission: Submission) =>
  getAccentStyleFromSeed(submission.id || submission.title?.trim() || "untitled");

export const getCriterionAccentStyle = (criterionId: JudgingCriterionId): CriterionAccentStyle =>
  CRITERION_ACCENT_STYLES[criterionId] ?? DEFAULT_CRITERION_ACCENT;

export const SCORE_BUTTON_STOPS_BY_WEIGHT: Record<number, number[]> = {
  25: [0, 5, 10, 15, 20, 25],
  20: [0, 4, 8, 12, 16, 20],
  15: [0, 3, 6, 9, 12, 15],
};
