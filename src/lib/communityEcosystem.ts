import { getHostedHackathonUrl, type HostedHackathon } from "@/lib/aiHackathons";
import { getEventTimeRange } from "@/lib/eventPreviews";
import { getLumaArchiveUrl } from "@/lib/lumaCalendarArchive";

export const COMMUNITY_SOURCE = "https://www.cognisorai.com/";
export const JAPAN_CITIES = [
  { id: "Tokyo", japanese: "東京", lon: 139.6917, lat: 35.6895, caption: "Meet the builders. Make the next connection.", description: "AI meetups, creative challenges, and the Impact Tokyo community.", href: "/work?city=Tokyo", labelX: 510, labelY: 260 },
  { id: "Kyoto", japanese: "京都", lon: 135.7681, lat: 35.0116, caption: "Old traditions. Entirely new possibilities.", description: "Explore the Impact Kyoto edition and its agentic AI programme.", href: "/work?city=Kyoto", labelX: 240, labelY: 245 },
  { id: "Osaka", japanese: "大阪", lon: 135.5023, lat: 34.6937, caption: "Build something with real-world impact.", description: "Discover the Osaka programme on Cognisor’s official events site.", href: "https://www.cognisorai.com/events/impact-osaka-hackathon-2026", labelX: 280, labelY: 360 },
] as const;
export type JapanCity = typeof JAPAN_CITIES[number];
export const projectJapanPoint = (lon: number, lat: number) => ({ x: (lon - 122) * 25, y: (46 - lat) * 25 });

export type CommunityEventKind = "Hackathons" | "Meetups" | "Workshops" | "Other";
export function communityEventKind(event: Pick<HostedHackathon, "name" | "format">): CommunityEventKind {
  const value = `${event.name} ${event.format}`;
  if (/meetup|meet-up|networking/i.test(value)) return "Meetups";
  if (event.format === "Portal catalog") return "Hackathons";
  if (/hackathon|ideathon|designathon/i.test(value)) return "Hackathons";
  if (/workshop|masterclass|bootcamp|ワークショップ/i.test(value)) return "Workshops";
  return "Other";
}
export function communityEventCity(event: Pick<HostedHackathon, "location">) {
  const value = event.location;
  for (const [city, pattern] of [["Tokyo", /tokyo|東京/i], ["Kyoto", /kyoto|京都/i], ["Osaka", /osaka|大阪/i], ["Dhaka", /dhaka|ঢাকা/i], ["Online", /online|virtual|remote/i]] as const) {
    if (pattern.test(value)) return city;
  }
  return value.split(",")[0]?.trim() || "To be confirmed";
}
export function communityEventStatus(event: HostedHackathon, now = Date.now()) {
  const range = getEventTimeRange(event);
  return range ? now < range.start ? "upcoming" : now < range.end ? "active" : "past" : event.status;
}
export function communityEventPartners(event: HostedHackathon) {
  return [...new Set([event.organizerName, ...(event.organizerLinks || []).map(partner => partner.name)].filter((value): value is string => Boolean(value?.trim())))];
}
export function communityEventHref(event: HostedHackathon, now = Date.now()) {
  const lumaUrl = getLumaArchiveUrl(event);
  if (lumaUrl && communityEventStatus(event, now) === "past") return lumaUrl;
  // A legacy catalog stub without a public page is discoverable in the existing directory.
  return event.createdBy === "portal-catalog" && event.id === "impact-kyoto"
    ? "/hackathons" : getHostedHackathonUrl(event.id);
}
export type CommunityFilters = { search: string; city: string; kind: string; partner: string; status: string };
export function filterCommunityEvents(events: HostedHackathon[], filters: CommunityFilters, now = Date.now()) {
  const query = filters.search.trim().toLocaleLowerCase();
  return events.filter(event => event.published &&
    (!query || `${event.name} ${event.location} ${event.theme} ${event.organizerName || ""}`.toLocaleLowerCase().includes(query)) &&
    (!filters.city || communityEventCity(event) === filters.city) &&
    (!filters.kind || communityEventKind(event) === filters.kind) &&
    (!filters.partner || communityEventPartners(event).includes(filters.partner)) &&
    (!filters.status || communityEventStatus(event, now) === filters.status));
}
