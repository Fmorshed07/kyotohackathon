import type { HostedHackathon } from "@/lib/aiHackathons";
import type { HackathonStatus } from "@/lib/hackathons";
import { ELEVENLABS_MEETUP } from "./elevenLabsMeetup.ts";
import { IMPACT_OSAKA } from "./impactOsaka.ts";

export function getBundledEventStatus(startAt: string, endAt: string, now = new Date()): HackathonStatus {
  if (now.getTime() >= new Date(endAt).getTime()) return "past";
  return now.getTime() >= new Date(startAt).getTime() ? "active" : "upcoming";
}

export function getBundledHackathon(id: string, now = new Date()): HostedHackathon | null {
  const event = [ELEVENLABS_MEETUP, IMPACT_OSAKA].find((event) => event.id === id);
  if (!event) return null;
  const status = getBundledEventStatus(event.startAt!, event.endAt!, now);
  return { ...event, status, submissionMode: status === "past" ? "closed" : "open" };
}

export function getBundledHackathons(now = new Date()): HostedHackathon[] {
  return [ELEVENLABS_MEETUP, IMPACT_OSAKA].map((event) => getBundledHackathon(event.id, now)!);
}

/** Cloud rows win, including explicit unpublish and organiser gate decisions. */
export function mergeBundledHackathons(events: HostedHackathon[], now = new Date()): HostedHackathon[] {
  const byId = new Map(getBundledHackathons(now).map((event) => [event.id, event]));
  for (const event of events) byId.set(event.id, { ...byId.get(event.id), ...event });
  return [...byId.values()];
}
