import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowUpRight, ChevronLeft, ChevronRight, Search, ShieldCheck, Users } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import ActivityIndicator from "@/components/ActivityIndicator";
import type { AdminUser } from "@/components/dashboard/AdminDashboard";
import type { HackathonId, PortalHackathon } from "@/lib/hackathons";
import type { PortalRole } from "@/types/portal";
import "./admin-people-directory.css";

export type AdminPeopleFilter = "all" | "participant" | "staff" | "host" | "pending";

type Props = {
  users: AdminUser[];
  hackathons: PortalHackathon[];
  selectedHackathon: PortalHackathon;
  isLoading: boolean;
  savingUserId: string | null;
  pendingRoles: Record<string, PortalRole>;
  onRoleChange: (userId: string, role: PortalRole) => void;
  onSaveRole: (user: AdminUser) => Promise<void>;
  onApproveJudge: (user: AdminUser) => Promise<void>;
  onRejectJudge: (user: AdminUser) => Promise<void>;
  onApproveHost: (user: AdminUser) => Promise<void>;
  onUpdateHackathonAccess: (user: AdminUser, ids: HackathonId[]) => Promise<void>;
  initialFilter?: AdminPeopleFilter;
  message?: string | null;
};

const PAGE_SIZE = 8;
const isStaff = (user: AdminUser) => user.role === "judge" || user.role === "mentor";
const needsApproval = (user: AdminUser) =>
  (isStaff(user) && user.judgeApprovalStatus !== "approved") ||
  (user.role === "host" && user.hostApprovalStatus !== "approved");
const personName = (user: AdminUser) => user.profile?.fullName?.trim() || "Unnamed user";
const grantedIds = (user: AdminUser) => [...new Set(user.hackathonIds ?? (user.hackathonId ? [user.hackathonId] : []))];
const accessKey = (ids: string[]) => [...ids].sort().join("\u0000");

function PersonAvatar({ user }: { user: AdminUser }) {
  const initials = user.profile?.fullName?.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join("");
  return (
    <Avatar className="people-directory__avatar">
      {user.profile?.avatarUrl?.trim() ? <AvatarImage src={user.profile.avatarUrl.trim()} alt="" /> : null}
      <AvatarFallback>{initials || <Users className="h-4 w-4" aria-hidden="true" />}</AvatarFallback>
    </Avatar>
  );
}

function safeLink(value?: string | null) {
  if (!value?.trim()) return null;
  try {
    const url = new URL(value.trim());
    return url.protocol === "https:" || url.protocol === "http:" ? url.href : null;
  } catch {
    return null;
  }
}

