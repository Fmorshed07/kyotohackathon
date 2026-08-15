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
              Select finalists from the submissions table. Judges see these teams in their final scoring queue.
            </p>
          </div>
        </div>
        <Badge className="w-fit border-amber-400/30 bg-amber-500/10 text-amber-200 hover:bg-amber-500/10">
          {finalists.length} finalist{finalists.length === 1 ? "" : "s"}
        </Badge>
      </div>

      <div className="p-5 sm:p-6">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading final shortlist…</p>
        ) : finalists.length === 0 ? (
          <div className="dash-empty">
            No finalists selected for {selectedHackathon.name}. Use “Add finalist” in the submissions table above.
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
    </section>
  );
}
