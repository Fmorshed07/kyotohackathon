import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, ScanSearch, Sparkles } from "lucide-react";
import type { ApplicantOpsStatus, PlatformOpsState } from "@/lib/platformOps";
import {
  applyPersistedProjectScreen,
  buildProjectConceptQueue,
  compareProjectScreenScores,
  evaluateQueuedConcept,
} from "@/lib/projectScreening";
import type { PortalHackathon } from "@/lib/hackathons";
import type { UserProfile } from "@/types/portal";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ProjectScreeningMarksSection } from "@/components/dashboard/ProjectScreeningMarksSection";

export type ProjectScreeningParticipant = {
  id: string;
  email: string;
  profile?: UserProfile;
};

export type ProjectScreeningSubmission = {
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

type ProjectScreeningWorkspaceProps = {
  hackathon: PortalHackathon;
  participants: ProjectScreeningParticipant[];
  submissions: ProjectScreeningSubmission[];
  ops: PlatformOpsState;
  isBusy?: boolean;
  statusMessage?: string | null;
  readOnly?: boolean;
  onRunAll: () => Promise<void> | void;
  onSetStatus: (conceptId: string, status: ApplicantOpsStatus) => Promise<void> | void;
};

const statusLabel: Record<ApplicantOpsStatus, string> = {
  pending: "Pending",
  shortlisted: "Shortlisted",
  passed: "Passed",
};

const asList = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];

const asDisplay = (value: unknown, fallback = "—") =>
  typeof value === "string" && value.trim() ? value : fallback;

const FitBar = ({ value, label }: { value: number; label: string }) => {
  const safe = Number.isFinite(value) ? value : 0;
  return (
  <div>
    <div className="flex items-baseline justify-between gap-2">
      <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
      <p className="font-mono text-xs text-primary">{safe}</p>
    </div>
    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
      <div className="h-full rounded-full bg-primary" style={{ width: `${Math.max(0, Math.min(100, safe))}%` }} />
    </div>
  </div>
  );
};

