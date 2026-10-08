import { Link } from "react-router-dom";
import BrandLogo from "@/components/BrandLogo";
import { CommunityLink } from "./CommunityLink";
import "./ecosystem.css";

const groups = [
  { title: "Events", links: [["Find events", "/hackathons"], ["Submit an event", "/host/signin"], ["Create an event", "/host/signin"], ["Our work", "/work"]] },
  { title: "Platform", links: [["Projects & demos", "/projects"], ["Careers", "/#get-hired"], ["About Cognisor", "https://www.cognisorai.com/about"], ["Field notes", "https://www.cognisorai.com/blog"], ["Contact us", "https://www.cognisorai.com/contact"]] },
  { title: "Community", links: [["Discord", "https://discord.gg/cQEFjQDFm"], ["LinkedIn", "https://www.linkedin.com/company/cognisor-ai/"], ["Instagram", "https://www.instagram.com/cognisor.ai/"], ["GitHub", "https://github.com/cognisor"], ["Creators Circuit", "https://www.creatorscircuit.tech"]] },
];

export default function CommunityFooter() {
  return <footer className="community-footer"><div className="community-footer-inner"><div className="community-footer-top"><div className="community-footer-brand"><BrandLogo showWordmark /><p>Rooted in Japan.<br />Connected by curiosity.<br />Building what comes next, together.</p><p lang="ja">日本から、世界へ。</p></div>{groups.map(group => <nav key={group.title} aria-label={`${group.title} footer links`}><h2>{group.title}</h2><ul>{group.links.map(([label, href]) => <li key={label}><CommunityLink href={href}>{label}</CommunityLink></li>)}</ul></nav>)}</div><div className="community-footer-bottom"><span>© {new Date().getFullYear()} Cognisor AI · Tokyo, Japan</span><div><a href="https://www.cognisorai.com/contact" target="_blank" rel="noreferrer">Let’s build together ↗</a><Link to="/signin">Open portal ↗</Link></div></div></div></footer>;
}
