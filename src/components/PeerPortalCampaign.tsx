import { ArrowUpRight, Check } from "lucide-react";
import "./sections/peer-careers.css";

const PEER_PORTAL_URL = "https://peerportal.app/";

export default function PeerPortalCampaign() {
  return (
    <div className="peer-campaign">
      <div className="peer-campaign-copy">
        <p className="peer-campaign-eyebrow">From building to belonging.</p>
        <h2 id="get-hired-heading">Get hired with <span>Peer Portal</span></h2>
        <p className="peer-campaign-description">You’ve built something worth sharing. Take your projects, skills, and ambition to your next opportunity in Japan.</p>
        <ul className="peer-campaign-benefits">
          <li><Check aria-hidden="true" />Put your work in front of recruiters</li>
          <li><Check aria-hidden="true" />Find roles that fit your direction</li>
          <li><Check aria-hidden="true" />Prepare for your next career move</li>
        </ul>
        <div className="peer-campaign-action">
          <a href={PEER_PORTAL_URL} target="_blank" rel="noopener noreferrer">Explore Peer Portal <ArrowUpRight aria-hidden="true" /></a>
          <span>Opens in a new tab</span>
        </div>
      </div>
      <figure className="peer-campaign-artwork">
        <img
          src="/images/peer-portal-careers.png"
          alt="Peer Portal Japan careers campaign: match directly with company recruiters."
          width={1080}
          height={1080}
          loading="lazy"
          decoding="async"
        />
      </figure>
    </div>
  );
}