export function ProjectScreeningWorkspace({
  hackathon,
  participants,
  submissions,
  ops,
  isBusy,
  statusMessage,
  readOnly,
  onRunAll,
  onSetStatus,
}: ProjectScreeningWorkspaceProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const profileById = useMemo(
    () => Object.fromEntries(participants.map((person) => [person.id, person.profile])),
    [participants],
  );

  const queue = useMemo(() => {
    const concepts = buildProjectConceptQueue(submissions, participants);
    return concepts.map((item) => {
      const record = ops.projectScreens?.[item.id];
      const heuristic = evaluateQueuedConcept(item, hackathon.theme, profileById[item.participantId]);
      const evaluation = applyPersistedProjectScreen(heuristic, record);
      return {
        ...item,
        status: record?.status ?? "pending",
        score: record?.score ?? evaluation.score,
        evaluation,
      };
    });
  }, [hackathon.theme, ops.projectScreens, participants, profileById, submissions]);

  const rankedQueue = useMemo(() => {
    if (!ops.projectsScreenedAt) return queue;
    return [...queue].sort((left, right) =>
      compareProjectScreenScores(
        { score: left.score, themeFit: left.evaluation.themeFit, conceptQuality: left.evaluation.conceptQuality, title: left.title },
        { score: right.score, themeFit: right.evaluation.themeFit, conceptQuality: right.evaluation.conceptQuality, title: right.title },
      ),
    );
  }, [ops.projectsScreenedAt, queue]);

  useEffect(() => {
    if (rankedQueue.length === 0) {
      setActiveId(null);
      return;
    }
    if (!activeId || !rankedQueue.some((item) => item.id === activeId)) {
      setActiveId(rankedQueue[0].id);
    }
  }, [activeId, rankedQueue]);

  const activeIndex = rankedQueue.findIndex((item) => item.id === activeId);
  const active = activeIndex >= 0 ? rankedQueue[activeIndex] : null;
  const shortlisted = rankedQueue.filter((item) => item.status === "shortlisted").length;
  const reviewed = rankedQueue.filter((item) => item.status !== "pending").length;

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
            <ScanSearch className="h-4 w-4" />
          </span>
          <div>
            <p className="dash-eyebrow">Project screening agent</p>
            <h1 className="dash-title">Score concepts against the theme</h1>
            <p className="dash-subtitle">
              {hackathon.name} · {reviewed}/{rankedQueue.length} decided · {shortlisted} shortlisted ·{" "}
              <a href="#marks-chart" className="text-primary hover:underline">
                Ranked marks
              </a>
            </p>
          </div>
        </div>
        {!readOnly && (
          <Button
            type="button"
            disabled={Boolean(isBusy) || rankedQueue.length === 0}
            onClick={() => void onRunAll()}
            className="gap-2"
          >
            <Sparkles className="h-4 w-4" />
            {isBusy ? "Ranking…" : "Run AI depth ranking"}
          </Button>
        )}
      </div>

      <div className="rounded-xl border border-primary/20 bg-primary/10 px-4 py-3 sm:px-5">
        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-primary">Event theme</p>
        <p className="mt-1 font-display text-lg font-semibold tracking-tight text-foreground">
          {hackathon.theme?.trim() || "Theme not set yet"}
        </p>
        <p className="mt-1 font-body text-sm text-muted-foreground">
          The agent reads each write-up with OpenAI, scores theme fit plus problem, solution, feasibility, originality, and impact, then ranks the queue.
        </p>
      </div>

      {statusMessage && (
        <p className="rounded-md border border-primary/20 bg-primary/10 px-3 py-2 font-body text-sm text-primary">
          {statusMessage}
        </p>
      )}

      {rankedQueue.length === 0 ? (
        <div className="rounded-xl border border-dashed border-white/10 px-6 py-16 text-center">
          <p className="font-display text-base font-semibold text-foreground">No concepts yet</p>
          <p className="mt-2 font-body text-sm text-muted-foreground">
            Project write-ups and participant pitches for {hackathon.shortName} will appear here.
          </p>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.4fr)]">
          <aside className="overflow-hidden rounded-xl border border-white/[0.08] bg-card/70">
            <div className="border-b border-white/[0.06] px-4 py-3">
              <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                Concept queue
              </p>
            </div>
            <ul className="max-h-[70vh] space-y-1 overflow-y-auto p-2">
              {rankedQueue.map((item, index) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => setActiveId(item.id)}
                    className={cn(
                      "flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2.5 text-left transition-colors",
                      item.id === activeId
                        ? "bg-primary/15 text-foreground"
                        : "hover:bg-white/[0.04] text-muted-foreground hover:text-foreground",
                    )}
                  >
                    <div className="min-w-0">
                      <p className="truncate font-display text-sm font-semibold text-foreground">
                        {index + 1}. {item.title}
                      </p>
                      <p className="truncate font-body text-xs text-muted-foreground">
                        {item.participantName}
                        {item.source === "pitch" ? " · pitch" : ""}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-0.5">
                      <span className="font-mono text-xs text-primary">{item.score}</span>
                      <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
                        {statusLabel[item.status]}
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
                    {active.source === "pitch" ? "Profile pitch" : "Submission"} · rank {activeIndex + 1} of{" "}
                    {rankedQueue.length}
                    {active.evaluation.analysisMode === "blended" || active.evaluation.analysisMode === "ai"
                      ? " · AI depth"
                      : ""}
                  </p>
                  <h2 className="mt-1 font-display text-xl font-semibold tracking-tight text-foreground">
                    {active.title}
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

                <div className="grid gap-4 sm:grid-cols-2">
                  <FitBar value={active.evaluation.themeFit} label="Theme fit" />
                  <FitBar value={active.evaluation.conceptQuality} label="Concept quality" />
                  <FitBar value={active.evaluation.problemClarity} label="Problem clarity" />
                  <FitBar value={active.evaluation.solutionDepth} label="Solution depth" />
                  <FitBar value={active.evaluation.feasibility} label="Feasibility" />
                  <FitBar value={active.evaluation.originality} label="Originality" />
                  <FitBar value={active.evaluation.impact} label="Impact" />
                </div>

                <p className="font-body text-sm leading-relaxed text-muted-foreground">
                  {active.evaluation.summary}
                </p>
                {(asList(active.evaluation.strengths).length > 0 || asList(active.evaluation.gaps).length > 0) && (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {asList(active.evaluation.strengths).length > 0 && (
                      <div className="rounded-lg bg-emerald-500/10 px-3 py-3">
                        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-emerald-300">Strengths</p>
                        <ul className="mt-2 space-y-1 font-body text-sm text-foreground">
                          {asList(active.evaluation.strengths).map((item) => (
                            <li key={item}>{item}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {asList(active.evaluation.gaps).length > 0 && (
                      <div className="rounded-lg bg-white/[0.04] px-3 py-3">
                        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Gaps</p>
                        <ul className="mt-2 space-y-1 font-body text-sm text-muted-foreground">
                          {asList(active.evaluation.gaps).map((item) => (
                            <li key={item}>{item}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <p className="font-display text-sm font-semibold text-foreground">Concept</p>
                    <dl className="mt-3 space-y-2 font-body text-sm">
                      {[
                        ["Builder", asDisplay(active.participantName, "Builder")],
                        ["Email", asDisplay(active.participantEmail)],
                        ["Team", asDisplay(active.teamName)],
                        ["Link", asDisplay(active.projectUrl)],
                      ].map(([label, value]) => (
                        <div key={label} className="grid grid-cols-[7rem_minmax(0,1fr)] gap-2">
                          <dt className="text-muted-foreground">{label}</dt>
                          <dd className="truncate text-foreground">{value}</dd>
                        </div>
                      ))}
                    </dl>
                    <p className="mt-4 max-h-64 overflow-y-auto rounded-lg bg-black/30 p-3 font-body text-sm leading-relaxed text-muted-foreground">
                      {asDisplay(active.concept, "No concept write-up yet.")}
                    </p>
                    {asList(active.evaluation.matchedKeywords).length > 0 && (
                      <p className="mt-3 font-body text-xs text-muted-foreground">
                        Matched: {asList(active.evaluation.matchedKeywords).join(" · ")}
                      </p>
                    )}
                    {asList(active.evaluation.missingKeywords).length > 0 && (
                      <p className="mt-1 font-body text-xs text-muted-foreground">
                        Weak on: {asList(active.evaluation.missingKeywords).join(" · ")}
                      </p>
                    )}
                  </div>

                  <div>
                    <p className="font-display text-sm font-semibold text-foreground">Agent signals</p>
                    <ul className="mt-3 space-y-2">
                      {(Array.isArray(active.evaluation.signals) ? active.evaluation.signals : []).map((signal) => (
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
                  {!readOnly && (
                    <>
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
                    </>
                  )}
                  <Button type="button" variant="ghost" onClick={() => go(1)}>
                    Next concept
                  </Button>
                </div>
              </div>
            </section>
          )}
        </div>
      )}

      {rankedQueue.length > 0 && (
        <ProjectScreeningMarksSection
          rows={rankedQueue.map((item) => ({
            id: item.id,
            title: item.title,
            participantName: item.participantName,
            teamName: item.teamName,
            source: item.source,
            status: item.status,
            score: item.score,
            themeFit: item.evaluation.themeFit,
            conceptQuality: item.evaluation.conceptQuality,
            summary: item.evaluation.summary,
            strengths: item.evaluation.strengths,
            gaps: item.evaluation.gaps,
          }))}
          activeId={activeId}
          onSelect={setActiveId}
          csvLabel={hackathon.name}
        />
      )}
    </div>
  );
}

