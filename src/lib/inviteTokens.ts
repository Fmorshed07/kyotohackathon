/** URL-safe invite tokens for team + judge portal links. */

import {
  getEventBoardPath,
  getJudgeEventWorkspacePath,
  HACKATHON_STORAGE_KEYS,
  isHackathonId,
  type HackathonId,
} from "@/lib/hackathons";

export function createInviteToken(byteLength = 16): string {
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

export function buildInviteUrl(kind: "team" | "judge", token: string, origin = window.location.origin) {
  return `${origin.replace(/\/$/, "")}/invite/${kind}/${encodeURIComponent(token)}`;
}

export const PENDING_TEAM_INVITE_KEY = "cognisor_pending_team_invite";
export const PENDING_JUDGE_INVITE_KEY = "cognisor_pending_judge_invite";
/** Bridges invite redeem → judge dashboard until Firestore session catches up. */
export const JUDGE_WORKSPACE_BOOTSTRAP_KEY = "cognisor_judge_workspace_bootstrap";

export function stashPendingInvite(kind: "team" | "judge", token: string) {
  const key = kind === "team" ? PENDING_TEAM_INVITE_KEY : PENDING_JUDGE_INVITE_KEY;
  try {
    sessionStorage.setItem(key, token);
  } catch {
    // ignore quota / private mode
  }
}

export function readPendingInvite(kind: "team" | "judge"): string | null {
  const key = kind === "team" ? PENDING_TEAM_INVITE_KEY : PENDING_JUDGE_INVITE_KEY;
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

export function clearPendingInvite(kind: "team" | "judge") {
  const key = kind === "team" ? PENDING_TEAM_INVITE_KEY : PENDING_JUDGE_INVITE_KEY;
  try {
    sessionStorage.removeItem(key);
  } catch {
    // ignore
  }
}

export function stashJudgeWorkspaceBootstrap(hackathonId: string) {
  if (!isHackathonId(hackathonId)) return;
  try {
    sessionStorage.setItem(JUDGE_WORKSPACE_BOOTSTRAP_KEY, hackathonId);
    window.localStorage.setItem(HACKATHON_STORAGE_KEYS.judge, hackathonId);
  } catch {
    // ignore quota / private mode
  }
}

export function readJudgeWorkspaceBootstrap(): HackathonId | null {
  try {
    const value = sessionStorage.getItem(JUDGE_WORKSPACE_BOOTSTRAP_KEY);
    return value && isHackathonId(value) ? value : null;
  } catch {
    return null;
  }
}

export function clearJudgeWorkspaceBootstrap() {
  try {
    sessionStorage.removeItem(JUDGE_WORKSPACE_BOOTSTRAP_KEY);
  } catch {
    // ignore
  }
}

/** Pin the participant workspace to the invited event until they switch. */
export function stashParticipantEvent(hackathonId: string) {
  if (!isHackathonId(hackathonId)) return;
  try {
    window.localStorage.setItem(HACKATHON_STORAGE_KEYS.participant, hackathonId);
  } catch {
    // ignore quota / private mode
  }
}

/** After a team invite, open that event’s board with the joined team highlighted. */
export function getEventBoardPathAfterTeamInvite(input: {
  hackathonId: string;
  teamName?: string;
  submissionId?: string;
}) {
  if (!input.hackathonId || !isHackathonId(input.hackathonId)) {
    const params = new URLSearchParams();
    if (input.teamName) params.set("joinedTeam", input.teamName);
    if (input.submissionId) params.set("joinedSubmission", input.submissionId);
    const query = params.toString();
    return query ? `/dashboard/participant?${query}` : "/dashboard/participant";
  }

  stashParticipantEvent(input.hackathonId);
  const params = new URLSearchParams();
  params.set("joined", "1");
  if (input.teamName) params.set("team", input.teamName);
  if (input.submissionId) params.set("project", input.submissionId);
  return `${getEventBoardPath(input.hackathonId)}?${params.toString()}`;
}

export function getJudgeDashboardPathAfterInvite(primaryHackathonId: string | null | undefined) {
  if (primaryHackathonId && isHackathonId(primaryHackathonId)) {
    stashJudgeWorkspaceBootstrap(primaryHackathonId);
    return getJudgeEventWorkspacePath(primaryHackathonId);
  }
  return "/dashboard/judge";
}
