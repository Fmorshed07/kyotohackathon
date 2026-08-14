import { Lock, Pause, Play } from "lucide-react";
import {
  getHackathonSubmissionMode,
  getSubmissionModeLabel,
  type SubmissionMode,
} from "@/lib/hackathons";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const MODES: Array<{
  value: SubmissionMode;
  label: string;
  hint: string;
  icon: typeof Play;
}> = [
  {
    value: "open",
    label: "Open",
    hint: "Teams can create and edit projects",
    icon: Play,
  },
  {
    value: "paused",
    label: "Pause",
    hint: "Soft freeze — reopen any time",
    icon: Pause,
  },
  {
    value: "closed",
    label: "Close",
    hint: "Deadline lock — reopen if you extend",
    icon: Lock,
  },
];

export type SubmissionGateControlsProps = {
  mode: SubmissionMode;
  disabled?: boolean;
  onChange: (mode: SubmissionMode) => void;
  /** Hide the intro copy when the parent already explains the control. */
  compact?: boolean;
};

export function SubmissionGateControls({
  mode,
  disabled,
  onChange,
  compact = false,
}: SubmissionGateControlsProps) {
  const active = getHackathonSubmissionMode({ status: "active", submissionMode: mode });

  return (
    <div className="space-y-2">
      {compact ? null : (
        <div>
          <p className="font-display text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Project submissions
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Pause for a demo freeze or judging setup. Close after the deadline. Independent of live /
            upcoming / past.
          </p>
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        {MODES.map((item) => {
          const Icon = item.icon;
          const isActive = active === item.value;
          return (
            <Button
              key={item.value}
              type="button"
              size="sm"
              variant={isActive ? "default" : "outline"}
              disabled={disabled}
              className="gap-1.5"
              title={item.hint}
              onClick={() => onChange(item.value)}
            >
              <Icon className="h-3.5 w-3.5" />
              {item.label}
            </Button>
          );
        })}
      </div>
      <p
        className={cn(
          "text-[11px]",
          active === "open"
            ? "text-emerald-300/90"
            : active === "paused"
              ? "text-amber-200/90"
              : "text-muted-foreground",
        )}
      >
        {getSubmissionModeLabel(active)}
        {" — "}
        {MODES.find((item) => item.value === active)?.hint}
      </p>
    </div>
  );
}
