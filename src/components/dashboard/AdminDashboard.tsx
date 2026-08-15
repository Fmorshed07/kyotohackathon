import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Activity,
  CalendarCheck2,
  ExternalLink,
  Gavel,
  Github,
  Mail,
  PenLine,
  Radar,
  ScanSearch,
  ShieldCheck,
  Star,
  Users,
  Wand2,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { sectionClass } from "@/components/dashboard/DashboardLayout";
import { HackathonContextBanner } from "@/components/dashboard/HackathonSelector";
import {
  getHackathonById,
  PORTAL_HACKATHONS,
  withHackathonQuery,
  type PortalHackathon,
  type HackathonId,
} from "@/lib/hackathons";
import type { AdminGrantRecord } from "@/lib/adminGrants";
import type { AdminJudgingStatistics } from "@/lib/judgingStatistics";
import { AdminJudgingSection } from "@/components/dashboard/AdminJudgingSection";
import { AdminFinalShortlistPanel } from "@/components/dashboard/AdminFinalShortlistPanel";
import { type PlatformOpsLive } from "@/components/dashboard/PlatformOpsConsole";
import { AiHackathonLauncher } from "@/components/dashboard/AiHackathonLauncher";
import { ManualHackathonLauncher } from "@/components/dashboard/ManualHackathonLauncher";
import { JudgeInvitePanel } from "@/components/dashboard/JudgeInvitePanel";
import { AdminTeamsPanel } from "@/components/dashboard/AdminTeamsPanel";
import { AdminNewsletterPanel } from "@/components/dashboard/AdminNewsletterPanel";
import { AdminAudienceAnalyticsPanel } from "@/components/dashboard/AdminAudienceAnalyticsPanel";
import type { NewsletterSubscriber } from "@/lib/hackathonSubscribe";
import {
  EMPTY_SITE_ANALYTICS,
  type AudienceEngagementTotals,
  type SiteAnalyticsSnapshot,
} from "@/lib/siteAnalytics";
import type { JudgingCriterion } from "@/components/dashboard/judgingCriteria";
import type { AdminTop3RankingSummary } from "@/lib/judgeTop3Rankings";
import type { HostApprovalStatus, JudgeApprovalStatus, PortalRole, UserProfile } from "@/types/portal";
import type { AiHackathonDraft, HostedHackathon, ManualHackathonDraft } from "@/lib/aiHackathons";

export type AdminUser = {
  id: string;
  email: string;
  role: PortalRole;
  judgeApprovalStatus?: JudgeApprovalStatus;
  hostApprovalStatus?: HostApprovalStatus;
  hackathonId?: HackathonId | null;
  hackathonIds?: HackathonId[];
  profile?: UserProfile;
};

export type AdminSubmissionRow = {
  id: string;
  hackathonId: HackathonId;
  participantId: string;
  participantEmail: string;
  teamName: string | null;
  teamLeaderName: string | null;
  teamLeaderEmail: string | null;
  memberCount: number;
  members: Array<{
    user_id: string;
    name: string;
    email: string;
    isOwner: boolean;
    isLeader: boolean;
    avatarUrl?: string | null;
    headline?: string | null;
  }>;
  extraMemberNames: string[];
  title: string | null;
  shortDescription: string | null;
  projectUrl: string | null;
  submissionPdfUrl: string | null;
  demoVideoUrl: string | null;
  isPublic: boolean;
  isFinalShortlisted: boolean;
  finalShortlistedAt: string | null;
  judgeMarks: Array<{
    judgeId: string;
    judgeEmail: string;
    score: number | null;
    notes: string | null;
    criteriaScores?: Record<string, number | null>;
  }>;
  averageScore: number | null;
  scoredByCount: number;
  createdAt: string | null;
  updatedAt: string | null;
};

export type NewSubmissionInput = {
  participantId: string;
  title: string;
  shortDescription: string;
  projectUrl: string;
  submissionPdfUrl: string;
  demoVideoUrl: string;
};

type AdminAnalytics = AdminJudgingStatistics;

export type AdminWorkspace = "overview" | "create" | "people" | "judging" | "shortlist";

type AdminDashboardProps = {
  /** Which admin sub-page to render — each stays under /dashboard/admin/*. */
  workspace?: AdminWorkspace;
  selectedHackathon: PortalHackathon;
  /** Dynamic event list for staff access grants (portal + hosted). */
  hackathons?: PortalHackathon[];
  judgingCriteria: JudgingCriterion[];
  isLoadingCriteria: boolean;
  isSavingCriteria: boolean;
  onSaveCriteria: (criteria: JudgingCriterion[]) => Promise<void>;
  users: AdminUser[];
  hostAccounts: AdminUser[];
  /** All judge/mentor accounts (not scoped to selected hackathon) for the approval queue. */
  judgeAccounts: AdminUser[];
  isLoadingUsers: boolean;
  submissions: AdminSubmissionRow[];
  /** All events' submissions for the judging submissions list. Falls back to `submissions`. */
  allSubmissions?: AdminSubmissionRow[];
  isLoadingSubmissions: boolean;
  analytics: AdminAnalytics;
  message: string | null;
  savingUserId: string | null;
  pendingRoles: Record<string, PortalRole>;
  onRoleChange: (userId: string, role: PortalRole) => void;
  onSaveRole: (user: AdminUser) => Promise<void>;
  onApproveJudge: (user: AdminUser) => Promise<void>;
  onRejectJudge: (user: AdminUser) => Promise<void>;
  onApproveHost: (user: AdminUser) => Promise<void>;
  onUpdateHackathonAccess: (user: AdminUser, hackathonIds: HackathonId[]) => Promise<void>;
  adminGrantEmail: string;
  onAdminGrantEmailChange: (email: string) => void;
  pendingAdminGrants: AdminGrantRecord[];
  isGrantingAdmin: boolean;
  onGrantAdminAccess: () => Promise<void>;
  broadcastSubject: string;
  onBroadcastSubjectChange: (value: string) => void;
  broadcastMessage: string;
  onBroadcastMessageChange: (value: string) => void;
  isSendingBroadcast: boolean;
  onSendParticipantBroadcast: () => Promise<void>;
  isCreatingSubmission: boolean;
  deletingSubmissionId: string | null;
  publishingSubmissionId: string | null;
  shortlistingSubmissionId: string | null;
  onCreateSubmission: (payload: NewSubmissionInput) => Promise<void>;
  onDeleteSubmission: (submissionId: string) => Promise<void>;
  onSetSubmissionPublic: (submissionId: string, makePublic: boolean) => Promise<void>;
  onSetFinalShortlisted: (submissionId: string, shortlisted: boolean) => Promise<void>;
  top3RankingSummary: AdminTop3RankingSummary;
  isLoadingTop3Rankings: boolean;
  top3SubmissionLookup: Map<
    string,
    { id: string; title: string | null; team_name?: string | null; participantEmail: string }
  >;
  platformOpsLive: PlatformOpsLive;
  onCreateAiHackathon: (
    draft: AiHackathonDraft,
    rulebookUrl: string,
  ) => Promise<HostedHackathon>;
  onCreateManualHackathon: (
    draft: ManualHackathonDraft,
    rulebookUrl: string,
  ) => Promise<HostedHackathon>;
  judgeInviteLabel?: string;
  onJudgeInviteLabelChange?: (value: string) => void;
  judgeInviteHackathonIds?: HackathonId[];
  onToggleJudgeInviteHackathon?: (hackathonId: HackathonId) => void;
  judgeInviteUrl?: string | null;
  judgeInviteMessage?: string | null;
  isCreatingJudgeInvite?: boolean;
  onCreateJudgeInvite?: () => Promise<void>;
  newsletterSubscribers?: NewsletterSubscriber[];
  isLoadingNewsletter?: boolean;
  siteAnalytics?: SiteAnalyticsSnapshot;
  audienceEngagement?: AudienceEngagementTotals;
  isLoadingAudienceAnalytics?: boolean;
  onRefreshAudienceAnalytics?: () => void;
};

