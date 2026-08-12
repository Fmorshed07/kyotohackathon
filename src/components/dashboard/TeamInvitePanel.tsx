import { useState } from "react";
import { Check, Copy, Link2, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { TeamMemberRecord } from "@/types/portal";

export type TeamInvitePanelProps = {
  inviteUrl: string | null;
  linkedMembers: TeamMemberRecord[];
  isBusy?: boolean;
  disabled?: boolean;
  disabledReason?: string;
  onGenerate: () => Promise<void>;
  onRevoke?: () => Promise<void>;
};

export function TeamInvitePanel({
  inviteUrl,
  linkedMembers,
  isBusy = false,
  disabled = false,
  disabledReason,
  onGenerate,
  onRevoke,
}: TeamInvitePanelProps) {
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
    <div className="space-y-4 rounded-2xl border border-white/10 bg-black/15 p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <span className="dash-icon-chip" aria-hidden>
          <Link2 className="h-4 w-4" />
        </span>
        <div>
          <p className="dash-eyebrow">Invite link</p>
          <p className="text-sm text-muted-foreground">
            Share a link so teammates can join this team directly in the portal.
          </p>
        </div>
      </div>

      {disabled ? (
        <p className="text-sm text-muted-foreground">
          {disabledReason || "Save your project first to generate a team invite link."}
        </p>
      ) : (
        <>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" disabled={isBusy} onClick={() => void onGenerate()}>
              {inviteUrl ? "Regenerate link" : "Create invite link"}
            </Button>
            {inviteUrl && onRevoke ? (
              <Button type="button" variant="ghost" disabled={isBusy} onClick={() => void onRevoke()}>
                Revoke
              </Button>
            ) : null}
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
        </>
      )}

      {linkedMembers.length > 0 ? (
        <div className="border-t border-white/10 pt-4">
          <p className="dash-eyebrow mb-2 inline-flex items-center gap-1.5">
            <UserPlus className="h-3.5 w-3.5" />
            Joined via invite
          </p>
          <ul className="space-y-2">
            {linkedMembers.map((member) => (
              <li
                key={`${member.user_id}-${member.email}`}
                className="rounded-lg border border-white/10 bg-background/40 px-3 py-2 text-sm"
              >
                <p className="font-medium text-foreground">{member.name}</p>
                <a
                  href={`mailto:${member.email}`}
                  className="text-xs text-primary hover:underline"
                >
                  {member.email}
                </a>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
