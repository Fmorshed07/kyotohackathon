import { Save, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  TOP3_RANK_SLOTS,
  TOP3_SLOT_LABELS,
  TOP3_SLOT_POINTS,
  isTop3RankingComplete,
} from "@/lib/judgeTop3Rankings";
import { getSubmissionAccentStyle } from "@/components/dashboard/judgeDashboardAccents";
import type { JudgeTop3Ranks, Submission, Top3RankSlot } from "@/types/portal";

type JudgeTop3RankingSectionProps = {
  submissions: Submission[];
  ranks: JudgeTop3Ranks;
  savedAt: string | null;
  isSaving: boolean;
  onRankChange: (slot: Top3RankSlot, submissionId: string | null) => void;
  onSave: () => Promise<void>;
};

const SLOT_MEDAL_STYLES: Record<Top3RankSlot, string> = {
  first: "border-amber-400/50 bg-amber-500/15 text-amber-200",
  second: "border-slate-300/40 bg-slate-400/15 text-slate-200",
  third: "border-orange-400/40 bg-orange-600/15 text-orange-200",
};

function formatSavedAt(iso: string | null): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString();
}

function getSubmissionLabel(submission: Submission): string {
  const title = submission.title?.trim() || "Untitled Project";
  const team = submission.team_name?.trim() || "Unnamed team";
  return `${title} — ${team}`;
}

export function JudgeTop3RankingSection({
  submissions,
  ranks,
  savedAt,
  isSaving,
  onRankChange,
  onSave,
}: JudgeTop3RankingSectionProps) {
  const isComplete = isTop3RankingComplete(ranks);
  const selectedIds = new Set(
    TOP3_RANK_SLOTS.map((slot) => ranks[slot]).filter(Boolean) as string[]
  );

  const getAvailableSubmissions = (currentSlot: Top3RankSlot) => {
    const currentId = ranks[currentSlot];
    return submissions.filter(
      (submission) => submission.id === currentId || !selectedIds.has(submission.id)
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          <span className="dash-icon-chip dash-icon-chip--violet" aria-hidden>
            <Trophy className="h-4 w-4" />
          </span>
          <div>
            <p className="dash-eyebrow">Final ballot</p>
            <h2 className="dash-title">Top 3 idea ranking</h2>
            <p className="dash-subtitle">
              Pick your three best ideas. Each rank must be a different submission.
            </p>
          </div>
        </div>
        <span
          className={cn(
            "inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.1em]",
            isComplete
              ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-200"
              : "border-border/60 bg-muted/30 text-muted-foreground"
          )}
        >
          {isComplete ? "Ready to save" : "3 picks required"}
        </span>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {TOP3_RANK_SLOTS.map((slot) => {
          const selectedId = ranks[slot];
          const selectedSubmission = submissions.find((s) => s.id === selectedId) ?? null;
          const accent = selectedSubmission
            ? getSubmissionAccentStyle(selectedSubmission)
            : null;
          const available = getAvailableSubmissions(slot);

          return (
            <div
              key={slot}
              className={cn(
                "rounded-xl border p-4",
                accent ? accent.panel : "border-border/50 bg-muted/20"
              )}
            >
              <div className="mb-3 flex items-center justify-between gap-2">
                <span
                  className={cn(
                    "inline-flex rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em]",
                    SLOT_MEDAL_STYLES[slot]
                  )}
                >
                  {TOP3_SLOT_LABELS[slot]}
                </span>
                <span className="text-xs text-muted-foreground">
                  {TOP3_SLOT_POINTS[slot]} pts
                </span>
              </div>

              <Select
                value={selectedId ?? ""}
                onValueChange={(value) => onRankChange(slot, value || null)}
              >
                <SelectTrigger className="w-full bg-background/80">
                  <SelectValue placeholder="Choose an idea…" />
                </SelectTrigger>
                <SelectContent>
                  {available.map((submission) => (
                    <SelectItem key={submission.id} value={submission.id}>
                      {getSubmissionLabel(submission)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {selectedSubmission ? (
                <div className="mt-3 space-y-1">
                  <p className={cn("text-sm font-semibold", accent?.teamName ?? "text-foreground")}>
                    {selectedSubmission.title || "Untitled Project"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {selectedSubmission.team_name?.trim() || "Unnamed team"}
                  </p>
                  {selectedSubmission.short_description ? (
                    <p className="line-clamp-2 text-xs text-muted-foreground">
                      {selectedSubmission.short_description}
                    </p>
                  ) : null}
                </div>
              ) : (
                <p className="mt-3 text-xs text-muted-foreground">
                  Select the idea you rank {slot === "first" ? "1st" : slot === "second" ? "2nd" : "3rd"}.
                </p>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4">
        <p className="text-xs text-muted-foreground">
          {savedAt
            ? `Last saved ${formatSavedAt(savedAt) ?? savedAt}`
            : "Your ranking has not been saved yet."}
        </p>
        <Button
          size="lg"
          className="h-11 text-sm font-semibold"
          disabled={isSaving || !isComplete}
          onClick={() => void onSave()}
        >
          <Save className="h-4 w-4" />
          {isSaving ? "Saving…" : "Save top 3 ranking"}
        </Button>
      </div>
    </div>
  );
}
