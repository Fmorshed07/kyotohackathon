import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  CalendarRange,
  ExternalLink,
  Eye,
  EyeOff,
  Radio,
  Archive,
  Sparkles,
  Wrench,
} from "lucide-react";
import {
  getHackathonVisibilityLabel,
  getHostedHackathonUrl,
  type HostedHackathon,
} from "@/lib/aiHackathons";
import type { HackathonStatus } from "@/lib/hackathons";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type FilterKey = "all" | "live" | "published" | "unpublished" | "past";

export type EventManagementWorkspaceProps = {
  events: HostedHackathon[];
  isLoading?: boolean;
  isBusy?: boolean;
  busyEventId?: string | null;
  statusMessage?: string | null;
  onPublish: (eventId: string) => Promise<void> | void;
  onUnpublish: (eventId: string) => Promise<void> | void;
  onSetStatus: (eventId: string, status: HackathonStatus) => Promise<void> | void;
};

const FILTERS: Array<{ key: FilterKey; label: string }> = [
  { key: "all", label: "All" },
  { key: "live", label: "Live" },
  { key: "published", label: "Published" },
  { key: "unpublished", label: "Unpublished" },
  { key: "past", label: "Past" },
];

function matchesFilter(event: HostedHackathon, filter: FilterKey) {
  if (filter === "all") return true;
  if (filter === "live") return event.published && event.status === "active";
  if (filter === "unpublished") return !event.published;
  if (filter === "past") return event.status === "past";
  return event.published && event.status !== "past";
}

function visibilityTone(event: HostedHackathon) {
  if (!event.published) return "border-white/15 bg-white/[0.04] text-muted-foreground";
  if (event.status === "active") return "border-emerald-400/40 bg-emerald-400/10 text-emerald-300";
  if (event.status === "past") return "border-white/15 bg-white/[0.04] text-muted-foreground";
  return "border-primary/40 bg-primary/10 text-primary";
}

