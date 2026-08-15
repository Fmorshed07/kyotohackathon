import { ExternalLink, Star, Users, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { sectionClass } from "@/components/dashboard/DashboardLayout";
import type { AdminSubmissionRow } from "@/components/dashboard/AdminDashboard";
import type { PortalHackathon } from "@/lib/hackathons";

type AdminFinalShortlistPanelProps = {
  selectedHackathon: PortalHackathon;
  submissions: AdminSubmissionRow[];
  isLoading: boolean;
  shortlistingSubmissionId: string | null;
  onSetFinalShortlisted: (submissionId: string, shortlisted: boolean) => Promise<void>;
};

export function AdminFinalShortlistPanel({
  selectedHackathon,
  submissions,
  isLoading,
  shortlistingSubmissionId,
  onSetFinalShortlisted,
}: AdminFinalShortlistPanelProps) {
  const finalists = submissions.filter((submission) => submission.isFinalShortlisted);
  const candidates = submissions.filter((submission) => !submission.isFinalShortlisted);

  return (
    <section
      className={`${sectionClass} scroll-mt-24 overflow-hidden border-amber-400/20 bg-gradient-to-br from-amber-500/[0.07] via-card/95 to-card/95 p-0`}
      id="final-shortlist"
      aria-labelledby="admin-final-shortlist-heading"
    >
      <div className="flex flex-col gap-4 border-b border-white/10 px-5 py-5 sm:flex-row sm:items-start sm:justify-between sm:px-6">
        <div className="flex items-start gap-3">
          <span className="dash-icon-chip dash-icon-chip--sunset shrink-0" aria-hidden>
            <Star className="h-4 w-4" />
          </span>
          <div>
            <p className="dash-eyebrow">Final round</p>
            <h2 id="admin-final-shortlist-heading" className="dash-title">Final shortlist</h2>
            <p className="dash-subtitle">
              Click a team below to add it. Judges see selected teams in their final scoring queue.
            </p>
          </div>
        </div>
        <Badge className="w-fit border-amber-400/30 bg-amber-500/10 text-amber-200 hover:bg-amber-500/10">
          {finalists.length} finalist{finalists.length === 1 ? "" : "s"}
        </Badge>
      </div>

      <div className="space-y-7 p-5 sm:p-6">
        {isLoading ? <p className="text-sm text-muted-foreground">Loading final shortlist…</p> : (
          <>
            <div>
              <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">Choose finalists</p>
                  <h3 className="mt-1 text-lg font-semibold text-foreground">Available teams</h3>
                </div>
                <span className="text-xs text-muted-foreground">
                  {candidates.length} team{candidates.length === 1 ? "" : "s"} available
                </span>
              </div>

              {submissions.length === 0 ? (
                <div className="dash-empty">No submissions yet for {selectedHackathon.name}.</div>
              ) : candidates.length === 0 ? (
                <div className="rounded-xl border border-emerald-400/20 bg-emerald-500/[0.06] px-4 py-3 text-sm text-emerald-200">
                  Every submitted team is already in the final shortlist.
                </div>
              ) : (
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {candidates.map((submission) => (
                    <article
                      key={submission.id}
                      className="flex min-h-36 flex-col justify-between rounded-xl border border-white/10 bg-white/[0.025] p-4 transition hover:border-primary/30 hover:bg-primary/[0.04]"
                    >
                      <div className="min-w-0">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <h4 className="truncate text-base font-semibold text-foreground">
                              {submission.teamName?.trim() || "Unnamed team"}
                            </h4>
                            <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                              {submission.title?.trim() || "Untitled project"}
                            </p>
                          </div>
                          {submission.averageScore != null ? (
                            <span className="shrink-0 rounded-full border border-primary/20 bg-primary/[0.06] px-2 py-1 font-mono text-[0.65rem] text-primary">
                              {submission.averageScore.toFixed(1)}
                            </span>
                          ) : null}
                        </div>
                        <p className="mt-3 inline-flex items-center gap-1 text-xs text-muted-foreground">
                          <Users className="h-3 w-3" aria-hidden />
                          {submission.memberCount} {submission.memberCount === 1 ? "member" : "members"}
                        </p>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        className="mt-4 w-full gap-2"
                        disabled={shortlistingSubmissionId === submission.id}
                        onClick={() => void onSetFinalShortlisted(submission.id, true)}
                      >
                        <Star className="h-3.5 w-3.5" />
                        {shortlistingSubmissionId === submission.id ? "Adding…" : "Add finalist"}
                      </Button>
                    </article>
                  ))}
                </div>
              )}
            </div>

            <div className="border-t border-white/10 pt-6">
              <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-amber-300">Selected</p>
                  <h3 className="mt-1 text-lg font-semibold text-foreground">Final-round teams</h3>
                </div>
                <span className="text-xs text-muted-foreground">
                  {finalists.length} finalist{finalists.length === 1 ? "" : "s"}
                </span>
              </div>

              {finalists.length === 0 ? (
                <div className="dash-empty">
                  No finalists selected for {selectedHackathon.name}. Choose a team above to begin.
                </div>
              ) : (
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {finalists.map((submission, index) => (
              <article
                key={submission.id}
                className="rounded-xl border border-amber-400/20 bg-black/20 p-4 shadow-[0_18px_45px_-35px_hsl(42_96%_55%/0.55)]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-amber-300">
                      Finalist {String(index + 1).padStart(2, "0")}
                    </p>
                    <h3 className="mt-1 truncate text-base font-semibold text-foreground">
                      {submission.teamName?.trim() || "Unnamed team"}
                    </h3>
                    <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                      {submission.title?.trim() || "Untitled project"}
                    </p>
                  </div>
                  <Star className="h-5 w-5 shrink-0 fill-amber-400 text-amber-400" aria-hidden />
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.035] px-2.5 py-1">
                    <Users className="h-3 w-3" aria-hidden />
                    {submission.memberCount} {submission.memberCount === 1 ? "member" : "members"}
                  </span>
                  {submission.averageScore != null ? (
                    <span className="rounded-full border border-primary/20 bg-primary/[0.06] px-2.5 py-1 font-mono text-primary">
                      Avg {submission.averageScore.toFixed(1)}
                    </span>
                  ) : null}
                </div>

                <div className="mt-4 flex flex-wrap gap-2 border-t border-white/10 pt-3">
                  {submission.projectUrl ? (
                    <Button asChild size="sm" variant="outline" className="h-8 gap-1.5 text-xs">
                      <a href={submission.projectUrl} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-3.5 w-3.5" /> Open project
                      </a>
                    </Button>
                  ) : null}
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-8 gap-1.5 text-xs text-muted-foreground hover:text-destructive"
                    disabled={shortlistingSubmissionId === submission.id}
                    onClick={() => void onSetFinalShortlisted(submission.id, false)}
                  >
                    <X className="h-3.5 w-3.5" />
                    {shortlistingSubmissionId === submission.id ? "Removing…" : "Remove"}
                  </Button>
                </div>
              </article>
            ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
