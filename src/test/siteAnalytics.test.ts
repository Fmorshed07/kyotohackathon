import { describe, expect, it } from "vitest";
import {
  analyticsPageLabel,
  buildSiteAnalytics,
  isPublicAnalyticsPath,
  type SitePageView,
} from "@/lib/siteAnalytics";

const view = (
  visitorId: string,
  sessionId: string,
  path: string,
  source: string,
  createdAt: string,
): SitePageView => ({
  visitorId,
  sessionId,
  path,
  source,
  createdAt,
  pageGroup: analyticsPageLabel(path),
});

describe("site analytics", () => {
  it("tracks public pages but excludes private dashboards", () => {
    expect(isPublicAnalyticsPath("/projects/demo-project")).toBe(true);
    expect(isPublicAnalyticsPath("/events/ai-ideathon-2026")).toBe(true);
    expect(isPublicAnalyticsPath("/dashboard/admin/people")).toBe(false);
    expect(isPublicAnalyticsPath("/invite/judge/private-token")).toBe(false);
  });

  it("builds unique visitor, session, content, and source metrics", () => {
    const views = [
      view("visitor-a", "session-a1", "/", "Direct", "2026-08-15T01:00:00.000Z"),
      view("visitor-a", "session-a1", "/projects", "Direct", "2026-08-15T01:02:00.000Z"),
      view("visitor-a", "session-a2", "/projects/demo", "Google", "2026-08-15T02:00:00.000Z"),
      view("visitor-b", "session-b1", "/projects", "LinkedIn", "2026-08-10T02:00:00.000Z"),
    ];

    const result = buildSiteAnalytics(views, new Date("2026-08-15T03:00:00.000Z"));

    expect(result.visitors).toBe(2);
    expect(result.pageViews).toBe(4);
    expect(result.sessions).toBe(3);
    expect(result.returningVisitors).toBe(1);
    expect(result.visitorsLast24Hours).toBe(1);
    expect(result.averagePagesPerSession).toBeCloseTo(4 / 3);
    expect(result.topPages[0]).toEqual({ label: "Projects gallery", value: 2 });
    expect(result.trafficSources[0]).toEqual({ label: "Direct", value: 2 });
    expect(result.dailySeries).toHaveLength(7);
  });
});
