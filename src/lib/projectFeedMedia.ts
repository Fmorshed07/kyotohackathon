export type ProjectFeedVideo =
  | { kind: "native"; url: string }
  | { kind: "youtube"; url: string; id: string }
  | { kind: "vimeo"; url: string; id: string; hash?: string }
  | { kind: "loom" | "drive"; url: string; id: string };

/** Only web URLs are accepted; provider hosts are checked exactly before embedding. */
export function projectFeedHttpUrl(value?: string | null): string {
  const input = value?.trim();
  if (!input || /^(?!https?:)[a-z][a-z\d+.-]*:/i.test(input)) return "";
  try {
    const url = new URL(/^https?:\/\//i.test(input) ? input : `https://${input}`);
    if (!/^https?:$/.test(url.protocol) || url.username || url.password || !url.hostname.includes(".")) return "";
    return url.toString();
  } catch {
    return "";
  }
}

export function getProjectFeedVideo(value?: string | null): ProjectFeedVideo | null {
  const normalized = projectFeedHttpUrl(value);
  if (!normalized) return null;
  const url = new URL(normalized);
  const host = url.hostname.toLowerCase();
  const path = url.pathname.split("/").filter(Boolean);
  let youtubeId = "";
  if (host === "youtu.be" || host === "www.youtu.be") youtubeId = path.length === 1 ? path[0] : "";
  if (["youtube.com", "www.youtube.com", "m.youtube.com", "youtube-nocookie.com", "www.youtube-nocookie.com"].includes(host)) {
    if (url.pathname === "/watch") youtubeId = url.searchParams.get("v") ?? "";
    if (["embed", "shorts", "live"].includes(path[0]) && path.length === 2) youtubeId = path[1];
  }
  if (/^[\w-]{11}$/.test(youtubeId)) return { kind: "youtube", id: youtubeId, url: `https://www.youtube.com/watch?v=${youtubeId}` };
  if (["vimeo.com", "www.vimeo.com", "player.vimeo.com"].includes(host)) {
    const id = host === "player.vimeo.com" && path[0] === "video" ? path[1] : path[0];
    const hash = url.searchParams.get("h") ?? (host !== "player.vimeo.com" ? path[1] : undefined);
    const validPath = host === "player.vimeo.com" ? path.length === 2 : path.length <= 2;
    if (validPath && /^\d{1,12}$/.test(id ?? "") && (!hash || /^[a-z\d]+$/i.test(hash))) {
      return { kind: "vimeo", id, url: normalized, ...(hash ? { hash } : {}) };
    }
  }
  if (["loom.com", "www.loom.com"].includes(host) && ["share", "embed"].includes(path[0]) && path.length === 2 && /^[a-f\d]{32}$/i.test(path[1])) {
    return { kind: "loom", url: `https://www.loom.com/share/${path[1]}`, id: path[1] };
  }
  if (host === "drive.google.com" && path[0] === "file" && path[1] === "d" && /^[\w-]{10,100}$/.test(path[2] ?? "") && (path.length === 3 || (path.length === 4 && ["view", "preview", "edit"].includes(path[3])))) {
    return { kind: "drive", url: `https://drive.google.com/file/d/${path[2]}/view`, id: path[2] };
  }
  if (/\.(mp4|webm|ogg|ogv|m4v)$/i.test(url.pathname)) return { kind: "native", url: normalized };
  return null;
}

export function projectFeedEmbedUrl(video: ProjectFeedVideo, options: { autoplay: boolean; muted: boolean; origin?: string }): string {
  if (video.kind === "native") return video.url;
  // These providers offer inline playback through their own controls.
  if (video.kind === "loom") return `https://www.loom.com/embed/${video.id}`;
  if (video.kind === "drive") return `https://drive.google.com/file/d/${video.id}/preview`;
  const url = new URL(video.kind === "youtube"
    ? `https://www.youtube-nocookie.com/embed/${video.id}`
    : `https://player.vimeo.com/video/${video.id}`);
  url.searchParams.set("autoplay", options.autoplay ? "1" : "0");
  url.searchParams.set(video.kind === "youtube" ? "mute" : "muted", options.muted ? "1" : "0");
  url.searchParams.set("playsinline", "1");
  if (video.kind === "youtube") {
    url.searchParams.set("enablejsapi", "1");
    url.searchParams.set("rel", "0");
    if (options.origin) url.searchParams.set("origin", options.origin);
  } else {
    url.searchParams.set("dnt", "1");
    if (video.kind === "vimeo" && video.hash) url.searchParams.set("h", video.hash);
  }
  return url.toString();
}
