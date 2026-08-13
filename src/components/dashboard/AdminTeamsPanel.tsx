import { useMemo, useState } from "react";
import { Crown, Mail, Search, Users } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { sectionClass } from "@/components/dashboard/DashboardLayout";
import type { PortalHackathon } from "@/lib/hackathons";
import { matchesSearchQuery } from "@/lib/submissionSearch";
import type { AdminTeamMemberView } from "@/lib/teamRoster";

export type AdminTeamRow = {
  id: string;
  title: string | null;
  teamName: string | null;
  participantEmail: string;
  teamLeaderName: string | null;
  teamLeaderEmail: string | null;
  memberCount: number;
  members: AdminTeamMemberView[];
  extraMemberNames: string[];
};

type AdminTeamsPanelProps = {
  selectedHackathon: PortalHackathon;
  submissions: AdminTeamRow[];
  isLoading: boolean;
};

const getInitials = (name: string) => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
};

export function AdminTeamsPanel({
  selectedHackathon,
  submissions,
  isLoading,
}: AdminTeamsPanelProps) {
  const [query, setQuery] = useState("");
  const totalMembers = submissions.reduce((sum, row) => sum + row.memberCount, 0);
  const namedTeams = submissions.filter((row) => row.teamName?.trim()).length;

  const filtered = useMemo(() => {
    if (!query.trim()) return submissions;
    return submissions.filter((row) =>
      matchesSearchQuery(query, [
        row.teamName,
        row.title,
        row.participantEmail,
        row.teamLeaderName,
        row.teamLeaderEmail,
        ...row.members.map((member) => member.name),
        ...row.members.map((member) => member.email),
        ...row.extraMemberNames,
      ])
    );
  }, [query, submissions]);

  return (
    <section className={sectionClass} id="event-teams" aria-labelledby="event-teams-heading">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4 border-b border-white/10 pb-4">
        <div className="flex min-w-0 items-start gap-3">
          <span className="dash-icon-chip dash-icon-chip--violet" aria-hidden>
            <Users className="h-4 w-4" />
          </span>
          <div>
            <p className="dash-eyebrow">Team roster</p>
            <h2 id="event-teams-heading" className="dash-title">
              Teams
            </h2>
            <p className="dash-subtitle">
              Name, leader, and members for every project in {selectedHackathon.shortName}.
            </p>
          </div>
        </div>
        <Badge variant="secondary" className="uppercase tracking-[0.12em]">
          {submissions.length} team{submissions.length === 1 ? "" : "s"}
        </Badge>
      </div>

      <div className="dash-stat-grid mb-5 grid gap-2 sm:grid-cols-3 sm:gap-3">
        <div className="dash-stat-tile dash-stat-tile--highlight">
          <p className="dash-stat-value">{isLoading ? "—" : String(submissions.length)}</p>
          <p className="dash-stat-label">Projects</p>
        </div>
        <div className="dash-stat-tile">
          <p className="dash-stat-value">{isLoading ? "—" : String(totalMembers)}</p>
          <p className="dash-stat-label">Builders</p>
        </div>
        <div className="dash-stat-tile">
          <p className="dash-stat-value">{isLoading ? "—" : String(namedTeams)}</p>
          <p className="dash-stat-label">Named teams</p>
        </div>
      </div>

      {submissions.length > 0 ? (
        <div className="relative mb-5 max-w-lg">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search team, member, email, or project…"
          />
        </div>
      ) : null}

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading teams…</p>
      ) : submissions.length === 0 ? (
        <p className="dash-empty">No teams yet for {selectedHackathon.name}.</p>
      ) : filtered.length === 0 ? (
        <p className="dash-empty">No teams match your search.</p>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {filtered.map((row) => (
            <article
              key={row.id}
              className="space-y-4 rounded-2xl border border-white/10 bg-background/40 p-4 sm:p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-display text-lg font-semibold text-foreground">
                    {row.teamName?.trim() || "Unnamed team"}
                  </p>
                  <p className="mt-1 truncate text-sm text-muted-foreground">
                    {row.title?.trim() || "Untitled project"}
                  </p>
                </div>
                <Badge variant="outline" className="shrink-0 uppercase tracking-[0.12em]">
                  {row.memberCount} {row.memberCount === 1 ? "member" : "members"}
                </Badge>
              </div>

              <p className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                <Crown className="h-3.5 w-3.5 text-amber-200" />
                Leader: {row.teamLeaderName || row.participantEmail}
              </p>

              <ul className="space-y-2">
                {row.members.map((member) => (
                  <li
                    key={`${row.id}-${member.user_id}`}
                    className="flex items-start gap-3 rounded-xl border border-white/10 bg-black/15 px-3 py-2.5"
                  >
                    <Avatar className="h-9 w-9 rounded-full border border-primary/25">
                      {member.avatarUrl?.trim() ? (
                        <AvatarImage
                          src={member.avatarUrl.trim()}
                          alt={member.name}
                          className="object-cover"
                        />
                      ) : null}
                      <AvatarFallback className="bg-primary/15 text-[10px] font-semibold text-primary">
                        {getInitials(member.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="flex flex-wrap items-center gap-2 font-medium text-foreground">
                        <span className="truncate">{member.name}</span>
                        {member.isLeader ? (
                          <span className="inline-flex items-center gap-1 rounded-full border border-amber-400/30 bg-amber-400/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-200">
                            <Crown className="h-3 w-3" />
                            Leader
                          </span>
                        ) : null}
                        {member.isOwner && !member.isLeader ? (
                          <span className="rounded-full border border-white/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                            Creator
                          </span>
                        ) : null}
                      </p>
                      {member.headline ? (
                        <p className="truncate text-xs text-muted-foreground">{member.headline}</p>
                      ) : null}
                      {member.email ? (
                        <a
                          href={`mailto:${member.email}`}
                          className="mt-0.5 inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
                        >
                          <Mail className="h-3 w-3" />
                          {member.email}
                        </a>
                      ) : null}
                    </div>
                  </li>
                ))}
                {row.extraMemberNames.map((name) => (
                  <li
                    key={`${row.id}-named-${name}`}
                    className="rounded-xl border border-dashed border-white/10 bg-black/10 px-3 py-2 text-sm text-muted-foreground"
                  >
                    {name} · listed on submission
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
