import { useEffect, useId, useMemo, useRef, useState } from "react";
import { ArrowUpRight, CalendarDays, MapPin, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getHackathonPublicUrl, isJoinableHackathon, type HackathonId, type PortalHackathon } from "@/lib/hackathons";

type HackathonDiscoveryDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  hackathons: PortalHackathon[];
  isLoading?: boolean;
  error?: string | null;
  joinError?: string | null;
  isJoining?: boolean;
  onRetry?: () => void;
  onJoin: (id: HackathonId) => Promise<boolean>;
};

function EventImage({ event }: { event: PortalHackathon }) {
  const [failedUrls, setFailedUrls] = useState<string[]>([]);
  const source = [event.bannerImageUrl, event.coverImageUrl]
    .find((url) => url && !failedUrls.includes(url));

  return (
    <div className="flex h-32 shrink-0 items-center justify-center overflow-hidden border-b border-white/10 bg-slate-950 sm:h-36">
      {source ? (
        <img
          src={source}
          alt={`${event.name} poster`}
          loading="lazy"
          className="h-full w-full object-contain"
          onError={() => setFailedUrls((current) => [...current, source])}
        />
      ) : (
        <div className="flex flex-col items-center gap-3 py-6 text-slate-500">
          <CalendarDays className="h-10 w-10 text-sky-400/50" aria-hidden="true" />
          <span className="text-xs">Event preview</span>
        </div>
      )}
    </div>
  );
}

