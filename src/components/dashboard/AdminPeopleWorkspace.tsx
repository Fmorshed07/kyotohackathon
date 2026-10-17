import { useState, type ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Activity, ArrowUpRight, Mail, ShieldCheck, UserPlus, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { sectionClass } from "@/components/dashboard/DashboardLayout";
import { AdminPeopleDirectory, type AdminPeopleFilter } from "./AdminPeopleDirectory";
import { AdminTeamsPanel } from "./AdminTeamsPanel";
import { AdminNewsletterPanel } from "./AdminNewsletterPanel";
import { JudgeInvitePanel } from "./JudgeInvitePanel";
import type { AdminDashboardProps } from "./AdminDashboard";
import { withHackathonQuery } from "@/lib/hackathons";

type Props = Pick<AdminDashboardProps,
  | "selectedHackathon" | "hackathons" | "users" | "hostAccounts" | "judgeAccounts"
  | "isLoadingUsers" | "savingUserId" | "pendingRoles" | "onRoleChange" | "onSaveRole"
  | "onApproveJudge" | "onRejectJudge" | "onApproveHost" | "onUpdateHackathonAccess" | "message"
  | "submissions" | "isLoadingSubmissions" | "publishingSubmissionId" | "onSetSubmissionPublic"
  | "adminGrantEmail" | "onAdminGrantEmailChange" | "pendingAdminGrants" | "isGrantingAdmin" | "onGrantAdminAccess"
  | "broadcastSubject" | "onBroadcastSubjectChange" | "broadcastMessage" | "onBroadcastMessageChange"
  | "isSendingBroadcast" | "onSendParticipantBroadcast" | "newsletterSubscribers" | "isLoadingNewsletter"
  | "judgeInviteLabel" | "onJudgeInviteLabelChange" | "judgeInviteHackathonIds" | "onToggleJudgeInviteHackathon"
  | "judgeInviteUrl" | "judgeInviteMessage" | "isCreatingJudgeInvite" | "onCreateJudgeInvite"
> & { insights: ReactNode };

const views = [
  { value: "directory", label: "Directory", hash: "manage-all-users", icon: Users },
  { value: "requests", label: "Requests", hash: "manage-judge-approvals", icon: ShieldCheck },
  { value: "invites", label: "Invite & access", hash: "judge-invites", icon: UserPlus },
  { value: "teams", label: "Teams", hash: "event-teams", icon: Users },
  { value: "messages", label: "Messages", hash: "newsletter", icon: Mail },
  { value: "insights", label: "Insights", hash: "audience-analytics", icon: Activity },
] as const;

function viewForHash(hash: string) {
  if (["manage-judge-approvals", "manage-judge-pending"].includes(hash)) return "requests";
  if (["judge-invites", "grant-admin-access"].includes(hash)) return "invites";
  if (hash === "event-teams") return "teams";
  if (["newsletter", "participant-broadcast"].includes(hash)) return "messages";
  if (["audience-analytics", "host-analytics"].includes(hash)) return "insights";
  return "directory";
}

export function AdminPeopleWorkspace(props: Props) {
  const location = useLocation();
  const navigate = useNavigate();
  const hash = location.hash.slice(1);
  const activeView = viewForHash(hash);
  const [revealedGrant, setRevealedGrant] = useState<string | null>(null);
  const { selectedHackathon, hackathons = [], users, hostAccounts, judgeAccounts } = props;
  // Event participants plus the staff accounts administrators can assign to this event.
  const people = [...new Map([...hostAccounts, ...judgeAccounts, ...users].map(user => [user.id, user])).values()];
  const pending = people.filter(user =>
    user.role === "host" ? user.hostApprovalStatus !== "approved"
      : (user.role === "judge" || user.role === "mentor") && user.judgeApprovalStatus !== "approved",
  );
  const initialFilter: AdminPeopleFilter = hash === "manage-participants" ? "participant"
    : hash === "manage-judges" ? "staff" : hash === "manage-hosts" ? "host" : "all";
  const goTo = (nextHash: string) => navigate({ pathname: location.pathname, search: location.search, hash: nextHash });
  const directoryProps = {
    users: people, hackathons, selectedHackathon, isLoading: props.isLoadingUsers,
    savingUserId: props.savingUserId, pendingRoles: props.pendingRoles,
    onRoleChange: props.onRoleChange, onSaveRole: props.onSaveRole,
    onApproveJudge: props.onApproveJudge, onRejectJudge: props.onRejectJudge,
    onApproveHost: props.onApproveHost, onUpdateHackathonAccess: props.onUpdateHackathonAccess,
    message: props.message,
  };
  const showAdmin = hash === "grant-admin-access";
  const showBroadcast = hash === "participant-broadcast";

  return (
    <div className="space-y-6" aria-label="People workspace">
      <section className={sectionClass}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-2xl">
            <p className="dash-eyebrow">{selectedHackathon.shortName} / People</p>
            <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight sm:text-3xl">People &amp; access</h2>
            <p className="dash-subtitle mt-2">Find a person, review their details, and manage their access.</p>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link to={withHackathonQuery("/dashboard/admin", selectedHackathon.id)}>Overview <ArrowUpRight className="ml-2 h-4 w-4" /></Link>
          </Button>
        </div>
        <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 border-t border-border pt-3">
          {[
            { label: "Event participants", count: users.filter(user => user.role === "participant").length },
            { label: "Awaiting approval", count: pending.length },
            { label: "Event teams", count: props.submissions.length },
          ].map(item => <div key={item.label} className="flex items-baseline gap-2">
            <p className="font-medium tabular-nums text-foreground">{props.isLoadingUsers || props.isLoadingSubmissions ? "—" : item.count}</p>
            <p className="text-xs text-muted-foreground">{item.label}</p>
          </div>)}
        </div>
      </section>

      <Tabs value={activeView} onValueChange={value => goTo(views.find(view => view.value === value)!.hash)}>
        <TabsList aria-label="People workspace views" className="mb-4 grid w-full grid-cols-2 gap-1 p-1.5 sm:grid-cols-3 xl:grid-cols-6">
          {views.map(({ value, label, icon: Icon }) => <TabsTrigger key={value} value={value} className="gap-2 py-2.5">
            <Icon className="h-4 w-4" aria-hidden />{label}
            {value === "requests" && pending.length > 0 && <span className="rounded-full bg-primary/15 px-1.5 text-xs tabular-nums text-primary">{pending.length}</span>}
          </TabsTrigger>)}
        </TabsList>
        {props.message && <p role="status" className="dash-message mb-4">{props.message}</p>}

        <TabsContent value="directory" className="space-y-3">
          <p className="px-1 text-sm text-muted-foreground">Participants in {selectedHackathon.shortName}, plus hosts, judges, and mentors across the platform. Contact details open only when you select a person.</p>
          <div id={["manage-participants", "manage-judges", "manage-hosts"].includes(hash) ? hash : "manage-all-users"}>
            <AdminPeopleDirectory key={selectedHackathon.id} {...directoryProps} initialFilter={initialFilter} />
          </div>
        </TabsContent>

        <TabsContent value="requests" className="space-y-3">
          <p className="px-1 text-sm text-muted-foreground">Review one request at a time. Judge approvals grant access to {selectedHackathon.shortName}; host approvals allow the organiser to manage their own events.</p>
          <div id={hash === "manage-judge-pending" ? hash : "manage-judge-approvals"}>
            <AdminPeopleDirectory key={selectedHackathon.id} {...directoryProps} users={pending} initialFilter="pending" />
          </div>
        </TabsContent>

        <TabsContent value="invites" className="space-y-4">
          <div className="flex flex-wrap gap-2" aria-label="Invitation type">
            <Button variant={showAdmin ? "outline" : "default"} aria-pressed={!showAdmin} onClick={() => goTo("judge-invites")}>Invite judges</Button>
            <Button variant={showAdmin ? "default" : "outline"} aria-pressed={showAdmin} onClick={() => goTo("grant-admin-access")}>Admin access</Button>
          </div>
          {showAdmin ? <section className={sectionClass} id="grant-admin-access">
            <p className="dash-eyebrow">Platform access</p>
            <h2 className="dash-title">Invite an administrator</h2>
            <p className="dash-subtitle">Administrators can manage people and all events. Enter the exact email of the person who needs this access.</p>
            <form className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-end" onSubmit={event => { event.preventDefault(); if (!props.isGrantingAdmin && props.adminGrantEmail.trim()) void props.onGrantAdminAccess(); }}>
              <div className="flex-1 space-y-2">
                <label htmlFor="admin-grant-email" className="text-sm font-medium">Email address</label>
                <Input required id="admin-grant-email" type="email" autoComplete="off" placeholder="organizer@example.com" value={props.adminGrantEmail} onChange={event => props.onAdminGrantEmailChange(event.target.value)} />
              </div>
              <Button type="submit" disabled={props.isGrantingAdmin || !props.adminGrantEmail.trim()}>{props.isGrantingAdmin ? "Granting…" : "Grant admin access"}</Button>
            </form>
            {props.pendingAdminGrants.length > 0 && <details className="mt-6 rounded-xl border border-border p-4">
              <summary className="cursor-pointer text-sm font-medium">Pending invitations ({props.pendingAdminGrants.length})</summary>
              <ul className="mt-3 max-h-64 space-y-2 overflow-y-auto">
                {props.pendingAdminGrants.map((grant, index) => <li key={grant.email} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-muted/20 p-3 text-sm">
                  <span className="break-all">{revealedGrant === grant.email ? grant.email : `Administrator invitation ${index + 1}`}</span>
                  <Button size="sm" variant="ghost" onClick={() => setRevealedGrant(revealedGrant === grant.email ? null : grant.email)}>{revealedGrant === grant.email ? "Hide email" : "View email"}</Button>
                </li>)}
              </ul>
            </details>}
          </section> : props.onCreateJudgeInvite && props.onToggleJudgeInviteHackathon && props.onJudgeInviteLabelChange ? <JudgeInvitePanel
            hackathons={hackathons} selectedHackathonIds={props.judgeInviteHackathonIds ?? []}
            onToggleHackathon={props.onToggleJudgeInviteHackathon} label={props.judgeInviteLabel ?? ""}
            onLabelChange={props.onJudgeInviteLabelChange} inviteUrl={props.judgeInviteUrl}
            isBusy={props.isCreatingJudgeInvite ?? false} message={props.judgeInviteMessage}
            onGenerate={props.onCreateJudgeInvite}
          /> : <p className="dash-empty">Judge invitations are unavailable in this workspace.</p>}
        </TabsContent>

        <TabsContent value="teams">
          <AdminTeamsPanel key={selectedHackathon.id} selectedHackathon={selectedHackathon} submissions={props.submissions} isLoading={props.isLoadingSubmissions} publishingSubmissionId={props.publishingSubmissionId} onSetSubmissionPublic={props.onSetSubmissionPublic} />
        </TabsContent>

        <TabsContent value="messages" className="space-y-4">
          <div className="flex flex-wrap gap-2" aria-label="Messaging tools">
            <Button variant={showBroadcast ? "outline" : "default"} aria-pressed={!showBroadcast} onClick={() => goTo("newsletter")}>Subscribers</Button>
            <Button variant={showBroadcast ? "default" : "outline"} aria-pressed={showBroadcast} onClick={() => goTo("participant-broadcast")}>Email participants</Button>
          </div>
          {showBroadcast ? <section className={sectionClass} id="participant-broadcast">
            <p className="dash-eyebrow">Event announcement</p>
            <h2 className="dash-title">Email participants</h2>
            <p className="dash-subtitle">Send an update to all participants registered for {selectedHackathon.name}.</p>
            <form className="mt-6 space-y-4" onSubmit={event => { event.preventDefault(); if (!props.isSendingBroadcast && props.broadcastSubject.trim() && props.broadcastMessage.trim()) void props.onSendParticipantBroadcast(); }}>
              <div className="space-y-2"><label htmlFor="participant-broadcast-subject" className="text-sm font-medium">Subject</label>
                <Input required id="participant-broadcast-subject" value={props.broadcastSubject} onChange={event => props.onBroadcastSubjectChange(event.target.value)} placeholder="Submission reminder" /></div>
              <div className="space-y-2"><label htmlFor="participant-broadcast-message" className="text-sm font-medium">Message</label>
                <Textarea required id="participant-broadcast-message" value={props.broadcastMessage} onChange={event => props.onBroadcastMessageChange(event.target.value)} rows={6} placeholder="Write your update…" /></div>
              <Button type="submit" disabled={props.isSendingBroadcast || !props.broadcastSubject.trim() || !props.broadcastMessage.trim()}>{props.isSendingBroadcast ? "Sending…" : "Send announcement"}</Button>
            </form>
          </section> : <AdminNewsletterPanel subscribers={props.newsletterSubscribers ?? []} isLoading={props.isLoadingNewsletter ?? false} />}
        </TabsContent>
        <TabsContent value="insights" className="space-y-6">{props.insights}</TabsContent>
      </Tabs>
    </div>
  );
}
