import {
  addDoc,
  arrayUnion,
  collection,
  doc,
  getDoc,
  getDocs,
  increment,
  query,
  setDoc,
  updateDoc,
  where,
  type Firestore,
} from "firebase/firestore";
import { createInviteToken } from "@/lib/inviteTokens";
import type {
  PortalJudgeInvite,
  TeamInvite,
  TeamMemberRecord,
} from "@/types/portal";

const TEAM_INVITES = "team_invites";
const TEAM_MEMBERSHIPS = "team_memberships";
const JUDGE_INVITES = "portal_invites";

const getString = (value: unknown) => (typeof value === "string" ? value : "");

export function mapTeamInvite(id: string, data: Record<string, unknown>): TeamInvite {
  return {
    id,
    token: getString(data.token) || id,
    submission_id: getString(data.submission_id),
    owner_id: getString(data.owner_id),
    hackathon_id: getString(data.hackathon_id),
    team_name: getString(data.team_name),
    owner_name: getString(data.owner_name),
    owner_email: getString(data.owner_email),
    status: data.status === "revoked" ? "revoked" : "open",
    created_at: getString(data.created_at),
    max_uses: typeof data.max_uses === "number" ? data.max_uses : null,
    use_count: typeof data.use_count === "number" ? data.use_count : 0,
  };
}

export function mapJudgeInvite(
  id: string,
  data: Record<string, unknown>
): PortalJudgeInvite {
  return {
    id,
    token: getString(data.token) || id,
    hackathon_ids: Array.isArray(data.hackathon_ids)
      ? data.hackathon_ids.filter((value): value is string => typeof value === "string")
      : [],
    created_by: getString(data.created_by),
    created_by_email: getString(data.created_by_email) || null,
    label: getString(data.label) || null,
    status: data.status === "revoked" ? "revoked" : "open",
    created_at: getString(data.created_at),
    max_uses: typeof data.max_uses === "number" ? data.max_uses : null,
    use_count: typeof data.use_count === "number" ? data.use_count : 0,
    used_by: Array.isArray(data.used_by)
      ? data.used_by.filter((value): value is string => typeof value === "string")
      : [],
  };
}

export async function createTeamInvite(
  db: Firestore,
  input: {
    submissionId: string;
    ownerId: string;
    hackathonId: string;
    teamName: string;
    ownerName: string;
    ownerEmail: string;
    maxUses?: number;
  }
): Promise<TeamInvite> {
  const token = createInviteToken();
  const now = new Date().toISOString();
  const payload = {
    token,
    type: "team" as const,
    submission_id: input.submissionId,
    owner_id: input.ownerId,
    hackathon_id: input.hackathonId,
    team_name: input.teamName.trim() || "Untitled team",
    owner_name: input.ownerName.trim(),
    owner_email: input.ownerEmail.trim().toLowerCase(),
    status: "open" as const,
    created_at: now,
    max_uses: input.maxUses ?? 8,
    use_count: 0,
  };
  await setDoc(doc(db, TEAM_INVITES, token), payload);
  return mapTeamInvite(token, payload);
}

export async function getTeamInvite(
  db: Firestore,
  token: string
): Promise<TeamInvite | null> {
  const snap = await getDoc(doc(db, TEAM_INVITES, token));
  if (!snap.exists()) return null;
  return mapTeamInvite(snap.id, snap.data() as Record<string, unknown>);
}

export async function revokeTeamInvite(db: Firestore, token: string): Promise<void> {
  await updateDoc(doc(db, TEAM_INVITES, token), { status: "revoked" });
}

export async function listTeamMembershipsForSubmission(
  db: Firestore,
  submissionId: string
): Promise<TeamMemberRecord[]> {
  const snap = await getDocs(
    query(collection(db, TEAM_MEMBERSHIPS), where("submission_id", "==", submissionId))
  );
  return snap.docs.map((entry) => {
    const data = entry.data() as Record<string, unknown>;
    return {
      user_id: getString(data.user_id),
      name: getString(data.name),
      email: getString(data.email),
      joined_at: getString(data.joined_at),
    };
  });
}

function appendMemberName(existing: string | null | undefined, name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return existing?.trim() ?? "";
  const lines = (existing ?? "")
    .split(/\r?\n|,/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.some((line) => line.toLowerCase() === trimmed.toLowerCase())) {
    return lines.join("\n");
  }
  return [...lines, trimmed].join("\n");
}

/**
 * Join a team via invite: writes a membership row, bumps invite use count,
 * enrolls the participant, and best-effort syncs submission member fields (owner can always edit).
 */