const roleBadgeVariant: Record<PortalRole, "default" | "secondary" | "outline"> = {
  participant: "secondary",
  mentor: "default",
  judge: "default",
  host: "secondary",
  admin: "outline",
};

const isStaffRole = (role: PortalRole) => role === "judge" || role === "mentor";

const hasText = (value: string | null | undefined) => Boolean(value?.trim());

const getGithubUrl = (profile?: UserProfile) => {
  if (hasText(profile?.githubProfileUrl)) return profile?.githubProfileUrl?.trim() ?? "";
  if (hasText(profile?.githubUsername)) return `https://github.com/${profile?.githubUsername?.trim().replace(/^@/, "")}`;
  return "";
};

const getProfileCompletion = (user: AdminUser) => {
  const profile = user.profile;
  const signals = [
    profile?.avatarUrl,
    profile?.fullName,
    profile?.headline || profile?.publicRole,
    profile?.bio,
    profile?.githubUsername || profile?.githubProfileUrl,
    profile?.linkedinUrl || profile?.portfolioUrl,
    profile?.skills,
    profile?.interests || profile?.lookingFor,
  ];
  return Math.round((signals.filter(hasText).length / signals.length) * 100);
};

const getProfileInitials = (name?: string | null) => {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
};

const roleLabels: Record<PortalRole, string> = {
  participant: "Participants",
  mentor: "Mentors",
  judge: "Judges",
  host: "Hosts",
  admin: "Admins",
};

type HostAnalytics = {
  totalUsers: number;
  participants: number;
  staff: number;
  admins: number;
  githubConnected: number;
  socialConnected: number;
  completedProfiles: number;
  averageProfileCompletion: number;
  roleCounts: Record<PortalRole, number>;
};

function buildHostAnalytics(users: AdminUser[]): HostAnalytics {
  const roleCounts: Record<PortalRole, number> = {
    participant: 0,
    mentor: 0,
    judge: 0,
    host: 0,
    admin: 0,
  };
  let githubConnected = 0;
  let socialConnected = 0;
  let completedProfiles = 0;
  let completionTotal = 0;

  for (const user of users) {
    roleCounts[user.role] += 1;
    const completion = getProfileCompletion(user);
    completionTotal += completion;
    if (completion >= 80) completedProfiles += 1;
    if (getGithubUrl(user.profile)) githubConnected += 1;
    if (
      hasText(user.profile?.linkedinUrl) ||
      hasText(user.profile?.portfolioUrl) ||
      hasText(user.profile?.xUrl) ||
      hasText(user.profile?.discordHandle)
    ) {
      socialConnected += 1;
    }
  }

  return {
    totalUsers: users.length,
    participants: roleCounts.participant,
    staff: roleCounts.mentor + roleCounts.judge,
    admins: roleCounts.admin,
    githubConnected,
    socialConnected,
    completedProfiles,
    averageProfileCompletion:
      users.length > 0 ? Math.round(completionTotal / users.length) : 0,
    roleCounts,
  };
}