export function HackathonDiscoveryDialog({
  open,
  onOpenChange,
  hackathons,
  isLoading = false,
  error = null,
  joinError = null,
  isJoining = false,
  onRetry,
  onJoin,
}: HackathonDiscoveryDialogProps) {
  const searchId = useId();
  const eventHeadingPrefix = useId();
  const [search, setSearch] = useState("");
  const [joiningId, setJoiningId] = useState<HackathonId | null>(null);
  const [localJoinError, setLocalJoinError] = useState<string | null>(null);
  const joinLock = useRef(false);
  const mounted = useRef(false);
  const isOpen = useRef(open);
  isOpen.current = open;

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  useEffect(() => {
    if (open) {
      setSearch("");
      setLocalJoinError(null);
    }
  }, [open]);

  const openHackathons = useMemo(() => hackathons.filter(isJoinableHackathon), [hackathons]);
  const visibleHackathons = useMemo(() => {
    const words = search.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
    return openHackathons.filter((event) => {
      const text = `${event.name} ${event.shortName} ${event.location} ${event.theme}`.toLocaleLowerCase();
      return words.every((word) => text.includes(word));
    });
  }, [openHackathons, search]);
  const busy = isJoining || joiningId !== null;
  const displayedJoinError = joinError || localJoinError;

  const join = async (id: HackathonId) => {
    if (joinLock.current || isJoining) return;
    joinLock.current = true;
    setJoiningId(id);
    setLocalJoinError(null);
    try {
      const joined = await onJoin(id);
      if (!mounted.current || !isOpen.current) return;
      if (joined) onOpenChange(false);
      else setLocalJoinError("Could not join this hackathon. Please try again.");
    } catch {
      if (mounted.current && isOpen.current) {
        setLocalJoinError("Could not join this hackathon. Please try again.");
      }
    } finally {
      joinLock.current = false;
      if (mounted.current) setJoiningId(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90dvh] w-[calc(100vw-1.5rem)] max-w-[1000px] flex-col gap-0 overflow-hidden rounded-2xl border-sky-400/20 bg-[#07101f] p-0 text-slate-100 shadow-2xl sm:rounded-2xl [&>button]:text-slate-400">
        <DialogHeader className="shrink-0 space-y-2 border-b border-white/10 p-4 pr-12 text-left sm:p-5 sm:pr-14">
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-sky-300">Discover your next event</p>
          <DialogTitle className="text-2xl font-semibold leading-tight">Join another hackathon</DialogTitle>
          <DialogDescription className="max-w-2xl text-sm leading-5 text-slate-400">
            Preview an event before joining. Your past hackathons stay available.
          </DialogDescription>
          <div className="relative">
            <label htmlFor={searchId} className="sr-only">Search hackathons</label>
            <Search className="pointer-events-none absolute left-3 top-3 h-5 w-5 text-slate-500" aria-hidden="true" />
            <Input
              id={searchId}
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by name, city, or theme"
              disabled={isLoading || Boolean(error)}
              className="border-white/15 bg-slate-950/60 pl-10 text-slate-100 placeholder:text-slate-500 focus-visible:ring-sky-400"
            />
          </div>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4" aria-busy={busy || isLoading}>
          {displayedJoinError && <p role="alert" className="mb-5 rounded-xl border border-rose-400/25 bg-rose-400/10 px-4 py-3 text-sm leading-6 text-rose-200">{displayedJoinError}</p>}
          {isLoading ? (
            <p role="status" className="py-12 text-center text-sm text-slate-400">Loading open hackathons…</p>
          ) : error ? (
            <div role="alert" className="rounded-xl border border-rose-400/20 bg-rose-400/5 p-6 text-center">
              <p className="text-sm leading-6 text-rose-200">{error}</p>
              {onRetry && <Button type="button" variant="outline" onClick={onRetry} className="mt-4 border-sky-400/30 text-sky-200 hover:bg-sky-400/10 hover:text-white">Try again</Button>}
            </div>
          ) : openHackathons.length === 0 ? (
            <div className="py-12 text-center">
              <CalendarDays className="mx-auto mb-4 h-10 w-10 text-sky-400/50" aria-hidden="true" />
              <h3 className="text-lg font-medium">No open hackathons right now</h3>
              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-400">New events will appear here when they open. You can still revisit your joined hackathons.</p>
            </div>
          ) : visibleHackathons.length === 0 ? (
            <div className="py-12 text-center">
              <h3 className="text-lg font-medium">No matching hackathons</h3>
              <p className="mt-2 text-sm text-slate-400">Try another name, location, or theme.</p>
              <Button type="button" variant="outline" onClick={() => setSearch("")} className="mt-4 border-sky-400/30 text-sky-200 hover:bg-sky-400/10 hover:text-white">Clear search</Button>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {visibleHackathons.map((event) => (
                <article key={event.id} aria-labelledby={`${eventHeadingPrefix}-${event.id}`} className="flex min-w-0 flex-col overflow-hidden rounded-xl border border-white/10 bg-slate-900/70">
                  <EventImage event={event} />
                  <div className="flex flex-1 flex-col p-4">
                    <div className="flex items-start justify-between gap-3">
                      <h3 id={`${eventHeadingPrefix}-${event.id}`} className="min-w-0 break-words text-lg font-semibold leading-snug">{event.name}</h3>
                      <span className="shrink-0 rounded-full border border-sky-400/20 bg-sky-400/10 px-2.5 py-1 text-xs font-medium text-sky-200">{event.status === "active" ? "Active" : "Upcoming"}</span>
                    </div>
                    {event.theme && <p title={event.theme} className="mt-1 line-clamp-2 text-sm leading-5 text-slate-400">{event.theme}</p>}
                    <div className="mt-3 space-y-1.5 text-sm leading-5 text-slate-300">
                      <p className="flex items-start gap-2"><CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-sky-300" aria-hidden="true" /><span className="min-w-0 break-words">{event.eventDate || "Dates to be announced"}</span></p>
                      <p className="flex items-start gap-2"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-sky-300" aria-hidden="true" /><span className="min-w-0 break-words">{event.location || "Location to be announced"}</span></p>
                    </div>
                    <div className="mt-auto grid grid-cols-2 gap-2 pt-3">
                      <Button asChild variant="outline" className="min-w-0 px-3 text-xs text-sky-200 border-sky-400/30 hover:bg-sky-400/10 hover:text-white sm:text-sm">
                        <a href={getHackathonPublicUrl(event.id)} target="_blank" rel="noopener noreferrer" aria-label={`Preview ${event.name} (opens in a new tab)`}>Preview event <ArrowUpRight aria-hidden="true" /></a>
                      </Button>
                      <Button type="button" aria-label={`Join ${event.name}`} disabled={busy} onClick={() => void join(event.id)} className="min-w-0 bg-sky-400 px-3 text-xs text-slate-950 hover:bg-sky-300 sm:text-sm">
                        {joiningId === event.id ? "Joining…" : "Join hackathon"}
                      </Button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>

        <DialogFooter className="shrink-0 items-start gap-2 border-t border-white/10 px-4 py-3 text-xs text-slate-400 sm:items-center sm:justify-between sm:px-5">
          <p>{busy ? "Joining hackathon…" : "Joining keeps your previous workspaces."}</p>
          <a href="/hackathons" target="_blank" rel="noopener noreferrer" className="inline-flex min-h-8 items-center gap-1.5 text-sky-300 underline-offset-4 hover:underline">View all events <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" /></a>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
