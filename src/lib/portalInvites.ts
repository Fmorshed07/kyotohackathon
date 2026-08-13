import {
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
  Submission,
  TeamInvite,
  TeamMemberRecord,
  UserProfile,
} from "@/types/portal";
import { mapUserDocToProfile, pickTeamMemberProfile } from "@/lib/userProfile";

const TEAM_INVITES = "team_invites";
const TEAM_MEMBERSHIPS = "team_memberships";
const JUDGE_INVITES = "portal_invites";

const getString = (value: unknown) => (typeof value === "string" ? value : "");

export function teamMembershipDocId(submissionId: string, userId: string) {
  return `${submissionId}_${userId}`;
}

function mapTeamMemberRecord(data: Record<string, unknown>): TeamMemberRecord {
  const profileData = data.profile;
  return {
    user_id: getString(data.user_id),
    name: getString(data.name),
    email: getString(data.email),
    joined_at: getString(data.joined_at),
    role: data.role === "leader" ? "leader" : "member",
    profile:
      profileData && typeof profileData === "object"
        ? pickTeamMemberProfile(mapUserDocToProfile(profileData as Record<string, unknown>))
        : null,
  };
}

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
  return snap.docs.map((entry) => mapTeamMemberRecord(entry.data() as Record<string, unknown>));
}

export async function listTeamMembershipsForUser(
  db: Firestore,
  userId: string
): Promise<Array<TeamMemberRecord & { submission_id: string; hackathon_id: string; team_name: string }>> {
  const snap = await getDocs(
    query(collection(db, TEAM_MEMBERSHIPS), where("user_id", "==", userId))
  );
  return snap.docs.map((entry) => {
    const data = entry.data() as Record<string, unknown>;
    return {
      ...mapTeamMemberRecord(data),
      submission_id: getString(data.submission_id),
      hackathon_id: getString(data.hackathon_id),
      team_name: getString(data.team_name),
    };
  });
}

/**
 * Join a team via invite: writes a membership row, bumps invite use count,
 * enrolls the participant, and best-effort syncs submission member fields.
 *
 * Teammates cannot read the owner's private submission, so this path must not
 * getDoc(submissions/...). Rules allow membership create + invite use_count
 * increment + a narrow submission update (arrayUnion + invite token).
 */
