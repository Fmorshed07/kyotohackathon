import { useState } from "react";
import { ArrowUpRight, Pause, Play } from "lucide-react";
import { COMMUNITY_PARTNERS, FEATURED_BRAND_ROWS, type FeaturedCommunityBrand } from "@/data/communityPartners";
import { useAmbientMotion } from "@/hooks/useAmbientMotion";
import { COMMUNITY_SOURCE } from "@/lib/communityEcosystem";
import "./ecosystem.css";

const directoryPartners = COMMUNITY_PARTNERS.map(partner =>
  FEATURED_BRAND_ROWS.flat().find(brand => brand.id === partner.id) ?? partner,
);

function PartnerLogo({ partner, decorative = false, eager = false }: { partner: FeaturedCommunityBrand; decorative?: boolean; eager?: boolean }) {
  const [failed, setFailed] = useState(false);
  return <div className="partner-logo" data-brand={partner.artworkClass} data-named={partner.showName || undefined} data-surface={partner.surface} title={partner.name}>
    <div className="partner-logo-art">
      {failed ? <span role={decorative ? undefined : "img"} aria-label={decorative ? undefined : partner.name}>{partner.name}</span> : <img
        src={partner.image} alt={decorative ? "" : partner.name}
        data-logo-source={partner.image}
        loading={eager ? "eager" : "lazy"} decoding="async"
        onError={() => setFailed(true)}
      />}
    </div>
    {partner.showName && <small className="partner-brand-name">{partner.name}</small>}
  </div>;
}

export default function PartnersSection() {
  const [expanded, setExpanded] = useState(false);
  const { ref, running, paused, setPaused } = useAmbientMotion();
  return <section ref={ref} id="partners" className="ecosystem-section partners-section" data-motion={running && !expanded ? "on" : "off"} aria-labelledby="partners-title">
    <div className="ecosystem-section-inner">
      <header className="eco-partner-heading">
        <p className="partner-eyebrow"><span aria-hidden="true" />The Cognisor ecosystem</p>
        <h2 id="partners-title">Great ideas. <span>Extraordinary company.</span></h2>
        <p>Founders, communities &amp; technology. Moving ideas forward, together.</p>
      </header>
      {!expanded && <div className="partner-wall" aria-label="Featured partners and technology">
        {FEATURED_BRAND_ROWS.map((row, index) => <div className="partner-ribbon" key={index}>
          <div className="partner-track">
            <div className="partner-track-set">{row.map(partner => <PartnerLogo key={partner.id} partner={partner} eager />)}</div>
            <div className="partner-track-set" aria-hidden="true">{row.map(partner => <PartnerLogo key={partner.id} partner={partner} decorative eager />)}</div>
          </div>
        </div>)}
      </div>}
      <div className="partner-controls">
        <a className="eco-text-link" href={COMMUNITY_SOURCE} target="_blank" rel="noopener noreferrer">Explore the Cognisor network<ArrowUpRight aria-hidden="true" /></a>
        <div className="partner-control-actions">
          <button type="button" aria-expanded={expanded} aria-controls="partner-directory" onClick={() => setExpanded(value => !value)}>
            {expanded ? "Back to the logo wall" : "View every logo"}<span aria-hidden="true">{expanded ? "−" : "+"}</span>
          </button>
          <button type="button" disabled={expanded} aria-pressed={paused || expanded} onClick={() => setPaused(value => !value)} aria-label={expanded ? "Partner directory is static" : paused ? "Resume partner animation" : "Pause partner animation"}>
            {paused || expanded ? <Play aria-hidden="true" /> : <Pause aria-hidden="true" />}
            {expanded ? "Static directory" : paused ? "Resume motion" : "Pause motion"}
          </button>
        </div>
      </div>
      <div id="partner-directory" hidden={!expanded}>{expanded && <div className="partner-grid">{directoryPartners.map(partner => <PartnerLogo key={partner.id} partner={partner} />)}</div>}</div>
    </div>
  </section>;
}
