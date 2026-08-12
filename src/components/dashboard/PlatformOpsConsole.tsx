import { Link } from "react-router-dom";
import { useMemo, useState, type ReactNode } from "react";
import {
  Activity,
  BarChart3,
  Bell,
  GitBranch,
  Gavel,
  Layers,
  Network,
  Radar,
  Search,
  UsersRound,
} from "lucide-react";
import { PORTAL_HACKATHONS, type HackathonId, type PortalHackathon } from "@/lib/hackathons";
import {
  emptyPlatformOps,
  getApplicantDisplayName,
  inferRoleFit,
  type ApplicantOpsStatus,
  type PlatformOpsState,
} from "@/lib/platformOps";
import type { JudgingCriterion } from "@/components/dashboard/judgingCriteria";
import type { UserProfile } from "@/types/portal";
import { cn } from "@/lib/utils";

type LiveParticipant = {
  id: string;
  email: string;
  profile?: UserProfile;
  hackathonIds?: HackathonId[];
};

type LiveSubmission = {
  id: string;
  participantId: string;
  participantEmail: string;
  teamName: string | null;
  title: string | null;
  shortDescription: string | null;
  projectUrl: string | null;
  submissionPdfUrl: string | null;
  demoVideoUrl: string | null;
  averageScore: number | null;
};

export type PlatformOpsLive = {
  hackathon: PortalHackathon;
  /** Full admin catalog — switcher shows live/upcoming only. */
  hackathons?: PortalHackathon[];
  participants: LiveParticipant[];
  submissions: LiveSubmission[];
  judgingCriteria: JudgingCriterion[];
  ops: PlatformOpsState;
  isBusy?: boolean;
  statusMessage?: string | null;
  onHackathonChange: (hackathonId: HackathonId) => void;
  onRunScreening: () => Promise<void> | void;
  onSetApplicantStatus: (userId: string, status: ApplicantOpsStatus) => Promise<void> | void;
  onMatchTeams: () => Promise<void> | void;
  onToggleCheckIn: (teamName: string) => Promise<void> | void;
  onSendBroadcast: (message: string) => Promise<void> | void;
  onSelectProject: (submissionId: string) => void;
  activeProjectId: string | null;
  rubric: Record<string, number>;
  onRubricChange: (criterionId: string, value: number) => void;
  onRunCopilot: () => Promise<void> | void;
  onSaveScore: () => Promise<void> | void;
  copilotNote: string;
  onCarryForward: (targetId: HackathonId) => Promise<void> | void;
};

type DemoApplicant = {
  id: string;
  name: string;
  role: "Builder" | "Designer" | "Domain";
  track: string;
  score: number;
};

const DEMO_APPLICANTS: DemoApplicant[] = [
  { id: "a1", name: "Aiko Tanaka", role: "Builder", track: "Public services", score: 92 },
  { id: "a2", name: "Kenji Mori", role: "Designer", track: "Healthcare", score: 81 },
  { id: "a3", name: "Farhan Rahman", role: "Domain", track: "Climate", score: 88 },
  { id: "a4", name: "Mia Chen", role: "Builder", track: "Education", score: 74 },
  { id: "a5", name: "Yuki Sato", role: "Designer", track: "Public services", score: 69 },
  { id: "a6", name: "Noah Kim", role: "Domain", track: "Education", score: 86 },
];

const FeatureShell = ({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: typeof Radar;
  title: string;
  description: string;
  children: ReactNode;
}) => (
  <li className="overflow-hidden rounded-xl border border-white/[0.08] bg-card/70">
    <div className="flex items-start gap-3 px-4 pb-3 pt-4">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" strokeWidth={1.75} aria-hidden />
      <div>
        <h4 className="font-display text-[15px] font-semibold tracking-tight text-foreground">{title}</h4>
        <p className="mt-1 font-body text-xs leading-relaxed text-muted-foreground">{description}</p>
      </div>
    </div>
    <div className="border-t border-white/[0.06] bg-black/30 p-3">{children}</div>
  </li>
);

