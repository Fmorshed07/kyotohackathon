import { useState } from "react";
import { Check, Copy, Link2, Scale } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { sectionClass } from "@/components/dashboard/DashboardLayout";
import type { HackathonId, PortalHackathon } from "@/lib/hackathons";

export type JudgeInvitePanelProps = {
  hackathons: PortalHackathon[];
  selectedHackathonIds: HackathonId[];
  onToggleHackathon: (hackathonId: HackathonId) => void;
  label: string;
  onLabelChange: (value: string) => void;
  inviteUrl: string | null;
  isBusy?: boolean;
  message?: string | null;
  onGenerate: () => Promise<void>;
};

export function JudgeInvitePanel({
  hackathons,
  selectedHackathonIds,
  onToggleHackathon,
  label,
  onLabelChange,
  inviteUrl,
  isBusy = false,
  message = null,
  onGenerate,
}: JudgeInvitePanelProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!inviteUrl) return;
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  return (
    <section className={sectionClass} id="judge-invites" aria-labelledby="judge-invites-heading">
      <div className="mb-5 flex items-start gap-3 border-b border-white/10 pb-4">
        <span className="dash-icon-chip" aria-hidden>
          <Scale className="h-4 w-4" />
        </span>
        <div>
          <p className="dash-eyebrow">Portal access</p>
          <h2 id="judge-invites-heading" className="dash-title">
            Judge invite links
          </h2>
          <p className="dash-subtitle">
            Share a link for direct judge signup — approved automatically with event access.
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <label className="dash-field-label">Label (optional)</label>
          <Input
            value={label}
            onChange={(event) => onLabelChange(event.target.value)}
            placeholder="Kyoto judging panel"
          />
        </div>

        <div className="space-y-2">
          <p className="dash-field-label">Assign events</p>
          <div className="flex flex-wrap gap-2">
            {hackathons.map((hackathon) => {
              const selected = selectedHackathonIds.includes(hackathon.id);
              return (
                <Button
                  key={hackathon.id}
                  type="button"
                  size="sm"
                  variant={selected ? "default" : "outline"}
                  onClick={() => onToggleHackathon(hackathon.id)}
                >
                  {hackathon.shortName}
                </Button>
              );
            })}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="button"
            disabled={isBusy || selectedHackathonIds.length === 0}
            onClick={() => void onGenerate()}
          >
            <Link2 className="mr-1.5 h-4 w-4" />
            {isBusy ? "Creating…" : "Create invite link"}
          </Button>
          {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
        </div>

        {inviteUrl ? (
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input readOnly value={inviteUrl} className="font-mono text-xs" />
            <Button type="button" variant="secondary" onClick={() => void handleCopy()}>
              {copied ? (
                <>
                  <Check className="mr-1.5 h-4 w-4" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="mr-1.5 h-4 w-4" />
                  Copy
                </>
              )}
            </Button>
          </div>
        ) : null}
      </div>
    </section>
  );
}
