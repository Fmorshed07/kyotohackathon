import { Link } from "react-router-dom";
import { ArrowUpRight, CalendarDays, FolderKanban, TicketCheck } from "lucide-react";

const features = [
  { icon: FolderKanban, title: "Ideas worth exploring.", description: "Discover projects, watch demos, and meet the people building something new.", action: "Browse projects", href: "/projects" },
  { icon: CalendarDays, title: "Find your next event.", description: "From a first meetup to your next hackathon. Everything you need to show up and take part.", action: "Explore events", href: "/hackathons" },
  { icon: TicketCheck, title: "Bring people together.", description: "Create your event, manage tickets, and welcome your community. All in one place.", action: "Host an event", href: "/host/signin" },
];

export default function FeaturePreviewSection() {
  return (
    <section id="features" aria-labelledby="features-title">
      <div className="feature-overview mx-auto">
        <div className="feature-overview-heading">
          <p>One connected community</p>
          <h2 id="features-title">Less friction.<br />More possibility.</h2>
          <p>A space to share what you’re making, find your people, and create something together.</p>
        </div>
        <div className="feature-links">
          {features.map(({ icon: Icon, title, description, action, href }, index) => (
            <Link key={href} to={href} className="feature-link">
              <div className="feature-link-top" aria-hidden="true"><span>0{index + 1}</span><Icon /></div>
              <h3>{title}</h3>
              <p>{description}</p>
              <span className="feature-link-action">{action}<ArrowUpRight aria-hidden="true" /></span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
