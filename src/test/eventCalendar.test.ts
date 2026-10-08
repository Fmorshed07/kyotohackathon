import { describe, expect, it } from "vitest";
import { buildEventCalendar } from "@/lib/eventCalendar";

const event = { id: "elevenlabs-meetup-tokyo-2026", name: "Tokyo, creative; meetup", location: "Tokyo\nJapan", summary: "Build a video", lumaUrl: "https://luma.com/1phsvlq5", startAt: "2026-10-09T18:00:00+09:00", endAt: "2026-10-09T22:00:00+09:00" };
describe("event calendar", () => {
  it("uses the verified UTC time and escapes calendar text", () => {
    const calendar = buildEventCalendar(event, new Date("2026-10-08T15:00:00Z"));
    expect(calendar).toContain("DTSTART:20261009T090000Z\r\nDTEND:20261009T130000Z");
    expect(calendar).toContain("SUMMARY:Tokyo\\, creative\\; meetup");
    expect(calendar).toContain("LOCATION:Tokyo\\nJapan");
    expect(calendar).toContain("URL:https://luma.com/1phsvlq5");
  });
  it("does not offer a calendar for invalid or reversed dates", () => {
    expect(buildEventCalendar({ ...event, startAt: "" })).toBeNull();
    expect(buildEventCalendar({ ...event, endAt: event.startAt })).toBeNull();
  });
});