export async function acceptTeamInvite(
  db: Firestore,
  token: string,
  joiner: {
    userId: string;
    name: string;
    email: string;
    enrolledHackathonIds?: string[];
    profile?: UserProfile | null;
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
    return {
      teamName: invite.team_name,
      hackathonId: invite.hackathon_id,
      submissionId: invite.submission_id,
    };
  }

  const existingMemberships = await listTeamMembershipsForSubmission(db, invite.submission_id);
  if (existingMemberships.some((member) => member.user_id === joiner.userId)) {
    return {
      teamName: invite.team_name,
      hackathonId: invite.hackathon_id,
      submissionId: invite.submission_id,
    };
  }

  let profile = joiner.profile ? pickTeamMemberProfile(joiner.profile) : null;
  try {
    const userSnap = await getDoc(doc(db, "users", joiner.userId));
    if (userSnap.exists()) {
      profile = pickTeamMemberProfile(mapUserDocToProfile(userSnap.data() as Record<string, unknown>));
    }
  } catch {
    // Own profile read is optional; membership still records name/email.
  }

  const member: TeamMemberRecord = {
    user_id: joiner.userId,
    name:
      profile?.fullName?.trim() ||
      joiner.name.trim() ||
      joiner.email.split("@")[0] ||
      "Teammate",
    email: joiner.email.trim().toLowerCase(),
    joined_at: new Date().toISOString(),
    role: "member",
    profile,
  };

  await setDoc(doc(db, TEAM_MEMBERSHIPS, teamMembershipDocId(invite.submission_id, joiner.userId)), {
    invite_token: token,
    submission_id: invite.submission_id,
    owner_id: invite.owner_id,
    hackathon_id: invite.hackathon_id,
    team_name: invite.team_name,
    user_id: member.user_id,
    name: member.name,
    email: member.email,
    joined_at: member.joined_at,
    role: "member",
    profile: profile ?? {},
  });

  await updateDoc(doc(db, TEAM_INVITES, token), {
    use_count: increment(1),
  });

  const membershipFields = {
    team_members: arrayUnion(member),
    member_user_ids: arrayUnion(joiner.userId),
    member_name_list: arrayUnion(member.name),
    join_invite_token: token,
  };

  const submissionRef = doc(db, "submissions", invite.submission_id);
  try {
    await updateDoc(submissionRef, membershipFields);
  } catch {
    try {
      // Older deployed rules only allow team_members + join_invite_token.
      await updateDoc(submissionRef, {
        team_members: arrayUnion(member),
        member_user_ids: arrayUnion(joiner.userId),
        join_invite_token: token,
      });
    } catch {
      try {
        await updateDoc(submissionRef, {
          team_members: arrayUnion(member),
          join_invite_token: token,
        });
      } catch {
        // Membership row still lets the owner see the joiner; rules now also allow
        // submission reads via team_memberships/{submissionId}_{uid}.
      }
    }
  }

  try {
    await updateDoc(doc(db, "public_projects", invite.submission_id), membershipFields);
  } catch {
    // Board copy is optional until the team opts into public preview.
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

export async function setTeamLeader(
  db: Firestore,
  submissionId: string,
  leaderUserId: string
): Promise<void> {
  await updateDoc(doc(db, "submissions", submissionId), {
    team_leader_id: leaderUserId,
  });
  try {
    await updateDoc(doc(db, "public_projects", submissionId), {
      team_leader_id: leaderUserId,
    });
  } catch {
    // Public board copy may not exist yet.
  }
}

export async function loadUserProfiles(
  db: Firestore,
  userIds: string[]
): Promise<Record<string, UserProfile>> {
  const unique = Array.from(new Set(userIds.filter(Boolean)));
  const entries = await Promise.all(
    unique.map(async (userId) => {
      try {
        const snap = await getDoc(doc(db, "users", userId));
        if (!snap.exists()) return null;
        return [userId, mapUserDocToProfile(snap.data() as Record<string, unknown>)] as const;
      } catch {
        return null;
      }
    })
  );
  return Object.fromEntries(entries.filter((entry): entry is readonly [string, UserProfile] => entry != null));
}

export async function listAccessibleSubmissions(
  db: Firestore,
  userId: string
): Promise<Submission[]> {
  const [ownedSnap, memberSnap, memberships] = await Promise.all([
    getDocs(query(collection(db, "submissions"), where("user_id", "==", userId))),
    getDocs(query(collection(db, "submissions"), where("member_user_ids", "array-contains", userId))).catch(
      () => null
    ),
    listTeamMembershipsForUser(db, userId).catch(() => []),
  ]);

  const byId = new Map<string, Submission>();
  const ingest = (id: string, data: Omit<Submission, "id">) => {
    byId.set(id, { id, ...data });
  };

  for (const entry of ownedSnap.docs) {
    ingest(entry.id, entry.data() as Omit<Submission, "id">);
  }
  for (const entry of memberSnap?.docs ?? []) {
    ingest(entry.id, entry.data() as Omit<Submission, "id">);
  }

  const missingIds = memberships
    .map((row) => row.submission_id)
    .filter((id) => id && !byId.has(id));

  await Promise.all(
    missingIds.map(async (submissionId) => {
      try {
        const snap = await getDoc(doc(db, "submissions", submissionId));
        if (snap.exists()) {
          ingest(snap.id, snap.data() as Omit<Submission, "id">);
        }
      } catch {
        // Rules may still deny a legacy membership without member_user_ids.
      }
    })
  );

  return Array.from(byId.values());
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
 * `primaryHackathonId` is the invite's dedicated event (first assigned id).
 */
export async function redeemJudgeInvite(
  db: Firestore,
  token: string,
  user: { userId: string; email: string; existingHackathonIds?: string[] }
): Promise<{ hackathonIds: string[]; primaryHackathonId: string | null }> {
  const invite = await getJudgeInvite(db, token);
  if (!invite || invite.status !== "open") {
    throw new Error("This judge invite is invalid or has been revoked.");
  }
  if (invite.max_uses != null && invite.use_count >= invite.max_uses) {
    throw new Error("This judge invite has reached its use limit.");
  }

  const primaryHackathonId = invite.hackathon_ids[0] ?? null;

  if (invite.used_by?.includes(user.userId)) {
    return { hackathonIds: invite.hackathon_ids, primaryHackathonId };
  }

  // Prefer the invited event as the active workspace, then keep any prior enrollments.
  const nextHackathonIds = Array.from(
    new Set([...invite.hackathon_ids, ...(user.existingHackathonIds ?? [])].filter(Boolean))
  );

  await setDoc(
    doc(db, "users", user.userId),
    {
      email: user.email,
      role: "judge",
      judgeApprovalStatus: "approved",
      hackathon_id: primaryHackathonId ?? nextHackathonIds[0] ?? null,
      hackathon_ids: nextHackathonIds,
      invite_token: token,
    },
    { merge: true }
  );

  await updateDoc(doc(db, JUDGE_INVITES, token), {
    use_count: increment(1),
    used_by: arrayUnion(user.userId),
  });

  return { hackathonIds: nextHackathonIds, primaryHackathonId };
}
