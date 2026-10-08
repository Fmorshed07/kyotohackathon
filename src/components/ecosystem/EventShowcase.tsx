import { ArrowUpRight, RefreshCw } from "lucide-react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useCommunityEvents } from "@/hooks/useCommunityEvents";
import { communityEventCity, communityEventHref, communityEventKind } from "@/lib/communityEcosystem";
import { CommunityLink } from "./CommunityLink";
import { CommunityEventArt } from "./CommunityEventArt";

export default function EventShowcase() {
  const { events, isPending, isError, refetch } = useCommunityEvents();
  return (
    <section id="our-work" className="ecosystem-section" aria-labelledby="our-work-title">
      <div className="ecosystem-section-inner">
        <header className="eco-section-heading"><div><p className="eco-eyebrow">Good people. Unforgettable days.</p><h2 id="our-work-title">We bring ambitious builders<br />into the same room.</h2><p>New ideas, unexpected connections, and the things we make together. Explore the Cognisor event community.</p></div><Link to="/work" className="eco-button">Explore our events<ArrowUpRight aria-hidden="true" /></Link></header>
        {isPending && !events.length ? <div className="eco-event-loading" role="status">Loading community events…</div>
          : isError && !events.length ? <div className="eco-event-error" role="alert">We couldn’t load the event collection.<button className="eco-button" onClick={() => void refetch()}>Try again<RefreshCw aria-hidden="true" /></button></div>
          : events.length ? <motion.div className="event-fan" aria-label="Featured community events" initial={{ opacity: 0, y: 28 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.15 }} transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}>{events.slice(0, 5).map(event => <CommunityLink className="event-fan-card" href={communityEventHref(event)} key={event.id}><CommunityEventArt event={event} preferPhoto /><div className="event-fan-caption"><h3>{event.name}</h3><p>{communityEventCity(event)} <span aria-hidden="true">·</span> {communityEventKind(event)}</p></div></CommunityLink>)}</motion.div>
          : <div className="eco-event-loading">The next chapter is taking shape. <Link to="/host/signin">Host an event with us ↗</Link></div>}
        <div className="fan-caption"><span>Made of real people. Built around real ideas.</span><Link to="/work" className="eco-text-link">All events<ArrowUpRight aria-hidden="true" /></Link></div>
      </div>
    </section>
  );
}
