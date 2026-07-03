import type { JudgeApprovalStatus, PortalRole } from "@/types/portal";

export const isStaffRole = (role?: PortalRole) => role === "mentor" || role === "judge";

export const canAccessStaffDashboard = (
  role?: PortalRole,
  judgeApprovalStatus?: JudgeApprovalStatus
) => isStaffRole(role) && judgeApprovalStatus !== "pending";

export function getDashboardPathForUser(
  role?: PortalRole,
  judgeApprovalStatus?: JudgeApprovalStatus
) {
  if (role === "admin") return "/dashboard/admin";
  if (canAccessStaffDashboard(role, judgeApprovalStatus)) return "/dashboard/judge";
  if (isStaffRole(role)) return "/dashboard";
  return "/dashboard/participant";
}
