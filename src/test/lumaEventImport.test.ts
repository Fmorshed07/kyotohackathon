import { afterEach, describe, expect, it, vi } from "vitest";
import { extractLumaEvent } from "../../server/luma/extract";
import { normalizeLumaEventUrl } from "@/lib/lumaEventImportTypes";
import { importLumaEvent, lumaImportToForm } from "@/lib/lumaEventImport";
import { emptyHostEventBriefForm } from "@/lib/hostEventBriefForm";

const getIdToken = vi.fn().mockResolvedValue("test-token");
vi.mock("@/lib/firebaseClient", () => ({ getFirebaseAuth: () => ({ currentUser: { getIdToken } }) }));
afterEach(() => { vi.unstubAllGlobals(); vi.clearAllMocks(); });

const page = (schema: unknown, data?: unknown) => `<html><script type="application/ld+json">${JSON.stringify(schema)}</script>${data ? `<script id="__NEXT_DATA__" type="application/json">${JSON.stringify({ props: { pageProps: { initialData: data } } })}</script>` : ""}</html>`;
const event = {
  "@type": "Event", name: "Community AI Weekend",
  description: "A weekend for local builders.",
  startDate: "2026-10-17T14:00:00+09:00", endDate: "2026-10-17T18:00:00+09:00",
  location: { "@type": "Place", name: "Kyoto Studio", address: { streetAddress: "10 Test Street", addressLocality: "Kyoto", addressCountry: "Japan" } },
  eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
  image: ["https://images.lumacdn.com/cover.png"],
  organizer: [{ "@type": "Organization", name: "Community Lab", image: "https://images.lumacdn.com/logo.png" }],
};
const paragraph = (text: string) => ({ type: "paragraph", content: [{ type: "text", text }] });
const heading = (text: string) => ({ type: "heading", content: [{ type: "text", text }] });

describe("Luma link validation", () => {
  it("accepts both Luma domains and strips tracking parameters", () => {
    expect(normalizeLumaEventUrl("lu.ma/ai-weekend?utm_source=invite#details")).toBe("https://lu.ma/ai-weekend");
    expect(normalizeLumaEventUrl("https://www.luma.com/ai-weekend/")).toBe("https://luma.com/ai-weekend");
  });
  it.each(["https://evil.test/event", "https://luma.com.evil.test/event", "https://luma.com@127.0.0.1/event", "https://127.0.0.1/event", "http://luma.com/event", "https://luma.com:8080/event", "https://luma.com/calendar/manage", "https://luma.com/", "https://luma.com/user/person"])("rejects unsafe or non-event URL %s", (url) => {
    expect(() => normalizeLumaEventUrl(url)).toThrow();
  });
});