function PersonDetails({ user, ...props }: Omit<Props, "users" | "isLoading" | "initialFilter"> & { user: AdminUser }) {
  const currentAccessKey = accessKey(grantedIds(user));
  const [draftIds, setDraftIds] = useState(() => grantedIds(user));
  const [accessSaving, setAccessSaving] = useState(false);
  const [accessError, setAccessError] = useState<string | null>(null);
  const busy = props.savingUserId === user.id || accessSaving;
  const selectedRole = props.pendingRoles[user.id] ?? user.role;
  const profile = user.profile;
  const application = user.hostApplication;
  const availableEvents = [...props.hackathons];
  for (const id of grantedIds(user)) {
    if (!availableEvents.some((event) => event.id === id)) {
      availableEvents.push({ ...props.selectedHackathon, id, name: id, shortName: id });
    }
  }
  const github = profile?.githubProfileUrl || (profile?.githubUsername?.trim()
    ? `https://github.com/${profile.githubUsername.trim().replace(/^@/, "")}` : null);
  const links = [
    { label: "GitHub", href: safeLink(github) },
    { label: "LinkedIn", href: safeLink(profile?.linkedinUrl) },
    { label: "Portfolio", href: safeLink(profile?.portfolioUrl) },
    { label: "X", href: safeLink(profile?.xUrl) },
  ].filter((link) => link.href);

  useEffect(() => {
    setDraftIds(currentAccessKey ? currentAccessKey.split("\u0000") : []);
    setAccessError(null);
  }, [currentAccessKey]);

  async function saveAccess() {
    setAccessSaving(true);
    setAccessError(null);
    try {
      await props.onUpdateHackathonAccess(user, draftIds);
    } catch (error) {
      setAccessError(error instanceof Error ? error.message : "Event access could not be saved. Please try again.");
    } finally {
      setAccessSaving(false);
    }
  }

  return (
    <div className="people-detail">
      <DialogHeader className="people-detail__header">
        <PersonAvatar user={user} />
        <div className="min-w-0">
          <p className="people-directory__eyebrow">Person & access</p>
          <DialogTitle>{personName(user)}</DialogTitle>
          <DialogDescription>Review this account before changing its permissions.</DialogDescription>
        </div>
      </DialogHeader>

      {props.message ? <p role="status" className="people-detail__notice">{props.message}</p> : null}

      <section className="people-detail__section" aria-label="Profile details">
        <div className="people-detail__section-heading"><h3>Profile</h3><Badge variant="outline" className="capitalize">{user.role}</Badge></div>
        <a className="people-detail__email" href={`mailto:${user.email}`}>{user.email || "Email unavailable"}</a>
        <p className="people-detail__account">Account {user.id}</p>
        {profile?.headline ? <p className="mt-3 text-sm">{profile.headline}</p> : null}
        <dl className="people-detail__facts">
          {[
            ["Organization", profile?.organization], ["Location", profile?.location],
            ["Public role", profile?.publicRole], ["Experience", profile?.experienceLevel],
            ["Timezone", profile?.timezone], ["Skills", profile?.skills],
            ["Looking for", profile?.lookingFor], ["Discord", profile?.discordHandle],
          ].filter(([, value]) => value?.trim()).map(([label, value]) => (
            <div key={label}><dt>{label}</dt><dd>{value}</dd></div>
          ))}
        </dl>
        {profile?.bio ? <p className="people-detail__bio">{profile.bio}</p> : null}
        {links.length > 0 ? <div className="people-detail__links">{links.map((link) => (
          <a key={link.label} href={link.href!} target="_blank" rel="noreferrer">{link.label}<ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" /></a>
        ))}</div> : null}
      </section>

      {user.role === "host" && application ? (
        <details className="people-detail__section" open={needsApproval(user)}>
          <summary className="people-detail__summary">Host application · {application.eventName || "Event proposal"}</summary>
          <dl className="people-detail__facts">
            {[
              ["Host role", application.organizerTitle], ["Event", application.eventName],
              ["Type", application.eventType], ["Format", application.format],
              ["Audience", application.audience], ["Target date", application.targetDate],
              ["Duration", application.duration], ["Expected attendees", application.expectedAttendees],
              ["Location", application.location], ["Timezone", application.timezone],
            ].filter(([, value]) => value).map(([label, value]) => (
              <div key={label}><dt>{label}</dt><dd>{value}</dd></div>
            ))}
          </dl>
          {[
            ["Theme", application.theme], ["Goals", application.goals],
            ["Success definition", application.successDefinition], ["Support requested", application.supportNeeded],
            ["Previous experience", application.experience],
          ].filter(([, value]) => value).map(([label, value]) => (
            <div key={label} className="mt-4"><p className="people-directory__eyebrow">{label}</p><p className="people-detail__bio">{value}</p></div>
          ))}
          {safeLink(application.website) ? <a className="people-detail__email" href={safeLink(application.website)!} target="_blank" rel="noreferrer">Host website ↗</a> : null}
        </details>
      ) : null}

      {needsApproval(user) ? (
        <section className="people-detail__section people-detail__approval" aria-label="Approval request">
          <h3>Approval needed</h3>
          <p>{user.role === "host" ? "Approve this organizer to let them create and manage their own events." : `Approve this ${user.role} and grant access to ${props.selectedHackathon.shortName}, keeping their existing event assignments. Rejecting changes the account to a participant.`}</p>
          <div className="people-detail__actions">
            <Button disabled={busy} onClick={() => void (user.role === "host" ? props.onApproveHost(user) : props.onApproveJudge(user))}>
              <ShieldCheck className="mr-2 h-4 w-4" aria-hidden="true" />{user.role === "host" ? "Approve host" : `Approve for ${props.selectedHackathon.shortName}`}
            </Button>
            {isStaff(user) ? <Button variant="outline" disabled={busy} onClick={() => void props.onRejectJudge(user)}>Convert to participant</Button> : null}
          </div>
        </section>
      ) : null}

      <section className="people-detail__section" aria-label="Account permissions">
        <h3>Account role</h3>
        <p className="people-detail__hint">Choose the account's responsibilities, then save the change.</p>
        <div className="people-detail__role">
          <select aria-label="Account role" value={selectedRole} disabled={busy} onChange={(event) => props.onRoleChange(user.id, event.target.value as PortalRole)}>
            {(["participant", "mentor", "judge", "host", "admin"] as const).map((role) => <option key={role} value={role}>{role[0].toUpperCase() + role.slice(1)}</option>)}
          </select>
          <Button variant="outline" disabled={busy || selectedRole === user.role} onClick={() => void props.onSaveRole(user)}>Save role</Button>
        </div>
      </section>

      <section className="people-detail__section" aria-label="Event access permissions">
        <div className="people-detail__section-heading"><h3>Event access</h3><Badge variant="outline">{user.role === "admin" ? "All events" : `${grantedIds(user).length} assigned`}</Badge></div>
        {isStaff(user) ? <>
          <p className="people-detail__hint">Select the events this {user.role} can access. Changes apply when you save.</p>
          <div className="people-detail__events">
            {availableEvents.map((event) => (
              <label key={event.id} className="people-detail__event">
                <Checkbox checked={draftIds.includes(event.id)} disabled={busy} onCheckedChange={(checked) => {
                  setDraftIds((current) => checked ? [...current.filter((id) => id !== event.id), event.id] : current.filter((id) => id !== event.id));
                  setAccessError(null);
                }} />
                <span>{event.name}{event.id === props.selectedHackathon.id ? <small>Current event</small> : null}</span>
              </label>
            ))}
            {availableEvents.length === 0 ? <p className="people-detail__hint">No events are available to assign yet.</p> : null}
          </div>
          {accessError ? <p role="alert" className="text-sm text-destructive">{accessError}</p> : null}
          <div className="people-detail__actions">
            <Button disabled={busy || accessKey(draftIds) === currentAccessKey} onClick={() => void saveAccess()}>{busy ? "Saving…" : "Save access"}</Button>
            {accessKey(draftIds) !== currentAccessKey ? <Button variant="ghost" disabled={busy} onClick={() => setDraftIds(grantedIds(user))}>Discard changes</Button> : null}
          </div>
        </> : <p className="people-detail__hint">{user.role === "admin" ? "Administrators can manage all events." : user.role === "host" ? "Hosts manage events they own. Event assignments are available for judges and mentors." : (grantedIds(user).length ? `Registered event: ${grantedIds(user).map((id) => props.hackathons.find((event) => event.id === id)?.name || id).join(", ")}.` : "No event registration on this account.")}</p>}
      </section>
    </div>
  );
}

