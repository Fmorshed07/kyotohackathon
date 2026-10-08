import type { HostedHackathon } from "@/lib/aiHackathons";

const escapeText = (value: string) => value.replace(/\\/g, "\\\\").replace(/\r?\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");
const calendarDate = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
};

export function buildEventCalendar(event: Pick<HostedHackathon, "id" | "name" | "location" | "summary" | "lumaUrl" | "startAt" | "endAt">, now = new Date()): string | null {
  const start = calendarDate(event.startAt ?? "");
  const end = calendarDate(event.endAt ?? "");
  if (!start || !end || end <= start) return null;
  return [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Cognisor//Community Events//EN", "CALSCALE:GREGORIAN", "BEGIN:VEVENT",
    `UID:${escapeText(event.id)}@cognisorai.com`, `DTSTAMP:${calendarDate(now.toISOString())}`, `DTSTART:${start}`, `DTEND:${end}`,
    `SUMMARY:${escapeText(event.name)}`, `LOCATION:${escapeText(event.location)}`,
    `DESCRIPTION:${escapeText(`${event.summary}\nRegistration and latest details: ${event.lumaUrl}`)}`,
    `URL:${event.lumaUrl}`, "END:VEVENT", "END:VCALENDAR", "",
  ].join("\r\n");
}

export function downloadEventCalendar(event: HostedHackathon) {
  const content = buildEventCalendar(event);
  if (!content) return;
  const url = URL.createObjectURL(new Blob([content], { type: "text/calendar;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `${event.id}.ics`;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
