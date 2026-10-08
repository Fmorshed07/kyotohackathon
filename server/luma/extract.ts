import type { LumaEventDetails, LumaEventImport } from "../../src/lib/lumaEventImportTypes";

type RecordValue = Record<string, unknown>;
const record = (value: unknown): RecordValue => value && typeof value === "object" && !Array.isArray(value) ? value as RecordValue : {};
const list = (value: unknown): unknown[] => Array.isArray(value) ? value : value == null ? [] : [value];
const text = (value: unknown): string => typeof value === "string" ? value.trim() : "";

function decodeHtml(value: string): string {
  return value.replace(/&(#x[\da-f]+|#\d+|amp|quot|apos|lt|gt|nbsp);/gi, (match, entity: string) => {
    if (entity.startsWith("#")) {
      const code = entity[1].toLowerCase() === "x" ? parseInt(entity.slice(2), 16) : parseInt(entity.slice(1), 10);
      return code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : match;
    }
    return ({ amp: "&", quot: '"', apos: "'", lt: "<", gt: ">", nbsp: " " } as Record<string, string>)[entity.toLowerCase()] || match;
  });
}

function plainHtml(value: string): string {
  return decodeHtml(value.replace(/<\/(?:p|div|h[1-6]|li)>/gi, "\n\n").replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]*>/g, ""))
    .replace(/\u200b/g, "").replace(/\n{3,}/g, "\n\n").trim();
}

function safeDescription(value: string): string {
  return value.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, label: string, href: string) => {
    const url = httpsUrl(href);
    return url ? `${label} (${url})` : label;
  });
}

function httpsUrl(value: unknown): string {
  try {
    const url = new URL(text(value));
    return url.protocol === "https:" && !url.username && !url.password ? url.toString() : "";
  } catch { return ""; }
}

function isoDate(value: unknown): string {
  const source = text(value);
  // A timezone is required, otherwise Node would silently use the server's timezone.
  if (!/T.*(?:Z|[+-]\d{2}:?\d{2})$/i.test(source)) return "";
  const date = new Date(source);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString();
}

function attributes(tag: string): Record<string, string> {
  return Object.fromEntries(Array.from(tag.matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g), (m) => [m[1].toLowerCase(), decodeHtml(m[2] ?? m[3])]));
}

function schemaEvent(value: unknown): RecordValue | null {
  for (const item of list(value)) {
    const node = record(item);
    if (list(node["@type"]).some((type) => /Event$/.test(text(type)))) return node;
    if (node["@graph"]) {
      const found = schemaEvent(node["@graph"]);
      if (found) return found;
    }
  }
  return null;
}

function documentText(value: unknown, depth = 0): string {
  if (depth > 30) return "";
  const node = record(value);
  const type = text(node.type);
  if (type === "text") {
    const content = text(node.text);
    const link = list(node.marks).map(record).find((mark) => mark.type === "link");
    const href = httpsUrl(record(link?.attrs).href);
    // Keep links as plain text: imported content is never executed or rendered as HTML.
    return href && !content.includes(href) ? `${content} (${href})` : typeof node.text === "string" ? node.text : "";
  }
  if (type === "hard_break" || type === "hardBreak") return "\n";
  const content = list(node.content).map((child) => documentText(child, depth + 1)).join("");
  if (type === "heading") return `\n\n## ${content.trim()}\n\n`;
  if (type === "list_item" || type === "listItem") return `- ${content.trim()}\n`;
  if (["paragraph", "blockquote", "bullet_list", "ordered_list", "bulletList", "orderedList", "table_row", "tableRow"].includes(type)) return `${content}\n\n`;
  return content;
}

function documentAssets(value: unknown, images: Set<string>, links: Array<{ label: string; url: string }>, depth = 0) {
  if (depth > 30) return;
  const node = record(value);
  if (node.type === "image") {
    const url = httpsUrl(record(node.attrs).src);
    if (url) images.add(url);
  }
  for (const mark of list(node.marks).map(record)) {
    const url = mark.type === "link" ? httpsUrl(record(mark.attrs).href) : "";
    if (url) links.push({ label: text(node.text), url });
  }
  list(node.content).forEach((child) => documentAssets(child, images, links, depth + 1));
}

