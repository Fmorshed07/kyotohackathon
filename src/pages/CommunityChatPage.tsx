import { Hash, MessageCircle, ArrowUpRight, Users } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import SiteHeader from "@/components/SiteHeader";
import { Button } from "@/components/ui/button";
import { CommunityChat } from "@/components/community/CommunityChat";
import { COMMUNITY_CHANNELS, getCommunityChannel } from "@/lib/communityChat";
import { usePortalAuth } from "@/hooks/usePortalAuth";

export default function CommunityChatPage() {
  const { sessionUser, loading } = usePortalAuth();
  const [params, setParams] = useSearchParams();
  const channel = getCommunityChannel(params.get("channel"));
  return <div className="min-h-svh bg-background text-foreground">
    <SiteHeader />
    <main className="mx-auto max-w-7xl px-4 pb-12 pt-28 sm:px-6">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-5">
        <div><p className="mb-3 text-xs uppercase tracking-[0.2em] text-primary">The Cognisor commons</p><h1 className="font-display text-4xl font-medium tracking-tight sm:text-5xl">Meet your people.</h1><p className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground">One community, beyond any single event. Meet participants, judges, and mentors. Find a teammate. Build something together.</p></div>
        <Link to="/hackathons" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary">Explore events <ArrowUpRight className="h-4 w-4" aria-hidden="true" /></Link>
      </div>
      <div className="grid overflow-hidden rounded-xl border border-border bg-card lg:grid-cols-[230px_minmax(0,1fr)]">
        <aside className="border-b border-border bg-secondary/20 p-4 lg:border-b-0 lg:border-r">
          <p className="mb-4 flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground"><MessageCircle className="h-4 w-4" aria-hidden="true" />Community channels</p>
          <nav aria-label="Community channels" className="flex flex-wrap gap-2 lg:flex-col">
            {COMMUNITY_CHANNELS.map(room => <button key={room.id} type="button" onClick={() => setParams({ channel: room.id })} aria-current={channel.id === room.id ? "page" : undefined} className={`inline-flex min-h-11 items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${channel.id === room.id ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-secondary hover:text-foreground"}`}><Hash className="h-4 w-4" aria-hidden="true" />{room.name}</button>)}
          </nav>
          <div className="mt-8 hidden border-t border-border pt-5 lg:block"><Users className="h-5 w-5 text-primary" aria-hidden="true" /><p className="mt-3 text-sm">Everyone has a seat.</p><p className="mt-2 text-xs leading-relaxed text-muted-foreground">Open to all registered members. No event enrollment or judging approval is needed to network.</p></div>
        </aside>
        {loading ? <p role="status" className="p-12 text-center text-muted-foreground">Connecting your account…</p> : sessionUser?.role ? <CommunityChat key={`${sessionUser.id}:${channel.id}`} user={sessionUser} channel={channel} /> : <section className="flex min-h-96 flex-col items-center justify-center p-8 text-center" aria-label="Join community chat">
          <MessageCircle className="h-10 w-10 text-primary" aria-hidden="true" /><h2 className="mt-5 font-display text-2xl">Your next connection starts with hello.</h2><p className="mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">Sign in with your participant, judge, mentor, or host account to read and join the conversation. Messages are only visible to registered members.</p><div className="mt-6 flex gap-3"><Button asChild><Link to={sessionUser ? "/signup" : "/signin"}>{sessionUser ? "Complete your account" : "Sign in to chat"}</Link></Button>{!sessionUser && <Button asChild variant="outline"><Link to="/signup">Create account</Link></Button>}</div>
        </section>}
      </div>
    </main>
  </div>;
}
