import { useState } from "react";
import type { HostedHackathon } from "@/lib/aiHackathons";
import { communityEventCity } from "@/lib/communityEcosystem";

export function CommunityEventArt({ event, preferPhoto = false }: { event: HostedHackathon; preferPhoto?: boolean }) {
  const [failed, setFailed] = useState("");
  const photo = preferPhoto ? event.galleryUrls?.[0] : "";
  const src = photo || event.coverImageUrl || event.bannerImageUrl;
  return src && failed !== src ? <div className={`community-event-art${photo ? " is-photo" : ""}`}><img src={src} alt="" loading="lazy" decoding="async" onError={() => setFailed(src)} /></div>
    : <div className="community-event-art is-fallback" aria-hidden="true"><span className="event-fallback-graphic" /><div className="event-fallback-copy"><small>Cognisor / {communityEventCity(event)}</small><strong>{event.shortName || event.name}<br />{event.name.match(/20\d{2}/)?.[0] || "Build together"}</strong></div></div>;
}
