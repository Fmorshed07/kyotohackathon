import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Check,
  Copy,
  Crown,
  Github,
  Globe,
  Link2,
  Linkedin,
  Mail,
  MapPin,
  Pencil,
  UserPlus,
  Users,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { TeamMemberRecord, UserProfile } from "@/types/portal";
import { buildTeamRoster, type TeamRosterEntry } from "@/lib/teamRoster";
import {
  ensureHttpUrl,
  getGithubProfileUrl,
  parseSkillChips,
} from "@/lib/userProfile";

export type TeamInvitePanelProps = {
  inviteUrl: string | null;
  linkedMembers: TeamMemberRecord[];
  owner: { user_id: string; name: string; email: string; profile?: UserProfile | null };
  currentUserId?: string;
  teamLeaderId?: string | null;
  memberProfiles?: Record<string, UserProfile | null | undefined>;
  isBusy?: boolean;
  disabled?: boolean;
  disabledReason?: string;
  canAssignLeader?: boolean;
  layout?: "stack" | "split";
  onGenerate: () => Promise<void>;
  onRevoke?: () => Promise<void>;
  onAssignLeader?: (userId: string) => Promise<void>;
};

function memberInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
}

function formatJoinedAt(value?: string) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function RosterProfileCard({
  entry,
  canAssignLeader,
  isBusy,
  onAssignLeader,
}: {
  entry: TeamRosterEntry;
  canAssignLeader: boolean;
  isBusy: boolean;
  onAssignLeader?: (userId: string) => Promise<void>;
}) {
  const profile = entry.profile;
  const headline =
    profile?.headline?.trim() ||
    profile?.publicRole?.trim() ||
    (entry.isLeader ? "Team leader" : entry.isOwner ? "Team creator" : "Teammate");
  const meta = [profile?.organization?.trim(), profile?.location?.trim(), profile?.experienceLevel?.trim()].filter(
    Boolean
  );
  const skills = parseSkillChips(profile?.skills);
  const githubUrl = getGithubProfileUrl(profile);
  const linkedinUrl = ensureHttpUrl(profile?.linkedinUrl);
  const portfolioUrl = ensureHttpUrl(profile?.portfolioUrl);
  const joined = formatJoinedAt(entry.joined_at);

  return (
    <li className="rounded-2xl border border-white/10 bg-background/40 p-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <Avatar className="h-16 w-16 rounded-2xl border border-primary/25">
          {profile?.avatarUrl?.trim() ? (
            <AvatarImage
              src={profile.avatarUrl.trim()}
              alt={entry.name}
              className="rounded-2xl object-cover"
            />
          ) : null}
          <AvatarFallback className="rounded-2xl bg-primary/15 text-sm font-semibold tracking-wide text-primary">
            {memberInitials(entry.name)}
          </AvatarFallback>
        </Avatar>

        <div className="min-w-0 flex-1 space-y-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 space-y-1">
              <p className="flex flex-wrap items-center gap-2 font-display text-base font-semibold text-foreground">
                <span className="truncate">{entry.name}</span>
                {entry.isYou ? (
                  <span className="rounded-full border border-white/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    You
                  </span>
                ) : null}
                {entry.isLeader ? (
                  <span className="inline-flex items-center gap-1 rounded-full border border-amber-400/30 bg-amber-400/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-200">
                    <Crown className="h-3 w-3" />
                    Leader
                  </span>
                ) : null}
                {entry.isOwner && !entry.isLeader ? (
                  <span className="rounded-full border border-white/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Creator
                  </span>
                ) : null}
                <span className="rounded-full border border-primary/25 bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary">
                  Can edit
                </span>
              </p>
              <p className="text-sm text-muted-foreground">{headline}</p>
              {meta.length > 0 ? (
                <p className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                  <MapPin className="h-3 w-3 shrink-0" />
                  {meta.join(" · ")}
                </p>
              ) : null}
            </div>
            {canAssignLeader && !entry.isLeader && onAssignLeader ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={isBusy}
                onClick={() => void onAssignLeader(entry.user_id)}
              >
                Make leader
              </Button>
            ) : null}
          </div>

          {profile?.bio?.trim() ? (
            <p className="line-clamp-3 text-sm leading-relaxed text-foreground/80">{profile.bio.trim()}</p>
          ) : null}

          {skills.length > 0 ? (
            <ul className="flex flex-wrap gap-1.5">
              {skills.map((skill) => (
                <li
                  key={skill}
                  className="rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-[11px] text-foreground/80"
                >
                  {skill}
                </li>
              ))}
            </ul>
          ) : null}

          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
            {entry.email ? (
              <a href={`mailto:${entry.email}`} className="inline-flex items-center gap-1.5 text-primary hover:underline">
                <Mail className="h-3.5 w-3.5" />
                {entry.email}
              </a>
            ) : null}
            {githubUrl ? (
              <a
                href={githubUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground"
              >
                <Github className="h-3.5 w-3.5" />
                GitHub
              </a>
            ) : null}
            {linkedinUrl ? (
              <a
                href={linkedinUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground"
              >
                <Linkedin className="h-3.5 w-3.5" />
                LinkedIn
              </a>
            ) : null}
            {portfolioUrl ? (
              <a
                href={portfolioUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground"
              >
                <Globe className="h-3.5 w-3.5" />
                Portfolio
              </a>
            ) : null}
            {joined && !entry.isOwner ? (
              <span className="text-muted-foreground">Joined {joined}</span>
            ) : null}
            {entry.isYou ? (
              <Link
                to="/dashboard/participant/profile"
                className="inline-flex items-center gap-1.5 text-primary hover:underline"
              >
                <Pencil className="h-3.5 w-3.5" />
                Edit profile
              </Link>
            ) : null}
          </div>
        </div>
      </div>
    </li>
  );
}

export function TeamInvitePanel({
  inviteUrl,
  linkedMembers,
  owner,
  currentUserId = "",
  teamLeaderId = null,
  memberProfiles = {},
  isBusy = false,
  disabled = false,
  disabledReason,
  canAssignLeader = false,
  layout = "stack",
  onGenerate,
  onRevoke,
  onAssignLeader,
}: TeamInvitePanelProps) {
  const [copied, setCopied] = useState(false);
  const roster = buildTeamRoster({
    owner,
    linkedMembers,
    teamLeaderId,
    currentUserId,
    profiles: memberProfiles,
  });

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
    <div className={layout === "split" ? "grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(18rem,0.85fr)] xl:items-start" : "space-y-5"}>
      <div className="space-y-3" id="team-roster">
        <p className="dash-eyebrow inline-flex items-center gap-1.5">
          <Users className="h-3.5 w-3.5" />
          Team roster
        </p>
        <p className="text-sm text-muted-foreground">
          {roster.length <= 1
            ? "You're the only member right now — that's fine. Name the team anyway, and invite others later if you want."
            : "Full people profiles for everyone on this project. Every member can edit, and you can assign a team leader."}
        </p>
        <ul className="space-y-3">
          {roster.map((entry) => (
            <RosterProfileCard
              key={entry.user_id}
              entry={entry}
              canAssignLeader={canAssignLeader}
              isBusy={isBusy}
              onAssignLeader={onAssignLeader}
            />
          ))}
        </ul>
      </div>

      <div className="space-y-4 rounded-2xl border border-white/10 bg-black/15 p-4 sm:p-5" id="team-invite">
        <div className="flex items-start gap-3">
          <span className="dash-icon-chip" aria-hidden>
            <Link2 className="h-4 w-4" />
          </span>
          <div>
            <p className="dash-eyebrow">Invite link</p>
            <p className="text-sm text-muted-foreground">
              Share a link so teammates can join this team, edit the project, and appear on the
              event board with their profile.
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
          <p className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <UserPlus className="h-3.5 w-3.5" />
            {linkedMembers.length} teammate{linkedMembers.length === 1 ? "" : "s"} joined via invite
          </p>
        ) : null}
      </div>
    </div>
  );
}
