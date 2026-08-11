import { useMemo, useState } from "react";
import {
  Activity,
  Bell,
  Gavel,
  GitBranch,
  Network,
  Search,
  UsersRound,
} from "lucide-react";
import { PORTAL_HACKATHONS, type HackathonId, type PortalHackathon } from "@/lib/hackathons";
import {
  emptyPlatformOps,
  getApplicantDisplayName,
  inferRoleFit,
  type PlatformOpsState,
} from "@/lib/platformOps";
import type { JudgingCriterion } from "@/components/dashboard/judgingCriteria";
import type { UserProfile } from "@/types/portal";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

type LiveParticipant = {
  id: string;
  email: string;
  profile?: UserProfile;
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

export type LiveOpsWorkspaceProps = {
  hackathon: PortalHackathon;
  participants: LiveParticipant[];
  submissions: LiveSubmission[];
  judgingCriteria: JudgingCriterion[];
  ops: PlatformOpsState;
  isBusy?: boolean;
  statusMessage?: string | null;
  onHackathonChange: (hackathonId: HackathonId) => void;
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

const ChipButton = ({
  active,
  children,
  onClick,
  disabled,
}: {
  active?: boolean;
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) => (
  <button
    type="button"
    disabled={disabled}
    onClick={onClick}
    className={cn(
      "rounded-md border px-2.5 py-1.5 font-display text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-40",
      active
        ? "border-primary/50 bg-primary/20 text-primary"
        : "border-white/10 bg-white/[0.03] text-muted-foreground hover:border-white/20 hover:text-foreground",
    )}
  >
    {children}
  </button>
);

const Panel = ({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: typeof Activity;
  title: string;
  description: string;
  children: React.ReactNode;
}) => (
  <section className="overflow-hidden rounded-xl border border-white/[0.08] bg-card/70">
    <div className="flex items-start gap-3 border-b border-white/[0.06] px-4 py-4 sm:px-5">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" strokeWidth={1.75} aria-hidden />
      <div>
        <h2 className="font-display text-base font-semibold tracking-tight text-foreground">{title}</h2>
        <p className="mt-1 font-body text-xs leading-relaxed text-muted-foreground">{description}</p>
      </div>
    </div>
    <div className="p-4 sm:p-5">{children}</div>
  </section>
);

export function LiveOpsWorkspace({
  hackathon,
  participants,
  submissions,
  judgingCriteria,
  ops: opsProp,
  isBusy,
  statusMessage,
  onHackathonChange,
  onMatchTeams,
  onToggleCheckIn,
  onSendBroadcast,
  onSelectProject,
  activeProjectId,
  rubric,
  onRubricChange,
  onRunCopilot,
  onSaveScore,
  copilotNote,
  onCarryForward,
}: LiveOpsWorkspaceProps) {
  const [broadcast, setBroadcast] = useState("Welcome builders. Submissions close at 16:00.");
  const [graphQuery, setGraphQuery] = useState("");
  const ops = opsProp ?? emptyPlatformOps();
  const busy = Boolean(isBusy);

  const criteria = judgingCriteria.length
    ? judgingCriteria
    : [
        { id: "impact", title: "Impact", weight: 25, questions: [] },
        { id: "innovation", title: "Innovation", weight: 20, questions: [] },
        { id: "build", title: "Build", weight: 20, questions: [] },
      ];

  const applicants = useMemo(
    () =>
      participants.map((person) => {
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
    [ops.applicants, participants],
  );

  const shortlisted = applicants.filter((person) => person.status === "shortlisted");
  const teams = useMemo(() => {
    const byName = new Map<string, typeof applicants>();
    for (const person of applicants) {
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
  }, [applicants]);

  const checkedInCount = teams.filter((team) => team.checkedIn).length;
  const activeProject =
    submissions.find((submission) => submission.id === activeProjectId) ?? submissions[0] ?? null;
  const rubricTotal = criteria.reduce((sum, item) => sum + (rubric[item.id] ?? 0), 0);

  const rankings = useMemo(
    () =>
      [...submissions].sort((left, right) => {
        const leftScore = left.averageScore ?? ops.projectScores[left.id] ?? -1;
        const rightScore = right.averageScore ?? ops.projectScores[right.id] ?? -1;
        return rightScore - leftScore;
      }),
    [ops.projectScores, submissions],
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
      ...submissions.map((submission) => ({
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
  }, [graphQuery, ops.projectScores, shortlisted, submissions]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          <span className="dash-icon-chip" aria-hidden>
            <Activity className="h-4 w-4" />
          </span>
          <div>
            <p className="dash-eyebrow">Operations</p>
            <h1 className="dash-title">Live ops console</h1>
            <p className="dash-subtitle">
              Match teams, score projects, check in, and broadcast for {hackathon.name}.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {PORTAL_HACKATHONS.map((entry) => (
            <ChipButton
              key={entry.id}
              active={hackathon.id === entry.id}
              disabled={busy}
              onClick={() => onHackathonChange(entry.id)}
            >
              {entry.shortName}
            </ChipButton>
          ))}
        </div>
      </div>

      {statusMessage && (
        <p className="rounded-md border border-primary/20 bg-primary/10 px-3 py-2 font-body text-sm text-primary">
          {statusMessage}
        </p>
      )}

      <dl className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ["Applicants", String(applicants.length)],
          ["Shortlisted", String(shortlisted.length)],
          ["Teams", String(teams.length)],
          ["Checked in", String(checkedInCount)],
        ].map(([label, value]) => (
          <div key={label} className="rounded-xl border border-white/[0.08] bg-card/70 px-4 py-4">
            <dt className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{label}</dt>
            <dd className="mt-2 font-display text-3xl font-semibold text-foreground">{value}</dd>
          </div>
        ))}
      </dl>

      <div className="grid gap-4 xl:grid-cols-2">
        <Panel
          icon={UsersRound}
          title="Team matching"
          description="Balance builder, designer, and domain from the shortlist."
        >
          <div className="mb-3 flex items-center justify-between gap-2">
            <p className="font-body text-xs text-muted-foreground">
              {teams.length > 0
                ? `${teams.length} team${teams.length === 1 ? "" : "s"} ready.`
                : "Shortlist at least two people, then match."}
            </p>
            <ChipButton active disabled={busy || shortlisted.length < 2} onClick={() => void onMatchTeams()}>
              Match
            </ChipButton>
          </div>
          {teams.length === 0 ? (
            <p className="rounded-md border border-dashed border-white/10 px-3 py-6 text-center font-body text-xs text-muted-foreground">
              No teams yet.
            </p>
          ) : (
            <ul className="space-y-2">
              {teams.map((team) => (
                <li key={team.name} className="rounded-md bg-white/[0.03] px-3 py-2">
                  <p className="font-display text-sm font-semibold text-foreground">{team.name}</p>
                  <p className="font-body text-xs text-muted-foreground">
                    {team.members.map((member) => `${member.name.split(" ")[0]} (${member.role})`).join(" · ")}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel
          icon={Gavel}
          title="Judging, scoring & copilots"
          description="Score a submission. Copilot fills the weighted rubric."
        >
          {submissions.length === 0 ? (
            <p className="rounded-md border border-dashed border-white/10 px-3 py-6 text-center font-body text-xs text-muted-foreground">
              No submissions in this event yet.
            </p>
          ) : (
            <>
              <div className="mb-3 flex flex-wrap gap-1.5">
                {submissions.slice(0, 8).map((submission) => (
                  <ChipButton
                    key={submission.id}
                    active={activeProject?.id === submission.id}
                    onClick={() => onSelectProject(submission.id)}
                  >
                    {submission.title?.trim() || "Untitled"}
                  </ChipButton>
                ))}
              </div>
              <ul className="space-y-2">
                {criteria.slice(0, 5).map((item) => {
                  const options = [
                    Math.round(item.weight * 0.5),
                    Math.round(item.weight * 0.75),
                    item.weight,
                  ];
                  return (
                    <li key={item.id} className="flex items-center justify-between gap-2">
                      <span className="font-body text-xs text-muted-foreground">
                        {item.title} / {item.weight}
                      </span>
                      <div className="flex gap-1">
                        {options.map((value) => (
                          <ChipButton
                            key={value}
                            active={rubric[item.id] === value}
                            disabled={busy}
                            onClick={() => onRubricChange(item.id, value)}
                          >
                            {value}
                          </ChipButton>
                        ))}
                      </div>
                    </li>
                  );
                })}
              </ul>
              <p className="mt-3 font-body text-xs text-muted-foreground">{copilotNote}</p>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                <ChipButton disabled={busy || !activeProject} onClick={() => void onRunCopilot()}>
                  Copilot
                </ChipButton>
                <p className="font-mono text-sm text-primary">{rubricTotal} pts</p>
                <ChipButton active disabled={busy || !activeProject} onClick={() => void onSaveScore()}>
                  Save mark
                </ChipButton>
              </div>
            </>
          )}
        </Panel>

        <Panel
          icon={Bell}
          title="Check-in & live comms"
          description="Badge teams in and push one update to every participant."
        >
          {teams.length === 0 ? (
            <p className="mb-3 font-body text-xs text-muted-foreground">Match teams to enable check-in.</p>
          ) : (
            <ul className="mb-3 space-y-2">
              {teams.map((team) => (
                <li key={team.name} className="flex items-center justify-between gap-2">
                  <span className="font-display text-sm text-foreground">{team.name}</span>
                  <ChipButton
                    active={team.checkedIn}
                    disabled={busy}
                    onClick={() => void onToggleCheckIn(team.name)}
                  >
                    {team.checkedIn ? "In" : "Check in"}
                  </ChipButton>
                </li>
              ))}
            </ul>
          )}
          <div className="flex gap-2">
            <input
              value={broadcast}
              onChange={(event) => setBroadcast(event.target.value)}
              className="h-10 min-w-0 flex-1 rounded-md border border-white/10 bg-black/40 px-3 font-body text-sm text-foreground outline-none focus:border-primary/50"
              aria-label="Live update to teams"
            />
            <Button
              type="button"
              disabled={busy || !broadcast.trim() || participants.length === 0}
              onClick={() => void onSendBroadcast(broadcast.trim())}
            >
              Send
            </Button>
          </div>
          {ops.lastBroadcast && (
            <p className="mt-3 font-body text-xs text-primary">Sent: {ops.lastBroadcast}</p>
          )}
        </Panel>

        <Panel icon={Network} title="Live rankings & graph" description="Search builders and ranked projects.">
          <ol className="mb-4 space-y-1.5">
            {rankings.length === 0 ? (
              <li className="rounded-md border border-dashed border-white/10 px-3 py-4 text-center font-body text-xs text-muted-foreground">
                Score a project to populate rankings.
              </li>
            ) : (
              rankings.slice(0, 6).map((submission, index) => {
                const score = submission.averageScore ?? ops.projectScores[submission.id] ?? null;
                return (
                  <li
                    key={submission.id}
                    className="flex items-center justify-between gap-2 rounded-md bg-white/[0.03] px-3 py-2"
                  >
                    <span className="truncate font-display text-sm text-foreground">
                      {index + 1}. {submission.title?.trim() || "Untitled"}
                    </span>
                    <span className="font-mono text-xs text-primary">{score === null ? "—" : score}</span>
                  </li>
                );
              })
            )}
          </ol>
          <label className="mb-2 flex items-center gap-2 rounded-md border border-white/10 bg-black/40 px-3">
            <Search className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
            <input
              value={graphQuery}
              onChange={(event) => setGraphQuery(event.target.value)}
              placeholder="Search builders or projects"
              className="h-9 w-full bg-transparent font-body text-sm text-foreground outline-none placeholder:text-muted-foreground/70"
            />
          </label>
          <ul className="space-y-1">
            {graphHits.slice(0, 6).map((row) => (
              <li key={row.id} className="flex items-center justify-between gap-2 px-1 py-1">
                <span className="truncate font-display text-sm text-foreground">{row.title}</span>
                <span className="shrink-0 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                  {row.kind}
                </span>
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      <Panel
        icon={GitBranch}
        title="Replay the next cohort"
        description="Carry this shortlist into Impact Dhaka without starting from zero."
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="max-w-xl font-body text-sm text-muted-foreground">
            {ops.replayedTo === "impact-dhaka"
              ? `Pool of ${shortlisted.length} applicants is now scoped to Impact Dhaka.`
              : "Reuse the people you already screened."}
          </p>
          <ChipButton
            active={ops.replayedTo !== "impact-dhaka"}
            disabled={busy || shortlisted.length === 0}
            onClick={() => void onCarryForward("impact-dhaka")}
          >
            {ops.replayedTo === "impact-dhaka" ? "Carried to Dhaka" : "Carry to Dhaka"}
          </ChipButton>
        </div>
      </Panel>
    </div>
  );
}
