import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Activity,
  CalendarCheck2,
  ClipboardCheck,
  Gavel,
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
import { sectionClass } from "@/components/dashboard/DashboardLayout";
import { HackathonContextBanner } from "@/components/dashboard/HackathonSelector";
import {
  PORTAL_HACKATHONS,
  withHackathonQuery,
  type PortalHackathon,
  type HackathonId,
} from "@/lib/hackathons";
import type { AdminGrantRecord } from "@/lib/adminGrants";
import type { AdminJudgingStatistics } from "@/lib/judgingStatistics";
import { AdminJudgingSection } from "@/components/dashboard/AdminJudgingSection";
import { AdminFinalShortlistPanel } from "@/components/dashboard/AdminFinalShortlistPanel";
import { AdminFinalJudgeScoresPanel } from "@/components/dashboard/AdminFinalJudgeScoresPanel";
import { AdminJudgeMarksPanel } from "@/components/dashboard/AdminJudgeMarksPanel";
import { type PlatformOpsLive } from "@/components/dashboard/PlatformOpsConsole";
import { AiHackathonLauncher } from "@/components/dashboard/AiHackathonLauncher";
import { ManualHackathonLauncher } from "@/components/dashboard/ManualHackathonLauncher";
import { AdminPeopleWorkspace } from "@/components/dashboard/AdminPeopleWorkspace";
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
import type { HostApplication } from "@/lib/hostApplication";

export type AdminUser = {
  id: string;
  email: string;
  role: PortalRole;
  judgeApprovalStatus?: JudgeApprovalStatus;
  hostApprovalStatus?: HostApprovalStatus;
  hackathonId?: HackathonId | null;
  hackathonIds?: HackathonId[];
  profile?: UserProfile;
  hostApplication?: HostApplication;
};

export type AdminSubmissionRow = {
  track_id?: string | null;
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
  finalJudgeMarks?: Array<{
    judgeId: string;
    judgeEmail: string;
    score: number | null;
    notes: string | null;
    criteriaScores?: Record<string, number | null>;
  }>;
  finalAverageScore?: number | null;
  finalScoredByCount?: number;
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

export type AdminWorkspace =
  | "overview"
  | "create"
  | "people"
  | "judging"
  | "shortlist"
  | "marks";

export type AdminDashboardProps = {
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
        <AdminFinalJudgeScoresPanel
          selectedHackathon={selectedHackathon}
          submissions={submissions}
          judgingCriteria={judgingCriteria}
          judges={approvedStaff.map((judge) => ({ id: judge.id, email: judge.email }))}
          isLoading={isLoadingSubmissions || isLoadingUsers}
        />
      </div>
    );
  }

  if (workspace === "marks") {
    return (
      <div className="space-y-6">
        <section className={sectionClass} aria-label="Saved judge marks workspace">
          <div className="dash-stack-header flex flex-wrap items-start justify-between gap-4">
            <div className="flex min-w-0 items-start gap-3">
              <span className="dash-icon-chip dash-icon-chip--violet" aria-hidden>
                <ClipboardCheck className="h-4 w-4" />
              </span>
              <div>
                <p className="dash-eyebrow">Saved judging records</p>
                <h2 className="dash-title">Judge marks</h2>
                <p className="dash-subtitle">
                  Review every judge's saved score, criterion breakdown, and notes for {selectedHackathon.name}.
                </p>
              </div>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link to={withHackathonQuery("/dashboard/admin/judging", eventQuery)}>
                Back to judging
              </Link>
            </Button>
          </div>
        </section>
        <AdminJudgeMarksPanel
          selectedHackathon={selectedHackathon}
          submissions={submissions}
          judgingCriteria={judgingCriteria}
          isLoading={isLoadingSubmissions}
        />
        <AdminFinalJudgeScoresPanel
          selectedHackathon={selectedHackathon}
          submissions={submissions}
          judgingCriteria={judgingCriteria}
          judges={approvedStaff.map((judge) => ({ id: judge.id, email: judge.email }))}
          isLoading={isLoadingSubmissions || isLoadingUsers}
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
      <AdminPeopleWorkspace
        selectedHackathon={selectedHackathon}
        hackathons={hackathons}
        users={users}
        hostAccounts={hostAccounts}
        judgeAccounts={judgeAccounts}
        isLoadingUsers={isLoadingUsers}
        savingUserId={savingUserId}
        pendingRoles={pendingRoles}
        onRoleChange={onRoleChange}
        onSaveRole={onSaveRole}
        onApproveJudge={onApproveJudge}
        onRejectJudge={onRejectJudge}
        onApproveHost={onApproveHost}
        onUpdateHackathonAccess={onUpdateHackathonAccess}
        message={message}
        submissions={submissions}
        isLoadingSubmissions={isLoadingSubmissions}
        publishingSubmissionId={publishingSubmissionId}
        onSetSubmissionPublic={onSetSubmissionPublic}
        adminGrantEmail={adminGrantEmail}
        onAdminGrantEmailChange={onAdminGrantEmailChange}
        pendingAdminGrants={pendingAdminGrants}
        isGrantingAdmin={isGrantingAdmin}
        onGrantAdminAccess={onGrantAdminAccess}
        broadcastSubject={broadcastSubject}
        onBroadcastSubjectChange={onBroadcastSubjectChange}
        broadcastMessage={broadcastMessage}
        onBroadcastMessageChange={onBroadcastMessageChange}
        isSendingBroadcast={isSendingBroadcast}
        onSendParticipantBroadcast={onSendParticipantBroadcast}
        newsletterSubscribers={newsletterSubscribers}
        isLoadingNewsletter={isLoadingNewsletter}
        judgeInviteLabel={judgeInviteLabel}
        onJudgeInviteLabelChange={onJudgeInviteLabelChange}
        judgeInviteHackathonIds={judgeInviteHackathonIds}
        onToggleJudgeInviteHackathon={onToggleJudgeInviteHackathon}
        judgeInviteUrl={judgeInviteUrl}
        judgeInviteMessage={judgeInviteMessage}
        isCreatingJudgeInvite={isCreatingJudgeInvite}
        onCreateJudgeInvite={onCreateJudgeInvite}
        insights={<>
          <AdminAudienceAnalyticsPanel
            analytics={siteAnalytics}
            engagement={audienceEngagement}
            subscriberCount={newsletterSubscribersLast7Days}
            isLoading={isLoadingAudienceAnalytics}
            onRefresh={onRefreshAudienceAnalytics}
          />
          <HostAnalyticsPanel analytics={hostAnalytics} isLoading={isLoadingUsers} />
        </>}
      />
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
