import { useEffect, useState } from "react";
import { Hash, MessageCircle, ArrowUpRight, Users, LockKeyhole, Megaphone, RefreshCw } from "lucide-react";
import { Link, Navigate, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { CommunityChat } from "@/components/community/CommunityChat";
import { CommunityChannelManager } from "@/components/community/CommunityChannelManager";
import { Button } from "@/components/ui/button";
import { getCommunityChannel, subscribeToCommunityChannels, type CommunityChannel } from "@/lib/communityChannels";
import { usePortalAuth } from "@/hooks/usePortalAuth";
import { getUserAllowedHackathonIds, isHackathonId } from "@/lib/hackathons";
import { getFirestoreDb } from "@/lib/firebaseClient";

type ChannelCatalog = { scope: string | null; channels: CommunityChannel[]; loading: boolean; fromCache: boolean; error: boolean };

export default function CommunityChatPage() {
  const { sessionUser, loading, signOut } = usePortalAuth();
  const [params] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [catalog, setCatalog] = useState<ChannelCatalog>({ scope: null, channels: [], loading: true, fromCache: true, error: false });
  const [attempt, setAttempt] = useState(0);
  const scope = !loading && sessionUser?.role ? `${sessionUser.id}:${sessionUser.role}` : null;

  useEffect(() => {
    if (!scope) return;
    let current = true;
    setCatalog({ scope, channels: [], loading: true, fromCache: true, error: false });
    let unsubscribe: (() => void) | undefined;
    try {
      unsubscribe = subscribeToCommunityChannels(getFirestoreDb(), (channels, fromCache) => {
        if (current) setCatalog({ scope, channels, loading: false, fromCache, error: false });
      }, () => {
        if (current) setCatalog((previous) => ({ ...previous, scope, loading: false, error: true }));
      });
    } catch {
      setCatalog({ scope, channels: [], loading: false, fromCache: true, error: true });
    }
    return () => { current = false; unsubscribe?.(); };
  }, [scope, attempt]);

  if (loading) return <div className="flex min-h-svh items-center justify-center bg-background"><p role="status" className="text-sm text-muted-foreground">Loading community…</p></div>;
  if (!sessionUser) {
    const next = `${location.pathname}${location.search}${location.hash}`;
    return <Navigate to={`/signin?next=${encodeURIComponent(next)}`} replace />;
  }
  if (!sessionUser.role) return <Navigate to="/signup" replace />;

  const channels = catalog.scope === scope ? catalog.channels : [];
  const channelsLoading = catalog.scope !== scope || catalog.loading;
  const settingsReady = !channelsLoading && !catalog.error && !catalog.fromCache;
  const channel = getCommunityChannel(params.get("channel"), channels);
  const visibleChannels = channels.filter((room) => room.status !== "archived" || room.id === channel.id);
  const sections = [...new Set(visibleChannels.map((room) => room.status === "archived" ? "Archive" : room.section))]
    .sort((left, right) => left === "Information" ? -1 : right === "Information" ? 1 : left.localeCompare(right));

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
        <div className="flex flex-wrap items-center gap-3">
          {sessionUser.role === "admin" && <CommunityChannelManager user={sessionUser} channels={channels} onSelectChannel={chooseChannel} disabled={!settingsReady} />}
          <Link to="/hackathons" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary">Explore events <ArrowUpRight className="h-4 w-4" aria-hidden="true" /></Link>
        </div>
      </div>
      {channelsLoading ? <p role="status" className="rounded-xl border border-border bg-card p-8 text-sm text-muted-foreground">Loading channels…</p> : catalog.error ? (
        <div role="alert" className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-destructive/30 bg-card p-6">
          <p className="text-sm text-muted-foreground">We couldn’t load channel settings. Reconnect to continue.</p>
          <Button variant="outline" className="gap-2" onClick={() => setAttempt((value) => value + 1)}><RefreshCw className="h-4 w-4" aria-hidden />Retry channels</Button>
        </div>
      ) : <div className="grid overflow-hidden rounded-xl border border-border bg-card lg:grid-cols-[230px_minmax(0,1fr)]">
        <aside className="border-b border-border bg-secondary/20 p-4 lg:border-b-0 lg:border-r">
          <p className="mb-4 flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground"><MessageCircle className="h-4 w-4" aria-hidden="true" />Community channels</p>
          <nav aria-label="Community channels" className="space-y-5">
            {sections.map((section) => <div key={section}>
              <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">{section}</p>
              <div className="flex flex-wrap gap-1 lg:flex-col">{visibleChannels.filter((room) => (room.status === "archived" ? "Archive" : room.section) === section).map((room) => {
                const Icon = room.type === "announcement" ? Megaphone : Hash;
                return <button key={room.id} aria-label={room.name} type="button" onClick={() => chooseChannel(room.id)} aria-current={channel.id === room.id ? "page" : undefined} className={`inline-flex min-h-11 min-w-0 items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${channel.id === room.id ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-secondary hover:text-foreground"}`}>
                  <Icon className="h-4 w-4 shrink-0" aria-hidden /><span className="min-w-0 break-words">{room.name}</span>{room.status !== "open" && <LockKeyhole className="ml-auto h-3.5 w-3.5 shrink-0" aria-label={room.status === "archived" ? "Archived" : "Posting closed"} />}
                </button>;
              })}</div>
            </div>)}
          </nav>
          <div className="mt-8 hidden border-t border-border pt-5 lg:block"><Users className="h-5 w-5 text-primary" aria-hidden="true" /><p className="mt-3 text-sm">Everyone has a seat.</p><p className="mt-2 text-xs leading-relaxed text-muted-foreground">Open to all registered members. No event enrollment or judging approval is needed to network.</p></div>
        </aside>
        <CommunityChat key={`${sessionUser.id}:${sessionUser.role}:${channel.id}`} user={sessionUser} channel={channel} settingsReady={settingsReady} />
      </div>}
    </div>
  </DashboardLayout>;
}
