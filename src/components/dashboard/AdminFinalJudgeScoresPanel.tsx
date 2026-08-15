import { Award, CheckCircle2, Scale, ShieldCheck, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { sectionClass } from "@/components/dashboard/DashboardLayout";
import { getCriterionAccentStyle, getTeamAccentStyle } from "@/components/dashboard/judgeDashboardAccents";
import type { JudgingCriterion } from "@/components/dashboard/judgingCriteria";
import type { AdminSubmissionRow } from "@/components/dashboard/AdminDashboard";
import type { PortalHackathon } from "@/lib/hackathons";
import { cn } from "@/lib/utils";

type HumanJudge = { id: string; email: string };

type AdminFinalJudgeScoresPanelProps = {
  selectedHackathon: PortalHackathon;
  submissions: AdminSubmissionRow[];
  judgingCriteria: JudgingCriterion[];
  judges: HumanJudge[];
  isLoading: boolean;
};

export function AdminFinalJudgeScoresPanel({
  selectedHackathon,
  submissions,
  judgingCriteria,
  judges,
  isLoading,
}: AdminFinalJudgeScoresPanelProps) {
  const finalists = submissions.filter((submission) => submission.isFinalShortlisted);
  const eligibleJudgeIds = new Set(judges.map((judge) => judge.id));
  const savedFinalMarks = finalists.flatMap((submission) =>
    (submission.finalJudgeMarks ?? []).filter(
      (mark) => eligibleJudgeIds.has(mark.judgeId) && typeof mark.score === "number",
    ),
  );
  const judgesResponded = new Set(savedFinalMarks.map((mark) => mark.judgeId)).size;

  return (
    <section
      id="final-judge-scores"
      className={`${sectionClass} scroll-mt-24 overflow-hidden border-violet-400/20 bg-gradient-to-br from-violet-500/[0.07] via-card/95 to-card/95 p-0`}
      aria-labelledby="final-judge-scores-heading"
    >
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-white/10 px-5 py-5 sm:px-6">
        <div className="flex min-w-0 items-start gap-3">
          <span className="dash-icon-chip dash-icon-chip--violet" aria-hidden>
            <Award className="h-4 w-4" />
          </span>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <p className="dash-eyebrow">Final round results</p>
              <Badge className="border-emerald-400/25 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/10">
                <ShieldCheck className="mr-1 h-3 w-3" /> Human judges only
              </Badge>
            </div>
            <h2 id="final-judge-scores-heading" className="dash-title">Finalist judge scores</h2>
            <p className="dash-subtitle">
              Final-round scores saved by approved judges for {selectedHackathon.name}. Agent and theme marks are excluded.
            </p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-lg border border-white/10 bg-black/20 px-3 py-2">
            <p className="font-mono text-lg font-bold text-foreground">{finalists.length}</p>
            <p className="text-[9px] uppercase tracking-wider text-muted-foreground">Finalists</p>
          </div>
          <div className="rounded-lg border border-white/10 bg-black/20 px-3 py-2">
            <p className="font-mono text-lg font-bold text-primary">{savedFinalMarks.length}</p>
            <p className="text-[9px] uppercase tracking-wider text-muted-foreground">Marks</p>
          </div>
          <div className="rounded-lg border border-white/10 bg-black/20 px-3 py-2">
            <p className="font-mono text-lg font-bold text-emerald-300">{judgesResponded}/{judges.length}</p>
            <p className="text-[9px] uppercase tracking-wider text-muted-foreground">Judges</p>
          </div>
        </div>
      </div>

      <div className="space-y-5 p-4 sm:p-6">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading final judge scores…</p>
        ) : finalists.length === 0 ? (
          <p className="dash-empty">Select finalist teams before final-round scores can appear.</p>
        ) : judges.length === 0 ? (
          <p className="dash-empty">No approved human judges are assigned to this event.</p>
        ) : (
          finalists.map((submission, finalistIndex) => {
            const marksByJudge = new Map(
              (submission.finalJudgeMarks ?? [])
                .filter((mark) => eligibleJudgeIds.has(mark.judgeId))
                .map((mark) => [mark.judgeId, mark]),
            );
            const numericMarks = [...marksByJudge.values()].filter(
              (mark) => typeof mark.score === "number",
            );
            const average = numericMarks.length
              ? numericMarks.reduce((total, mark) => total + (mark.score ?? 0), 0) / numericMarks.length
              : null;
            const accent = getTeamAccentStyle(submission.teamName ?? submission.title ?? submission.id);

            return (
              <article key={submission.id} className={cn("overflow-hidden rounded-xl border", accent.panel)}>
                <header className="flex flex-wrap items-start justify-between gap-3 border-b border-white/10 px-4 py-4 sm:px-5">
                  <div className="min-w-0">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-amber-300">
                      Finalist {String(finalistIndex + 1).padStart(2, "0")}
                    </p>
                    <h3 className={cn("mt-1 text-lg font-semibold", accent.teamName)}>
                      {submission.teamName?.trim() || "Unnamed team"}
                    </h3>
                    <p className="text-sm text-muted-foreground">{submission.title?.trim() || "Untitled project"}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{numericMarks.length}/{judges.length} judges scored</Badge>
                    <div className="rounded-lg border border-violet-400/25 bg-violet-500/10 px-3 py-1.5 text-center">
                      <p className="font-mono text-xl font-bold text-violet-200">{average == null ? "—" : average.toFixed(1)}</p>
                      <p className="text-[9px] uppercase tracking-wider text-muted-foreground">Final avg</p>
                    </div>
                  </div>
                </header>

                <div className="grid gap-3 p-4 sm:p-5 lg:grid-cols-2">
                  {judges.map((judge) => {
                    const mark = marksByJudge.get(judge.id);
                    const hasScore = typeof mark?.score === "number";
                    return (
                      <div
                        key={`${submission.id}-${judge.id}`}
                        className={cn(
                          "rounded-xl border p-3",
                          hasScore ? "border-emerald-400/20 bg-emerald-500/[0.055]" : "border-white/10 bg-black/15",
                        )}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-foreground">{judge.email}</p>
                            <p className={cn("mt-1 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider", hasScore ? "text-emerald-300" : "text-muted-foreground")}>
                              {hasScore ? <CheckCircle2 className="h-3 w-3" /> : <Scale className="h-3 w-3" />}
                              {hasScore ? "Final mark saved" : "Awaiting final mark"}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className={cn("font-mono text-xl font-bold", hasScore ? "text-emerald-200" : "text-muted-foreground")}>
                              {hasScore ? mark!.score!.toFixed(1) : "—"}
                            </p>
                            <p className="text-[9px] text-muted-foreground">/ 100</p>
                          </div>
                        </div>

                        {hasScore && mark?.criteriaScores ? (
                          <div className="mt-3 grid gap-1.5 sm:grid-cols-2">
                            {judgingCriteria.map((criterion) => {
                              const value = mark.criteriaScores?.[criterion.id];
                              return (
                                <div key={`${judge.id}-${criterion.id}`} className={cn("rounded-md border px-2 py-1.5", getCriterionAccentStyle(criterion.id).card)}>
                                  <p className="truncate text-[10px] text-muted-foreground">{criterion.title}</p>
                                  <p className="font-mono text-sm font-semibold text-foreground">
                                    {typeof value === "number" ? `${value}/${criterion.weight}` : "—"}
                                  </p>
                                </div>
                              );
                            })}
                          </div>
                        ) : null}

                        {hasScore && mark?.notes?.trim() ? (
                          <div className="mt-3 rounded-md border border-white/10 bg-black/15 px-2.5 py-2">
                            <p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">Final feedback</p>
                            <p className="mt-1 text-xs leading-relaxed text-foreground">{mark.notes}</p>
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </article>
            );
          })
        )}

        <div className="flex items-start gap-2 rounded-xl border border-dashed border-emerald-400/20 bg-emerald-500/[0.04] p-3 text-xs text-muted-foreground">
          <Star className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-300" />
          This section reads only dedicated final-round judge fields. Project-agent screening and theme-fit marks never affect these results.
        </div>
      </div>
    </section>
  );
}
