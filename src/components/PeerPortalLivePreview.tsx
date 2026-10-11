import { useId } from "react";
import { ArrowUpRight, Globe2 } from "lucide-react";
import "./creators-circuit-live-preview.css";

const PEER_PORTAL_URL = "https://www.peerportal.app/";

export default function PeerPortalLivePreview() {
  const headingId = useId();
  const fallbackId = useId();

  return (
    <section id="peer-portal-preview" className="creators-circuit-preview" aria-labelledby={headingId}>
      <header className="creators-circuit-preview-header">
        <div className="creators-circuit-preview-copy">
          <p className="creators-circuit-preview-kicker">Your next opportunity</p>
          <h3 id={headingId} className="creators-circuit-preview-title">
            Peer Portal <span>— live website</span>
          </h3>
          <p className="creators-circuit-preview-description">
            Explore Japan careers, discover matching roles, and start your next chapter.
          </p>
        </div>
        <a href={PEER_PORTAL_URL} target="_blank" rel="noopener noreferrer" className="creators-circuit-preview-open">
          Open Peer Portal <ArrowUpRight aria-hidden="true" />
        </a>
      </header>
      <div className="creators-circuit-preview-frame">
        <div className="creators-circuit-preview-address" aria-hidden="true">
          <Globe2 />
          <span>www.peerportal.app</span>
        </div>
        <iframe
          title="Peer Portal live website preview"
          src={PEER_PORTAL_URL}
          loading="lazy"
          referrerPolicy="strict-origin-when-cross-origin"
          aria-describedby={fallbackId}
          className="creators-circuit-preview-website"
        />
      </div>
      <p id={fallbackId} className="creators-circuit-preview-fallback">
        If the preview is unavailable, open Peer Portal in a new tab.
      </p>
    </section>
  );
}
