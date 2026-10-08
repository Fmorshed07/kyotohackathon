import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LUMA_CALENDAR_ARCHIVE, LUMA_CALENDAR_URL } from "@/data/lumaCalendarArchive";
import { getLumaArchiveUrl, mergeLumaCalendarArchive } from "@/lib/lumaCalendarArchive";
import { getEventPreviews } from "@/lib/eventPreviews";
import { communityEventCity, communityEventHref, communityEventKind } from "@/lib/communityEcosystem";
import { portalHackathonAsHosted } from "@/lib/aiHackathons";
import { PORTAL_HACKATHONS } from "@/lib/hackathons";
import PastEventsSection from "@/components/sections/PastEventsSection";

const NOW = Date.parse("2026-10-09T00:00:00Z");
const archives = () => mergeLumaCalendarArchive([], NOW);
beforeEach(() => { vi.spyOn(Date, "now").mockReturnValue(NOW); });
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe("verified public Luma archive", () => {
  it("includes all ten past calendar URLs with artwork, valid dates, and closed registration", () => {
    const entries = archives();
    expect(entries).toHaveLength(10);
    expect(new Set(entries.map(getLumaArchiveUrl)).size).toBe(10);
    expect(entries.map(event => event.lumaUrl)).toEqual(LUMA_CALENDAR_ARCHIVE.map(entry => `https://luma.com/${entry.slug}`));
    for (const event of entries) {
      expect(event.coverImageUrl).toMatch(/^https:\/\/images\.lumacdn\.com\//);
      expect(Date.parse(event.startAt!)).toBeLessThan(Date.parse(event.endAt!));
      expect(Date.parse(event.endAt!)).toBeLessThan(NOW);
      expect(event.registrationStatus).toBe("closed");
      expect(event.submissionMode).toBe("closed");
      expect(communityEventHref(event)).toBe(event.lumaUrl);
    }
    expect(getEventPreviews(entries, NOW)).toMatchObject({ live: [], upcoming: [], past: entries });
  });

  it("uses actual end boundaries and never adds future or live source entries to a past-only snapshot", () => {
    const first = LUMA_CALENDAR_ARCHIVE.at(-1)!;
    const end = Date.parse(first.endAt);
    expect(mergeLumaCalendarArchive([], end - 1)).toEqual([]);
    expect(mergeLumaCalendarArchive([], end).map(event => event.lumaUrl)).toEqual([`https://luma.com/${first.slug}`]);
    expect(archives().map(event => event.lumaUrl)).not.toContain("https://luma.com/1phsvlq5");
  });

  it("deduplicates existing portal IDs, keeps authored artwork, and fills undated legacy entries", () => {
    const entries = archives();
    const ideathon = { ...entries[2], id: "ai-ideathon-2026-q9pxii", lumaUrl: "", sourceUrl: "", createdBy: "organiser", coverImageUrl: "/custom-poster.png", summary: "Organiser description" };
    const dhaka = portalHackathonAsHosted(PORTAL_HACKATHONS.find(event => event.id === "impact-dhaka")!);
    const input = [ideathon, dhaka];
    const original = structuredClone(input);
    const result = mergeLumaCalendarArchive(input, NOW);
    expect(result).toHaveLength(10);
    expect(result.find(event => event.id === ideathon.id)).toMatchObject({ coverImageUrl: "/custom-poster.png", summary: "Organiser description", lumaUrl: "https://luma.com/e56k7x3v" });
    expect(result.find(event => event.id === "impact-dhaka")).toMatchObject({ eventDate: "Apr 10, 2026", timezone: "Asia/Dhaka", lumaUrl: "https://luma.com/cnged4tc" });
    expect(input).toEqual(original);
    expect(mergeLumaCalendarArchive(result, NOW)).toEqual(result);
  });

  it("deduplicates lu.ma URLs with tracking parameters and identical names under new IDs", () => {
    const entries = archives();
    const byUrl = { ...entries[0], id: "renamed-event", name: "Updated event title", lumaUrl: "https://lu.ma/sorwsk0c/?utm_source=website#details", sourceUrl: "" };
    const duplicate = { ...entries[0], id: "duplicate" };
    const byName = { ...entries[1], id: "new-workshop-id", lumaUrl: "", sourceUrl: "" };
    const result = mergeLumaCalendarArchive([byUrl, duplicate, byName], NOW);
    expect(result).toHaveLength(10);
    expect(result[0]).toMatchObject({ id: "renamed-event", name: "Updated event title", lumaUrl: "https://luma.com/sorwsk0c" });
    expect(result[1].id).toBe("new-workshop-id");
  });

  it("never exposes unpublished portal fields or restores a hidden portal route", () => {
    const hidden = { ...archives().find(event => event.lumaUrl.endsWith("cmevass2"))!, id: "impact-kyoto", published: false, name: "Private draft title", location: "Private venue" };
    const result = mergeLumaCalendarArchive([hidden], NOW);
    expect(result.some(event => event.id === "impact-kyoto" || event.name === hidden.name || event.location === hidden.location)).toBe(false);
    const publicEntry = result.find(event => event.id === "luma-cmevass2")!;
    expect(communityEventHref(publicEntry)).toBe("https://luma.com/cmevass2");
    expect(publicEntry.location).toBe("Kyoto, Japan · Venue shared with registered guests");
  });

  it("does not merge a recurring event with the same title but a different date", () => {
    const nextEdition = { ...archives()[6], id: "another-sprint", lumaUrl: "", sourceUrl: "", startAt: "2026-12-01T08:00:00Z", endAt: "2026-12-01T10:00:00Z" };
    const result = mergeLumaCalendarArchive([nextEdition], NOW);
    expect(result).toHaveLength(11);
    expect(result.filter(event => event.name === nextEdition.name)).toHaveLength(2);
  });

  it("keeps fresh organiser dates authoritative if an archived event is rescheduled", () => {
    const rescheduled = { ...archives()[0], createdBy: "organiser", startAt: "2026-11-01T00:00:00Z", endAt: "2026-11-01T02:00:00Z" };
    const result = getEventPreviews(mergeLumaCalendarArchive([rescheduled], NOW), NOW);
    expect(result.upcoming).toHaveLength(1);
    expect(result.past).toHaveLength(9);
    expect(result.upcoming[0].startAt).toBe(rescheduled.startAt);
  });

  it("classifies Japan, online, Dhaka, workshops, and designathons correctly", () => {
    const entries = archives();
    expect(entries.filter(event => communityEventCity(event) === "Tokyo")).toHaveLength(6);
    expect(entries.filter(event => communityEventCity(event) === "Online")).toHaveLength(2);
    expect(entries.filter(event => communityEventKind(event) === "Workshops")).toHaveLength(2);
    expect(entries.filter(event => communityEventKind(event) === "Hackathons")).toHaveLength(5);
    expect(getLumaArchiveUrl({ lumaUrl: "https://evil.example/sorwsk0c" })).toBe("");
    expect(getLumaArchiveUrl({ lumaUrl: "javascript:alert(1)" })).toBe("");
    expect(getLumaArchiveUrl({ lumaUrl: "https://luma.com@evil.example/sorwsk0c" })).toBe("");
  });
});

describe("past-event previews", () => {
  const show = () => render(<MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><PastEventsSection events={archives()} /></MemoryRouter>);
  it("expands all ten previews, exposes direct Luma links, and collapses without losing the toggle", () => {
    show();
    expect(screen.getAllByRole("article")).toHaveLength(3);
    expect(screen.getByRole("link", { name: "Browse past events" })).toHaveAttribute("href", "/work?status=past");
    expect(screen.getByRole("link", { name: "From the Cognisor Luma calendar" })).toHaveAttribute("href", LUMA_CALENDAR_URL);
    fireEvent.click(screen.getByRole("button", { name: "Show all 10 past events" }));
    expect(screen.getAllByRole("article")).toHaveLength(10);
    expect(screen.getByRole("status")).toHaveTextContent("Showing 10 of 10 past events");
    const links = screen.getAllByRole("link", { name: "View on Luma" });
    expect(links.map(link => link.getAttribute("href"))).toEqual(archives().map(event => event.lumaUrl));
    for (const link of links) {
      expect(link).toHaveAttribute("target", "_blank");
      expect(link).toHaveAttribute("rel", "noopener noreferrer");
    }
    expect(screen.queryByRole("link", { name: /register|join waitlist/i })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Show fewer events" }));
    expect(screen.getAllByRole("article")).toHaveLength(3);
    expect(screen.getByRole("button", { name: "Show all 10 past events" })).toHaveAttribute("aria-expanded", "false");
  });
  it("keeps the event preview usable when a remote poster fails", () => {
    show();
    const card = screen.getAllByRole("article")[0];
    fireEvent.error(card.querySelector("img")!);
    expect(card.querySelector("img")).toBeNull();
    expect(within(card).getByRole("link", { name: "View on Luma" })).toHaveAttribute("href", "https://luma.com/sorwsk0c");
  });
});
