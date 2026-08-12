/** URL-safe invite tokens for team + judge portal links. */

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
