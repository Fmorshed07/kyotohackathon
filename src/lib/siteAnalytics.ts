import { addDoc, collection, getDocs, type Firestore } from "firebase/firestore";
import { fetchProjectShareStats } from "@/lib/projectShares";
import { fetchProjectStarStats } from "@/lib/projectStars";

export const SITE_PAGE_VIEWS_COLLECTION = "site_page_views";

const VISITOR_STORAGE_KEY = "cognisor_analytics_visitor";
const SESSION_STORAGE_KEY = "cognisor_analytics_session";
const SOURCE_STORAGE_KEY = "cognisor_analytics_source";

export type SitePageView = {
  visitorId: string;
  sessionId: string;
  path: string;
  pageGroup: string;
  source: string;
  createdAt: string;
};

export type SiteAnalyticsSeriesPoint = {
  key: string;
  label: string;
  visitors: number;
  views: number;
};

export type SiteAnalyticsBreakdown = {
  label: string;
  value: number;
};

export type SiteAnalyticsSnapshot = {
  visitors: number;
  pageViews: number;
  sessions: number;
  returningVisitors: number;
  visitorsLast24Hours: number;
  visitorsLast7Days: number;
  averagePagesPerSession: number;
  topPages: SiteAnalyticsBreakdown[];
  trafficSources: SiteAnalyticsBreakdown[];
  dailySeries: SiteAnalyticsSeriesPoint[];
  recentActivity: Array<Pick<SitePageView, "path" | "source" | "createdAt">>;
};

export type AudienceEngagementTotals = {
  projectStars: number;
  projectShares: number;
};

export const EMPTY_SITE_ANALYTICS: SiteAnalyticsSnapshot = {
  visitors: 0,
  pageViews: 0,
  sessions: 0,
  returningVisitors: 0,
  visitorsLast24Hours: 0,
  visitorsLast7Days: 0,
  averagePagesPerSession: 0,
  topPages: [],
  trafficSources: [],
  dailySeries: [],
  recentActivity: [],
};

