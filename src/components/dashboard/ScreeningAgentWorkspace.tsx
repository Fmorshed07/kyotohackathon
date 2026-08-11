import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Radar, Sparkles } from "lucide-react";
import {
  evaluateApplicant,
  getApplicantDisplayName,
  type ApplicantOpsStatus,
  type PlatformOpsState,
} from "@/lib/platformOps";
import type { PortalHackathon } from "@/lib/hackathons";
import type { UserProfile } from "@/types/portal";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export type ScreeningApplicant = {
  id: string;
  email: string;
  profile?: UserProfile;
};

type ScreeningAgentWorkspaceProps = {
  hackathon: PortalHackathon;
  participants: ScreeningApplicant[];
  ops: PlatformOpsState;
  isBusy?: boolean;
  statusMessage?: string | null;
  onRunAll: () => Promise<void> | void;
  onSetStatus: (userId: string, status: ApplicantOpsStatus) => Promise<void> | void;
};

const statusLabel: Record<ApplicantOpsStatus, string> = {
  pending: "Pending",
  shortlisted: "Shortlisted",
  passed: "Passed",
};

export function ScreeningAgentWorkspace({
  hackathon,
  participants,
  ops,
  isBusy,
  statusMessage,
  onRunAll,
  onSetStatus,
}: ScreeningAgentWorkspaceProps) {
  const [activeId, setActiveId] = useState<string | null>(null);

  const queue = useMemo(
    () =>
      participants.map((person) => {
        const record = ops.applicants[person.id];
        const evaluation = evaluateApplicant(person.profile, person.email);
        return {
          ...person,
          name: getApplicantDisplayName(person.profile, person.email),
          status: record?.status ?? "pending",
          score: record?.score ?? evaluation.score,
          evaluation,
        };
      }),
    [ops.applicants, participants],
  );

  const rankedQueue = useMemo(() => {
    if (!ops.screenedAt) return queue;
    return [...queue].sort((left, right) => right.score - left.score);
  }, [ops.screenedAt, queue]);

  useEffect(() => {
    if (rankedQueue.length === 0) {
      setActiveId(null);
      return;
    }
    if (!activeId || !rankedQueue.some((person) => person.id === activeId)) {
      setActiveId(rankedQueue[0].id);
    }
  }, [activeId, rankedQueue]);

  const activeIndex = rankedQueue.findIndex((person) => person.id === activeId);
  const active = activeIndex >= 0 ? rankedQueue[activeIndex] : null;
  const shortlisted = rankedQueue.filter((person) => person.status === "shortlisted").length;
  const reviewed = rankedQueue.filter((person) => person.status !== "pending").length;

  const go = (delta: number) => {
    if (rankedQueue.length === 0) return;
    const next = (activeIndex + delta + rankedQueue.length) % rankedQueue.length;
    setActiveId(rankedQueue[next].id);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          <span className="dash-icon-chip" aria-hidden>
            <Radar className="h-4 w-4" />
          </span>
          <div>
            <p className="dash-eyebrow">Screening agent</p>
            <h1 className="dash-title">Review applicants one by one</h1>
            <p className="dash-subtitle">
              {hackathon.name} · {reviewed}/{rankedQueue.length} decided · {shortlisted} shortlisted
            </p>
          </div>
        </div>
        <Button
          type="button"
          disabled={Boolean(isBusy) || rankedQueue.length === 0}
          onClick={() => void onRunAll()}
          className="gap-2"
        >
          <Sparkles className="h-4 w-4" />
          Run agent on all
        </Button>
      </div>

      {statusMessage && (
        <p className="rounded-md border border-primary/20 bg-primary/10 px-3 py-2 font-body text-sm text-primary">
          {statusMessage}
        </p>
      )}

      {rankedQueue.length === 0 ? (
        <div className="rounded-xl border border-dashed border-white/10 px-6 py-16 text-center">
          <p className="font-display text-base font-semibold text-foreground">No applicants yet</p>
          <p className="mt-2 font-body text-sm text-muted-foreground">
            Participants in {hackathon.shortName} will appear here for screening.
          </p>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.4fr)]">
          <aside className="overflow-hidden rounded-xl border border-white/[0.08] bg-card/70">
            <div className="border-b border-white/[0.06] px-4 py-3">
              <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                Applicant queue
              </p>
            </div>
            <ul className="max-h-[70vh] space-y-1 overflow-y-auto p-2">
              {rankedQueue.map((person, index) => (
                <li key={person.id}>
                  <button
                    type="button"
                    onClick={() => setActiveId(person.id)}
                    className={cn(
                      "flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2.5 text-left transition-colors",
                      person.id === activeId
                        ? "bg-primary/15 text-foreground"
                        : "hover:bg-white/[0.04] text-muted-foreground hover:text-foreground",
                    )}
                  >
                    <div className="min-w-0">
                      <p className="truncate font-display text-sm font-semibold text-foreground">
                        {index + 1}. {person.name}
                      </p>
                      <p className="truncate font-body text-xs text-muted-foreground">
                        {person.evaluation.role} · {person.evaluation.track}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-0.5">
                      <span className="font-mono text-xs text-primary">{person.score}</span>
                      <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
                        {statusLabel[person.status]}
                      </span>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          </aside>

          {active && (
            <section className="overflow-hidden rounded-xl border border-white/[0.08] bg-card/70">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.06] px-4 py-3 sm:px-6">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                    Individual agent · {activeIndex + 1} of {rankedQueue.length}
                  </p>
                  <h2 className="mt-1 font-display text-xl font-semibold tracking-tight text-foreground">
                    {active.name}
                  </h2>
                </div>
                <div className="flex items-center gap-2">
                  <Button type="button" variant="outline" size="icon" onClick={() => go(-1)} aria-label="Previous">
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button type="button" variant="outline" size="icon" onClick={() => go(1)} aria-label="Next">
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="space-y-6 p-4 sm:p-6">
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-lg bg-white/[0.03] px-3 py-3">
                    <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Score</p>
                    <p className="mt-1 font-display text-2xl font-semibold text-primary">{active.score}</p>
                  </div>
                  <div className="rounded-lg bg-white/[0.03] px-3 py-3">
                    <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                      Recommendation
                    </p>
                    <p className="mt-1 font-display text-lg font-semibold capitalize text-foreground">
                      {active.evaluation.recommendation === "shortlisted"
                        ? "In"
                        : active.evaluation.recommendation === "passed"
                          ? "Out"
                          : "Review"}
                    </p>
                  </div>
                  <div className="rounded-lg bg-white/[0.03] px-3 py-3">
                    <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                      Confidence
                    </p>
                    <p className="mt-1 font-display text-lg font-semibold capitalize text-foreground">
                      {active.evaluation.confidence}
                    </p>
                  </div>
                </div>

                <p className="font-body text-sm leading-relaxed text-muted-foreground">
                  {active.evaluation.summary}
                </p>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <p className="font-display text-sm font-semibold text-foreground">Profile</p>
                    <dl className="mt-3 space-y-2 font-body text-sm">
                      {[
                        ["Email", active.email],
                        ["Role fit", active.evaluation.role],
                        ["Track", active.evaluation.track],
                        ["Headline", active.profile?.headline || active.profile?.publicRole || "—"],
                        ["Skills", active.profile?.skills || "—"],
                        ["Looking for", active.profile?.lookingFor || "—"],
                      ].map(([label, value]) => (
                        <div key={label} className="grid grid-cols-[7rem_minmax(0,1fr)] gap-2">
                          <dt className="text-muted-foreground">{label}</dt>
                          <dd className="truncate text-foreground">{value}</dd>
                        </div>
                      ))}
                    </dl>
                    {active.profile?.bio && (
                      <p className="mt-4 rounded-lg bg-black/30 p-3 font-body text-sm leading-relaxed text-muted-foreground">
                        {active.profile.bio}
                      </p>
                    )}
                  </div>

                  <div>
                    <p className="font-display text-sm font-semibold text-foreground">Agent signals</p>
                    <ul className="mt-3 space-y-2">
                      {active.evaluation.signals.map((signal) => (
                        <li
                          key={signal.id}
                          className="flex items-center justify-between gap-3 rounded-lg bg-white/[0.03] px-3 py-2"
                        >
                          <span
                            className={cn(
                              "font-body text-sm",
                              signal.present ? "text-foreground" : "text-muted-foreground",
                            )}
                          >
                            {signal.label}
                          </span>
                          <span className="font-mono text-xs text-primary">+{signal.points}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 border-t border-white/[0.06] pt-4">
                  <Button
                    type="button"
                    disabled={Boolean(isBusy)}
                    onClick={() => void onSetStatus(active.id, "shortlisted")}
                    className={cn(active.status === "shortlisted" && "ring-2 ring-primary/40")}
                  >
                    Shortlist (In)
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={Boolean(isBusy)}
                    onClick={() => void onSetStatus(active.id, "passed")}
                    className={cn(active.status === "passed" && "ring-2 ring-primary/40")}
                  >
                    Pass (Out)
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    disabled={Boolean(isBusy)}
                    onClick={() => void onSetStatus(active.id, active.evaluation.recommendation)}
                  >
                    Accept agent decision
                  </Button>
                  <Button type="button" variant="ghost" onClick={() => go(1)}>
                    Next applicant
                  </Button>
                </div>
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
