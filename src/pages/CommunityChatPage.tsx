import { Hash, MessageCircle, ArrowUpRight, Users } from "lucide-react";
import { Link, Navigate, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { CommunityChat } from "@/components/community/CommunityChat";
import { COMMUNITY_CHANNELS, getCommunityChannel } from "@/lib/communityChat";
import { usePortalAuth } from "@/hooks/usePortalAuth";
import { getUserAllowedHackathonIds, isHackathonId } from "@/lib/hackathons";

export default function CommunityChatPage() {
  const { sessionUser, loading, signOut } = usePortalAuth();
  const [params] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const channel = getCommunityChannel(params.get("channel"));
  if (loading) return <div className="flex min-h-svh items-center justify-center bg-background"><p role="status" className="text-sm text-muted-foreground">Loading community…</p></div>;
  if (!sessionUser) {
    const next = `${location.pathname}${location.search}${location.hash}`;
    return <Navigate to={`/signin?next=${encodeURIComponent(next)}`} replace />;
  }
  if (!sessionUser.role) return <Navigate to="/signup" replace />;

  const allowedIds = getUserAllowedHackathonIds(sessionUser);
  const requestedId = params.get("hackathon");
  const selectedHackathonId = requestedId && isHackathonId(requestedId)
    && (sessionUser.role === "admin" || allowedIds.includes(requestedId))
    ? requestedId
    : allowedIds.find((id) => id === sessionUser.hackathonId) ?? allowedIds[0];
  const chooseChannel = (id: string) => {
    const next = new URLSearchParams(params);
    next.set("channel", id);
    navigate({ search: `?${next.toString()}`, hash: location.hash }, { preventScrollReset: true });
  };

  return <DashboardLayout sessionUser={sessionUser} role={sessionUser.role} onSignOut={signOut} selectedHackathonId={selectedHackathonId}>
    <div className="min-w-0" aria-label="Community workspace">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-5">
        <div><p className="mb-3 text-xs uppercase tracking-[0.2em] text-primary">Community chat</p><h2 className="font-display text-3xl font-medium tracking-tight sm:text-4xl">Meet your people.</h2><p className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground">One community, beyond any single event. Meet participants, judges, and mentors. Find a teammate. Build something together.</p></div>
        <Link to="/hackathons" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary">Explore events <ArrowUpRight className="h-4 w-4" aria-hidden="true" /></Link>
      </div>
      <div className="grid overflow-hidden rounded-xl border border-border bg-card lg:grid-cols-[230px_minmax(0,1fr)]">
        <aside className="border-b border-border bg-secondary/20 p-4 lg:border-b-0 lg:border-r">
          <p className="mb-4 flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground"><MessageCircle className="h-4 w-4" aria-hidden="true" />Community channels</p>
          <nav aria-label="Community channels" className="flex flex-wrap gap-2 lg:flex-col">
            {COMMUNITY_CHANNELS.map(room => <button key={room.id} type="button" onClick={() => chooseChannel(room.id)} aria-current={channel.id === room.id ? "page" : undefined} className={`inline-flex min-h-11 items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${channel.id === room.id ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-secondary hover:text-foreground"}`}><Hash className="h-4 w-4" aria-hidden="true" />{room.name}</button>)}
          </nav>
          <div className="mt-8 hidden border-t border-border pt-5 lg:block"><Users className="h-5 w-5 text-primary" aria-hidden="true" /><p className="mt-3 text-sm">Everyone has a seat.</p><p className="mt-2 text-xs leading-relaxed text-muted-foreground">Open to all registered members. No event enrollment or judging approval is needed to network.</p></div>
        </aside>
        <CommunityChat key={`${sessionUser.id}:${channel.id}`} user={sessionUser} channel={channel} />
      </div>
    </div>
  </DashboardLayout>;
}
