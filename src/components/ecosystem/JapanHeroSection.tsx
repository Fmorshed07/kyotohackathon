import { useState } from "react";
import { ArrowDown, ArrowRight, ArrowUpRight, Pause, Play } from "lucide-react";
import { useAmbientMotion } from "@/hooks/useAmbientMotion";
import { JAPAN_CITIES, type JapanCity } from "@/lib/communityEcosystem";
import JapanMap from "./JapanMap";
import { CommunityLink } from "./CommunityLink";
import "./ecosystem.css";

export default function JapanHeroSection({ asSection = false }: { asSection?: boolean }) {
  const Heading = asSection ? "h2" : "h1";
  const [city, setCity] = useState<JapanCity>(JAPAN_CITIES[0]);
  const { ref, running, paused, setPaused } = useAmbientMotion();
  return <section ref={ref} id="japan-community" className="ecosystem-hero" aria-labelledby="japan-hero-title" data-motion={running ? "on" : "off"}>
    <div className="ecosystem-hero-top"><span><i aria-hidden="true" />Cognisor · Japan community</span><span>From a first idea to a lasting impact.</span></div>
    <div className="ecosystem-hero-grid"><div className="ecosystem-hero-copy"><p className="eco-eyebrow">People. Ideas. Impact.</p><Heading className="ecosystem-hero-title" id="japan-hero-title">Japan builds.<br /><span>The world<br /> moves.</span></Heading><p className="eco-lede">A meeting point for curious minds. Join the hackathons, meetups, and communities turning bold ideas into something real.</p><div className="eco-actions"><a href="#live-events" className="eco-button eco-button-blue">Explore events<ArrowRight aria-hidden="true" /></a><CommunityLink href="/host/signin" className="eco-text-link">Host with us<ArrowUpRight aria-hidden="true" /></CommunityLink></div><div className="eco-hero-stats"><div><strong>20<span>+</span></strong><small>Events hosted</small></div><div><strong>3,000<span>+</span></strong><small>Builders impacted</small></div><div><strong>15<span>+</span></strong><small>Startups empowered</small></div></div><a href="https://www.cognisorai.com/about" target="_blank" rel="noopener noreferrer" className="eco-source-note">Community figures reported by Cognisor ↗</a></div>
      <div className="ecosystem-map-panel"><div className="map-panel-top"><span className="map-live-label"><i aria-hidden="true" />Explore the community</span><span>日本 · JAPAN</span></div><JapanMap selected={city} onSelect={setCity} /><div className="map-city-detail" key={city.id} aria-live="polite"><div><span className="eco-eyebrow">{city.id} / {city.japanese}</span><h2>{city.caption}</h2><p>{city.description}</p></div><CommunityLink className="map-city-open" href={city.href} aria-label={`Discover ${city.id} events`}><ArrowUpRight aria-hidden="true" /></CommunityLink></div></div>
    </div><div className="ecosystem-hero-bottom"><a href="#partners">Meet the ecosystem<ArrowDown aria-hidden="true" /></a><CommunityLink href="/signin">Enter the portal<ArrowUpRight aria-hidden="true" /></CommunityLink><button type="button" aria-pressed={paused} aria-label={paused ? "Resume background animation" : "Pause background animation"} onClick={() => setPaused(value => !value)}>{paused ? <Play aria-hidden="true" /> : <Pause aria-hidden="true" />}{paused ? "Resume motion" : "Pause motion"}</button></div>
  </section>;
}