const ChipButton = ({
  active,
  children,
  onClick,
  disabled,
}: {
  active?: boolean;
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) => (
  <button
    type="button"
    disabled={disabled}
    onClick={onClick}
    className={cn(
      "rounded-md border px-2 py-1 font-display text-[11px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-40",
      active
        ? "border-primary/50 bg-primary/20 text-primary"
        : "border-white/10 bg-white/[0.03] text-muted-foreground hover:border-white/20 hover:text-foreground",
    )}
  >
    {children}
  </button>
);

const StageGrid = ({
  stages,
}: {
  stages: Array<{
    label: string;
    features: Array<{
      icon: typeof Radar;
      title: string;
      description: string;
      body: ReactNode;
    }>;
  }>;
}) => (
  <div className="grid gap-10 lg:grid-cols-3 lg:gap-6">
    {stages.map((stage) => (
      <div key={stage.label}>
        <div className="mb-5 flex items-center gap-3">
          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-foreground" aria-hidden />
          <span className="h-px flex-1 bg-border" aria-hidden />
          <h3 className="shrink-0 font-display text-sm font-semibold tracking-tight text-foreground">
            {stage.label}
          </h3>
        </div>
        <ul className="space-y-3">
          {stage.features.map((feature) => (
            <FeatureShell
              key={feature.title}
              icon={feature.icon}
              title={feature.title}
              description={feature.description}
            >
              {feature.body}
            </FeatureShell>
          ))}
        </ul>
      </div>
    ))}
  </div>
);

function LivePlatformOpsConsole({ live }: { live: PlatformOpsLive }) {
  const [broadcast, setBroadcast] = useState("Welcome builders. Submissions close at 16:00.");
  const [graphQuery, setGraphQuery] = useState("");

  const ops = live.ops ?? emptyPlatformOps();
  const eventCatalog = live.hackathons?.length ? live.hackathons : PORTAL_HACKATHONS;
  const criteria = live.judgingCriteria.length
    ? live.judgingCriteria
    : [
        { id: "impact", title: "Impact", weight: 25, questions: [] },
        { id: "innovation", title: "Innovation", weight: 20, questions: [] },
        { id: "build", title: "Build", weight: 20, questions: [] },
      ];

  const applicants = useMemo(
    () =>
      live.participants.map((person) => {
        const record = ops.applicants[person.id];
        return {
          id: person.id,
          name: getApplicantDisplayName(person.profile, person.email),
          role: inferRoleFit(person.profile),
          track: person.profile?.interests?.trim() || person.profile?.publicRole?.trim() || person.email,
          score: record?.score ?? null,
          status: record?.status ?? "pending",
          teamName: record?.teamName ?? null,
          checkedIn: record?.checkedIn ?? false,
        };
      }),
    [live.participants, ops.applicants],
  );

  const rankedApplicants = useMemo(
    () =>
      [...applicants].sort((left, right) => {
        if (ops.screenedAt) return (right.score ?? 0) - (left.score ?? 0);
        return left.name.localeCompare(right.name);
      }),
    [applicants, ops.screenedAt],
  );

  const shortlisted = rankedApplicants.filter((person) => person.status === "shortlisted");
  const teams = useMemo(() => {
    const byName = new Map<string, typeof rankedApplicants>();
    for (const person of rankedApplicants) {
      if (!person.teamName) continue;
      const current = byName.get(person.teamName) ?? [];
      current.push(person);
      byName.set(person.teamName, current);
    }
    return [...byName.entries()].map(([name, members]) => ({
      name,
      members,
      checkedIn: members.every((member) => member.checkedIn),
    }));
  }, [rankedApplicants]);

  const checkedInCount = teams.filter((team) => team.checkedIn).length;
  const activeProject =
    live.submissions.find((submission) => submission.id === live.activeProjectId) ??
    live.submissions[0] ??
    null;

  const rankings = useMemo(
    () =>
      [...live.submissions].sort((left, right) => {
        const leftScore = left.averageScore ?? ops.projectScores[left.id] ?? -1;
        const rightScore = right.averageScore ?? ops.projectScores[right.id] ?? -1;
        return rightScore - leftScore;
      }),
    [live.submissions, ops.projectScores],
  );

  const graphHits = useMemo(() => {
    const q = graphQuery.trim().toLowerCase();
    const rows = [
      ...shortlisted.map((person) => ({
        id: person.id,
        kind: person.role,
        title: person.name,
        meta: person.track,
      })),
      ...live.submissions.map((submission) => ({
        id: submission.id,
        kind: "Project",
        title: submission.title?.trim() || "Untitled project",
        meta: `${submission.teamName || "Solo"}${
          submission.averageScore != null || ops.projectScores[submission.id] != null
            ? ` · ${submission.averageScore ?? ops.projectScores[submission.id]} pts`
            : ""
        }`,
      })),
    ];
    if (!q) return rows;
    return rows.filter((row) => `${row.title} ${row.meta}`.toLowerCase().includes(q));
  }, [graphQuery, live.submissions, ops.projectScores, shortlisted]);

  const rubricTotal = criteria.reduce((sum, item) => sum + (live.rubric[item.id] ?? 0), 0);
  const busy = Boolean(live.isBusy);

  const stages = [
    {
      label: "Set it up",
      features: [
        {
          icon: Radar,
          title: "Screening agents",
          description: "Score real applicants from this hackathon and shortlist the strongest fits.",
          body: (
            <>
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                  {ops.screenedAt ? `${shortlisted.length} shortlisted` : `${applicants.length} applicants`}
                </p>
                <div className="flex items-center gap-1.5">
                  <Link
                    to="/dashboard/admin/screening"
                    className="rounded-md border border-white/10 bg-white/[0.03] px-2 py-1 font-display text-[11px] font-semibold text-muted-foreground transition-colors hover:border-white/20 hover:text-foreground"
                  >
                    Open agent
                  </Link>
                  <ChipButton active disabled={busy || applicants.length === 0} onClick={() => void live.onRunScreening()}>
                    Run agent
                  </ChipButton>
                </div>
              </div>
              {rankedApplicants.length === 0 ? (
                <p className="rounded-md border border-dashed border-white/10 px-3 py-4 text-center font-body text-xs text-muted-foreground">
                  No participants in {live.hackathon.shortName} yet.
                </p>
              ) : (
                <ul className="max-h-52 space-y-1.5 overflow-y-auto pr-0.5">
                  {rankedApplicants.map((person) => (
                    <li key={person.id} className="flex items-center justify-between gap-2 rounded-md bg-white/[0.03] px-2 py-1.5">
                      <div className="min-w-0">
                        <p className="truncate font-display text-xs font-semibold text-foreground">{person.name}</p>
                        <p className="truncate font-body text-[11px] text-muted-foreground">
                          {person.role} · {person.track}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-1.5">
                        {person.score != null && (
                          <span className="font-mono text-[11px] text-primary">{person.score}</span>
                        )}
                        <ChipButton
                          active={person.status === "shortlisted"}
                          disabled={busy}
                          onClick={() => void live.onSetApplicantStatus(person.id, "shortlisted")}
                        >
                          In
                        </ChipButton>
                        <ChipButton
                          active={person.status === "passed"}
                          disabled={busy}
                          onClick={() => void live.onSetApplicantStatus(person.id, "passed")}
                        >
                          Out
                        </ChipButton>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </>
          ),
        },
        {
          icon: UsersRound,
          title: "Agentic team matching",
          description: "Balance builder, designer, and domain from the shortlist.",
          body: (
            <>
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="font-body text-[11px] text-muted-foreground">
                  {teams.length > 0
                    ? `${teams.length} team${teams.length === 1 ? "" : "s"} ready.`
                    : "Shortlist at least two people, then match."}
                </p>
                <ChipButton active disabled={busy || shortlisted.length < 2} onClick={() => void live.onMatchTeams()}>
                  Match
                </ChipButton>
              </div>
              {teams.length === 0 ? (
                <p className="rounded-md border border-dashed border-white/10 px-3 py-4 text-center font-body text-xs text-muted-foreground">
                  No teams yet.
                </p>
              ) : (
                <ul className="space-y-1.5">
                  {teams.map((team) => (
                    <li key={team.name} className="rounded-md bg-white/[0.03] px-2 py-1.5">
                      <p className="font-display text-xs font-semibold text-foreground">{team.name}</p>
                      <p className="font-body text-[11px] text-muted-foreground">
                        {team.members.map((member) => `${member.name.split(" ")[0]} (${member.role})`).join(" · ")}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </>
          ),
        },
        {
          icon: Layers,
          title: "Multi-event setup",
          description: "Switch the live console. Submissions and users stay scoped.",
          body: (
            <>
              <div className="mb-2 flex flex-wrap gap-1.5">
                {eventCatalog.map((hackathon) => (
                  <ChipButton
                    key={hackathon.id}
                    active={live.hackathon.id === hackathon.id}
                    disabled={busy}
                    onClick={() => live.onHackathonChange(hackathon.id)}
                  >
                    {hackathon.shortName}
                  </ChipButton>
                ))}
              </div>
              <div className="rounded-md bg-white/[0.03] px-3 py-2">
                <p className="font-display text-xs font-semibold text-foreground">{live.hackathon.name}</p>
                <p className="mt-1 font-body text-[11px] leading-relaxed text-muted-foreground">
                  {live.hackathon.theme} · {live.hackathon.eventDate}
                  {ops.replayedTo === live.hackathon.id ? " · applicant pool carried over" : ""}
                </p>
              </div>
            </>
          ),
        },
      ],
    },
    {
      label: "Run it",
      features: [
        {
          icon: Activity,
          title: "Live ops console",
          description: "Counts update from screening, matching, and check-in.",
          body: (
            <>
              <div className="mb-2 flex justify-end">
                <Link
                  to="/dashboard/admin/operations"
                  className="rounded-md border border-primary/40 bg-primary/15 px-2 py-1 font-display text-[11px] font-semibold text-primary transition-colors hover:bg-primary/25"
                >
                  Open operations
                </Link>
              </div>
              <dl className="grid grid-cols-2 gap-1.5">
                {[
                  ["Applicants", String(applicants.length)],
                  ["Shortlisted", String(shortlisted.length)],
                  ["Teams", String(teams.length)],
                  ["Checked in", String(checkedInCount)],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-md bg-white/[0.03] px-2.5 py-2">
                    <dt className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{label}</dt>
                    <dd className="mt-1 font-display text-lg font-semibold text-foreground">{value}</dd>
                  </div>
                ))}
              </dl>
            </>
          ),
        },
        {
          icon: Gavel,
          title: "Judging, scoring & copilots",
          description: "Score a real submission. Copilot fills the rubric from the demo pack.",
          body: (
            <>
              {live.submissions.length === 0 ? (
                <p className="rounded-md border border-dashed border-white/10 px-3 py-4 text-center font-body text-xs text-muted-foreground">
                  No submissions in this event yet.
                </p>
              ) : (
                <>
                  <div className="mb-2 flex flex-wrap gap-1.5">
                    {live.submissions.slice(0, 6).map((submission) => (
                      <ChipButton
                        key={submission.id}
                        active={activeProject?.id === submission.id}
                        onClick={() => live.onSelectProject(submission.id)}
                      >
                        {submission.title?.trim() || "Untitled"}
                      </ChipButton>
                    ))}
                  </div>
                  <ul className="space-y-1.5">
                    {criteria.slice(0, 4).map((item) => {
                      const options = [
                        Math.round(item.weight * 0.5),
                        Math.round(item.weight * 0.75),
                        item.weight,
                      ];
                      return (
                        <li key={item.id} className="flex items-center justify-between gap-2">
                          <span className="font-body text-[11px] text-muted-foreground">
                            {item.title} / {item.weight}
                          </span>
                          <div className="flex gap-1">
                            {options.map((value) => (
                              <ChipButton
                                key={value}
                                active={live.rubric[item.id] === value}
                                disabled={busy}
                                onClick={() => live.onRubricChange(item.id, value)}
                              >
                                {value}
                              </ChipButton>
                            ))}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                  <p className="mt-2 font-body text-[11px] text-muted-foreground">{live.copilotNote}</p>
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <ChipButton disabled={busy || !activeProject} onClick={() => void live.onRunCopilot()}>
                      Copilot
                    </ChipButton>
                    <p className="font-mono text-xs text-primary">{rubricTotal} pts</p>
                    <ChipButton active disabled={busy || !activeProject} onClick={() => void live.onSaveScore()}>
                      Save mark
                    </ChipButton>
                  </div>
                </>
              )}
            </>
          ),
        },
        {
          icon: Bell,
          title: "Check-in & live comms",
          description: "Badge teams in and email every participant in this event.",
          body: (
            <>
              {teams.length === 0 ? (
                <p className="mb-2 font-body text-[11px] text-muted-foreground">Match teams to enable check-in.</p>
              ) : (
                <ul className="mb-2 space-y-1">
                  {teams.map((team) => (
                    <li key={team.name} className="flex items-center justify-between gap-2">
                      <span className="font-display text-xs text-foreground">{team.name}</span>
                      <ChipButton
                        active={team.checkedIn}
                        disabled={busy}
                        onClick={() => void live.onToggleCheckIn(team.name)}
                      >
                        {team.checkedIn ? "In" : "Check in"}
                      </ChipButton>
                    </li>
                  ))}
                </ul>
              )}
              <div className="flex gap-1.5">
                <input
                  value={broadcast}
                  onChange={(event) => setBroadcast(event.target.value)}
                  className="h-8 min-w-0 flex-1 rounded-md border border-white/10 bg-black/40 px-2 font-body text-xs text-foreground outline-none focus:border-primary/50"
                  aria-label="Live update to teams"
                />
                <ChipButton
                  active
                  disabled={busy || !broadcast.trim() || live.participants.length === 0}
                  onClick={() => void live.onSendBroadcast(broadcast.trim())}
                >
                  Send
                </ChipButton>
              </div>
              {ops.lastBroadcast && (
                <p className="mt-2 font-body text-[11px] text-primary">Sent: {ops.lastBroadcast}</p>
              )}
            </>
          ),
        },
      ],
    },
    {
      label: "Capture the value",
      features: [
        {
          icon: BarChart3,
          title: "Live rankings & reports",
          description: "Judge averages and saved copilot marks, ranked.",
          body:
            rankings.length === 0 ? (
              <p className="rounded-md border border-dashed border-white/10 px-3 py-4 text-center font-body text-xs text-muted-foreground">
                Score a project to populate rankings.
              </p>
            ) : (
              <ol className="space-y-1.5">
                {rankings.slice(0, 6).map((submission, index) => {
                  const score = submission.averageScore ?? ops.projectScores[submission.id] ?? null;
                  return (
                    <li
                      key={submission.id}
                      className="flex items-center justify-between gap-2 rounded-md bg-white/[0.03] px-2 py-1.5"
                    >
                      <span className="truncate font-display text-xs text-foreground">
                        {index + 1}. {submission.title?.trim() || "Untitled"}
                      </span>
                      <span className="font-mono text-[11px] text-primary">{score === null ? "—" : score}</span>
                    </li>
                  );
                })}
              </ol>
            ),
        },
        {
          icon: Network,
          title: "Builder & project graph",
          description: "Search the live applicant pool and submissions.",
          body: (
            <>
              <label className="mb-2 flex items-center gap-2 rounded-md border border-white/10 bg-black/40 px-2">
                <Search className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
                <input
                  value={graphQuery}
                  onChange={(event) => setGraphQuery(event.target.value)}
                  placeholder="Search builders or projects"
                  className="h-8 w-full bg-transparent font-body text-xs text-foreground outline-none placeholder:text-muted-foreground/70"
                />
              </label>
              {graphHits.length === 0 ? (
                <p className="font-body text-[11px] text-muted-foreground">No matches yet. Shortlist or submit first.</p>
              ) : (
                <ul className="space-y-1">
                  {graphHits.slice(0, 6).map((row) => (
                    <li key={row.id} className="flex items-center justify-between gap-2">
                      <span className="truncate font-display text-xs text-foreground">{row.title}</span>
                      <span className="shrink-0 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                        {row.kind}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </>
          ),
        },
        {
          icon: GitBranch,
          title: "Replay the next cohort",
          description: "Carry this shortlist into Impact Dhaka.",
          body: (
            <>
              <p className="mb-2 font-body text-[11px] leading-relaxed text-muted-foreground">
                {ops.replayedTo === "impact-dhaka"
                  ? `Pool of ${shortlisted.length} applicants is now scoped to Impact Dhaka.`
                  : "Reuse the people you already screened. Don’t start from zero."}
              </p>
              <ChipButton
                active={ops.replayedTo !== "impact-dhaka"}
                disabled={busy || shortlisted.length === 0}
                onClick={() => void live.onCarryForward("impact-dhaka")}
              >
                {ops.replayedTo === "impact-dhaka" ? "Carried to Dhaka" : "Carry to Dhaka"}
              </ChipButton>
            </>
          ),
        },
      ],
    },
  ];

  return (
    <div className="space-y-4">
      {live.statusMessage && (
        <p className="rounded-md border border-primary/20 bg-primary/10 px-3 py-2 font-body text-xs text-primary">
          {live.statusMessage}
        </p>
      )}
      <StageGrid stages={stages} />
    </div>
  );
}

function DemoPlatformOpsConsole() {
  const [screened, setScreened] = useState(false);
  const [statusById, setStatusById] = useState<Record<string, ApplicantOpsStatus>>({});
  const [teams, setTeams] = useState<Array<{ id: string; name: string; members: DemoApplicant[]; checkedIn: boolean }>>(
    [],
  );
  const [eventId, setEventId] = useState<HackathonId>("impact-kyoto");
  const [projects, setProjects] = useState<Array<{ id: string; title: string; score: number | null }>>([]);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [rubric, setRubric] = useState<Record<string, number>>({ impact: 19, innovation: 15, build: 15 });
  const [copilotNote, setCopilotNote] = useState("Open a project, then run the copilot.");
  const [broadcast, setBroadcast] = useState("Welcome to Impact Kyoto. Submissions close at 16:00.");
  const [lastPing, setLastPing] = useState<string | null>(null);
  const [graphQuery, setGraphQuery] = useState("");
  const [replayed, setReplayed] = useState(false);

  const event = PORTAL_HACKATHONS.find((item) => item.id === eventId) ?? PORTAL_HACKATHONS[0];
  const rankedApplicants = useMemo(
    () => [...DEMO_APPLICANTS].sort((a, b) => (screened ? b.score - a.score : 0)),
    [screened],
  );
  const shortlisted = rankedApplicants.filter((person) => statusById[person.id] === "shortlisted");
  const checkedInCount = teams.filter((team) => team.checkedIn).length;
  const rankings = useMemo(
    () => [...projects].sort((a, b) => (b.score ?? -1) - (a.score ?? -1)),
    [projects],
  );
  const activeProject = projects.find((project) => project.id === activeProjectId) ?? projects[0] ?? null;
  const graphHits = useMemo(() => {
    const q = graphQuery.trim().toLowerCase();
    const rows = [
      ...shortlisted.map((person) => ({ id: person.id, kind: person.role, title: person.name })),
      ...projects.map((project) => ({ id: project.id, kind: "Project", title: project.title })),
    ];
    if (!q) return rows;
    return rows.filter((row) => row.title.toLowerCase().includes(q));
  }, [graphQuery, projects, shortlisted]);

  const stages = [
    {
      label: "Set it up",
      features: [
        {
          icon: Radar,
          title: "Screening agents",
          description: "Run the agent. Shortlist the strongest ICP fits.",
          body: (
            <>
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                  {screened ? `${shortlisted.length} shortlisted` : "Awaiting agent"}
                </p>
                <ChipButton
                  active
                  onClick={() => {
                    setScreened(true);
                    setStatusById((current) => {
                      const next = { ...current };
                      DEMO_APPLICANTS.forEach((person) => {
                        if (!next[person.id]) next[person.id] = person.score >= 80 ? "shortlisted" : "pending";
                      });
                      return next;
                    });
                  }}
                >
                  Run agent
                </ChipButton>
              </div>
              <ul className="max-h-52 space-y-1.5 overflow-y-auto pr-0.5">
                {rankedApplicants.map((person) => {
                  const status = statusById[person.id] ?? "pending";
                  return (
                    <li key={person.id} className="flex items-center justify-between gap-2 rounded-md bg-white/[0.03] px-2 py-1.5">
                      <div className="min-w-0">
                        <p className="truncate font-display text-xs font-semibold text-foreground">{person.name}</p>
                        <p className="truncate font-body text-[11px] text-muted-foreground">
                          {person.role} · {person.track}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-1.5">
                        {screened && <span className="font-mono text-[11px] text-primary">{person.score}</span>}
                        <ChipButton
                          active={status === "shortlisted"}
                          onClick={() => setStatusById((current) => ({ ...current, [person.id]: "shortlisted" }))}
                        >
                          In
                        </ChipButton>
                        <ChipButton
                          active={status === "passed"}
                          onClick={() => setStatusById((current) => ({ ...current, [person.id]: "passed" }))}
                        >
                          Out
                        </ChipButton>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </>
          ),
        },
        {
          icon: UsersRound,
          title: "Agentic team matching",
          description: "Balance builder, designer, and domain in one pass.",
          body: (
            <>
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="font-body text-[11px] text-muted-foreground">
                  {teams.length ? `${teams.length} balanced teams ready.` : "Shortlist builders first, then match."}
                </p>
                <ChipButton
                  active
                  onClick={() => {
                    if (shortlisted.length < 2) return;
                    const remaining = [...shortlisted];
                    const formed: typeof teams = [];
                    while (remaining.length > 0) {
                      const lead = remaining.shift();
                      if (!lead) break;
                      const partnerIndex = remaining.findIndex((person) => person.role !== lead.role);
                      const partner =
                        partnerIndex >= 0 ? remaining.splice(partnerIndex, 1)[0] : remaining.shift();
                      formed.push({
                        id: `team-${formed.length + 1}`,
                        name: `Team ${["Nova", "Delta", "Horizon", "Kumo"][formed.length] ?? formed.length + 1}`,
                        members: partner ? [lead, partner] : [lead],
                        checkedIn: false,
                      });
                    }
                    setTeams(formed);
                    const nextProjects = formed.map((team, index) => ({
                      id: `project-${team.id}`,
                      title: ["KyoCare Agent", "Mizu Grid", "School Copilot", "Civic Router"][index] ?? team.name,
                      score: null as number | null,
                    }));
                    setProjects(nextProjects);
                    setActiveProjectId(nextProjects[0]?.id ?? null);
                  }}
                >
                  Match
                </ChipButton>
              </div>
              {teams.length === 0 ? (
                <p className="rounded-md border border-dashed border-white/10 px-3 py-4 text-center font-body text-xs text-muted-foreground">
                  No teams yet.
                </p>
              ) : (
                <ul className="space-y-1.5">
                  {teams.map((team) => (
                    <li key={team.id} className="rounded-md bg-white/[0.03] px-2 py-1.5">
                      <p className="font-display text-xs font-semibold text-foreground">{team.name}</p>
                      <p className="font-body text-[11px] text-muted-foreground">
                        {team.members.map((member) => `${member.name.split(" ")[0]} (${member.role})`).join(" · ")}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </>
          ),
        },
        {
          icon: Layers,
          title: "Multi-event setup",
          description: "Kyoto, Tokyo, Dhaka — same console, scoped data.",
          body: (
            <>
              <div className="mb-2 flex flex-wrap gap-1.5">
                {PORTAL_HACKATHONS.map((hackathon) => (
                  <ChipButton
                    key={hackathon.id}
                    active={eventId === hackathon.id}
                    onClick={() => setEventId(hackathon.id)}
                  >
                    {hackathon.shortName}
                  </ChipButton>
                ))}
              </div>
              <div className="rounded-md bg-white/[0.03] px-3 py-2">
                <p className="font-display text-xs font-semibold text-foreground">{event.name}</p>
                <p className="mt-1 font-body text-[11px] leading-relaxed text-muted-foreground">
                  {event.theme} · {event.eventDate}
                  {replayed && eventId === "impact-dhaka" ? " · applicant pool carried over" : ""}
                </p>
              </div>
            </>
          ),
        },
      ],
    },
    {
      label: "Run it",
      features: [
        {
          icon: Activity,
          title: "Live ops console",
          description: "Counts update as you screen, match, and check in.",
          body: (
            <dl className="grid grid-cols-2 gap-1.5">
              {[
                ["Applicants", String(DEMO_APPLICANTS.length)],
                ["Shortlisted", String(shortlisted.length)],
                ["Teams", String(teams.length)],
                ["Checked in", String(checkedInCount)],
              ].map(([label, value]) => (
                <div key={label} className="rounded-md bg-white/[0.03] px-2.5 py-2">
                  <dt className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{label}</dt>
                  <dd className="mt-1 font-display text-lg font-semibold text-foreground">{value}</dd>
                </div>
              ))}
            </dl>
          ),
        },
        {
          icon: Gavel,
          title: "Judging, scoring & copilots",
          description: "Weighted rubric. Copilot suggests marks. Rankings move on save.",
          body:
            projects.length === 0 ? (
              <p className="rounded-md border border-dashed border-white/10 px-3 py-4 text-center font-body text-xs text-muted-foreground">
                Match teams to open scoring.
              </p>
            ) : (
              <>
                <div className="mb-2 flex flex-wrap gap-1.5">
                  {projects.map((project) => (
                    <ChipButton
                      key={project.id}
                      active={activeProject?.id === project.id}
                      onClick={() => setActiveProjectId(project.id)}
                    >
                      {project.title}
                    </ChipButton>
                  ))}
                </div>
                <p className="mb-2 font-body text-[11px] text-muted-foreground">{copilotNote}</p>
                <div className="flex items-center justify-between gap-2">
                  <ChipButton
                    onClick={() => {
                      if (!activeProject) return;
                      setRubric({ impact: 19, innovation: 15, build: 20 });
                      setCopilotNote(`Suggested marks for ${activeProject.title}. Save to lock the score.`);
                    }}
                  >
                    Copilot
                  </ChipButton>
                  <p className="font-mono text-xs text-primary">
                    {(rubric.impact ?? 0) + (rubric.innovation ?? 0) + (rubric.build ?? 0)} pts
                  </p>
                  <ChipButton
                    active
                    onClick={() => {
                      if (!activeProject) return;
                      const total = (rubric.impact ?? 0) + (rubric.innovation ?? 0) + (rubric.build ?? 0);
                      setProjects((current) =>
                        current.map((project) =>
                          project.id === activeProject.id ? { ...project, score: total } : project,
                        ),
                      );
                      setCopilotNote(`${activeProject.title} saved at ${total} pts. Rankings updated.`);
                    }}
                  >
                    Save mark
                  </ChipButton>
                </div>
              </>
            ),
        },
        {
          icon: Bell,
          title: "Check-in & live comms",
          description: "Badge teams in. Push one update to every squad.",
          body: (
            <>
              {teams.length === 0 ? (
                <p className="mb-2 font-body text-[11px] text-muted-foreground">Match teams to enable check-in.</p>
              ) : (
                <ul className="mb-2 space-y-1">
                  {teams.map((team) => (
                    <li key={team.id} className="flex items-center justify-between gap-2">
                      <span className="font-display text-xs text-foreground">{team.name}</span>
                      <ChipButton
                        active={team.checkedIn}
                        onClick={() =>
                          setTeams((current) =>
                            current.map((entry) =>
                              entry.id === team.id ? { ...entry, checkedIn: !entry.checkedIn } : entry,
                            ),
                          )
                        }
                      >
                        {team.checkedIn ? "In" : "Check in"}
                      </ChipButton>
                    </li>
                  ))}
                </ul>
              )}
              <div className="flex gap-1.5">
                <input
                  value={broadcast}
                  onChange={(event) => setBroadcast(event.target.value)}
                  className="h-8 min-w-0 flex-1 rounded-md border border-white/10 bg-black/40 px-2 font-body text-xs text-foreground outline-none focus:border-primary/50"
                  aria-label="Live update to teams"
                />
                <ChipButton active onClick={() => setLastPing(broadcast.trim())}>
                  Send
                </ChipButton>
              </div>
              {lastPing && <p className="mt-2 font-body text-[11px] text-primary">Sent: {lastPing}</p>}
            </>
          ),
        },
      ],
    },
    {
      label: "Capture the value",
      features: [
        {
          icon: BarChart3,
          title: "Live rankings & reports",
          description: "Saved judge marks land here instantly.",
          body:
            rankings.length === 0 ? (
              <p className="rounded-md border border-dashed border-white/10 px-3 py-4 text-center font-body text-xs text-muted-foreground">
                Score a project to populate rankings.
              </p>
            ) : (
              <ol className="space-y-1.5">
                {rankings.map((project, index) => (
                  <li key={project.id} className="flex items-center justify-between gap-2 rounded-md bg-white/[0.03] px-2 py-1.5">
                    <span className="font-display text-xs text-foreground">
                      {index + 1}. {project.title}
                    </span>
                    <span className="font-mono text-[11px] text-primary">
                      {project.score === null ? "—" : project.score}
                    </span>
                  </li>
                ))}
              </ol>
            ),
        },
        {
          icon: Network,
          title: "Builder & project graph",
          description: "Search the pool you just screened and scored.",
          body: (
            <>
              <label className="mb-2 flex items-center gap-2 rounded-md border border-white/10 bg-black/40 px-2">
                <Search className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
                <input
                  value={graphQuery}
                  onChange={(event) => setGraphQuery(event.target.value)}
                  placeholder="Search builders or projects"
                  className="h-8 w-full bg-transparent font-body text-xs text-foreground outline-none placeholder:text-muted-foreground/70"
                />
              </label>
              {graphHits.length === 0 ? (
                <p className="font-body text-[11px] text-muted-foreground">No matches yet. Shortlist or match first.</p>
              ) : (
                <ul className="space-y-1">
                  {graphHits.slice(0, 5).map((row) => (
                    <li key={row.id} className="flex items-center justify-between gap-2">
                      <span className="truncate font-display text-xs text-foreground">{row.title}</span>
                      <span className="shrink-0 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                        {row.kind}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </>
          ),
        },
        {
          icon: GitBranch,
          title: "Replay the next cohort",
          description: "Carry this shortlist into Impact Dhaka.",
          body: (
            <>
              <p className="mb-2 font-body text-[11px] leading-relaxed text-muted-foreground">
                {replayed
                  ? `Pool of ${shortlisted.length} applicants is now scoped to Impact Dhaka.`
                  : "Reuse the people you already screened. Don’t start from zero."}
              </p>
              <ChipButton
                active={!replayed}
                disabled={shortlisted.length === 0}
                onClick={() => {
                  setEventId("impact-dhaka");
                  setReplayed(true);
                }}
              >
                {replayed ? "Carried to Dhaka" : "Carry to Dhaka"}
              </ChipButton>
            </>
          ),
        },
      ],
    },
  ];

  return <StageGrid stages={stages} />;
}

export function PlatformOpsConsole({ live }: { live?: PlatformOpsLive }) {
  if (live) return <LivePlatformOpsConsole live={live} />;
  return <DemoPlatformOpsConsole />;
}
