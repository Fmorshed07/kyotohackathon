import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  BarChart3,
  ShieldCheck,
  Trophy,
  Users,
} from "lucide-react";
import { useEffect, useState } from "react";
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
import { sectionClass } from "@/components/dashboard/DashboardLayout";
import { HackathonContextBanner } from "@/components/dashboard/HackathonSelector";
import { JudgingStatsPanel } from "@/components/dashboard/JudgingStatsPanel";
import { getHackathonById, type PortalHackathon, type HackathonId } from "@/lib/hackathons";
import type { AdminGrantRecord } from "@/lib/adminGrants";
import type { AdminJudgingStatistics } from "@/lib/judgingStatistics";
import { MarkingCriteriaSection } from "@/components/dashboard/MarkingCriteriaSection";
import { AdminTop3RankingPanel } from "@/components/dashboard/AdminTop3RankingPanel";
import { AdminJudgeMarksPanel } from "@/components/dashboard/AdminJudgeMarksPanel";
import { AdminSubmissionsPanel } from "@/components/dashboard/AdminSubmissionsPanel";
import type { JudgingCriterion } from "@/components/dashboard/judgingCriteria";
import type { AdminTop3RankingSummary } from "@/lib/judgeTop3Rankings";
import type { JudgeApprovalStatus, PortalRole } from "@/types/portal";

export type AdminUser = {
  id: string;
  email: string;
  role: PortalRole;
  judgeApprovalStatus?: JudgeApprovalStatus;
  hackathonId?: HackathonId | null;
};