function randomAnalyticsId() {
  const value =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random()}-${Math.random()}`;
  return value.replace(/[^A-Za-z0-9_-]/g, "").slice(0, 40).padEnd(20, "0");
}

function readOrCreateStorageId(storage: Storage, key: string) {
  const existing = storage.getItem(key)?.trim() ?? "";
  if (/^[A-Za-z0-9_-]{16,64}$/.test(existing)) return existing;
  const generated = randomAnalyticsId();
  storage.setItem(key, generated);
  return generated;
}

export function isPublicAnalyticsPath(pathname: string) {
  return (
    pathname === "/" ||
    pathname === "/hackathons" ||
    pathname.startsWith("/events/") ||
    pathname === "/projects" ||
    pathname.startsWith("/projects/") ||
    pathname === "/resources" ||
    pathname === "/signin" ||
    pathname === "/signup" ||
    pathname === "/host/signin"
  );
}

export function getAnalyticsPageGroup(pathname: string) {
  if (pathname === "/") return "Home";
  if (pathname === "/hackathons") return "Hackathons";
  if (pathname.startsWith("/events/")) return "Event detail";
  if (pathname === "/projects") return "Projects gallery";
  if (pathname.startsWith("/projects/")) return "Project detail";
  if (pathname === "/resources") return "Resources";
  if (pathname.includes("signin") || pathname === "/signup") return "Sign in";
  return "Other";
}

export function analyticsPageLabel(pathname: string) {
  const group = getAnalyticsPageGroup(pathname);
  if (group === "Project detail") return `Project · ${pathname.split("/").filter(Boolean).at(-1)?.slice(0, 10) ?? "detail"}`;
  if (group === "Event detail") return `Event · ${pathname.split("/").filter(Boolean).at(-1)?.slice(0, 18) ?? "detail"}`;
  return group;
}

function normalizeTrafficSource(hostname: string) {
  const host = hostname.trim().toLowerCase().replace(/^www\./, "");
  if (!host) return "Direct";
  if (host.includes("google.")) return "Google";
  if (host.includes("linkedin.")) return "LinkedIn";
  if (host.includes("facebook.") || host === "fb.com" || host.includes("instagram.")) return "Meta";
  if (host === "t.co" || host === "x.com" || host.includes("twitter.")) return "X";
  if (host.includes("whatsapp.")) return "WhatsApp";
  return "Referral";
}

function getSessionTrafficSource() {
  const saved = window.sessionStorage.getItem(SOURCE_STORAGE_KEY)?.trim();
  if (saved) return saved.slice(0, 40);
  let source = "Direct";
  try {
    const referrer = document.referrer ? new URL(document.referrer) : null;
    if (referrer && referrer.hostname !== window.location.hostname) {
      source = normalizeTrafficSource(referrer.hostname);
    }
  } catch {
    source = "Direct";
  }
  window.sessionStorage.setItem(SOURCE_STORAGE_KEY, source);
  return source;
}

export async function recordSitePageView(db: Firestore, pathname: string) {
  if (typeof window === "undefined" || !isPublicAnalyticsPath(pathname)) return;
  const path = pathname.slice(0, 200);
  await addDoc(collection(db, SITE_PAGE_VIEWS_COLLECTION), {
    visitor_id: readOrCreateStorageId(window.localStorage, VISITOR_STORAGE_KEY),
    session_id: readOrCreateStorageId(window.sessionStorage, SESSION_STORAGE_KEY),
    path,
    page_group: getAnalyticsPageGroup(path),
    source: getSessionTrafficSource(),
    created_at: new Date().toISOString(),
  });
}

export function parseSitePageView(data: Record<string, unknown>): SitePageView | null {
  const visitorId = typeof data.visitor_id === "string" ? data.visitor_id : "";
  const sessionId = typeof data.session_id === "string" ? data.session_id : "";
  const path = typeof data.path === "string" ? data.path : "";
  const createdAt = typeof data.created_at === "string" ? data.created_at : "";
  if (!visitorId || !sessionId || !path || !createdAt || Number.isNaN(Date.parse(createdAt))) return null;
  return {
    visitorId,
    sessionId,
    path,
    pageGroup: typeof data.page_group === "string" ? data.page_group : getAnalyticsPageGroup(path),
    source: typeof data.source === "string" && data.source.trim() ? data.source : "Direct",
    createdAt,
  };
}

export async function fetchSitePageViews(db: Firestore) {
  const snapshot = await getDocs(collection(db, SITE_PAGE_VIEWS_COLLECTION));
  return snapshot.docs
    .map((item) => parseSitePageView(item.data() as Record<string, unknown>))
    .filter((item): item is SitePageView => item != null)
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
}

function countBreakdown(values: string[], label: (value: string) => string = (value) => value) {
  const counts = new Map<string, number>();
  values.forEach((value) => counts.set(value, (counts.get(value) ?? 0) + 1));
  return [...counts.entries()]
    .map(([value, count]) => ({ label: label(value), value: count }))
    .sort((left, right) => right.value - left.value || left.label.localeCompare(right.label));
}

function localDayKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function buildSiteAnalytics(pageViews: SitePageView[], now = new Date()): SiteAnalyticsSnapshot {
  const validViews = pageViews.filter((view) => !Number.isNaN(Date.parse(view.createdAt)));
  const visitors = new Set(validViews.map((view) => view.visitorId));
  const sessions = new Set(validViews.map((view) => view.sessionId));
  const sessionsByVisitor = new Map<string, Set<string>>();
  validViews.forEach((view) => {
    const visitorSessions = sessionsByVisitor.get(view.visitorId) ?? new Set<string>();
    visitorSessions.add(view.sessionId);
    sessionsByVisitor.set(view.visitorId, visitorSessions);
  });

  const since24Hours = now.getTime() - 24 * 60 * 60 * 1000;
  const since7Days = now.getTime() - 7 * 24 * 60 * 60 * 1000;
  const uniqueSince = (threshold: number) =>
    new Set(validViews.filter((view) => Date.parse(view.createdAt) >= threshold).map((view) => view.visitorId)).size;

  const dailySeries: SiteAnalyticsSeriesPoint[] = [];
  for (let offset = 6; offset >= 0; offset -= 1) {
    const day = new Date(now);
    day.setHours(0, 0, 0, 0);
    day.setDate(day.getDate() - offset);
    const key = localDayKey(day);
    const dayViews = validViews.filter((view) => localDayKey(new Date(view.createdAt)) === key);
    dailySeries.push({
      key,
      label: day.toLocaleDateString(undefined, { weekday: "short" }),
      visitors: new Set(dayViews.map((view) => view.visitorId)).size,
      views: dayViews.length,
    });
  }

  return {
    visitors: visitors.size,
    pageViews: validViews.length,
    sessions: sessions.size,
    returningVisitors: [...sessionsByVisitor.values()].filter((value) => value.size > 1).length,
    visitorsLast24Hours: uniqueSince(since24Hours),
    visitorsLast7Days: uniqueSince(since7Days),
    averagePagesPerSession: sessions.size ? validViews.length / sessions.size : 0,
    topPages: countBreakdown(validViews.map((view) => view.path), analyticsPageLabel).slice(0, 6),
    trafficSources: countBreakdown(validViews.map((view) => view.source)).slice(0, 6),
    dailySeries,
    recentActivity: validViews.slice(0, 8).map(({ path, source, createdAt }) => ({ path, source, createdAt })),
  };
}

export async function fetchAudienceEngagementTotals(db: Firestore): Promise<AudienceEngagementTotals> {
  const [starStats, shareStats] = await Promise.all([
    fetchProjectStarStats(db),
    fetchProjectShareStats(db),
  ]);
  return {
    projectStars: Object.values(starStats).reduce((total, item) => total + item.count, 0),
    projectShares: Object.values(shareStats).reduce((total, item) => total + item.count, 0),
  };
}
