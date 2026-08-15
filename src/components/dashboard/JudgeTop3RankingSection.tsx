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
  return date.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function getSubmissionTitle(submission: Submission): string {
  return submission.title?.trim() || "Untitled Project";
}

function getSubmissionTeam(submission: Submission): string {
  return submission.team_name?.trim() || "Unnamed team";
}

export function JudgeTop3RankingSection({
  submissions,
  ranks,
  savedAt,
  isSaving,
  onRankChange,
  onSave,
}: JudgeTop3RankingSectionProps) {
  const submissionIds = new Set(submissions.map((submission) => submission.id));
  const isValidRankId = (submissionId: string | null) =>
    submissionId != null && submissionIds.has(submissionId);
  const selectedIds = new Set(
    TOP3_RANK_SLOTS.map((slot) => ranks[slot]).filter(isValidRankId) as string[]
  );
  const picksCount = TOP3_RANK_SLOTS.filter((slot) => isValidRankId(ranks[slot])).length;
  const isComplete = picksCount === TOP3_RANK_SLOTS.length;

  const getAvailableSubmissions = (currentSlot: Top3RankSlot) => {
    const currentId = ranks[currentSlot];
    return submissions.filter(
      (submission) => submission.id === currentId || !selectedIds.has(submission.id)
    );
  };

  return (
    <div className="space-y-5 sm:space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div className="flex min-w-0 items-start gap-3">
          <span className="dash-icon-chip dash-icon-chip--violet shrink-0" aria-hidden>
            <Trophy className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <p className="dash-eyebrow">Final ballot</p>
            <h2 className="dash-title">Top 3 idea ranking</h2>
            <p className="dash-subtitle">
              Pick your three best ideas. Each rank must be a different submission.
            </p>
          </div>
        </div>
        <span
          className={cn(
            "inline-flex w-fit shrink-0 items-center rounded-full border px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] sm:text-xs sm:tracking-[0.1em]",
            isComplete
              ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-200"
              : "border-border/60 bg-muted/30 text-muted-foreground"
          )}
        >
          {isComplete ? "Ready to save" : `${picksCount}/3 picks`}
        </span>
      </div>

      <div className="grid gap-3 sm:gap-4 md:grid-cols-2 lg:grid-cols-3">
        {TOP3_RANK_SLOTS.map((slot) => {
          const selectedId = isValidRankId(ranks[slot]) ? ranks[slot] : null;
          const selectedSubmission = submissions.find((s) => s.id === selectedId) ?? null;
          const accent = selectedSubmission
            ? getSubmissionAccentStyle(selectedSubmission)
            : null;
          const available = getAvailableSubmissions(slot);

          return (
            <div
              key={slot}
              className={cn(
                "rounded-lg border p-3.5 sm:p-4",
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
                <SelectTrigger className="h-11 w-full bg-background/80 text-base sm:h-10 sm:text-sm">
                  <SelectValue placeholder="Choose an idea…" />
                </SelectTrigger>
                <SelectContent
                  position="popper"
                  sideOffset={4}
                  className="max-h-[min(24rem,70dvh)] w-[min(calc(100vw-2rem),var(--radix-select-trigger-width))]"
                >
                  {available.map((submission) => (
                    <SelectItem
                      key={submission.id}
                      value={submission.id}
                      className="items-start py-2.5 pl-8 pr-3 text-sm leading-snug [&>span:first-child]:top-2.5"
                    >
                      <span className="flex min-w-0 flex-col gap-0.5">
                        <span className="font-medium text-foreground">
                          {getSubmissionTitle(submission)}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {getSubmissionTeam(submission)}
                        </span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {selectedSubmission ? (
                <div className="mt-3 space-y-1">
                  <p className={cn("text-sm font-semibold", accent?.teamName ?? "text-foreground")}>
                    {getSubmissionTitle(selectedSubmission)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {getSubmissionTeam(selectedSubmission)}
                  </p>
                  {selectedSubmission.short_description ? (
                    <p className="line-clamp-3 text-xs leading-relaxed text-muted-foreground sm:line-clamp-2">
                      {selectedSubmission.short_description}
                    </p>
                  ) : null}
                </div>
              ) : (
                <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                  Select the idea you rank {slot === "first" ? "1st" : slot === "second" ? "2nd" : "3rd"}.
                </p>
              )}
            </div>
          );
        })}
      </div>

      <div className="sticky bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-10 -mx-1 rounded-lg border border-white/10 bg-card/95 p-3 shadow-lg backdrop-blur-md sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:p-0 sm:shadow-none sm:backdrop-blur-none">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:border-t sm:border-white/10 sm:pt-4">
          <p className="text-center text-xs text-muted-foreground sm:text-left">
            {savedAt
              ? `Last saved ${formatSavedAt(savedAt) ?? savedAt}`
              : "Your ranking has not been saved yet."}
          </p>
          <Button
            size="lg"
            className="h-11 w-full text-sm font-semibold sm:w-auto"
            disabled={isSaving || !isComplete}
            onClick={() => void onSave()}
          >
            <Save className="h-4 w-4" />
            {isSaving ? "Saving…" : "Save top 3 ranking"}
          </Button>
        </div>
      </div>
    </div>
  );
}