export type AdminSubmissionRow = {
  id: string;
  participantId: string;
  participantEmail: string;
  title: string | null;
  shortDescription: string | null;
  projectUrl: string | null;
  submissionPdfUrl: string | null;
  demoVideoUrl: string | null;
  judgeMarks: Array<{
    judgeId: string;
    judgeEmail: string;
    score: number | null;
    notes: string | null;
    criteriaScores?: Record<string, number | null>;
  }>;
  averageScore: number | null;
  scoredByCount: number;
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

type WinnerResult = {
  topScore: number | null;
  winners: AdminSubmissionRow[];
};

type AdminDashboardProps = {
  selectedHackathon: PortalHackathon;
  judgingCriteria: JudgingCriterion[];
  isLoadingCriteria: boolean;
  isSavingCriteria: boolean;
  onSaveCriteria: (criteria: JudgingCriterion[]) => Promise<void>;
  users: AdminUser[];
  isLoadingUsers: boolean;
  submissions: AdminSubmissionRow[];
  isLoadingSubmissions: boolean;
  analytics: AdminAnalytics;
  winner: WinnerResult;
  message: string | null;
  savingUserId: string | null;
  pendingRoles: Record<string, PortalRole>;
  onRoleChange: (userId: string, role: PortalRole) => void;
  onSaveRole: (user: AdminUser) => Promise<void>;
  onApproveJudge: (user: AdminUser) => Promise<void>;
  adminGrantEmail: string;
  onAdminGrantEmailChange: (email: string) => void;
  pendingAdminGrants: AdminGrantRecord[];
  isGrantingAdmin: boolean;
  onGrantAdminAccess: () => Promise<void>;
  isCreatingSubmission: boolean;
  deletingSubmissionId: string | null;
  onCreateSubmission: (payload: NewSubmissionInput) => Promise<void>;
  onDeleteSubmission: (submissionId: string) => Promise<void>;
  top3RankingSummary: AdminTop3RankingSummary;
  isLoadingTop3Rankings: boolean;
  top3SubmissionLookup: Map<
    string,
    { id: string; title: string | null; team_name?: string | null; participantEmail: string }
  >;
};

const roleBadgeVariant: Record<PortalRole, "default" | "secondary" | "outline"> = {
  participant: "secondary",
  mentor: "default",
  judge: "default",
  admin: "outline",
};

const isStaffRole = (role: PortalRole) => role === "judge" || role === "mentor";

function UserManagementTable({
  users,
  title,
  description,
  emptyMessage,
  sectionId,
  savingUserId,
  pendingRoles,
  onRoleChange,
  onSaveRole,
  onApproveJudge,
}: {
  users: AdminUser[];
  title: string;
  description: string;
  emptyMessage: string;
  sectionId: string;
  savingUserId: string | null;
  pendingRoles: Record<string, PortalRole>;
  onRoleChange: (userId: string, role: PortalRole) => void;
  onSaveRole: (user: AdminUser) => Promise<void>;
  onApproveJudge: (user: AdminUser) => Promise<void>;
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
                  <TableHead className="dash-table-head w-[110px]">
                    Event
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
                    isStaffRole(user.role) && user.judgeApprovalStatus === "pending";

                  return (
                    <TableRow key={user.id} className="border-white/5 transition-colors hover:bg-primary/5">
                      <TableCell className="text-sm">{user.email}</TableCell>
                      <TableCell>
                        {user.role === "admin" ? (
                          <Badge variant="outline" className="text-[0.65rem] uppercase tracking-[0.12em]">
                            All events
                          </Badge>
                        ) : user.hackathonId ? (
                          <Badge variant="secondary" className="text-[0.65rem] uppercase tracking-[0.12em]">
                            {getHackathonById(user.hackathonId).shortName}
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={roleBadgeVariant[selectedRole]} className="uppercase tracking-[0.14em]">
                          {user.role}
                        </Badge>
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
                            <SelectItem value="admin">admin</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        {isStaffRole(user.role) ? (
                          <Badge variant={isPendingStaff ? "secondary" : "default"}>
                            {isPendingStaff ? "Pending approval" : "Approved"}
                          </Badge>
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
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 px-3 text-[0.7rem] uppercase tracking-[0.22em]"
                              disabled={savingUserId === user.id}
                              onClick={() => onApproveJudge(user)}
                            >
                              {savingUserId === user.id ? "Saving..." : "Approve"}
                            </Button>
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

export function AdminDashboard({
  selectedHackathon,
  judgingCriteria,
  isLoadingCriteria,
  isSavingCriteria,
  onSaveCriteria,
  users,
  isLoadingUsers,
  submissions,
  isLoadingSubmissions,
  analytics,
  winner,
  message,
  savingUserId,
  pendingRoles,
  onRoleChange,
  onSaveRole,
  onApproveJudge,
  adminGrantEmail,
  onAdminGrantEmailChange,
  pendingAdminGrants,
  isGrantingAdmin,
  onGrantAdminAccess,
  isCreatingSubmission,
  deletingSubmissionId,
  onCreateSubmission,
  onDeleteSubmission,
  top3RankingSummary,
  isLoadingTop3Rankings,
  top3SubmissionLookup,
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
  const winnerNames = winner.winners
    .map((entry) => entry.title || entry.participantEmail || "Untitled Project")
    .join(", ");

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
                Users and submissions scoped to {selectedHackathon.name}.
              </p>
            </div>
          </div>
          <div className="dash-stat-grid grid w-full gap-2 sm:grid-cols-3 sm:gap-3 lg:w-auto lg:gap-4">
            <div className="dash-stat-tile dash-stat-tile--highlight">
              <p className="dash-stat-value">
                {isLoadingUsers ? "—" : participants.length}
              </p>
              <p className="dash-stat-label">
                Participants
              </p>
            </div>
            <div className="dash-stat-tile">
              <p className="dash-stat-value">
                {isLoadingUsers ? "—" : staff.length}
              </p>
              <p className="dash-stat-label">
                Judges
              </p>
            </div>
            <div className="dash-stat-tile sm:col-span-1 col-span-2">
              <p className="dash-stat-value">
                {isLoadingSubmissions ? "—" : analytics.totalSubmissions}
              </p>
              <p className="dash-stat-label">
                Submissions
              </p>
            </div>
          </div>
        </div>
        {message && (
          <p className="dash-message mt-4">
            {message}
          </p>
        )}
      </section>

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

      <MarkingCriteriaSection
        selectedHackathon={selectedHackathon}
        criteria={judgingCriteria}
        isLoading={isLoadingCriteria}
        isSaving={isSavingCriteria}
        onSave={onSaveCriteria}
      />

      <section className={`${sectionClass}`} id="analytics">
        <div className="mb-5 flex items-start gap-3 border-b border-white/10 pb-4">
          <span className="dash-icon-chip" aria-hidden>
            <BarChart3 className="h-4 w-4" />
          </span>
          <div>
            <p className="dash-eyebrow">Analytics</p>
            <h2 className="dash-title">Judging statistics</h2>
            <p className="dash-subtitle">
              Live scoring analytics for {selectedHackathon.name}.
            </p>
          </div>
        </div>
        <JudgingStatsPanel
          isLoading={isLoadingSubmissions}
          completionRate={analytics.completionRate}
          criterionAverages={analytics.criterionAverages}
          title="Event scoring overview"
          description="Aggregated across all judges and submissions for this hackathon."
          stats={[
            { label: "Submissions", value: String(analytics.totalSubmissions), highlight: true },
            { label: "Scored", value: String(analytics.scoredSubmissions) },
            { label: "Pending", value: String(analytics.unscoredSubmissions) },
            {
              label: "Avg score",
              value: analytics.averageScore != null ? analytics.averageScore.toFixed(1) : "—",
            },
            { label: "Teams", value: String(analytics.teamsCount) },
            { label: "Judge marks", value: String(analytics.totalJudgeMarks) },
            { label: "Judges active", value: String(analytics.activeJudgeCount) },
            {
              label: "Judges registered",
              value: isLoadingUsers ? "—" : String(analytics.registeredJudgeCount),
            },
            {
              label: "Top project",
              value:
                analytics.highestProjectScore != null
                  ? analytics.highestProjectScore.toFixed(1)
                  : "—",
            },
            {
              label: "Lowest project",
              value:
                analytics.lowestProjectScore != null ? analytics.lowestProjectScore.toFixed(1) : "—",
            },
          ]}
        />
      </section>

      <section className={`${sectionClass}`} id="winner-detection">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <span className="dash-icon-chip dash-icon-chip--sunset" aria-hidden>
              <Trophy className="h-4 w-4" />
            </span>
            <div>
              <p className="dash-eyebrow">Leaderboard</p>
              <h2 className="dash-title">Winner detection</h2>
              <p className="dash-subtitle">
                Winner is auto-detected from the highest average score for {selectedHackathon.shortName}.
              </p>
            </div>
          </div>
          <Badge
            variant="outline"
            className="border-accent/40 bg-accent/10 font-mono text-accent uppercase tracking-[0.14em]"
          >
            {winner.topScore != null ? `Top score ${winner.topScore.toFixed(1)}` : "Awaiting scores"}
          </Badge>
        </div>
        <div className="mt-4 overflow-hidden rounded-xl border border-accent/25 bg-gradient-to-r from-accent/10 via-muted/15 to-transparent p-4">
          {winner.winners.length ? (
            <>
              <p className="dash-eyebrow text-accent/90">
                {winner.winners.length > 1 ? "Tie detected" : "Current winner"}
              </p>
              <p className="mt-1.5 font-display text-base font-bold text-foreground sm:text-lg">
                {winnerNames}
              </p>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              No winner detected yet. At least one scored project is required.
            </p>
          )}
        </div>
      </section>

      <AdminTop3RankingPanel
        selectedHackathon={selectedHackathon}
        summary={top3RankingSummary}
        isLoading={isLoadingTop3Rankings || isLoadingSubmissions}
        submissionLookup={top3SubmissionLookup}
      />

      <AdminJudgeMarksPanel
        selectedHackathon={selectedHackathon}
        submissions={submissions}
        judgingCriteria={judgingCriteria}
        isLoading={isLoadingSubmissions}
      />

      <AdminSubmissionsPanel
        selectedHackathon={selectedHackathon}
        participants={participants}
        submissions={submissions}
        isLoading={isLoadingSubmissions}
        isCreatingSubmission={isCreatingSubmission}
        deletingSubmissionId={deletingSubmissionId}
        newSubmission={newSubmission}
        onNewSubmissionChange={setNewSubmission}
        onCreateSubmission={onCreateSubmission}
        onDeleteSubmission={onDeleteSubmission}
      />

      {isLoadingUsers ? (
        <section className={`${sectionClass}`}>
          <p className="text-sm text-muted-foreground">Loading users...</p>
        </section>
      ) : (
        <>
          <UserManagementTable
            users={users}
            title={`All users · ${selectedHackathon.shortName}`}
            description={`Accounts linked to ${selectedHackathon.name} via signup, submissions, or judging activity.`}
            emptyMessage={`No users linked to ${selectedHackathon.name} yet.`}
            sectionId="manage-all-users"
            savingUserId={savingUserId}
            pendingRoles={pendingRoles}
            onRoleChange={onRoleChange}
            onSaveRole={onSaveRole}
            onApproveJudge={onApproveJudge}
          />
          <UserManagementTable
            users={participants}
            title={`Participants · ${selectedHackathon.shortName}`}
            description={`Participant accounts for ${selectedHackathon.name}.`}
            emptyMessage={`No participants for ${selectedHackathon.name} yet.`}
            sectionId="manage-participants"
            savingUserId={savingUserId}
            pendingRoles={pendingRoles}
            onRoleChange={onRoleChange}
            onSaveRole={onSaveRole}
            onApproveJudge={onApproveJudge}
          />
          <UserManagementTable
            users={staff}
            title={`Mentors & judges · ${selectedHackathon.shortName}`}
            description={`Mentor and judge accounts for ${selectedHackathon.name}.`}
            emptyMessage={`No mentors or judges for ${selectedHackathon.name} yet.`}
            sectionId="manage-judges"
            savingUserId={savingUserId}
            pendingRoles={pendingRoles}
            onRoleChange={onRoleChange}
            onSaveRole={onSaveRole}
            onApproveJudge={onApproveJudge}
          />
        </>
      )}
    </div>
  );
}
