import { describe, expect, it } from "vitest";
import {
  canAccessStaffDashboard,
  getDashboardPathForUser,
  isStaffRole,
} from "@/lib/portalRoutes";

describe("judge onboarding access", () => {
  it("treats only explicitly approved staff as dashboard-ready", () => {
    expect(canAccessStaffDashboard("judge", "approved")).toBe(true);
    expect(canAccessStaffDashboard("mentor", "approved")).toBe(true);
    expect(canAccessStaffDashboard("judge", "pending")).toBe(false);
    expect(canAccessStaffDashboard("judge", undefined)).toBe(false);
    expect(canAccessStaffDashboard("participant", "approved")).toBe(false);
  });

  it("routes pending and missing approval to the waiting room", () => {
    expect(getDashboardPathForUser("judge", "pending")).toBe("/dashboard");
    expect(getDashboardPathForUser("judge", undefined)).toBe("/dashboard");
    expect(getDashboardPathForUser("mentor", "pending")).toBe("/dashboard");
    expect(getDashboardPathForUser("judge", "approved")).toBe("/dashboard/judge");
  });

  it("recognizes mentor and judge as staff roles", () => {
    expect(isStaffRole("judge")).toBe(true);
    expect(isStaffRole("mentor")).toBe(true);
    expect(isStaffRole("participant")).toBe(false);
  });
});