describe("public Luma extraction", () => {
  it("imports structured event data and preserves the timestamp's offset", () => {
    const result = extractLumaEvent(page({ "@graph": [event] }), "https://luma.com/ai-weekend");
    expect(result.details).toMatchObject({ name: event.name, description: event.description, startAt: "2026-10-17T05:00:00.000Z", endAt: "2026-10-17T09:00:00.000Z", location: "Kyoto Studio · 10 Test Street, Kyoto, Japan", organizerName: "Community Lab", format: "In person", coverImageUrl: event.image[0], capacity: "", registrationUrl: result.sourceUrl });
    expect(result.details.teamSize).toBe("");
    expect(result.warnings).toContain("Capacity was not published. Set it if you want to limit ticket issuance.");
  });

  it("uses Luma's full document for programme, links, images, theme, and participation", () => {
    const result = extractLumaEvent(page(event, { kind: "event", data: {
      event: { name: event.name, start_at: "2026-10-17T05:00:00.000Z", timezone: "Asia/Tokyo", cover_url: event.image[0] },
      calendar: { name: "Community Lab" },
      featured_guests: [{ name: "Attendee", bio_short: "A guest" }],
      ticket_types: [{ max_capacity: 200 }],
      description_mirror: { type: "doc", content: [
        paragraph(event.name), heading("Build together"),
        heading("Theme"), paragraph("AI for the community"), paragraph("Team Size: 1 to 4 Members"), paragraph("Eligibility: Everyone welcome"),
        heading("Event Schedule"), paragraph("📅 October 17"), paragraph("🎤 Webinar"), heading("Introduction to AI"), paragraph("Build your first prototype."), heading("Demo session"), paragraph("Share what you made."),
        heading("Prize Pool"), paragraph("Community tool credits"), heading("Organizers"), paragraph("Community Lab"),
        { type: "image", attrs: { src: "https://images.lumacdn.com/programme.png" } },
        { type: "paragraph", content: [{ type: "text", text: "Rulebook", marks: [{ type: "link", attrs: { href: "https://example.com/rules" } }] }] },
      ] },
    } }), "https://luma.com/ai-weekend");
    expect(result.details).toMatchObject({ tagline: "Build together", theme: "AI for the community", eligibility: "Everyone welcome", teamSize: "1 to 4 Members", prize: "Community tool credits", rulebookUrl: "https://example.com/rules", galleryUrls: ["https://images.lumacdn.com/programme.png"] });
    expect(result.details.schedule).toEqual([
      { time: "📅 October 17 · 🎤 Webinar", title: "Introduction to AI", description: "Build your first prototype." },
      { time: "📅 October 17", title: "Demo session", description: "Share what you made." },
    ]);
    expect(result.details.guests).toEqual([]);
    expect(result.details.capacity).toBe(""); // Ticket capacity is not the total event capacity.
    expect(result.timezone).toBe("Asia/Tokyo");
    expect(result.details.description).toContain("Rulebook (https://example.com/rules)");
  });

  it("does not invent timezones or venue details", () => {
    const result = extractLumaEvent(page({ ...event, startDate: "2026-10-17T14:00:00", endDate: "", location: undefined, eventAttendanceMode: undefined }), "https://luma.com/ai-weekend");
    expect(result.details.startAt).toBe("");
    expect(result.details.location).toBe("");
    expect(result.warnings).toHaveLength(3);
  });

  it("does not import calendar or sign-in pages as events", () => {
    expect(() => extractLumaEvent('<meta property="og:title" content="Sign in to Luma"><script type="application/ld+json">{"@type":"Organization","name":"A calendar"}</script>', "https://luma.com/calendar")).toThrow("No public event details found");
  });

  it("decodes metadata and ignores invalid scripts and unsafe image/link URLs", () => {
    const result = extractLumaEvent(`<meta property='og:image' content='https://images.lumacdn.com/a.png?x=1&amp;y=2'><script type='application/ld+json'>broken</script>${page({ ...event, image: "javascript:alert(1)", description: "<p>Join &amp; build</p>\n\n[Unsafe](javascript:alert)" })}`, "https://luma.com/ai-weekend");
    expect(result.details.description).toBe("Join & build\n\nUnsafe");
    expect(result.details.coverImageUrl).toBe("https://images.lumacdn.com/a.png?x=1&y=2");
  });

  it("converts dates to editor local time and retains our blue branding without fabricated defaults", () => {
    const result = extractLumaEvent(page(event), "https://luma.com/ai-weekend");
    const form = lumaImportToForm(result);
    expect(new Date(form.startAt).toISOString()).toBe(result.details.startAt);
    expect(new Date(form.endAt).toISOString()).toBe(result.details.endAt);
    expect(form.accentColor).toBe(emptyHostEventBriefForm().accentColor);
    expect(form.capacity).toBe("");
    expect(form.registrationUrl).toBe(result.sourceUrl);
  });
});

describe("authenticated browser import", () => {
  it("sends the Firebase token to the same-origin endpoint", async () => {
    const result = extractLumaEvent(page(event), "https://luma.com/ai-weekend");
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ event: result }) });
    vi.stubGlobal("fetch", fetchMock);
    await expect(importLumaEvent("https://luma.com/ai-weekend")).resolves.toEqual(result);
    expect(fetchMock).toHaveBeenCalledWith("/api/luma-event-import", expect.objectContaining({ method: "POST", headers: { Authorization: "Bearer test-token", "Content-Type": "application/json" } }));
  });
  it("shows a useful error when a static server returns HTML instead of the API response", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => { throw new Error("Not JSON"); } }));
    await expect(importLumaEvent("https://luma.com/ai-weekend")).rejects.toThrow("Could not import this Luma event");
  });
});
