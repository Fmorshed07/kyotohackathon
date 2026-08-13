import type { Submission, TeamMemberRecord, UserProfile } from "@/types/portal";

export type TeamRosterEntry = {
  user_id: string;
  name: string;
  email: string;
  joined_at?: string;
  isOwner: boolean;
  isLeader: boolean;
  isYou: boolean;
  profile?: UserProfile | null;
};

export const parseMemberNameList = (raw: string | null | undefined) =>
  (raw ?? "")
    .split(/[\n,;]+/)
    .map((name) => name.trim())
    .filter(Boolean);

const uniquePreserveOrder = (values: string[]) => {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    const key = value.trim().toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    result.push(value.trim());
  }
  return result;
};

export const isSubmissionCollaborator = (submission: Pick<Submission, "user_id" | "member_user_ids">, userId: string) =>
  Boolean(userId) &&
  (submission.user_id === userId || Boolean(submission.member_user_ids?.includes(userId)));

export const getTeamLeaderId = (submission: Pick<Submission, "user_id" | "team_leader_id">) =>
  submission.team_leader_id?.trim() || submission.user_id;

export const collectTeamDisplayNames = (
  submission: Pick<Submission, "member_names" | "member_name_list" | "team_members">
) =>
  uniquePreserveOrder([
    ...(submission.member_name_list ?? []),
    ...(submission.team_members ?? []).map((member) => member.name),
    ...parseMemberNameList(submission.member_names),
  ]);

export const formatTeamMemberNames = (
  submission: Pick<Submission, "member_names" | "member_name_list" | "team_members">
) => collectTeamDisplayNames(submission).join("\n");

export const countTeamBuilders = (
  submission: Pick<Submission, "user_id" | "member_names" | "member_name_list" | "team_members" | "member_user_ids">
) => {
  const named = collectTeamDisplayNames(submission).length;
  const linked = new Set(submission.member_user_ids ?? []);
  if (submission.user_id) linked.add(submission.user_id);
  for (const member of submission.team_members ?? []) {
    if (member.user_id) linked.add(member.user_id);
  }
  return Math.max(named, linked.size, 1);
};

export function buildTeamRoster(input: {
  owner: { user_id: string; name: string; email: string; profile?: UserProfile | null };
  linkedMembers: TeamMemberRecord[];
  teamLeaderId?: string | null;
  currentUserId?: string;
  profiles?: Record<string, UserProfile | null | undefined>;
}): TeamRosterEntry[] {
  const leaderId = input.teamLeaderId?.trim() || input.owner.user_id;
  const byId = new Map<string, TeamRosterEntry>();
  const liveProfile = (userId: string, fallback?: UserProfile | null) =>
    input.profiles?.[userId] ?? fallback ?? null;

  byId.set(input.owner.user_id, {
    user_id: input.owner.user_id,
    name:
      liveProfile(input.owner.user_id, input.owner.profile)?.fullName?.trim() ||
      input.owner.name.trim() ||
      input.owner.email.split("@")[0] ||
      "Team creator",
    email: input.owner.email,
    isOwner: true,
    isLeader: input.owner.user_id === leaderId,
    isYou: input.currentUserId === input.owner.user_id,
    profile: liveProfile(input.owner.user_id, input.owner.profile),
  });

  for (const member of input.linkedMembers) {
    if (!member.user_id || member.user_id === input.owner.user_id) continue;
    const profile = liveProfile(member.user_id, member.profile);
    byId.set(member.user_id, {
      user_id: member.user_id,
      name: profile?.fullName?.trim() || member.name.trim() || member.email.split("@")[0] || "Teammate",
      email: member.email,
      joined_at: member.joined_at,
      isOwner: false,
      isLeader: member.user_id === leaderId,
      isYou: input.currentUserId === member.user_id,
      profile,
    });
  }

  const roster = Array.from(byId.values());
  return roster.sort((left, right) => {
    if (left.isOwner !== right.isOwner) return left.isOwner ? -1 : 1;
    if (left.isLeader !== right.isLeader) return left.isLeader ? -1 : 1;
    return left.name.localeCompare(right.name);
  });
}

export const rosterDisplayNames = (roster: TeamRosterEntry[]) =>
  uniquePreserveOrder(roster.map((entry) => entry.name));

export type AdminTeamMemberView = {
  user_id: string;
  name: string;
  email: string;
  isOwner: boolean;
  isLeader: boolean;
  avatarUrl?: string | null;
  headline?: string | null;
};

export type AdminTeamDetails = {
  teamName: string;
  leaderName: string;
  leaderEmail: string;
  members: AdminTeamMemberView[];
  extraMemberNames: string[];
  memberCount: number;
};

export function buildAdminTeamDetails(input: {
  submission: Pick<
    Submission,
    | "user_id"
    | "team_name"
    | "owner_name"
    | "owner_email"
    | "team_leader_id"
    | "team_members"
    | "member_names"
    | "member_name_list"
  >;
  ownerEmail?: string;
  ownerName?: string;
  ownerProfile?: UserProfile | null;
  memberProfiles?: Record<string, UserProfile | null | undefined>;
}): AdminTeamDetails {
  const ownerEmail =
    input.submission.owner_email?.trim() || input.ownerEmail?.trim() || "";
  const ownerName =
    input.ownerProfile?.fullName?.trim() ||
    input.submission.owner_name?.trim() ||
    input.ownerName?.trim() ||
    ownerEmail.split("@")[0] ||
    "Team creator";
  const roster = buildTeamRoster({
    owner: {
      user_id: input.submission.user_id,
      name: ownerName,
      email: ownerEmail,
      profile: input.ownerProfile,
    },
    linkedMembers: input.submission.team_members ?? [],
    teamLeaderId: getTeamLeaderId(input.submission),
    profiles: input.memberProfiles,
  });
  const extraMemberNames = collectTeamDisplayNames(input.submission).filter((name) => {
    const key = name.trim().toLowerCase();
    if (!key) return false;
    return !roster.some((entry) => {
      const rosterKey = entry.name.trim().toLowerCase();
      return rosterKey === key || rosterKey.startsWith(`${key} `) || key.startsWith(`${rosterKey} `);
    });
  });
  const leader = roster.find((entry) => entry.isLeader) ?? roster[0];

  return {
    teamName: input.submission.team_name?.trim() || "Unnamed team",
    leaderName: leader?.name ?? ownerName,
    leaderEmail: leader?.email ?? ownerEmail,
    members: roster.map((entry) => ({
      user_id: entry.user_id,
      name: entry.name,
      email: entry.email,
      isOwner: entry.isOwner,
      isLeader: entry.isLeader,
      avatarUrl: entry.profile?.avatarUrl ?? null,
      headline: entry.profile?.headline?.trim() || entry.profile?.publicRole?.trim() || null,
    })),
    extraMemberNames,
    memberCount: Math.max(roster.length + extraMemberNames.length, countTeamBuilders(input.submission)),
  };
}
