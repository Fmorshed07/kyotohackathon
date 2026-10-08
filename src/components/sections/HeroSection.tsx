import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowDown, ArrowRight, ArrowUpRight, Pause, Play } from "lucide-react";
import ScrollEarth from "@/components/ScrollEarth";
import { useGlobeJourney } from "@/hooks/useGlobeJourney";
import "./globe-journey.css";

export default function HeroSection() {
  const [paused, setPaused] = useState(false);
  const { sectionRef, progressRef, running } = useGlobeJourney({ reduced: false, paused });

  function goToScene(progress: number) {
    const section = sectionRef.current;
    if (!section) return;
    const rect = section.getBoundingClientRect();
    window.scrollTo({ top: window.scrollY + rect.top + progress * (rect.height - window.innerHeight), behavior: "smooth" });
  }

  return (
    <section ref={sectionRef} className="editorial-hero globe-journey" aria-labelledby="globe-journey-title" data-motion={running ? "on" : "off"} data-reduced={false}>
      <div className="journey-stage">
        <ScrollEarth running={running} progress={progressRef} reduced={false} />
        <div className="journey-vignette" aria-hidden="true" />
        <div className="journey-topline" aria-hidden="true"><span>Cognisor · Tokyo</span><span>世界から、東京へ。</span></div>

        <div className="journey-intro journey-copy">
          <p className="journey-eyebrow">An open invitation.</p>
          <h1 id="globe-journey-title"><span className="journey-title-line">Build beyond</span>{" "}<span className="journey-title-line">borders.</span></h1>
          <p className="journey-description">Come for an idea.<br />Find the people to build it with.</p>
          <div className="journey-actions">
            <a className="journey-button journey-button-primary" href="#live-events">Explore events <ArrowUpRight aria-hidden="true" /></a>
            <Link className="journey-text-link" to="/signin">Join the community <ArrowRight aria-hidden="true" /></Link>
          </div>
        </div>

        <div className="journey-connect journey-copy">
          <p className="journey-eyebrow">A little closer.</p>
          <h2><span lang="ja">日本</span><span className="journey-country-name">Japan</span></h2>
        </div>

        <div className="journey-begin journey-copy">
          <p className="journey-eyebrow">35.6895° N, 139.6917° E</p>
          <h2>Welcome<br />to <span>Tokyo.</span></h2>
          <p className="journey-description">A city of ideas.<br />Meet the people bringing them to life.</p>
          <a className="journey-button journey-button-primary" href="#live-events">Explore Tokyo events <ArrowUpRight aria-hidden="true" /></a>
        </div>

        <div className="journey-location journey-location--tokyo" aria-hidden="true"><i /><span><b>Tokyo</b><small lang="ja">東京</small></span></div>

        <div className="journey-footer">
          <div className="journey-scroll-hint"><ArrowDown aria-hidden="true" /><span>Scroll into Tokyo</span></div>
          <nav className="journey-scenes" aria-label="Globe journey scenes">
            <button className="journey-scene-intro" type="button" onClick={() => goToScene(0)} aria-label="View the world"><span>World</span></button>
            <span className="journey-route-line" aria-hidden="true"><i /></span>
            <button className="journey-scene-connect" type="button" onClick={() => goToScene(.5)} aria-label="Travel to Japan"><span>Japan</span></button>
            <span className="journey-route-line" aria-hidden="true"><i /></span>
            <button className="journey-scene-begin" type="button" onClick={() => goToScene(.96)} aria-label="Arrive in Tokyo"><span>Tokyo</span></button>
          </nav>
          <button
            className="journey-motion"
            type="button"
            aria-label={paused ? "Resume background animation" : "Pause background animation"}
            aria-pressed={!paused}
            onClick={() => setPaused(value => !value)}
          >
            {paused ? <Play aria-hidden="true" /> : <Pause aria-hidden="true" />}
            {paused ? "Resume motion" : "Pause motion"}
          </button>
        </div>
      </div>
    </section>
  );
}