export function AdminPeopleDirectory({ initialFilter = "all", ...props }: Props) {
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>(initialFilter === "pending" ? "all" : initialFilter);
  const [statusFilter, setStatusFilter] = useState(initialFilter === "pending" ? "pending" : "all");
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const detailTrigger = useRef<HTMLButtonElement | null>(null);
  const detailPanel = useRef<HTMLDivElement | null>(null);
  const selectedPerson = props.users.find((user) => user.id === selectedId);

  useEffect(() => {
    setQuery("");
    setRoleFilter(initialFilter === "pending" ? "all" : initialFilter);
    setStatusFilter(initialFilter === "pending" ? "pending" : "all");
    setPage(1);
    setSelectedId(null);
  }, [initialFilter, props.selectedHackathon.id]);

  const filtered = useMemo(() => {
    const search = query.trim().toLowerCase();
    return props.users.filter((user) => {
      const roleMatches = roleFilter === "all" || (roleFilter === "staff" ? isStaff(user) : user.role === roleFilter);
      const statusMatches = statusFilter === "all" || (statusFilter === "pending" ? needsApproval(user) : !needsApproval(user));
      return roleMatches && statusMatches && (!search || [user.profile?.fullName, user.email, user.profile?.organization, user.id].some((text) => text?.toLowerCase().includes(search)));
    }).sort((a, b) => personName(a).localeCompare(personName(b)) || a.id.localeCompare(b.id));
  }, [props.users, query, roleFilter, statusFilter]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const visiblePeople = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  return (
    <section className="people-directory" aria-label="People directory">
      <div className="people-directory__toolbar">
        <div className="people-directory__search"><Search className="h-4 w-4" aria-hidden="true" /><Input aria-label="Search people" placeholder="Search by name or email" value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }} /></div>
        <label className="people-directory__filter"><span>Role</span><select aria-label="Filter people by role" value={roleFilter} onChange={(event) => { setRoleFilter(event.target.value); setPage(1); }}>
          <option value="all">All roles</option><option value="participant">Participants</option><option value="staff">Judges & mentors</option><option value="host">Hosts</option><option value="admin">Admins</option>
        </select></label>
        <label className="people-directory__filter"><span>Status</span><select aria-label="Filter people by status" value={statusFilter} onChange={(event) => { setStatusFilter(event.target.value); setPage(1); }}>
          <option value="all">All statuses</option><option value="pending">Needs approval</option><option value="active">Active / approved</option>
        </select></label>
      </div>
      <div className="people-directory__guide"><p>Open one person to review their profile and manage access.</p><span>{filtered.length} {filtered.length === 1 ? "person" : "people"}</span></div>

      {props.isLoading ? <div className="people-directory__empty"><ActivityIndicator label="Loading people" /></div> : filtered.length === 0 ? (
        <div className="people-directory__empty"><Users className="h-6 w-6" aria-hidden="true" /><h3>No people found</h3><p>{query || roleFilter !== "all" || statusFilter !== "all" ? "Try another name or adjust the filters." : "Accounts will appear here when people join."}</p>{query || roleFilter !== "all" || statusFilter !== "all" ? <Button variant="outline" onClick={() => { setQuery(""); setRoleFilter("all"); setStatusFilter("all"); setPage(1); }}>Clear filters</Button> : null}</div>
      ) : <>
        <div className="people-directory__head" aria-hidden="true"><span>Person</span><span>Role & status</span><span>Access</span><span /></div>
        <ul className="people-directory__list">
          {visiblePeople.map((user) => (
            <li key={user.id} className="people-directory__row">
              <div className="people-directory__identity"><PersonAvatar user={user} /><div><h3>{personName(user)}</h3><p>{user.profile?.organization?.trim() || user.profile?.headline?.trim() || `Account ${user.id.slice(0, 8)}`}</p></div></div>
              <div className="people-directory__role"><span>{user.role}</span><small className={needsApproval(user) ? "people-directory__pending" : ""}>{needsApproval(user) ? "Needs approval" : isStaff(user) || user.role === "host" ? "Approved" : "Active"}</small></div>
              <p className="people-directory__access">{user.role === "admin" ? "All events" : user.role === "host" ? "Own events" : `${grantedIds(user).length} ${grantedIds(user).length === 1 ? "event" : "events"}`}</p>
              <Button className="people-directory__manage" variant="outline" size="sm" aria-label={`Manage ${personName(user)}${user.profile?.fullName?.trim() ? "" : ` (${user.id.slice(0, 8)})`}`} onClick={(event) => { detailTrigger.current = event.currentTarget; setSelectedId(user.id); }}>Manage<ChevronRight className="h-3.5 w-3.5" aria-hidden="true" /></Button>
            </li>
          ))}
        </ul>
        <div className="people-directory__pagination"><p aria-live="polite">Showing {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, filtered.length)} of {filtered.length}</p><div><Button variant="ghost" size="sm" aria-label="Previous people page" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}><ChevronLeft className="h-4 w-4" /></Button><span>Page {currentPage} of {totalPages}</span><Button variant="ghost" size="sm" aria-label="Next people page" disabled={currentPage === totalPages} onClick={() => setPage(currentPage + 1)}><ChevronRight className="h-4 w-4" /></Button></div></div>
      </>}

      <Dialog open={Boolean(selectedPerson)} onOpenChange={(open) => { if (!open) setSelectedId(null); }}>
        {selectedPerson ? <DialogContent ref={detailPanel} tabIndex={-1} className="people-detail-dialog" onOpenAutoFocus={(event) => { event.preventDefault(); detailPanel.current?.focus(); }} onCloseAutoFocus={(event) => { event.preventDefault(); detailTrigger.current?.focus(); }}>
          <PersonDetails key={`${selectedPerson.id}:${props.selectedHackathon.id}`} {...props} user={selectedPerson} />
        </DialogContent> : null}
      </Dialog>
    </section>
  );
}