function HostAnalyticsPanel({
  analytics,
  isLoading,
}: {
  analytics: HostAnalytics;
  isLoading: boolean;
}) {
  const display = (value: string | number) => (isLoading ? "..." : String(value));
  const githubCoverage =
    analytics.totalUsers > 0 ? Math.round((analytics.githubConnected / analytics.totalUsers) * 100) : 0;
  const profileCoverage =
    analytics.totalUsers > 0 ? Math.round((analytics.completedProfiles / analytics.totalUsers) * 100) : 0;

  return (
    <section className={`${sectionClass}`} id="host-analytics">
      <div className="mb-5 flex items-start gap-3 border-b border-white/10 pb-4">
        <span className="dash-icon-chip" aria-hidden>
          <Activity className="h-4 w-4" />
        </span>
        <div>
          <p className="dash-eyebrow">Host analytics</p>
          <h2 className="dash-title">People and readiness intelligence</h2>
          <p className="dash-subtitle">
            Role mix, profile depth, and social coverage for running a stronger hackathon.
          </p>
        </div>
      </div>

      <div className="dash-stat-grid grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 lg:grid-cols-4 xl:grid-cols-6">
        <div className="dash-stat-tile dash-stat-tile--highlight">
          <p className="dash-stat-value">{display(analytics.totalUsers)}</p>
          <p className="dash-stat-label">People</p>
        </div>
        <div className="dash-stat-tile">
          <p className="dash-stat-value">{display(analytics.participants)}</p>
          <p className="dash-stat-label">Participants</p>
        </div>
        <div className="dash-stat-tile">
          <p className="dash-stat-value">{display(analytics.staff)}</p>
          <p className="dash-stat-label">Mentors + judges</p>
        </div>
        <div className="dash-stat-tile">
          <p className="dash-stat-value">{display(analytics.githubConnected)}</p>
          <p className="dash-stat-label">GitHub linked</p>
        </div>
        <div className="dash-stat-tile">
          <p className="dash-stat-value">{display(analytics.socialConnected)}</p>
          <p className="dash-stat-label">Social linked</p>
        </div>
        <div className="dash-stat-tile">
          <p className="dash-stat-value">{display(`${analytics.averageProfileCompletion}%`)}</p>
          <p className="dash-stat-label">Avg profile</p>
        </div>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-xl border border-white/10 bg-muted/15 p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <span className="font-display text-base font-semibold text-foreground">Profile coverage</span>
            <span className="font-mono text-lg font-bold tabular-nums text-primary">
              {display(`${profileCoverage}%`)}
            </span>
          </div>
          <div className="dash-progress-track">
            <div className="dash-progress-fill" style={{ width: `${profileCoverage}%` }} />
          </div>
          <div className="mt-4 flex items-center justify-between gap-3 text-sm text-muted-foreground">
            <span>GitHub adoption</span>
            <span className="font-mono text-primary">{display(`${githubCoverage}%`)}</span>
          </div>
          <div className="mt-2 dash-progress-track">
            <div className="dash-progress-fill" style={{ width: `${githubCoverage}%` }} />
          </div>
        </div>

        <div className="rounded-xl border border-white/10 bg-muted/15 p-4">
          <p className="dash-eyebrow mb-3">Role distribution</p>
          <div className="space-y-3">
            {(Object.keys(roleLabels) as PortalRole[]).map((role) => {
              const count = analytics.roleCounts[role];
              const percent =
                analytics.totalUsers > 0 ? Math.round((count / analytics.totalUsers) * 100) : 0;
              return (
                <div key={role}>
                  <div className="mb-1 flex items-center justify-between gap-3 text-sm">
                    <span className="text-foreground/85">{roleLabels[role]}</span>
                    <span className="font-mono text-primary">{display(count)}</span>
                  </div>
                  <div className="dash-progress-track">
                    <div className="dash-progress-fill" style={{ width: `${percent}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

function UserManagementTable({
  users,
  hackathons,
  title,
  description,
  emptyMessage,
  sectionId,
  savingUserId,
  pendingRoles,
  onRoleChange,
  onSaveRole,
  onApproveJudge,
  onRejectJudge,
  onUpdateHackathonAccess,
}: {
  users: AdminUser[];
  hackathons: PortalHackathon[];
  title: string;
  description: string;
  emptyMessage: string;
  sectionId: string;
  savingUserId: string | null;
  pendingRoles: Record<string, PortalRole>;
  onRoleChange: (userId: string, role: PortalRole) => void;
  onSaveRole: (user: AdminUser) => Promise<void>;
  onApproveJudge: (user: AdminUser) => Promise<void>;
  onRejectJudge: (user: AdminUser) => Promise<void>;
  onUpdateHackathonAccess: (user: AdminUser, hackathonIds: HackathonId[]) => Promise<void>;
}) {
  return (
    <section className={`${sectionClass} overflow-hidden p-0`} id={sectionId}>
      <div className="flex items-start gap-3 border-b border-white/10 px-6 py-5">
        <span className="dash-icon-chip dash-icon-chip--violet" aria-hidden>
          <Users className="h-4 w-4" />
        </span>
        <div>
          <p className="dash-eyebrow">User management</p>
          <h2 className="dash-title">{title}</h2>
          <p className="dash-subtitle">{description}</p>
        </div>
      </div>
      <div className="p-4 sm:p-6">
        {users.length === 0 ? (
          <p className="dash-empty">
            {emptyMessage}
          </p>
        ) : (
          <div className="dash-table-scroll rounded-xl border border-white/10">
            <Table>
              <TableHeader>
                <TableRow className="border-white/10 bg-muted/15 hover:bg-muted/15">
                  <TableHead className="dash-table-head">Email</TableHead>
                  <TableHead className="dash-table-head min-w-[220px]">
                    Profile
                  </TableHead>
                  <TableHead className="dash-table-head min-w-[190px]">
                    Social Accounts
                  </TableHead>
                  <TableHead className="dash-table-head min-w-[220px]">
                    Event access
                  </TableHead>
                  <TableHead className="dash-table-head w-[140px]">
                    Current Role
                  </TableHead>
                  <TableHead className="dash-table-head w-[180px]">
                    Change Role
                  </TableHead>
                  <TableHead className="dash-table-head w-[150px]">
                    Judge Access
                  </TableHead>
                  <TableHead className="w-[160px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => {
                  const selectedRole = pendingRoles[user.id] ?? user.role;
                  const hasPendingChange = selectedRole !== user.role;
                  const isPendingStaff =
                    isStaffRole(user.role) && user.judgeApprovalStatus !== "approved";
                  const profile = user.profile;
                  const githubUrl = getGithubUrl(profile);
                  const socialLinks = [
                    { label: "LinkedIn", href: profile?.linkedinUrl },
                    { label: "Portfolio", href: profile?.portfolioUrl },
                    { label: "X", href: profile?.xUrl },
                  ].filter((link) => hasText(link.href));
                  const profileCompletion = getProfileCompletion(user);
                  const grantedIds = user.hackathonIds ?? (user.hackathonId ? [user.hackathonId] : []);

                  return (
                    <TableRow key={user.id} className="border-white/5 transition-colors hover:bg-primary/5">
                      <TableCell className="text-sm">{user.email}</TableCell>
                      <TableCell>
                        <div className="flex min-w-0 items-start gap-3">
                          <Avatar className="mt-0.5 h-10 w-10 rounded-xl border border-white/10">
                            {profile?.avatarUrl?.trim() ? (
                              <AvatarImage
                                src={profile.avatarUrl.trim()}
                                alt={profile?.fullName?.trim() || user.email}
                                className="rounded-xl object-cover"
                              />
                            ) : null}
                            <AvatarFallback className="rounded-xl bg-primary/10 text-[0.7rem] font-semibold tracking-[0.12em] text-primary">
                              {getProfileInitials(profile?.fullName)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0 space-y-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-medium text-foreground">
                                {profile?.fullName?.trim() || "Unnamed user"}
                              </span>
                              <Badge variant="outline" className="text-[0.65rem] uppercase tracking-[0.12em]">
                                {profileCompletion}% profile
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {profile?.headline?.trim() ||
                                profile?.publicRole?.trim() ||
                                "No people role set"}
                              {profile?.experienceLevel?.trim()
                                ? ` - ${profile.experienceLevel.trim()}`
                                : ""}
                            </p>
                            {profile?.organization?.trim() ? (
                              <p className="text-xs text-muted-foreground">
                                {profile.organization.trim()}
                              </p>
                            ) : null}
                            {profile?.location?.trim() || profile?.timezone?.trim() ? (
                              <p className="text-xs text-muted-foreground">
                                {[profile?.location, profile?.timezone].filter(hasText).join(" / ")}
                              </p>
                            ) : null}
                            {profile?.bio?.trim() ? (
                              <p className="line-clamp-2 text-xs text-foreground/70">
                                {profile.bio.trim()}
                              </p>
                            ) : null}
                            {profile?.skills?.trim() ? (
                              <p className="line-clamp-2 text-xs text-foreground/75">
                                {profile.skills.trim()}
                              </p>
                            ) : null}
                            {profile?.lookingFor?.trim() ? (
                              <p className="text-xs text-primary/90">
                                Looking for: {profile.lookingFor.trim()}
                              </p>
                            ) : null}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex min-w-[170px] flex-wrap gap-2">
                          {githubUrl ? (
                            <a
                              href={githubUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 rounded-lg border border-primary/30 px-2 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-primary hover:bg-primary/10"
                            >
                              <Github className="h-3.5 w-3.5" />
                              GitHub
                            </a>
                          ) : null}
                          {socialLinks.map((link) => (
                            <a
                              key={link.label}
                              href={link.href}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 rounded-lg border border-white/10 px-2 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground hover:border-primary/30 hover:text-primary"
                            >
                              <ExternalLink className="h-3.5 w-3.5" />
                              {link.label}
                            </a>
                          ))}
                          {profile?.discordHandle?.trim() ? (
                            <Badge variant="secondary" className="text-[0.68rem]">
                              {profile.discordHandle.trim()}
                            </Badge>
                          ) : null}
                          {!githubUrl && socialLinks.length === 0 && !profile?.discordHandle?.trim() ? (
                            <span className="text-xs text-muted-foreground">No social accounts</span>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell>
                        {user.role === "admin" ? (
                          <Badge variant="outline" className="text-[0.65rem] uppercase tracking-[0.12em]">
                            All events
                          </Badge>
                        ) : isStaffRole(user.role) ? (
                          <div className="flex min-w-[200px] flex-wrap gap-1.5">
                            {hackathons.map((hackathon) => {
                              const isGranted = grantedIds.includes(hackathon.id);
                              return (
                                <button
                                  key={hackathon.id}
                                  type="button"
                                  disabled={savingUserId === user.id}
                                  onClick={() => {
                                    const nextIds = isGranted
                                      ? grantedIds.filter((id) => id !== hackathon.id)
                                      : [...grantedIds, hackathon.id];
                                    void onUpdateHackathonAccess(user, nextIds);
                                  }}
                                  className={`rounded-md border px-2 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.12em] transition ${
                                    isGranted
                                      ? "border-primary/40 bg-primary/15 text-primary"
                                      : "border-white/10 text-muted-foreground hover:border-primary/30 hover:text-primary"
                                  }`}
                                  title={
                                    isGranted
                                      ? `Revoke ${hackathon.shortName} access`
                                      : `Grant ${hackathon.shortName} access`
                                  }
                                >
                                  {hackathon.shortName}
                                </button>
                              );
                            })}
                          </div>
                        ) : user.hackathonId ? (
                          <Badge variant="secondary" className="text-[0.65rem] uppercase tracking-[0.12em]">
                            {getHackathonById(user.hackathonId).shortName}
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col items-start gap-1.5">
                          <Badge variant={roleBadgeVariant[selectedRole]} className="uppercase tracking-[0.14em]">
                            {user.role}
                          </Badge>
                          {isPendingStaff ? (
                            <p className="max-w-[12rem] text-xs leading-snug text-amber-200/90">
                              Pending approval — this {user.role} cannot open the judging dashboard until an admin
                              approves them.
                            </p>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Select
                          value={selectedRole}
                          onValueChange={(value) => onRoleChange(user.id, value as PortalRole)}
                        >
                          <SelectTrigger className="h-8">
                            <SelectValue placeholder="Select role" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="participant">participant</SelectItem>
                            <SelectItem value="mentor">mentor</SelectItem>
                            <SelectItem value="judge">judge</SelectItem>
                            <SelectItem value="host">host</SelectItem>
                            <SelectItem value="admin">admin</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        {isStaffRole(user.role) ? (
                          <div className="flex flex-col items-start gap-1.5">
                            <Badge variant={isPendingStaff ? "secondary" : "default"}>
                              {isPendingStaff ? "Pending approval" : "Approved"}
                            </Badge>
                            {isPendingStaff ? (
                              <p className="max-w-[10rem] text-xs leading-snug text-muted-foreground">
                                Awaiting admin approval before event judging access is active.
                              </p>
                            ) : null}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">N/A</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            className="h-8 px-3 text-[0.7rem] uppercase tracking-[0.22em]"
                            disabled={savingUserId === user.id || !hasPendingChange}
                            onClick={() => onSaveRole(user)}
                          >
                            {savingUserId === user.id ? "Saving..." : "Save"}
                          </Button>
                          {isPendingStaff ? (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 px-3 text-[0.7rem] uppercase tracking-[0.22em]"
                                disabled={savingUserId === user.id}
                                onClick={() => onApproveJudge(user)}
                              >
                                {savingUserId === user.id ? "Saving..." : "Approve"}
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                className="h-8 px-3 text-[0.7rem] uppercase tracking-[0.22em]"
                                disabled={savingUserId === user.id}
                                onClick={() => onRejectJudge(user)}
                              >
                                {savingUserId === user.id ? "Saving..." : "Reject"}
                              </Button>
                            </>
                          ) : null}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </section>
  );
}

function HostApprovalPanel({
  hosts,
  savingUserId,
  onApproveHost,
}: {
  hosts: AdminUser[];
  savingUserId: string | null;
  onApproveHost: (user: AdminUser) => Promise<void>;
}) {
  const pendingHosts = hosts.filter((host) => host.hostApprovalStatus !== "approved");
  const approvedHosts = hosts.filter((host) => host.hostApprovalStatus === "approved");

  return (
    <section className={`${sectionClass} overflow-hidden p-0`} id="manage-hosts">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-white/10 px-6 py-5">
        <div className="flex items-start gap-3">
          <span className="dash-icon-chip dash-icon-chip--violet" aria-hidden>
            <ShieldCheck className="h-4 w-4" />
          </span>
          <div>
            <p className="dash-eyebrow">Host access control</p>
            <h2 className="dash-title">Host approval queue</h2>
            <p className="dash-subtitle">Approve organisers before they can create events, issue tickets, or check in attendees.</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Badge variant="secondary">{pendingHosts.length} pending</Badge>
          <Badge variant="outline">{approvedHosts.length} approved</Badge>
        </div>
      </div>
      <div className="grid gap-3 p-4 sm:p-6 lg:grid-cols-2">
        {hosts.length === 0 ? (
          <p className="text-sm text-muted-foreground">No host access requests yet.</p>
        ) : (
          hosts.map((host) => {
            const isPending = host.hostApprovalStatus !== "approved";
            return (
              <article key={host.id} className="rounded-xl border border-white/10 bg-muted/10 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-foreground">{host.profile?.fullName?.trim() || host.email}</p>
                    <p className="text-sm text-muted-foreground">{host.email}</p>
                    {host.profile?.organization?.trim() ? <p className="mt-2 text-xs text-muted-foreground">{host.profile.organization.trim()}</p> : null}
                  </div>
                  <Badge variant={isPending ? "secondary" : "default"} className="uppercase tracking-[0.12em]">
                    {isPending ? "Pending" : "Approved"}
                  </Badge>
                </div>
                {isPending ? (
                  <Button size="sm" className="mt-4" disabled={savingUserId === host.id} onClick={() => void onApproveHost(host)}>
                    {savingUserId === host.id ? "Approving..." : "Approve host"}
                  </Button>
                ) : (
                  <p className="mt-4 text-xs text-primary">This host can manage their own event workspace.</p>
                )}
              </article>
            );
          })
        )}
      </div>
    </section>
  );
}

export function JudgeApprovalPanel({
  judges,
  selectedHackathon,
  savingUserId,
  onApproveJudge,
  onRejectJudge,
}: {
  judges: AdminUser[];
  selectedHackathon: PortalHackathon;
  savingUserId: string | null;
  onApproveJudge: (user: AdminUser) => Promise<void>;
  onRejectJudge: (user: AdminUser) => Promise<void>;
}) {
  const pendingJudges = judges.filter((judge) => judge.judgeApprovalStatus !== "approved");
  const approvedJudges = judges.filter((judge) => judge.judgeApprovalStatus === "approved");

  return (
    <section className={`${sectionClass} overflow-hidden p-0`} id="manage-judge-approvals">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-white/10 px-6 py-5">
        <div className="flex items-start gap-3">
          <span className="dash-icon-chip dash-icon-chip--sunset" aria-hidden>
            <ShieldCheck className="h-4 w-4" />
          </span>
          <div>
            <p className="dash-eyebrow">Judge access control</p>
            <h2 className="dash-title">Pending approval</h2>
            <p className="dash-subtitle">
              Approve or reject self-signup judges and mentors. Approving grants access to{" "}
              {selectedHackathon.shortName} (and any events they already hold). Rejecting converts
              the account to a participant.
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Badge variant="secondary">{pendingJudges.length} pending</Badge>
          <Badge variant="outline">{approvedJudges.length} approved</Badge>
        </div>
      </div>
      <div className="grid gap-3 p-4 sm:p-6 lg:grid-cols-2">
        {judges.length === 0 ? (
          <p className="text-sm text-muted-foreground">No judge or mentor access requests yet.</p>
        ) : pendingJudges.length === 0 ? (
          <p className="text-sm text-muted-foreground lg:col-span-2">
            No pending judge or mentor approvals. Approved accounts appear under Mentors &amp; judges
            once they have event access.
          </p>
        ) : (
          pendingJudges.map((judge) => (
            <article key={judge.id} className="rounded-xl border border-white/10 bg-muted/10 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-foreground">
                    {judge.profile?.fullName?.trim() || judge.email}
                  </p>
                  <p className="text-sm text-muted-foreground">{judge.email}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Badge variant="outline" className="uppercase tracking-[0.12em]">
                      {judge.role}
                    </Badge>
                    {judge.profile?.organization?.trim() ? (
                      <span className="text-xs text-muted-foreground">
                        {judge.profile.organization.trim()}
                      </span>
                    ) : null}
                  </div>
                </div>
                <Badge variant="secondary" className="uppercase tracking-[0.12em]">
                  Pending
                </Badge>
              </div>
              <p className="mt-3 text-xs leading-snug text-amber-200/90">
                This {judge.role} is pending approval and cannot open the judging dashboard until
                approved.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button
                  size="sm"
                  disabled={savingUserId === judge.id}
                  onClick={() => void onApproveJudge(judge)}
                >
                  {savingUserId === judge.id
                    ? "Saving..."
                    : `Approve for ${selectedHackathon.shortName}`}
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  disabled={savingUserId === judge.id}
                  onClick={() => void onRejectJudge(judge)}
                >
                  {savingUserId === judge.id ? "Saving..." : "Reject"}
                </Button>
              </div>
            </article>
          ))
        )}
      </div>
    </section>
  );
}

export function AdminDashboard({
  workspace = "overview",
  selectedHackathon,
  hackathons = PORTAL_HACKATHONS,
  judgingCriteria,
  isLoadingCriteria,
  isSavingCriteria,
  onSaveCriteria,
  users,
  hostAccounts,
  judgeAccounts,
  isLoadingUsers,
  submissions,
  allSubmissions,
  isLoadingSubmissions,
  analytics,
  message,
  savingUserId,
  pendingRoles,
  onRoleChange,
  onSaveRole,
  onApproveJudge,
  onRejectJudge,
  onApproveHost,
  onUpdateHackathonAccess,
  adminGrantEmail,
  onAdminGrantEmailChange,
  pendingAdminGrants,
  isGrantingAdmin,
  onGrantAdminAccess,
  broadcastSubject,
  onBroadcastSubjectChange,
  broadcastMessage,
  onBroadcastMessageChange,
  isSendingBroadcast,
  onSendParticipantBroadcast,
  isCreatingSubmission,
  deletingSubmissionId,
  publishingSubmissionId,
  shortlistingSubmissionId,
  onCreateSubmission,
  onDeleteSubmission,
  onSetSubmissionPublic,
  onSetFinalShortlisted,
  top3RankingSummary,
  isLoadingTop3Rankings,
  top3SubmissionLookup,
  platformOpsLive,
  onCreateAiHackathon,
  onCreateManualHackathon,
  judgeInviteLabel = "",
  onJudgeInviteLabelChange,
  judgeInviteHackathonIds = [],
  onToggleJudgeInviteHackathon,
  judgeInviteUrl = null,
  judgeInviteMessage = null,
  isCreatingJudgeInvite = false,
  onCreateJudgeInvite,
  newsletterSubscribers = [],
  isLoadingNewsletter = false,
  siteAnalytics = EMPTY_SITE_ANALYTICS,
  audienceEngagement = { projectStars: 0, projectShares: 0 },
  isLoadingAudienceAnalytics = false,
  onRefreshAudienceAnalytics = () => undefined,
}: AdminDashboardProps) {
  const [newSubmission, setNewSubmission] = useState<NewSubmissionInput>({
    participantId: "",
    title: "",
    shortDescription: "",
    projectUrl: "",
    submissionPdfUrl: "",
    demoVideoUrl: "",
  });
  const participants = users.filter((user) => user.role === "participant");
  const staff = users.filter((user) => isStaffRole(user.role));
  // Full pending queue (not hackathon-scoped) so self-signup judges appear before event access is granted.
  const pendingStaff = judgeAccounts.filter((user) => user.judgeApprovalStatus !== "approved");
  const approvedStaff = staff.filter((user) => user.judgeApprovalStatus === "approved");
  const hostAnalytics = buildHostAnalytics(users);
  const eventQuery = selectedHackathon.id;
  const newsletterSubscribersLast7Days = newsletterSubscribers.filter((item) => {
    const created = Date.parse(item.createdAt);
    return Number.isFinite(created) && created >= Date.now() - 7 * 24 * 60 * 60 * 1000;
  }).length;

  useEffect(() => {
    setNewSubmission({
      participantId: "",
      title: "",
      shortDescription: "",
      projectUrl: "",
      submissionPdfUrl: "",
      demoVideoUrl: "",
    });
  }, [selectedHackathon.id]);

  if (workspace === "create") {
    return (
      <div className="space-y-8">
        <section className={sectionClass} aria-label="Create event">
          <div className="dash-stack-header flex flex-wrap items-start justify-between gap-4">
            <div className="flex min-w-0 items-start gap-3">
              <span className="dash-icon-chip" aria-hidden>
                <Wand2 className="h-4 w-4" />
              </span>
              <div>
                <p className="dash-eyebrow">Create</p>
                <h2 className="dash-title">Launch a new event</h2>
                <p className="dash-subtitle">
                  AI or manual setup — publishes into the admin catalog and public event pages.
                </p>
              </div>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link to={withHackathonQuery("/dashboard/admin", eventQuery)}>Back to overview</Link>
            </Button>
          </div>
        </section>
        <AiHackathonLauncher onCreate={onCreateAiHackathon} />
        <ManualHackathonLauncher onCreate={onCreateManualHackathon} />
      </div>
    );
  }

  if (workspace === "shortlist") {
    return (
      <div className="space-y-6">
        <section className={sectionClass} aria-label="Final shortlist workspace">
          <div className="dash-stack-header flex flex-wrap items-start justify-between gap-4">
            <div className="flex min-w-0 items-start gap-3">
              <span className="dash-icon-chip dash-icon-chip--sunset" aria-hidden>
                <Star className="h-4 w-4" />
              </span>
              <div>
                <p className="dash-eyebrow">Final round</p>
                <h2 className="dash-title">{selectedHackathon.name}</h2>
                <p className="dash-subtitle">
                  Select the teams that advance to final judging in this dedicated workspace.
                </p>
              </div>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link to={withHackathonQuery("/dashboard/admin/judging", eventQuery)}>Back to judging</Link>
            </Button>
          </div>
        </section>
        <AdminFinalShortlistPanel
          selectedHackathon={selectedHackathon}
          submissions={submissions}
          isLoading={isLoadingSubmissions}
          shortlistingSubmissionId={shortlistingSubmissionId}
          onSetFinalShortlisted={onSetFinalShortlisted}
        />
      </div>
    );
  }

  if (workspace === "judging") {
    return (
      <div className="space-y-8">
        <section className={sectionClass} aria-label="Judging workspace">
          <div className="dash-stack-header flex flex-wrap items-start justify-between gap-4">
            <div className="flex min-w-0 items-start gap-3">
              <span className="dash-icon-chip dash-icon-chip--sunset" aria-hidden>
                <Gavel className="h-4 w-4" />
              </span>
              <div>
                <p className="dash-eyebrow">Judging</p>
                <h2 className="dash-title">{selectedHackathon.name}</h2>
                <p className="dash-subtitle">
                  Criteria, marks, analytics, and rankings for this event.
                </p>
              </div>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link to={withHackathonQuery("/dashboard/admin", eventQuery)}>Back to overview</Link>
            </Button>
          </div>
        </section>
        <AdminJudgingSection
          selectedHackathon={selectedHackathon}
          hackathons={hackathons}
          judgingCriteria={judgingCriteria}
          isLoadingCriteria={isLoadingCriteria}
          isSavingCriteria={isSavingCriteria}
          onSaveCriteria={onSaveCriteria}
          participants={participants}
          submissions={submissions}
          allSubmissions={allSubmissions ?? submissions}
          isLoadingSubmissions={isLoadingSubmissions}
          isLoadingUsers={isLoadingUsers}
          analytics={analytics}
          isCreatingSubmission={isCreatingSubmission}
          deletingSubmissionId={deletingSubmissionId}
          publishingSubmissionId={publishingSubmissionId}
          newSubmission={newSubmission}
          onNewSubmissionChange={setNewSubmission}
          onCreateSubmission={onCreateSubmission}
          onDeleteSubmission={onDeleteSubmission}
          onSetSubmissionPublic={onSetSubmissionPublic}
          top3RankingSummary={top3RankingSummary}
          isLoadingTop3Rankings={isLoadingTop3Rankings}
          top3SubmissionLookup={top3SubmissionLookup}
        />
      </div>
    );
  }

  if (workspace === "people") {
    return (
      <div className="space-y-8">
        <section className={sectionClass} aria-label="People workspace">
          <div className="dash-stack-header flex flex-wrap items-start justify-between gap-4">
            <div className="flex min-w-0 items-start gap-3">
              <span className="dash-icon-chip" aria-hidden>
                <Users className="h-4 w-4" />
              </span>
              <div>
                <p className="dash-eyebrow">People</p>
                <h2 className="dash-title">{selectedHackathon.name}</h2>
                <p className="dash-subtitle">
                  Participants, teams, judges, hosts, invites, and access for this event.
                </p>
              </div>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link to={withHackathonQuery("/dashboard/admin", eventQuery)}>Back to overview</Link>
            </Button>
          </div>
        </section>

        <HostAnalyticsPanel analytics={hostAnalytics} isLoading={isLoadingUsers} />

        <AdminAudienceAnalyticsPanel
          analytics={siteAnalytics}
          engagement={audienceEngagement}
          subscriberCount={newsletterSubscribersLast7Days}
          isLoading={isLoadingAudienceAnalytics}
          onRefresh={onRefreshAudienceAnalytics}
        />

        <AdminNewsletterPanel
          subscribers={newsletterSubscribers}
          isLoading={isLoadingNewsletter}
        />

        <AdminTeamsPanel
          selectedHackathon={selectedHackathon}
          submissions={submissions}
          isLoading={isLoadingSubmissions}
          publishingSubmissionId={publishingSubmissionId}
          onSetSubmissionPublic={onSetSubmissionPublic}
        />

        <HostApprovalPanel
          hosts={hostAccounts}
          savingUserId={savingUserId}
          onApproveHost={onApproveHost}
        />

        <JudgeApprovalPanel
          judges={judgeAccounts}
          selectedHackathon={selectedHackathon}
          savingUserId={savingUserId}
          onApproveJudge={onApproveJudge}
          onRejectJudge={onRejectJudge}
        />

        <section className={`${sectionClass} overflow-hidden p-0`} id="grant-admin-access">
          <div className="flex items-start gap-3 border-b border-white/10 px-6 py-5">
            <span className="dash-icon-chip dash-icon-chip--violet" aria-hidden>
              <ShieldCheck className="h-4 w-4" />
            </span>
            <div>
              <p className="dash-eyebrow">Access control</p>
              <h2 className="dash-title">Grant admin access</h2>
              <p className="dash-subtitle">
                Promote an existing account or pre-authorize an email before first sign-in.
              </p>
            </div>
          </div>
          <div className="space-y-4 p-4 sm:p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="flex-1 space-y-2">
                <label
                  htmlFor="admin-grant-email"
                  className="text-xs uppercase tracking-[0.22em] text-muted-foreground"
                >
                  Email address
                </label>
                <Input
                  id="admin-grant-email"
                  type="email"
                  placeholder="organizer@example.com"
                  value={adminGrantEmail}
                  onChange={(event) => onAdminGrantEmailChange(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      void onGrantAdminAccess();
                    }
                  }}
                />
              </div>
              <Button
                className="h-10 px-4 text-[0.7rem] uppercase tracking-[0.22em]"
                disabled={isGrantingAdmin || !adminGrantEmail.trim()}
                onClick={() => void onGrantAdminAccess()}
              >
                {isGrantingAdmin ? "Granting..." : "Grant admin"}
              </Button>
            </div>
            {pendingAdminGrants.length > 0 ? (
              <div className="rounded-xl border border-white/10 bg-muted/10 p-4">
                <p className="dash-eyebrow">Pending invitations</p>
                <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                  {pendingAdminGrants.map((grant) => (
                    <li key={grant.email}>{grant.email}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        </section>

        <section className={`${sectionClass} overflow-hidden p-0`} id="participant-broadcast">
          <div className="flex items-start gap-3 border-b border-white/10 px-6 py-5">
            <span className="dash-icon-chip" aria-hidden>
              <Mail className="h-4 w-4" />
            </span>
            <div>
              <p className="dash-eyebrow">Participant email</p>
              <h2 className="dash-title">Broadcast to participants</h2>
              <p className="dash-subtitle">
                Send one email to every participant registered for {selectedHackathon.name}.
              </p>
            </div>
          </div>
          <div className="space-y-4 p-4 sm:p-6">
            <div className="space-y-2">
              <label
                htmlFor="participant-broadcast-subject"
                className="text-xs uppercase tracking-[0.22em] text-muted-foreground"
              >
                Subject
              </label>
              <Input
                id="participant-broadcast-subject"
                value={broadcastSubject}
                onChange={(event) => onBroadcastSubjectChange(event.target.value)}
                placeholder="Submission reminder"
              />
            </div>
            <div className="space-y-2">
              <label
                htmlFor="participant-broadcast-message"
                className="text-xs uppercase tracking-[0.22em] text-muted-foreground"
              >
                Message
              </label>
              <Textarea
                id="participant-broadcast-message"
                value={broadcastMessage}
                onChange={(event) => onBroadcastMessageChange(event.target.value)}
                placeholder="Write the update participants should receive..."
                rows={5}
              />
            </div>
            <Button
              className="h-10 px-4 text-[0.7rem] uppercase tracking-[0.22em]"
              disabled={
                isSendingBroadcast || !broadcastSubject.trim() || !broadcastMessage.trim()
              }
              onClick={() => void onSendParticipantBroadcast()}
            >
              {isSendingBroadcast ? "Sending..." : "Send broadcast"}
            </Button>
          </div>
        </section>

        {onCreateJudgeInvite && onToggleJudgeInviteHackathon && onJudgeInviteLabelChange ? (
          <JudgeInvitePanel
            hackathons={hackathons && hackathons.length > 0 ? hackathons : PORTAL_HACKATHONS}
            selectedHackathonIds={judgeInviteHackathonIds}
            onToggleHackathon={onToggleJudgeInviteHackathon}
            label={judgeInviteLabel}
            onLabelChange={onJudgeInviteLabelChange}
            inviteUrl={judgeInviteUrl}
            isBusy={isCreatingJudgeInvite}
            message={judgeInviteMessage}
            onGenerate={onCreateJudgeInvite}
          />
        ) : null}

        {isLoadingUsers ? (
          <section className={sectionClass}>
            <p className="text-sm text-muted-foreground">Loading users...</p>
          </section>
        ) : (
          <>
            <UserManagementTable
              users={users}
              hackathons={hackathons}
              title={`All users · ${selectedHackathon.shortName}`}
              description={`Accounts linked to ${selectedHackathon.name} via signup, submissions, or judging activity.`}
              emptyMessage={`No users linked to ${selectedHackathon.name} yet.`}
              sectionId="manage-all-users"
              savingUserId={savingUserId}
              pendingRoles={pendingRoles}
              onRoleChange={onRoleChange}
              onSaveRole={onSaveRole}
              onApproveJudge={onApproveJudge}
              onRejectJudge={onRejectJudge}
              onUpdateHackathonAccess={onUpdateHackathonAccess}
            />
            <UserManagementTable
              users={participants}
              hackathons={hackathons}
              title={`Participants · ${selectedHackathon.shortName}`}
              description={`Participant accounts for ${selectedHackathon.name}.`}
              emptyMessage={`No participants for ${selectedHackathon.name} yet.`}
              sectionId="manage-participants"
              savingUserId={savingUserId}
              pendingRoles={pendingRoles}
              onRoleChange={onRoleChange}
              onSaveRole={onSaveRole}
              onApproveJudge={onApproveJudge}
              onRejectJudge={onRejectJudge}
              onUpdateHackathonAccess={onUpdateHackathonAccess}
            />
            <UserManagementTable
              users={pendingStaff}
              hackathons={hackathons}
              title={`Pending approval · ${selectedHackathon.shortName}`}
              description={`All judges and mentors waiting for approval. Approving grants access to ${selectedHackathon.name} (and any events they already hold).`}
              emptyMessage="No pending judge or mentor approvals."
              sectionId="manage-judge-pending"
              savingUserId={savingUserId}
              pendingRoles={pendingRoles}
              onRoleChange={onRoleChange}
              onSaveRole={onSaveRole}
              onApproveJudge={onApproveJudge}
              onRejectJudge={onRejectJudge}
              onUpdateHackathonAccess={onUpdateHackathonAccess}
            />
            <UserManagementTable
              users={approvedStaff}
              hackathons={hackathons}
              title={`Mentors & judges · ${selectedHackathon.shortName}`}
              description={`Approved mentor and judge accounts for ${selectedHackathon.name}. Toggle event chips to grant or revoke access.`}
              emptyMessage={`No approved mentors or judges for ${selectedHackathon.name} yet.`}
              sectionId="manage-judges"
              savingUserId={savingUserId}
              pendingRoles={pendingRoles}
              onRoleChange={onRoleChange}
              onSaveRole={onSaveRole}
              onApproveJudge={onApproveJudge}
              onRejectJudge={onRejectJudge}
              onUpdateHackathonAccess={onUpdateHackathonAccess}
            />
          </>
        )}
      </div>
    );
  }

  const hubs: Array<{
    to: string;
    title: string;
    description: string;
    icon: typeof Wand2;
  }> = [
    {
      to: withHackathonQuery("/dashboard/admin/create", eventQuery),
      title: "Create event",
      description: "AI event builder or manual launch.",
      icon: Wand2,
    },
    {
      to: withHackathonQuery("/dashboard/admin/events", eventQuery),
      title: "Event management",
      description: "Publish, status, and edit live listings.",
      icon: CalendarCheck2,
    },
    {
      to: withHackathonQuery("/dashboard/admin/screening", eventQuery),
      title: "Screening agent",
      description: "Score and shortlist applicants.",
      icon: Radar,
    },
    {
      to: withHackathonQuery("/dashboard/admin/project-screening", eventQuery),
      title: "Project agent",
      description: "Match concepts to the event theme.",
      icon: ScanSearch,
    },
    {
      to: withHackathonQuery("/dashboard/admin/operations", eventQuery),
      title: "Operations",
      description: "Check-in, teams, and live ops console.",
      icon: Activity,
    },
    {
      to: withHackathonQuery("/dashboard/admin/people", eventQuery),
      title: "People",
      description: "Participants, teams, judges, hosts, and invites.",
      icon: Users,
    },
    {
      to: withHackathonQuery("/dashboard/admin/judging", eventQuery),
      title: "Judging",
      description: "Criteria, marks, analytics, and top 3.",
      icon: Gavel,
    },
    {
      to: withHackathonQuery("/dashboard/admin/final-shortlist", eventQuery),
      title: "Final shortlist",
      description: "Choose teams that advance to final judging.",
      icon: Star,
    },
  ];

  return (
    <div className="space-y-8" id="overview">
      <HackathonContextBanner hackathon={selectedHackathon} role="admin" />

      <section className={`${sectionClass} relative overflow-hidden`} aria-label="Admin overview">
        <div className="dash-stack-header flex flex-wrap items-center justify-between gap-4">
          <div className="flex min-w-0 items-start gap-3">
            <span className="dash-icon-chip dash-icon-chip--sunset" aria-hidden>
              <ShieldCheck className="h-4 w-4" />
            </span>
            <div>
              <p className="dash-eyebrow">Command center</p>
              <h2 className="dash-title">Admin overview</h2>
              <p className="dash-subtitle">
                Independent workspaces for {selectedHackathon.name} — pick a tool below.
              </p>
            </div>
          </div>
          <div className="dash-stat-grid grid w-full gap-2 sm:grid-cols-3 sm:gap-3 lg:w-auto lg:gap-4">
            <div className="dash-stat-tile dash-stat-tile--highlight">
              <p className="dash-stat-value">
                {isLoadingUsers ? "—" : participants.length}
              </p>
              <p className="dash-stat-label">Participants</p>
            </div>
            <div className="dash-stat-tile">
              <p className="dash-stat-value">{isLoadingUsers ? "—" : staff.length}</p>
              <p className="dash-stat-label">Judges</p>
            </div>
            <div className="dash-stat-tile sm:col-span-1 col-span-2">
              <p className="dash-stat-value">
                {isLoadingSubmissions ? "—" : analytics.totalSubmissions}
              </p>
              <p className="dash-stat-label">Submissions</p>
            </div>
          </div>
        </div>
        {message ? <p className="dash-message mt-4">{message}</p> : null}
      </section>

      <section className={sectionClass} aria-label="Admin workspaces">
        <div className="dash-stack-header mb-6">
          <p className="dash-eyebrow">Workspaces</p>
          <h2 className="dash-title">Open a tool</h2>
          <p className="dash-subtitle">
            Each area is separate, still scoped to the selected hackathon.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {hubs.map((hub) => {
            const Icon = hub.icon;
            return (
              <Link
                key={hub.to}
                to={hub.to}
                className="group rounded-xl border border-white/10 bg-white/[0.03] p-4 transition hover:border-primary/40 hover:bg-primary/5"
              >
                <span className="dash-icon-chip mb-3 inline-flex" aria-hidden>
                  <Icon className="h-4 w-4" />
                </span>
                <h3 className="font-display text-lg font-semibold tracking-tight text-foreground group-hover:text-primary">
                  {hub.title}
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">{hub.description}</p>
              </Link>
            );
          })}
          <Link
            to="/dashboard/host"
            className="group rounded-xl border border-white/10 bg-white/[0.03] p-4 transition hover:border-primary/40 hover:bg-primary/5"
          >
            <span className="dash-icon-chip mb-3 inline-flex" aria-hidden>
              <PenLine className="h-4 w-4" />
            </span>
            <h3 className="font-display text-lg font-semibold tracking-tight text-foreground group-hover:text-primary">
              Host ops
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Organizer ticket desk and host event workspace.
            </p>
          </Link>
        </div>
      </section>

      <span className="sr-only" aria-hidden>
        {platformOpsLive.hackathon.id}
      </span>
    </div>
  );
}
