import { useId } from "react";
import { ArrowUpRight, Globe2 } from "lucide-react";
import "./creators-circuit-live-preview.css";

const CREATORS_CIRCUIT_URL = "https://www.creatorscircuit.tech/";

export default function CreatorsCircuitLivePreview() {
  const headingId = useId();
  const fallbackId = useId();

  return (
    <section id="creators-circuit-preview" className="creators-circuit-preview" aria-labelledby={headingId}>
      <header className="creators-circuit-preview-header">
        <div className="creators-circuit-preview-copy">
          <p className="creators-circuit-preview-kicker">Community</p>
          <h3 id={headingId} className="creators-circuit-preview-title">
            Creators Circuit <span>— live website</span>
          </h3>
          <p className="creators-circuit-preview-description">
            Meet builders, discover events, and explore what our community is creating.
          </p>
        </div>
        <a
          href={CREATORS_CIRCUIT_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="creators-circuit-preview-open"
        >
          Open Creators Circuit <ArrowUpRight aria-hidden="true" />
        </a>
      </header>

      <div className="creators-circuit-preview-frame">
        <div className="creators-circuit-preview-address" aria-hidden="true">
          <Globe2 />
          <span>www.creatorscircuit.tech</span>
        </div>
        <iframe
          title="Creators Circuit live website preview"
          src={CREATORS_CIRCUIT_URL}
          loading="lazy"
          referrerPolicy="strict-origin-when-cross-origin"
          aria-describedby={fallbackId}
          className="creators-circuit-preview-website"
        />
      </div>
      <p id={fallbackId} className="creators-circuit-preview-fallback">
        If the preview is unavailable, open Creators Circuit in a new tab.
      </p>
    </section>
  );
}
