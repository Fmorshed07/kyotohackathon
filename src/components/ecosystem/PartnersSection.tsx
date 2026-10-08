import { useState } from "react";
import { ArrowUpRight, Pause, Play } from "lucide-react";
import { COMMUNITY_PARTNERS } from "@/data/communityPartners";
import { useAmbientMotion } from "@/hooks/useAmbientMotion";
import { COMMUNITY_SOURCE } from "@/lib/communityEcosystem";
import "./ecosystem.css";

function PartnerLogo({ partner, decorative = false }: { partner: typeof COMMUNITY_PARTNERS[number]; decorative?: boolean }) {
  const [failed, setFailed] = useState(false);
  return <div className="partner-logo" title={partner.name}>
    {failed ? <span>{partner.name}</span> : <img src={partner.image} alt={decorative ? "" : partner.name} loading="lazy" decoding="async" className={partner.darkArtwork ? "partner-art-dark" : undefined} onError={() => setFailed(true)} />}
  </div>;
}

export default function PartnersSection() {
  const [expanded, setExpanded] = useState(false);
  const { ref, running, paused, setPaused } = useAmbientMotion();
  const rows = [COMMUNITY_PARTNERS.slice(0, 17), COMMUNITY_PARTNERS.slice(17, 34), COMMUNITY_PARTNERS.slice(34)];
  return <section ref={ref} id="partners" className="ecosystem-section" data-motion={running && !expanded ? "on" : "off"} aria-labelledby="partners-title">
    <div className="ecosystem-section-inner">
      <header className="eco-partner-heading"><h2 id="partners-title">An ecosystem built together.</h2><p>Partners & supporters featured by Cognisor AI.</p></header>
      {!expanded && <div>{rows.map((row, index) => <div className="partner-ribbon" key={index}><div className="partner-track"><div className="partner-track-set">{row.map(partner => <PartnerLogo key={partner.id} partner={partner} />)}</div><div className="partner-track-set" aria-hidden="true">{row.map(partner => <PartnerLogo key={partner.id} partner={partner} decorative />)}</div></div></div>)}</div>}
      <div className="partner-controls"><a className="eco-text-link" href={COMMUNITY_SOURCE} target="_blank" rel="noopener noreferrer">From the Cognisor network<ArrowUpRight aria-hidden="true" /></a><button type="button" aria-expanded={expanded} aria-controls="partner-directory" onClick={() => setExpanded(value => !value)}>{expanded ? "Back to the logo wall" : "View every logo"} <span aria-hidden="true">{expanded ? "−" : "+"}</span></button><button type="button" disabled={expanded} aria-pressed={paused || expanded} onClick={() => setPaused(value => !value)} aria-label={expanded ? "Partner directory is static" : paused ? "Resume partner animation" : "Pause partner animation"}>{paused || expanded ? <Play aria-hidden="true" /> : <Pause aria-hidden="true" />}{expanded ? "Static directory" : paused ? "Resume motion" : "Pause motion"}</button></div>
      <div id="partner-directory" hidden={!expanded}>{expanded && <div className="partner-grid">{COMMUNITY_PARTNERS.map(partner => <PartnerLogo key={partner.id} partner={partner} />)}</div>}</div>
    </div>
  </section>;
}