export async function acceptTeamInvite(
  db: Firestore,
  token: string,
  joiner: {
    userId: string;
    name: string;
    email: string;
    enrolledHackathonIds?: string[];
  }
): Promise<{ teamName: string; hackathonId: string; submissionId: string }> {
  const invite = await getTeamInvite(db, token);
  if (!invite || invite.status !== "open") {
    throw new Error("This team invite is invalid or has been revoked.");
  }
  if (invite.max_uses != null && invite.use_count >= invite.max_uses) {
    throw new Error("This team invite has reached its member limit.");
  }
  if (invite.owner_id === joiner.userId) {
    throw new Error("You already own this team.");
  }

  const submissionRef = doc(db, "submissions", invite.submission_id);
  const submissionSnap = await getDoc(submissionRef);
  if (!submissionSnap.exists()) {
    throw new Error("The team submission no longer exists.");
  }

  const existingMemberships = await listTeamMembershipsForSubmission(db, invite.submission_id);
  if (existingMemberships.some((member) => member.user_id === joiner.userId)) {
    return {
      teamName: invite.team_name,
      hackathonId: invite.hackathon_id,
      submissionId: invite.submission_id,
    };
  }

  const member: TeamMemberRecord = {
    user_id: joiner.userId,
    name: joiner.name.trim() || joiner.email.split("@")[0] || "Teammate",
    email: joiner.email.trim().toLowerCase(),
    joined_at: new Date().toISOString(),
  };

  await addDoc(collection(db, TEAM_MEMBERSHIPS), {
    invite_token: token,
    submission_id: invite.submission_id,
    owner_id: invite.owner_id,
    hackathon_id: invite.hackathon_id,
    team_name: invite.team_name,
    user_id: member.user_id,
    name: member.name,
    email: member.email,
    joined_at: member.joined_at,
  });

  await updateDoc(doc(db, TEAM_INVITES, token), {
    use_count: increment(1),
  });

  const submission = submissionSnap.data() as Record<string, unknown>;
  const existingMembers = Array.isArray(submission.team_members)
    ? (submission.team_members as TeamMemberRecord[])
    : [];
  const nextMemberNames = appendMemberName(
    typeof submission.member_names === "string" ? submission.member_names : "",
    member.name
  );

  try {
    await updateDoc(submissionRef, {
      team_members: [...existingMembers, member],
      member_names: nextMemberNames,
      join_invite_token: token,
    });
  } catch {
    // Membership row is enough; owner still sees linked members via team_memberships.
  }

  const nextHackathonIds = Array.from(
    new Set([...(joiner.enrolledHackathonIds ?? []), invite.hackathon_id].filter(Boolean))
  );
  await setDoc(
    doc(db, "users", joiner.userId),
    {
      hackathon_id: invite.hackathon_id,
      hackathon_ids: nextHackathonIds,
    },
    { merge: true }
  );

  return {
    teamName: invite.team_name,
    hackathonId: invite.hackathon_id,
    submissionId: invite.submission_id,
  };
}

export async function createJudgeInvite(
  db: Firestore,
  input: {
    createdBy: string;
    createdByEmail?: string;
    hackathonIds: string[];
    label?: string;
    maxUses?: number;
  }
): Promise<PortalJudgeInvite> {
  if (input.hackathonIds.length === 0) {
    throw new Error("Pick at least one hackathon for the judge invite.");
  }
  const token = createInviteToken();
  const now = new Date().toISOString();
  const payload = {
    token,
    type: "judge" as const,
    hackathon_ids: input.hackathonIds,
    created_by: input.createdBy,
    created_by_email: input.createdByEmail?.trim().toLowerCase() || "",
    label: input.label?.trim() || "Judge portal invite",
    status: "open" as const,
    created_at: now,
    max_uses: input.maxUses ?? 25,
    use_count: 0,
    used_by: [] as string[],
  };
  await setDoc(doc(db, JUDGE_INVITES, token), payload);
  return mapJudgeInvite(token, payload);
}

export async function getJudgeInvite(
  db: Firestore,
  token: string
): Promise<PortalJudgeInvite | null> {
  const snap = await getDoc(doc(db, JUDGE_INVITES, token));
  if (!snap.exists()) return null;
  const data = snap.data() as Record<string, unknown>;
  if (data.type && data.type !== "judge") return null;
  return mapJudgeInvite(snap.id, data);
}

export async function revokeJudgeInvite(db: Firestore, token: string): Promise<void> {
  await updateDoc(doc(db, JUDGE_INVITES, token), { status: "revoked" });
}

/**
 * Apply a judge invite: approve the account and assign hackathon access.
 * Writes `invite_token` so Firestore rules can verify the open portal invite.
 */
export async function redeemJudgeInvite(
  db: Firestore,
  token: string,
  user: { userId: string; email: string; existingHackathonIds?: string[] }
): Promise<{ hackathonIds: string[] }> {
  const invite = await getJudgeInvite(db, token);
  if (!invite || invite.status !== "open") {
    throw new Error("This judge invite is invalid or has been revoked.");
  }
  if (invite.max_uses != null && invite.use_count >= invite.max_uses) {
    throw new Error("This judge invite has reached its use limit.");
  }
  if (invite.used_by?.includes(user.userId)) {
    return { hackathonIds: invite.hackathon_ids };
  }

  const nextHackathonIds = Array.from(
    new Set([...(user.existingHackathonIds ?? []), ...invite.hackathon_ids])
  );

  await setDoc(
    doc(db, "users", user.userId),
    {
      email: user.email,
      role: "judge",
      judgeApprovalStatus: "approved",
      hackathon_id: nextHackathonIds[0] ?? invite.hackathon_ids[0],
      hackathon_ids: nextHackathonIds,
      invite_token: token,
    },
    { merge: true }
  );

  await updateDoc(doc(db, JUDGE_INVITES, token), {
    use_count: increment(1),
    used_by: arrayUnion(user.userId),
  });

  return { hackathonIds: nextHackathonIds };
}
