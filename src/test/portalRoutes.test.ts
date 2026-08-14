import { describe, expect, it } from "vitest";
import {
  canAccessStaffDashboard,
  getDashboardPathForUser,
  isStaffRole,
  safeInternalPath,
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

  it("accepts same-origin next paths after create-profile", () => {
    expect(safeInternalPath("/projects/abc")).toBe("/projects/abc");
    expect(safeInternalPath("/projects?sort=stars")).toBe("/projects?sort=stars");
    expect(safeInternalPath("//evil.example")).toBeNull();
    expect(safeInternalPath("https://evil.example")).toBeNull();
    expect(safeInternalPath("\\windows")).toBeNull();
    expect(safeInternalPath("")).toBeNull();
  });

  it("recognizes mentor and judge as staff roles", () => {
    expect(isStaffRole("judge")).toBe(true);
    expect(isStaffRole("mentor")).toBe(true);
    expect(isStaffRole("participant")).toBe(false);
  });
});