export function EventManagementWorkspace({
  events,
  isLoading,
  isBusy,
  busyEventId,
  statusMessage,
  onPublish,
  onUnpublish,
  onSetStatus,
}: EventManagementWorkspaceProps) {
  const [filter, setFilter] = useState<FilterKey>("all");

  const counts = useMemo(
    () => ({
      all: events.length,
      live: events.filter((event) => event.published && event.status === "active").length,
      published: events.filter((event) => event.published && event.status !== "past").length,
      unpublished: events.filter((event) => !event.published).length,
      past: events.filter((event) => event.status === "past").length,
    }),
    [events],
  );

  const visibleEvents = useMemo(
    () => events.filter((event) => matchesFilter(event, filter)),
    [events, filter],
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          <span className="dash-icon-chip dash-icon-chip--sunset" aria-hidden>
            <CalendarRange className="h-4 w-4" />
          </span>
          <div>
            <p className="dash-eyebrow">Event management</p>
            <h2 className="dash-title">Publish, go live, or hide</h2>
            <p className="dash-subtitle">
              Control public visibility and lifecycle for every hosted hackathon.
            </p>
          </div>
        </div>
        <div className="dash-stat-grid grid w-full gap-2 sm:grid-cols-4 sm:gap-3 lg:w-auto">
          <div className="dash-stat-tile dash-stat-tile--highlight">
            <p className="dash-stat-value">{isLoading ? "—" : counts.live}</p>
            <p className="dash-stat-label">Live</p>
          </div>
          <div className="dash-stat-tile">
            <p className="dash-stat-value">{isLoading ? "—" : counts.published}</p>
            <p className="dash-stat-label">Published</p>
          </div>
          <div className="dash-stat-tile">
            <p className="dash-stat-value">{isLoading ? "—" : counts.unpublished}</p>
            <p className="dash-stat-label">Hidden</p>
          </div>
          <div className="dash-stat-tile">
            <p className="dash-stat-value">{isLoading ? "—" : counts.past}</p>
            <p className="dash-stat-label">Past</p>
          </div>
        </div>
      </div>

      {statusMessage && <p className="dash-message">{statusMessage}</p>}

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => setFilter(item.key)}
            className={cn(
              "rounded-md border px-2.5 py-1.5 font-display text-xs font-semibold transition-colors",
              filter === item.key
                ? "border-primary/50 bg-primary/20 text-primary"
                : "border-white/10 bg-white/[0.03] text-muted-foreground hover:border-white/20 hover:text-foreground",
            )}
          >
            {item.label}
            <span className="ml-1.5 opacity-70">{counts[item.key]}</span>
          </button>
        ))}
      </div>

      {isLoading ? (
        <p className="font-body text-sm text-muted-foreground">Loading events…</p>
      ) : visibleEvents.length === 0 ? (
        <div className="rounded-lg border border-dashed border-white/15 bg-white/[0.02] px-5 py-10 text-center">
          <p className="font-display text-sm font-semibold text-foreground">No events in this view</p>
          <p className="mt-1 font-body text-sm text-muted-foreground">
            Create an event from the admin overview, then manage it here.
          </p>
          <Button asChild variant="outline" size="sm" className="mt-4">
            <Link to="/dashboard/admin#ai-event-builder">Open event builders</Link>
          </Button>
        </div>
      ) : (
        <ul className="divide-y divide-white/10 overflow-hidden rounded-lg border border-white/10">
          {visibleEvents.map((event) => {
            const busy = isBusy && busyEventId === event.id;
            const publicUrl = getHostedHackathonUrl(event.id);
            const visibility = getHackathonVisibilityLabel(event);

            return (
              <li key={event.id} className="bg-white/[0.02] px-4 py-4 sm:px-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-display text-base font-semibold text-foreground sm:text-lg">
                        {event.name}
                      </h3>
                      <Badge variant="outline" className={cn("font-display text-[10px] uppercase tracking-wide", visibilityTone(event))}>
                        {visibility}
                      </Badge>
                      <Badge variant="outline" className="border-white/15 bg-transparent font-display text-[10px] uppercase tracking-wide text-muted-foreground">
                        {event.aiGenerated ? (
                          <span className="inline-flex items-center gap-1">
                            <Sparkles className="h-3 w-3" />
                            AI
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1">
                            <Wrench className="h-3 w-3" />
                            Manual
                          </span>
                        )}
                      </Badge>
                    </div>
                    <p className="font-body text-sm text-muted-foreground">
                      {event.eventDate} · {event.location}
                    </p>
                    <p className="line-clamp-2 font-body text-sm text-foreground/80">
                      {event.theme || event.summary || "No theme yet."}
                    </p>
                    <div className="flex flex-wrap items-center gap-3 pt-1">
                      {event.published ? (
                        <Link
                          to={publicUrl}
                          className="inline-flex items-center gap-1 font-display text-xs font-semibold text-primary hover:underline"
                        >
                          View public page
                          <ExternalLink className="h-3 w-3" />
                        </Link>
                      ) : (
                        <span className="font-display text-xs text-muted-foreground">
                          Hidden from public directory
                        </span>
                      )}
                      <span className="font-mono text-[11px] text-muted-foreground/80">{event.id}</span>
                    </div>
                  </div>

                  <div className="flex shrink-0 flex-col gap-2 sm:min-w-[220px]">
                    <p className="font-display text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                      Visibility
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {event.published ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={busy || isBusy}
                          className="gap-1.5"
                          onClick={() => void onUnpublish(event.id)}
                        >
                          <EyeOff className="h-3.5 w-3.5" />
                          Unpublish
                        </Button>
                      ) : (
                        <Button
                          type="button"
                          size="sm"
                          disabled={busy || isBusy}
                          className="gap-1.5"
                          onClick={() => void onPublish(event.id)}
                        >
                          <Eye className="h-3.5 w-3.5" />
                          Publish
                        </Button>
                      )}
                    </div>

                    <p className="mt-1 font-display text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                      Lifecycle
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant={event.status === "active" && event.published ? "default" : "outline"}
                        disabled={busy || isBusy || (event.status === "active" && event.published)}
                        className="gap-1.5"
                        onClick={() => void onSetStatus(event.id, "active")}
                      >
                        <Radio className="h-3.5 w-3.5" />
                        Go live
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant={event.status === "upcoming" ? "default" : "outline"}
                        disabled={busy || isBusy || event.status === "upcoming"}
                        className="gap-1.5"
                        onClick={() => void onSetStatus(event.id, "upcoming")}
                      >
                        Upcoming
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant={event.status === "past" ? "default" : "outline"}
                        disabled={busy || isBusy || event.status === "past"}
                        className="gap-1.5"
                        onClick={() => void onSetStatus(event.id, "past")}
                      >
                        <Archive className="h-3.5 w-3.5" />
                        Mark past
                      </Button>
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
