import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import type { JudgeApprovalStatus, PortalRole } from "@/types/portal";

export type AdminUser = {
  id: string;
  email: string;
  role: PortalRole;
  judgeApprovalStatus?: JudgeApprovalStatus;
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
  }>;
  averageScore: number | null;
  scoredByCount: number;
};

type AdminAnalytics = {
  totalSubmissions: number;
  scoredSubmissions: number;
  unscoredSubmissions: number;
  averageScore: number | null;
  activeJudgeCount: number;
};

type WinnerResult = {
  topScore: number | null;
  winners: AdminSubmissionRow[];
};

type AdminDashboardProps = {
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
};

const roleBadgeVariant: Record<PortalRole, "default" | "secondary" | "outline"> = {
  participant: "secondary",
  judge: "default",
  admin: "outline",
};

function UserManagementTable({
  users,
  title,
  description,
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
  sectionId: string;
  savingUserId: string | null;
  pendingRoles: Record<string, PortalRole>;
  onRoleChange: (userId: string, role: PortalRole) => void;
  onSaveRole: (user: AdminUser) => Promise<void>;
  onApproveJudge: (user: AdminUser) => Promise<void>;
}) {
  return (
    <section className={`${sectionClass} overflow-hidden p-0`} id={sectionId}>
      <div className="border-b border-border/40 px-6 py-5">
        <h2 className="font-display text-sm uppercase tracking-[0.28em] text-foreground">
          {title}
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">{description}</p>
      </div>
      <div className="p-4 sm:p-6">
        {users.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border/60 bg-muted/20 py-12 text-center text-sm text-muted-foreground">
            No users found in this group.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-border/40">
            <Table>
              <TableHeader>
                <TableRow className="border-border/50 hover:bg-transparent">
                  <TableHead className="text-xs uppercase tracking-[0.22em]">Email</TableHead>
                  <TableHead className="w-[140px] text-xs uppercase tracking-[0.22em]">
                    Current Role
                  </TableHead>
                  <TableHead className="w-[180px] text-xs uppercase tracking-[0.22em]">
                    Change Role
                  </TableHead>
                  <TableHead className="w-[150px] text-xs uppercase tracking-[0.22em]">
                    Judge Access
                  </TableHead>
                  <TableHead className="w-[160px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => {
                  const selectedRole = pendingRoles[user.id] ?? user.role;
                  const hasPendingChange = selectedRole !== user.role;
                  const isPendingJudge =
                    user.role === "judge" && user.judgeApprovalStatus === "pending";

                  return (
                    <TableRow key={user.id} className="border-border/40">
                      <TableCell className="text-sm">{user.email}</TableCell>
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
                            <SelectItem value="judge">judge</SelectItem>
                            <SelectItem value="admin">admin</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        {user.role === "judge" ? (
                          <Badge variant={isPendingJudge ? "secondary" : "default"}>
                            {isPendingJudge ? "Pending approval" : "Approved"}
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
                          {isPendingJudge ? (
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
}: AdminDashboardProps) {
  const participants = users.filter((user) => user.role === "participant");
  const judges = users.filter((user) => user.role === "judge");
  const winnerNames = winner.winners
    .map((entry) => entry.title || entry.participantEmail || "Untitled Project")
    .join(", ");

  return (
    <div className="space-y-8" id="overview">
      <section className={`${sectionClass} relative overflow-hidden p-6`} aria-label="Admin overview">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="font-display text-sm uppercase tracking-[0.28em] text-foreground">
              Admin overview
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Manage participant and judge access from one dashboard.
            </p>
          </div>
          <div className="grid w-full gap-3 sm:grid-cols-3 lg:w-auto lg:gap-4">
            <div className="rounded-xl border border-primary/30 bg-gradient-to-b from-primary/10 to-transparent px-5 py-3 text-center">
              <p className="font-display text-2xl font-semibold tabular-nums text-primary">
                {isLoadingUsers ? "—" : participants.length}
              </p>
              <p className="text-[0.65rem] uppercase tracking-[0.2em] text-muted-foreground">
                Participants
              </p>
            </div>
            <div className="rounded-xl border border-border/50 bg-muted/20 px-5 py-3 text-center">
              <p className="font-display text-2xl font-semibold tabular-nums text-primary">
                {isLoadingUsers ? "—" : judges.length}
              </p>
              <p className="text-[0.65rem] uppercase tracking-[0.2em] text-muted-foreground">
                Judges
              </p>
            </div>
            <div className="rounded-xl border border-border/50 bg-muted/20 px-5 py-3 text-center">
              <p className="font-display text-2xl font-semibold tabular-nums text-primary">
                {isLoadingSubmissions ? "—" : analytics.totalSubmissions}
              </p>
              <p className="text-[0.65rem] uppercase tracking-[0.2em] text-muted-foreground">
                Submissions
              </p>
            </div>
          </div>
        </div>
        {message && (
          <p className="mt-4 rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-xs text-primary">
            {message}
          </p>
        )}
      </section>

      <section className={`${sectionClass} p-6`} id="analytics">
        <div className="mb-5 border-b border-border/40 pb-4">
          <h2 className="font-display text-sm uppercase tracking-[0.28em] text-foreground">Analytics</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Submission health and scoring progress across all teams.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-xl border border-border/50 bg-muted/20 p-4">
            <p className="text-[0.65rem] uppercase tracking-[0.2em] text-muted-foreground">Scored projects</p>
            <p className="mt-1 font-display text-2xl tabular-nums text-primary">
              {isLoadingSubmissions ? "—" : analytics.scoredSubmissions}
            </p>
          </div>
          <div className="rounded-xl border border-border/50 bg-muted/20 p-4">
            <p className="text-[0.65rem] uppercase tracking-[0.2em] text-muted-foreground">Pending score</p>
            <p className="mt-1 font-display text-2xl tabular-nums text-primary">
              {isLoadingSubmissions ? "—" : analytics.unscoredSubmissions}
            </p>
          </div>
          <div className="rounded-xl border border-border/50 bg-muted/20 p-4">
            <p className="text-[0.65rem] uppercase tracking-[0.2em] text-muted-foreground">Average score</p>
            <p className="mt-1 font-display text-2xl tabular-nums text-primary">
              {isLoadingSubmissions
                ? "—"
                : analytics.averageScore != null
                  ? analytics.averageScore.toFixed(1)
                  : "—"}
            </p>
          </div>
          <div className="rounded-xl border border-border/50 bg-muted/20 p-4">
            <p className="text-[0.65rem] uppercase tracking-[0.2em] text-muted-foreground">Judges scored</p>
            <p className="mt-1 font-display text-2xl tabular-nums text-primary">
              {isLoadingSubmissions ? "—" : analytics.activeJudgeCount}
            </p>
          </div>
        </div>
      </section>

      <section className={`${sectionClass} p-6`} id="winner-detection">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="font-display text-sm uppercase tracking-[0.28em] text-foreground">
              Winner detection
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Winner is auto-detected from the highest average score across judges.
            </p>
          </div>
          <Badge variant="outline" className="uppercase tracking-[0.14em]">
            {winner.topScore != null ? `Top score ${winner.topScore.toFixed(1)}` : "Awaiting scores"}
          </Badge>
        </div>
        <div className="mt-4 rounded-xl border border-border/40 bg-muted/20 p-4">
          {winner.winners.length ? (
            <>
              <p className="text-[0.7rem] uppercase tracking-[0.22em] text-muted-foreground">
                {winner.winners.length > 1 ? "Tie detected" : "Current winner"}
              </p>
              <p className="mt-1 text-sm text-foreground">{winnerNames}</p>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              No winner detected yet. At least one scored project is required.
            </p>
          )}
        </div>
      </section>

      <section className={`${sectionClass} overflow-hidden p-0`} id="submission-marks">
        <div className="border-b border-border/40 px-6 py-5">
          <h2 className="font-display text-sm uppercase tracking-[0.28em] text-foreground">
            Participant submissions + judge marks
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Unified view of all participant projects and every judge score together.
          </p>
        </div>
        <div className="p-4 sm:p-6">
          {isLoadingSubmissions ? (
            <p className="text-sm text-muted-foreground">Loading submissions...</p>
          ) : submissions.length === 0 ? (
            <p className="rounded-lg border border-dashed border-border/60 bg-muted/20 py-12 text-center text-sm text-muted-foreground">
              No participant submissions yet.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-border/40">
              <Table>
                <TableHeader>
                  <TableRow className="border-border/50 hover:bg-transparent">
                    <TableHead className="w-[200px] text-xs uppercase tracking-[0.22em]">
                      Participant
                    </TableHead>
                    <TableHead className="w-[220px] text-xs uppercase tracking-[0.22em]">Project</TableHead>
                    <TableHead className="text-xs uppercase tracking-[0.22em]">Links</TableHead>
                    <TableHead className="min-w-[240px] text-xs uppercase tracking-[0.22em]">
                      Marks from judges
                    </TableHead>
                    <TableHead className="w-[90px] text-right text-xs uppercase tracking-[0.22em]">
                      Avg
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {submissions.map((submission) => (
                    <TableRow key={submission.id} className="border-border/40 hover:bg-muted/20">
                      <TableCell className="align-top text-sm">{submission.participantEmail}</TableCell>
                      <TableCell className="align-top">
                        <p className="text-sm font-medium">{submission.title || "Untitled Project"}</p>
                        <p className="mt-1 line-clamp-3 text-[0.7rem] text-muted-foreground">
                          {submission.shortDescription || "No description provided."}
                        </p>
                      </TableCell>
                      <TableCell className="align-top">
                        <div className="space-y-1 text-[0.7rem]">
                          {submission.projectUrl && (
                            <a
                              href={submission.projectUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="block text-primary underline underline-offset-4 hover:no-underline"
                            >
                              Project URL
                            </a>
                          )}
                          {submission.submissionPdfUrl && (
                            <a
                              href={submission.submissionPdfUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="block text-primary underline underline-offset-4 hover:no-underline"
                            >
                              PDF
                            </a>
                          )}
                          {submission.demoVideoUrl && (
                            <a
                              href={submission.demoVideoUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="block text-primary underline underline-offset-4 hover:no-underline"
                            >
                              Demo video
                            </a>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="align-top">
                        {submission.judgeMarks.length ? (
                          <div className="space-y-2">
                            {submission.judgeMarks.map((mark) => (
                              <div key={`${submission.id}-${mark.judgeId}`} className="text-xs text-muted-foreground">
                                <p className="font-medium text-foreground">
                                  {mark.judgeEmail}:{" "}
                                  {mark.score != null ? mark.score.toFixed(1) : "Not scored"}
                                </p>
                                {mark.notes ? <p className="line-clamp-2">{mark.notes}</p> : null}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-muted-foreground">No judge marks yet.</p>
                        )}
                      </TableCell>
                      <TableCell className="align-top text-right">
                        <p className="text-sm font-medium tabular-nums">
                          {submission.averageScore != null ? submission.averageScore.toFixed(1) : "—"}
                        </p>
                        <p className="text-[0.65rem] text-muted-foreground">{submission.scoredByCount} judges</p>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </section>

      {isLoadingUsers ? (
        <section className={`${sectionClass} p-6`}>
          <p className="text-sm text-muted-foreground">Loading users...</p>
        </section>
      ) : (
        <>
          <UserManagementTable
            users={users}
            title="All users"
            description="Complete account list across participant, judge, and admin roles."
            sectionId="manage-all-users"
            savingUserId={savingUserId}
            pendingRoles={pendingRoles}
            onRoleChange={onRoleChange}
            onSaveRole={onSaveRole}
            onApproveJudge={onApproveJudge}
          />
          <UserManagementTable
            users={participants}
            title="Manage participants"
            description="Review participant accounts and change roles when needed."
            sectionId="manage-participants"
            savingUserId={savingUserId}
            pendingRoles={pendingRoles}
            onRoleChange={onRoleChange}
            onSaveRole={onSaveRole}
            onApproveJudge={onApproveJudge}
          />
          <UserManagementTable
            users={judges}
            title="Manage judges"
            description="Review judge accounts and update access permissions."
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