const cleanLine = (line: string) => line.replace(/^[#\s•*-]+/, "").replace(/\*\*/g, "").trim();
const sectionHeading = /^(?:theme|event details|event schedule|schedule|programme|agenda|prizes?|prize pool|what you will experience|judging criteria|who can participate\??|eligibility|organizers?|organisers?|sponsors(?:\/tools)?|awards|judges|rules|requirements|focus areas)\s*:?$/i;

function labelledField(lines: string[], label: RegExp): string {
  for (let index = 0; index < lines.length; index++) {
    const line = cleanLine(lines[index]);
    const colon = line.indexOf(":");
    if (colon >= 0 && label.test(line.slice(0, colon).trim())) return line.slice(colon + 1).trim();
    if (label.test(line) && lines[index + 1] && !sectionHeading.test(cleanLine(lines[index + 1]))) return cleanLine(lines[index + 1]);
  }
  return "";
}

function section(lines: string[], heading: RegExp): string[] {
  const start = lines.findIndex((line) => heading.test(cleanLine(line)));
  if (start < 0) return [];
  const end = lines.findIndex((line, index) => index > start && sectionHeading.test(cleanLine(line)));
  return lines.slice(start + 1, end < 0 ? undefined : end);
}

function descriptionSchedule(lines: string[]): LumaEventDetails["schedule"] {
  const programme = section(lines, /^(?:event schedule|schedule|programme|agenda)\s*:?$/i);
  const result: LumaEventDetails["schedule"] = [];
  let time = "";
  let sessionType = "";
  let current: LumaEventDetails["schedule"][number] | null = null;
  const dateLine = /^(?:📅\s*)?(?:day\s+\d+\b|(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+\d{1,2}\b|\d{1,2}:\d{2}\b)/i;
  for (const raw of programme) {
    const line = cleanLine(raw);
    if (/^[━─⸻—-]+$/.test(line)) continue;
    if (dateLine.test(line)) { time = line; current = null; continue; }
    if (/^(?:🎤|🛠|🛠️)?\s*(?:webinar|workshop|fireside chat|keynote|panel)\s*$/i.test(line)) { sessionType = line; current = null; continue; }
    if (/^#{1,3}\s/.test(raw) || (sessionType && !current)) {
      current = { time: [time, sessionType].filter(Boolean).join(" · "), title: line, description: "" };
      result.push(current);
      sessionType = "";
    } else if (current) {
      current.description += `${current.description ? "\n\n" : ""}${line}`;
    }
  }
  return result.slice(0, 30);
}

function venue(location: unknown): string {
  return list(location).map((value) => {
    if (typeof value === "string") return value;
    const place = record(value);
    if (text(place["@type"]) === "VirtualLocation") return text(place.name) || "Online";
    const address = record(place.address);
    return [text(place.name), typeof place.address === "string" ? place.address : [address.streetAddress, address.addressLocality, address.addressRegion, address.addressCountry].map(text).filter(Boolean).join(", ")].filter(Boolean).join(" · ");
  }).filter(Boolean).join(" / ");
}

export function extractLumaEvent(html: string, sourceUrl: string): LumaEventImport {
  let schema: RecordValue = {};
  let data: RecordValue = {};
  const meta: Record<string, string> = {};
  for (const match of html.matchAll(/<meta\b[^>]*>/gi)) {
    const attrs = attributes(match[0]);
    if (attrs.property || attrs.name) meta[attrs.property || attrs.name] = attrs.content || "";
  }
  for (const match of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
    const attrs = attributes(match[1]);
    if (attrs.id !== "__NEXT_DATA__" && attrs.type !== "application/ld+json") continue;
    let json: unknown;
    try { json = JSON.parse(match[2]); } catch { continue; }
    if (attrs.id === "__NEXT_DATA__") {
      const props = record(record(json).props);
      const initial = record(record(props.pageProps).initialData ?? props.initialData);
      if (initial.kind === "event") data = record(initial.data);
    } else {
      schema = schemaEvent(json) || schema;
    }
  }
  const event = record(data.event);
  const name = text(event.name) || text(schema.name);
  if (!name) throw new Error("No public event details found. Check that this link opens a Luma event page.");
  const mirror = data.description_mirror ?? event.description_mirror;
  const description = safeDescription(documentText(mirror).replace(/\u200b/g, "").replace(/\n{3,}/g, "\n\n").trim() || plainHtml(text(event.description_md) || text(schema.description) || meta["og:description"] || "")).slice(0, 60000);
  const lines = description.split(/\n/).map((line) => line.trim()).filter(Boolean);
  const images = new Set<string>();
  const links: Array<{ label: string; url: string }> = [];
  documentAssets(mirror, images, links);
  const organizers = list(schema.organizer).map(record);
  const calendar = record(data.calendar);
  const coverImageUrl = httpsUrl(event.cover_url) || httpsUrl(list(schema.image)[0]) || httpsUrl(meta["og:image"]);
  const address = record(event.geo_address_info);
  const geoLocation = [address.name, address.address, address.city, address.region, address.country].map(text).filter(Boolean).join(", ");
  const attendance = text(schema.eventAttendanceMode);
  const format = labelledField(lines, /^(?:format|platform)$/i) || (attendance.includes("Mixed") ? "Hybrid" : attendance.includes("Online") || event.location_type === "online" ? "Online" : attendance.includes("Offline") || geoLocation ? "In person" : "");
  const capacity = event.max_capacity ?? data.max_capacity ?? schema.maximumAttendeeCapacity;
  const sessions = list(data.sessions).map(record).map((session) => {
    const item = record(session.event ?? session);
    return { time: text(item.start_at) || text(item.time), title: text(item.name) || text(item.title), description: plainHtml(text(item.description)) };
  }).filter((item) => item.title).slice(0, 30);
  const rulebookLine = labelledField(lines, /^(?:rulebook(?: url| link)?|rules link|guidelines link)$/i).match(/https:\/\/[^\s)]+/);
  const details: LumaEventDetails = {
    name,
    tagline: text(event.tagline) || (lines[0] && cleanLine(lines[0]) === name ? cleanLine(lines[1] || "") : ""),
    description,
    theme: labelledField(lines, /^theme$/i),
    format,
    eligibility: labelledField(lines, /^eligibility$/i),
    teamSize: labelledField(lines, /^team size$/i),
    prize: labelledField(lines, /^prizes?$/i) || section(lines, /^(?:prizes?|prize pool)\s*:?$/i).map(cleanLine).join("\n").slice(0, 6000),
    rulebookUrl: rulebookLine ? httpsUrl(rulebookLine[0]) : links.find((link) => /rulebook|rules|guidelines|handbook/i.test(link.label))?.url || "",
    registrationUrl: sourceUrl,
    highlightNote: "",
    focusAreas: labelledField(lines, /^focus areas$/i),
    schedule: sessions.length ? sessions : descriptionSchedule(lines),
    coverImageUrl,
    bannerImageUrl: "",
    logoUrl: httpsUrl(calendar.avatar_url) || httpsUrl(organizers.find((item) => item["@type"] === "Organization")?.image),
    galleryUrls: Array.from(images).filter((image) => image !== coverImageUrl).slice(0, 24),
    // Featured guests on Luma are attendees, not speakers. Only import explicit performers.
    guests: list(schema.performer).map(record).filter((person) => text(person.name)).slice(0, 24).map((person) => ({ name: text(person.name), role: text(person.jobTitle), bio: plainHtml(text(person.description)), imageUrl: httpsUrl(person.image) })),
    organizerName: text(calendar.name) || organizers.map((item) => text(item.name)).filter(Boolean).join(", "),
    startAt: isoDate(event.start_at) || isoDate(schema.startDate),
    endAt: isoDate(event.end_at) || isoDate(schema.endDate),
    location: venue(schema.location) || geoLocation || (format === "Online" ? "Online" : ""),
    capacity: typeof capacity === "number" && Number.isFinite(capacity) && capacity > 0 ? String(Math.floor(capacity)) : "",
  };
  const warnings = [];
  if (!details.startAt) warnings.push("Start time was not available. Add it before creating the draft.");
  if (!details.location) warnings.push("The venue is not public. Confirm the location before creating the draft.");
  if (!details.capacity) warnings.push("Capacity was not published. Set it if you want to limit ticket issuance.");
  return { sourceUrl, timezone: text(event.timezone), details, warnings };
}
