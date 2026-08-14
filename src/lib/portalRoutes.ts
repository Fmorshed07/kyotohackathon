import type { HostApprovalStatus, JudgeApprovalStatus, PortalRole, SessionUser } from "@/types/portal";

export const isStaffRole = (role?: PortalRole) => role === "mentor" || role === "judge";

export const canAccessHostDashboard = (
  role?: PortalRole,
  hostApprovalStatus?: HostApprovalStatus
) =>
  role === "admin" || (role === "host" && hostApprovalStatus === "approved");

export const canAccessStaffDashboard = (
  role?: PortalRole,
  judgeApprovalStatus?: JudgeApprovalStatus
) => isStaffRole(role) && judgeApprovalStatus === "approved";

/** New participants without a completed profile go through the onboarding wizard. */
export function participantNeedsOnboarding(
  user: Pick<SessionUser, "role" | "onboardingCompletedAt" | "profile"> | null | undefined
): boolean {
  if (!user || user.role !== "participant") return false;
  if (user.onboardingCompletedAt) return false;
  // Legacy accounts that already have a people profile skip the wizard.
  if (user.profile?.fullName?.trim() || user.profile?.profileUpdatedAt) return false;
  return true;
}

/** Same-origin app path only. Rejects protocol-relative and absolute URLs. */
export function safeInternalPath(value: string | null | undefined) {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed.startsWith("/")) return null;
  if (trimmed.startsWith("//") || trimmed.includes("://") || trimmed.includes("\\")) return null;
  return trimmed;
}

export function getDashboardPathForUser(
  role?: PortalRole,
  judgeApprovalStatus?: JudgeApprovalStatus,
  options?: { needsOnboarding?: boolean }
) {
  if (role === "admin") return "/dashboard/admin";
  if (role === "host") return "/dashboard/host";
  if (canAccessStaffDashboard(role, judgeApprovalStatus)) return "/dashboard/judge";
  if (isStaffRole(role)) return "/dashboard";
  if (options?.needsOnboarding) return "/onboarding";
  return "/dashboard/participant";
}