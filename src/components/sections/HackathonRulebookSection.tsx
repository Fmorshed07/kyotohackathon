import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { BookOpen, CalendarDays, ExternalLink, Loader2, MapPin, RefreshCw, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { usePortalAuth } from "@/hooks/usePortalAuth";
import { fetchPortalHackathonCatalog } from "@/lib/aiHackathons";
import { getFirestoreDb } from "@/lib/firebaseClient";
import { getHackathonPublicUrl, pickDefaultHackathonId, withHackathonQuery, type PortalHackathon } from "@/lib/hackathons";
import { normalizeRulebookUrl } from "@/lib/rulebook";

const STATUS_LABELS: Record<PortalHackathon["status"], string> = {
  active: "Live",
  upcoming: "Upcoming",
  past: "Past",
};

type RulebookCardProps = {
  hackathons: PortalHackathon[];
  isLoading?: boolean;
  error?: boolean;
  onRetry?: () => void;
  canManage?: boolean;
};

export function HackathonRulebookCard({ hackathons, isLoading = false, error = false, onRetry, canManage = false }: RulebookCardProps) {
  const [searchParams] = useSearchParams();
  const { hash } = useLocation();
  const navigate = useNavigate();
  const requestedId = searchParams.get("hackathon") ?? searchParams.get("event");
  const selectedId = requestedId ?? pickDefaultHackathonId(hackathons);
  const selected = hackathons.find((event) => event.id === selectedId);
  const rulebookUrl = normalizeRulebookUrl(selected?.rulebookUrl);
  const groups = [
    { label: "Current & upcoming", events: hackathons.filter((event) => event.status !== "past") },
    { label: "Past hackathons", events: hackathons.filter((event) => event.status === "past") },
  ].filter((group) => group.events.length > 0);

  const chooseEvent = (id: string) => {
    const next = new URLSearchParams(searchParams);
    next.set("hackathon", id);
    next.delete("event");
    navigate({ search: `?${next.toString()}`, hash }, { replace: true, preventScrollReset: true });
  };

  return (
    <section id="rulebook" aria-labelledby="rulebook-heading" className="mb-12 scroll-mt-24 overflow-hidden rounded-2xl border border-primary/25 bg-gradient-to-br from-primary/[0.09] via-card to-background">
      <div className="flex flex-col gap-5 border-b border-white/10 p-5 sm:p-7 md:flex-row md:items-start md:justify-between">
        <div className="flex min-w-0 gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-primary/30 bg-primary/10 text-primary">
            <BookOpen className="h-5 w-5" aria-hidden />
          </span>
          <div>
            <h2 id="rulebook-heading" className="font-display text-xl font-semibold tracking-tight text-foreground sm:text-2xl">Hackathon rule book</h2>
            <p className="mt-1 max-w-lg text-sm leading-relaxed text-muted-foreground">Choose your event for its official rules, eligibility, and submission requirements.</p>
          </div>
        </div>
        {canManage && (
          <Button asChild variant="outline" className="shrink-0 gap-2 self-start">
            <Link to={withHackathonQuery("/dashboard/admin/events", selected?.id)}>
              <Settings2 className="h-4 w-4" aria-hidden />Manage rule book URLs
            </Link>
          </Button>
        )}
      </div>

      <div className="p-5 sm:p-7" aria-busy={isLoading}>
        {isLoading ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground" role="status"><Loader2 className="h-4 w-4 animate-spin" aria-hidden />Loading hackathon rule books…</p>
        ) : error ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p role="alert" className="text-sm text-muted-foreground">Could not load rule books. Please try again.</p>
            <Button type="button" variant="outline" onClick={onRetry} className="gap-2"><RefreshCw className="h-4 w-4" aria-hidden />Try again</Button>
          </div>
        ) : hackathons.length === 0 ? (
          <p className="text-sm text-muted-foreground">Rule books will appear here when hackathons are published.</p>
        ) : (
          <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] md:gap-8">
            <div className="min-w-0">
              <p id="rulebook-event-label" className="mb-2 text-xs font-semibold uppercase tracking-widest text-primary">Your hackathon</p>
              <Select value={selected?.id ?? ""} onValueChange={chooseEvent}>
                <SelectTrigger aria-label="Choose hackathon for rule book" aria-describedby="rulebook-event-label" className="h-auto min-h-12 w-full border-white/15 bg-background/60 py-3 text-left text-base [&>span]:line-clamp-none">
                  <SelectValue placeholder="Choose a hackathon">{selected?.name}</SelectValue>
                </SelectTrigger>
                <SelectContent className="max-h-[min(60vh,380px)] w-[var(--radix-select-trigger-width)] max-w-[calc(100vw-3rem)]">
                  {groups.map((group) => (
                    <SelectGroup key={group.label}>
                      <SelectLabel className="text-xs text-muted-foreground">{group.label}</SelectLabel>
                      {group.events.map((event) => (
                        <SelectItem key={event.id} value={event.id} className="whitespace-normal break-words py-3">
                          <span className="font-medium">{event.name}</span>
                          {" "}<span className="ml-2 text-xs text-muted-foreground">{STATUS_LABELS[event.status]}</span>
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  ))}
                </SelectContent>
              </Select>
              {selected && (
                <div className="mt-4 space-y-2 text-sm text-muted-foreground">
                  <p className="flex items-start gap-2"><CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />{selected.eventDate}</p>
                  <p className="flex items-start gap-2"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />{selected.location}</p>
                </div>
              )}
            </div>
            <div className="min-w-0 rounded-xl border border-white/10 bg-background/40 p-5">
              {selected ? (
                <>
                  <p className="text-xs font-semibold uppercase tracking-widest text-primary">{STATUS_LABELS[selected.status]} event</p>
                  <h3 className="mt-2 break-words font-display text-lg font-semibold text-foreground">{selected.name}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground" role="status">{rulebookUrl ? "Read the organizer’s rule book before you start building or submit your project." : "The organizer hasn’t added a rule book for this hackathon yet."}</p>
                  {rulebookUrl ? (
                    <Button asChild className="mt-5 w-full gap-2 sm:w-auto">
                      <a href={rulebookUrl} target="_blank" rel="noopener noreferrer">Open rule book<ExternalLink className="h-4 w-4" aria-hidden /></a>
                    </Button>
                  ) : (
                    <a href={getHackathonPublicUrl(selected.id)} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline">View event details<ExternalLink className="h-4 w-4" aria-hidden /></a>
                  )}
                </>
              ) : (
                <p className="text-sm leading-relaxed text-muted-foreground" role="status">This hackathon isn’t available. Choose another event to view its rule book.</p>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

export default function HackathonRulebookSection() {
  const { sessionUser, loading: authLoading } = usePortalAuth();
  const [hackathons, setHackathons] = useState<PortalHackathon[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(false);
    void (async () => {
      try {
        const catalog = await fetchPortalHackathonCatalog(getFirestoreDb());
        if (!cancelled) setHackathons(catalog);
      } catch {
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [attempt]);

  return <HackathonRulebookCard hackathons={hackathons} isLoading={isLoading} error={error} onRetry={() => setAttempt((value) => value + 1)} canManage={!authLoading && sessionUser?.role === "admin"} />;
}
