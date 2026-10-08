import type { HostEventBriefForm } from "./hostEventBriefForm";

export type LumaEventDetails = Omit<HostEventBriefForm, "accentColor" | "fontPreset" | "layoutStyle">;

export type LumaEventImport = {
  sourceUrl: string;
  timezone: string;
  /** startAt/endAt are ISO timestamps; convert to local time only in the editor. */
  details: LumaEventDetails;
  warnings: string[];
};

/** The same allowlist is used before fetching the page and on every redirect. */
export function normalizeLumaEventUrl(input: string): string {
  const raw = input.trim();
  if (!raw || raw.length > 2048) throw new Error("Enter a Luma event link, such as https://luma.com/your-event.");
  let url: URL;
  try {
    url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
  } catch {
    throw new Error("Enter a valid Luma event link.");
  }
  const hostname = url.hostname.toLowerCase().replace(/^www\./, "");
  if (
    url.protocol !== "https:" || url.username || url.password || url.port ||
    !["luma.com", "lu.ma"].includes(hostname) ||
    !/^\/[a-zA-Z0-9_-]{3,100}\/?$/.test(url.pathname)
  ) {
    throw new Error("Use an HTTPS event link from luma.com or lu.ma.");
  }
  url.hostname = hostname;
  url.pathname = url.pathname.replace(/\/$/, "");
  url.search = "";
  url.hash = "";
  return url.toString();
}
