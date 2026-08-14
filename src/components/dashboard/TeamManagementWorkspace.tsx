import { Link } from "react-router-dom";
import {
  Crown,
  ExternalLink,
  FileText,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { sectionClass } from "@/components/dashboard/DashboardLayout";
import { FindTeammatesSection } from "@/components/dashboard/FindTeammatesSection";
import { HackathonContextBanner } from "@/components/dashboard/HackathonSelector";
import { TeamInvitePanel } from "@/components/dashboard/TeamInvitePanel";
import { getEventBoardPath, type PortalHackathon } from "@/lib/hackathons";
import { buildTeamRoster } from "@/lib/teamRoster";
import type { Submission, TeamMemberRecord, TeammatePost, UserProfile } from "@/types/portal";

export type TeamManagementWorkspaceProps = {
  selectedHackathon: PortalHackathon;
  publicSiteUrl?: string;
  isLoading?: boolean;
  isReadOnly?: boolean;
  teamName: string;
  onTeamNameChange: (value: string) => void;
  onTeamNameBlur?: () => void;
  isTeamNameDirty?: boolean;
  isSavingTeam?: boolean;
  saveMessage?: string | null;
  participantSubmissions: Submission[];
  activeSubmissionId: string | null;
  onSelectSubmission: (submissionId: string) => void;
  currentUserId: string;
  currentUserEmail: string;
  displayName: string;
  linkedTeamMembers: TeamMemberRecord[];
  teamOwner: { user_id: string; name: string; email: string; profile?: UserProfile | null };
  teamLeaderId: string | null;
  memberProfiles?: Record<string, UserProfile | null | undefined>;
  teamInviteUrl: string | null;
  isTeamInviteBusy: boolean;
  canAssignTeamLeader: boolean;
  onGenerateTeamInvite: () => Promise<void>;
  onRevokeTeamInvite: () => Promise<void>;
  onAssignTeamLeader: (userId: string) => Promise<void>;
  teammatePosts: TeammatePost[];
  isLoadingTeammatePosts: boolean;
  isSavingTeammatePost: boolean;
  teammatePostMessage: string | null;
  onCreateTeammatePost: (input: {
    looking_for: string;
    message: string;
    skills: string;
    author_name: string;
    author_email: string;
  }) => Promise<void>;
  onCloseTeammatePost: (postId: string) => Promise<void>;
  onDeleteTeammatePost: (postId: string) => Promise<void>;
};

export function TeamManagementWorkspace({
  selectedHackathon,
  publicSiteUrl,
  isLoading = false,
  isReadOnly = false,
  teamName,
  onTeamNameChange,
  onTeamNameBlur,
  isSavingTeam = false,
  saveMessage = null,
  participantSubmissions,
  activeSubmissionId,
  onSelectSubmission,
  currentUserId,
  currentUserEmail,
  displayName,
  linkedTeamMembers,
  teamOwner,
  teamLeaderId,
  memberProfiles = {},
  teamInviteUrl,
  isTeamInviteBusy,
  canAssignTeamLeader,
  onGenerateTeamInvite,
  onRevokeTeamInvite,
  onAssignTeamLeader,
  teammatePosts,
  isLoadingTeammatePosts,
  isSavingTeammatePost,
  teammatePostMessage,
  onCreateTeammatePost,
  onCloseTeammatePost,
  onDeleteTeammatePost,
}: TeamManagementWorkspaceProps) {
  const hasSubmission = Boolean(activeSubmissionId);
  const activeSubmission =
    participantSubmissions.find((submission) => submission.id === activeSubmissionId) ?? null;
  const roster = buildTeamRoster({
    owner: teamOwner,
    linkedMembers: linkedTeamMembers,
    teamLeaderId,
    currentUserId,
    profiles: memberProfiles,
  });
  const leader = roster.find((entry) => entry.isLeader) ?? roster[0];
  const projectTitle = activeSubmission?.title?.trim() || "";
  const isSolo = roster.length <= 1;

  return (
    <div className="space-y-8" id="overview">
      <HackathonContextBanner
        hackathon={selectedHackathon}
        role="participant"
        publicSiteUrl={publicSiteUrl}
      />

      <section className={sectionClass} aria-labelledby="team-overview-heading">
        <div className="dash-stack-header flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-3">
            <span className="dash-icon-chip dash-icon-chip--violet" aria-hidden>
              <Users className="h-4 w-4" />
            </span>
            <div>
              <p className="dash-eyebrow">{selectedHackathon.shortName} team</p>
              <div className="flex flex-wrap items-center gap-2">
                <h2 id="team-overview-heading" className="dash-title">
                  Team workspace
                </h2>
                {isSolo && !isLoading ? (
                  <Badge variant="secondary" className="align-middle">
                    Solo
                  </Badge>
                ) : null}
              </div>
              <p className="dash-subtitle">
                Name yourself or the group. Invite others later if you want teammates.
              </p>
            </div>
          </div>
          <Button asChild variant="outline" className="shrink-0">
            <Link to={getEventBoardPath(selectedHackathon.id)}>
              Open board
              <ExternalLink className="ml-1.5 h-4 w-4" />
            </Link>
          </Button>
        </div>

        <div className="dash-stat-grid mt-5 grid gap-2 sm:grid-cols-3 sm:gap-3">
          <div className="dash-stat-tile dash-stat-tile--highlight">
            <p className="dash-stat-value">
              {isLoading ? "—" : isSolo ? "Solo" : String(roster.length)}
            </p>
            <p className="dash-stat-label">{isSolo && !isLoading ? "Builder" : "Members"}</p>
          </div>
          <div className="dash-stat-tile">
            <p className="dash-stat-value truncate text-lg sm:text-2xl">
              {leader?.name?.trim() || "—"}
            </p>
            <p className="dash-stat-label">Team leader</p>
          </div>
          <div className="dash-stat-tile">
            <p className="dash-stat-value truncate text-lg sm:text-2xl">
              {teamInviteUrl ? "Ready" : hasSubmission ? "None" : "Locked"}
            </p>
            <p className="dash-stat-label">Invite link</p>
          </div>
        </div>
      </section>

      <section
        className={sectionClass}
        id="team-details"
        aria-labelledby="team-identity-heading"
      >
        <div className="mb-6 flex items-start gap-3 border-b border-white/10 pb-4">
          <span className="dash-icon-chip" aria-hidden>
            <FileText className="h-4 w-4" />
          </span>
          <div>
            <p className="dash-eyebrow">Identity</p>
            <h2 id="team-identity-heading" className="dash-title">
              Team name & project
            </h2>
            <p className="dash-subtitle">
              Solo builders can name themselves too. This name appears on the event board,
              gallery, and invite links.
            </p>
          </div>
        </div>

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading your team…</p>
        ) : (
          <div className="space-y-5">
            {participantSubmissions.length > 1 && activeSubmissionId ? (
              <div className="space-y-2">
                <label className="dash-field-label">Active project</label>
                <Select value={activeSubmissionId} onValueChange={onSelectSubmission}>
                  <SelectTrigger className="max-w-lg">
                    <SelectValue placeholder="Select project" />
                  </SelectTrigger>
                  <SelectContent>
                    {participantSubmissions.map((submission) => (
                      <SelectItem key={submission.id} value={submission.id}>
                        {submission.title?.trim() || `Untitled (${submission.id.slice(0, 8)})`}
                        {submission.team_name?.trim() ? ` — ${submission.team_name.trim()}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}

            <div className="max-w-lg space-y-2">
              <div className="flex items-baseline justify-between gap-3">
                <label className="dash-field-label" htmlFor="team-name">
                  Team name
                </label>
                <p className="text-xs text-muted-foreground">
                  {isSavingTeam
                    ? "Saving…"
                    : saveMessage
                      ? saveMessage
                      : isReadOnly
                        ? ""
                        : "Saves as you type"}
                </p>
              </div>
              <Input
                id="team-name"
                value={teamName}
                onChange={(event) => onTeamNameChange(event.target.value)}
                onBlur={() => onTeamNameBlur?.()}
                placeholder="Your name, or a team name"
                disabled={isReadOnly}
              />
            </div>

            {projectTitle ? (
              <p className="text-sm text-muted-foreground">
                Linked project:{" "}
                <span className="font-medium text-foreground">{projectTitle}</span>
              </p>
            ) : null}

            {saveMessage && saveMessage !== "Saved" ? (
              <p className="dash-message">{saveMessage}</p>
            ) : null}

            {!hasSubmission && !isReadOnly ? (
              <p className="text-sm text-muted-foreground">
                Type a name to appear on the board — solo is fine.{" "}
                <Link to="/dashboard/participant#my-project" className="text-primary hover:underline">
                  Add project details
                </Link>{" "}
                whenever you are ready.
              </p>
            ) : isReadOnly ? (
              <p className="text-sm text-muted-foreground">
                Submissions are locked. You can still browse the roster and teammate board.
              </p>
            ) : null}
          </div>
        )}
      </section>

      <section className={sectionClass} aria-labelledby="team-people-heading">
        <div className="mb-6 flex items-start gap-3 border-b border-white/10 pb-4">
          <span className="dash-icon-chip dash-icon-chip--violet" aria-hidden>
            <Crown className="h-4 w-4" />
          </span>
          <div>
            <p className="dash-eyebrow">People</p>
            <h2 id="team-people-heading" className="dash-title">
              Roster & invites
            </h2>
            <p className="dash-subtitle">
              Stay solo, or share a link so teammates join this same project.
            </p>
          </div>
        </div>
        <TeamInvitePanel
          layout="split"
          inviteUrl={teamInviteUrl}
          linkedMembers={linkedTeamMembers}
          owner={teamOwner}
          currentUserId={currentUserId}
          teamLeaderId={teamLeaderId}
          memberProfiles={memberProfiles}
          isBusy={isTeamInviteBusy}
          disabled={!hasSubmission || isReadOnly}
          disabledReason={
            isReadOnly
              ? "Past events are view-only."
              : "Type a team name first to unlock a shareable invite link."
          }
          canAssignLeader={canAssignTeamLeader && !isReadOnly}
          onGenerate={onGenerateTeamInvite}
          onRevoke={onRevokeTeamInvite}
          onAssignLeader={onAssignTeamLeader}
        />
      </section>

      <FindTeammatesSection
        posts={teammatePosts}
        isLoading={isLoadingTeammatePosts}
        isReadOnly={isReadOnly}
        currentUserId={currentUserId}
        defaultName={displayName}
        defaultEmail={currentUserEmail}
        isSaving={isSavingTeammatePost}
        message={teammatePostMessage}
        onCreatePost={onCreateTeammatePost}
        onClosePost={onCloseTeammatePost}
        onDeletePost={onDeleteTeammatePost}
      />
    </div>
  );
}
