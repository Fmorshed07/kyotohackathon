import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Archive,
  CalendarRange,
  ExternalLink,
  Eye,
  EyeOff,
  Pencil,
  Radio,
  RefreshCw,
  Search,
  Sparkles,
  Trash2,
  Users,
  Wrench,
} from "lucide-react";
import {
  getHackathonVisibilityLabel,
  getHostedHackathonUrl,
  isPortalCatalogEvent,
  isPortalEditionId,
  type HostedHackathon,
  type HostedHackathonUpdate,
} from "@/lib/aiHackathons";
import {
  getHackathonSubmissionMode,
  type HackathonStatus,
  type SubmissionMode,
} from "@/lib/hackathons";
import { formatDateTime, type HostEvent } from "@/lib/hostEvents";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { SubmissionGateControls } from "@/components/dashboard/SubmissionGateControls";

type TabKey = "public" | "host";
type FilterKey = "all" | "live" | "published" | "unpublished" | "past" | "host";
type SourceFilter = "all" | "host" | "admin";

export type EventManagementWorkspaceProps = {
  events: HostedHackathon[];
  hostEvents: HostEvent[];
  isLoading?: boolean;
  isBusy?: boolean;
  busyEventId?: string | null;
  statusMessage?: string | null;
  onRefresh?: () => Promise<void> | void;
  onPublish: (eventId: string) => Promise<void> | void;
  onUnpublish: (eventId: string) => Promise<void> | void;
  onSetStatus: (eventId: string, status: HackathonStatus) => Promise<void> | void;
  onSetSubmissionMode: (eventId: string, mode: SubmissionMode) => Promise<void> | void;
  onSaveEvent: (eventId: string, patch: HostedHackathonUpdate) => Promise<void> | void;
  onDeleteEvent: (eventId: string) => Promise<void> | void;
  onPublishHostEvent: (hostEventId: string) => Promise<void> | void;
  onUnpublishHostEvent: (hostEventId: string) => Promise<void> | void;
};

const FILTERS: Array<{ key: FilterKey; label: string }> = [
  { key: "all", label: "All" },
  { key: "live", label: "Live" },
  { key: "published", label: "Published" },
  { key: "unpublished", label: "Hidden" },
  { key: "host", label: "Host-sourced" },
  { key: "past", label: "Past" },
];

function matchesFilter(event: HostedHackathon, filter: FilterKey) {
  if (filter === "all") return true;
  if (filter === "live") return event.published && event.status === "active";
  if (filter === "unpublished") return !event.published;
  if (filter === "past") return event.status === "past";
  if (filter === "host") return Boolean(event.hostEventId);
  // Published includes past events that are still visible on /hackathons.
  return event.published;
}

function visibilityTone(event: HostedHackathon) {
  if (!event.published) return "border-white/15 bg-white/[0.04] text-muted-foreground";
  if (event.status === "active") return "border-emerald-400/40 bg-emerald-400/10 text-emerald-300";
  if (event.status === "past") return "border-white/15 bg-white/[0.04] text-muted-foreground";
  return "border-primary/40 bg-primary/10 text-primary";
}

type EditDraft = {
  name: string;
  shortName: string;
  eventDate: string;
  location: string;
  theme: string;
  summary: string;
  format: string;
  eligibility: string;
  teamSize: string;
  prize: string;
  rulebookUrl: string;
  lumaUrl: string;
};

function toEditDraft(event: HostedHackathon): EditDraft {
  return {
    name: event.name,
    shortName: event.shortName,
    eventDate: event.eventDate,
    location: event.location,
    theme: event.theme,
    summary: event.summary,
    format: event.format,
    eligibility: event.eligibility,
    teamSize: event.teamSize,
    prize: event.prize,
    rulebookUrl: event.rulebookUrl,
    lumaUrl: event.lumaUrl,
  };
}

export function EventManagementWorkspace({
  events,
  hostEvents,
  isLoading,
  isBusy,
  busyEventId,
  statusMessage,
  onRefresh,
  onPublish,
  onUnpublish,
  onSetStatus,
  onSetSubmissionMode,
  onSaveEvent,
  onDeleteEvent,
  onPublishHostEvent,
  onUnpublishHostEvent,
}: EventManagementWorkspaceProps) {
  const [tab, setTab] = useState<TabKey>("public");
  const [filter, setFilter] = useState<FilterKey>("all");
  const [source, setSource] = useState<SourceFilter>("all");
  const [query, setQuery] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<EditDraft | null>(null);

  useEffect(() => {
    if (!editingId) {
      setEditDraft(null);
      return;
    }
    const event = events.find((item) => item.id === editingId);
    setEditDraft(event ? toEditDraft(event) : null);
  }, [editingId, events]);

  const counts = useMemo(
    () => ({
      all: events.length,
      live: events.filter((event) => event.published && event.status === "active").length,
      published: events.filter((event) => event.published).length,
      unpublished: events.filter((event) => !event.published).length,
      past: events.filter((event) => event.status === "past").length,
      host: events.filter((event) => Boolean(event.hostEventId)).length,
    }),
    [events],
  );

  const hostDraftCount = useMemo(
    () => hostEvents.filter((event) => event.status !== "published").length,
    [hostEvents],
  );

  const visibleEvents = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return events.filter((event) => {
      if (!matchesFilter(event, filter)) return false;
      if (source === "host" && !event.hostEventId) return false;
      if (source === "admin" && event.hostEventId) return false;
      if (!needle) return true;
      return [event.name, event.location, event.theme, event.summary, event.id, event.createdBy]
        .join(" ")
        .toLowerCase()
        .includes(needle);
    });
  }, [events, filter, query, source]);

  const visibleHostEvents = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return hostEvents;
    return hostEvents.filter((event) =>
      [event.name, event.location, event.description, event.owner_id, event.id]
        .join(" ")
        .toLowerCase()
        .includes(needle),
    );
  }, [hostEvents, query]);

  const saveEdit = async () => {
    if (!editingId || !editDraft) return;
    if (!editDraft.name.trim() || !editDraft.eventDate.trim() || !editDraft.location.trim()) return;
    await onSaveEvent(editingId, {
      name: editDraft.name,
      shortName: editDraft.shortName || editDraft.name,
      eventDate: editDraft.eventDate,
      location: editDraft.location,
      theme: editDraft.theme,
      summary: editDraft.summary,
      format: editDraft.format,
      eligibility: editDraft.eligibility,
      teamSize: editDraft.teamSize,
      prize: editDraft.prize,
      rulebookUrl: editDraft.rulebookUrl,
      lumaUrl: editDraft.lumaUrl,
    });
    setEditingId(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          <span className="dash-icon-chip dash-icon-chip--sunset" aria-hidden>
            <CalendarRange className="h-4 w-4" />
          </span>
          <div>
            <p className="dash-eyebrow">Event management</p>
            <h2 className="dash-title">Edit, publish, and control every event</h2>
            <p className="dash-subtitle mt-1 max-w-2xl">
              Past, live, and upcoming listings stay editable. Publish or unpublish at any lifecycle
              stage — marking past does not lock the event.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {onRefresh ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1.5"
              disabled={isBusy || isLoading}
              onClick={() => void onRefresh()}
            >
              <RefreshCw className={cn("h-3.5 w-3.5", isLoading && "animate-spin")} />
              Refresh
            </Button>
          ) : null}
          <div className="dash-stat-grid grid gap-2 sm:grid-cols-4 sm:gap-3">
            <div className="dash-stat-tile dash-stat-tile--highlight">
              <p className="dash-stat-value">{isLoading ? "—" : counts.live}</p>
              <p className="dash-stat-label">Live</p>
            </div>
            <div className="dash-stat-tile">
              <p className="dash-stat-value">{isLoading ? "—" : counts.published}</p>
              <p className="dash-stat-label">Published</p>
            </div>
            <div className="dash-stat-tile">
              <p className="dash-stat-value">{isLoading ? "—" : counts.host}</p>
              <p className="dash-stat-label">Host-sourced</p>
            </div>
            <div className="dash-stat-tile">
              <p className="dash-stat-value">{isLoading ? "—" : hostDraftCount}</p>
              <p className="dash-stat-label">Host drafts</p>
            </div>
          </div>
        </div>
      </div>

      {statusMessage ? <p className="dash-message">{statusMessage}</p> : null}

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setTab("public")}
          className={cn(
            "rounded-md border px-3 py-1.5 font-display text-xs font-semibold transition-colors",
            tab === "public"
              ? "border-primary/50 bg-primary/20 text-primary"
              : "border-white/10 bg-white/[0.03] text-muted-foreground hover:text-foreground",
          )}
        >
          Public listings
          <span className="ml-1.5 opacity-70">{counts.all}</span>
        </button>
        <button
          type="button"
          onClick={() => setTab("host")}
          className={cn(
            "rounded-md border px-3 py-1.5 font-display text-xs font-semibold transition-colors",
            tab === "host"
              ? "border-primary/50 bg-primary/20 text-primary"
              : "border-white/10 bg-white/[0.03] text-muted-foreground hover:text-foreground",
          )}
        >
          Host ops events
          <span className="ml-1.5 opacity-70">{hostEvents.length}</span>
        </button>
        <div className="relative ml-auto min-w-[200px] flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={tab === "public" ? "Search public events…" : "Search host events…"}
            className="pl-8"
          />
        </div>
      </div>

      {tab === "public" ? (
        <>
          <div className="flex flex-wrap items-center gap-2">
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
            <span className="mx-1 hidden h-4 w-px bg-white/15 sm:inline-block" />
            {(["all", "host", "admin"] as SourceFilter[]).map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setSource(key)}
                className={cn(
                  "rounded-md border px-2.5 py-1.5 font-display text-xs font-semibold transition-colors",
                  source === key
                    ? "border-white/30 bg-white/10 text-foreground"
                    : "border-white/10 bg-transparent text-muted-foreground hover:text-foreground",
                )}
              >
                {key === "all" ? "Any source" : key === "host" ? "Host only" : "Admin only"}
              </button>
            ))}
          </div>

          {isLoading ? (
            <p className="font-body text-sm text-muted-foreground">Loading events…</p>
          ) : visibleEvents.length === 0 ? (
            <div className="rounded-lg border border-dashed border-white/15 bg-white/[0.02] px-5 py-10 text-center">
              <p className="font-display text-sm font-semibold text-foreground">No events in this view</p>
              <p className="mt-1 font-body text-sm text-muted-foreground">
                Create from the admin overview, or publish a host ops draft from the Host ops tab.
              </p>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                <Button asChild variant="outline" size="sm">
                  <Link to="/dashboard/admin#ai-event-builder">Open event builders</Link>
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={() => setTab("host")}>
                  View host drafts
                </Button>
              </div>
            </div>
          ) : (
            <ul className="divide-y divide-white/10 overflow-hidden rounded-lg border border-white/10">
              {visibleEvents.map((event) => {
                const busy = Boolean(isBusy && busyEventId === event.id);
                const publicUrl = getHostedHackathonUrl(event.id);
                const visibility = getHackathonVisibilityLabel(event);
                const isEditing = editingId === event.id && editDraft;
                const isCatalogStub = isPortalCatalogEvent(event);
                const isPortalEdition = isPortalEditionId(event.id);

                return (
                  <li key={event.id} className="bg-white/[0.02] px-4 py-4 sm:px-5">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0 space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-display text-base font-semibold text-foreground sm:text-lg">
                            {event.name}
                          </h3>
                          <Badge
                            variant="outline"
                            className={cn(
                              "font-display text-[10px] uppercase tracking-wide",
                              visibilityTone(event),
                            )}
                          >
                            {visibility}
                          </Badge>
                          {getHackathonSubmissionMode(event) !== "open" ? (
                            <Badge
                              variant="outline"
                              className={cn(
                                "font-display text-[10px] uppercase tracking-wide",
                                getHackathonSubmissionMode(event) === "paused"
                                  ? "border-amber-400/40 bg-amber-400/10 text-amber-200"
                                  : "border-white/20 bg-white/[0.04] text-muted-foreground",
                              )}
                            >
                              {getHackathonSubmissionMode(event) === "paused"
                                ? "Submissions paused"
                                : "Submissions closed"}
                            </Badge>
                          ) : null}
                          {isPortalEdition ? (
                            <Badge
                              variant="outline"
                              className="border-amber-400/30 bg-amber-400/10 font-display text-[10px] uppercase tracking-wide text-amber-200"
                            >
                              Portal
                            </Badge>
                          ) : event.hostEventId ? (
                            <Badge
                              variant="outline"
                              className="border-sky-400/30 bg-sky-400/10 font-display text-[10px] uppercase tracking-wide text-sky-300"
                            >
                              <Users className="mr-1 h-3 w-3" />
                              Host
                            </Badge>
                          ) : event.aiGenerated ? (
                            <Badge
                              variant="outline"
                              className="border-white/15 bg-transparent font-display text-[10px] uppercase tracking-wide text-muted-foreground"
                            >
                              <Sparkles className="mr-1 h-3 w-3" />
                              AI
                            </Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className="border-white/15 bg-transparent font-display text-[10px] uppercase tracking-wide text-muted-foreground"
                            >
                              <Wrench className="mr-1 h-3 w-3" />
                              Manual
                            </Badge>
                          )}
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
                              to={isCatalogStub ? "/hackathons" : publicUrl}
                              className="inline-flex items-center gap-1 font-display text-xs font-semibold text-primary hover:underline"
                            >
                              {isCatalogStub ? "View on /hackathons" : "View public page"}
                              <ExternalLink className="h-3 w-3" />
                            </Link>
                          ) : (
                            <span className="font-display text-xs text-muted-foreground">
                              Hidden from public directory
                            </span>
                          )}
                          {event.hostEventId ? (
                            <Link
                              to="/dashboard/host"
                              className="font-display text-xs font-semibold text-muted-foreground hover:text-foreground hover:underline"
                            >
                              Open host ops
                            </Link>
                          ) : null}
                          <span className="font-mono text-[11px] text-muted-foreground/80">{event.id}</span>
                          {!isCatalogStub && event.createdBy ? (
                            <span className="font-mono text-[11px] text-muted-foreground/60">
                              by {event.createdBy.slice(0, 8)}…
                            </span>
                          ) : null}
                        </div>
                      </div>

                      <div className="flex shrink-0 flex-col gap-2 sm:min-w-[240px]">
                        <p className="font-display text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                          Access
                        </p>
                        {isCatalogStub ? (
                          <p className="text-[11px] text-muted-foreground">
                            Portal edition — first save publishes a manageable listing for this id.
                          </p>
                        ) : null}
                        <div className="flex flex-wrap gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant={isEditing ? "default" : "outline"}
                            disabled={busy || isBusy}
                            className="gap-1.5"
                            onClick={() => setEditingId(isEditing ? null : event.id)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                            {isEditing ? "Close edit" : "Edit"}
                          </Button>
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
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={busy || isBusy || isCatalogStub}
                            className="gap-1.5 text-destructive hover:text-destructive"
                            title={
                              isCatalogStub
                                ? "Catalog editions stay listed until a saved override exists"
                                : undefined
                            }
                            onClick={() => {
                              if (
                                window.confirm(
                                  isPortalEdition
                                    ? `Remove the saved override for “${event.name}”? The portal catalog row will return with default details.`
                                    : `Delete “${event.name}” from the public directory? Host ops data is kept as a draft.`,
                                )
                              ) {
                                void onDeleteEvent(event.id);
                              }
                            }}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            Delete
                          </Button>
                        </div>

                        <p className="mt-1 font-display text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                          Lifecycle
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          Switch freely — past events remain editable and can be published or hidden.
                        </p>
                        <div className="flex flex-wrap gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant={event.status === "active" && event.published ? "default" : "outline"}
                            disabled={busy || isBusy}
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
                            disabled={busy || isBusy}
                            className="gap-1.5"
                            onClick={() => void onSetStatus(event.id, "upcoming")}
                          >
                            Upcoming
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant={event.status === "past" ? "default" : "outline"}
                            disabled={busy || isBusy}
                            className="gap-1.5"
                            onClick={() => void onSetStatus(event.id, "past")}
                          >
                            <Archive className="h-3.5 w-3.5" />
                            Mark past
                          </Button>
                        </div>

                        <div className="mt-3 border-t border-white/10 pt-3">
                          <SubmissionGateControls
                            mode={getHackathonSubmissionMode(event)}
                            disabled={busy || isBusy}
                            onChange={(mode) => void onSetSubmissionMode(event.id, mode)}
                          />
                        </div>
                      </div>
                    </div>

                    {isEditing && editDraft ? (
                      <div className="mt-4 space-y-3 rounded-lg border border-white/10 bg-black/20 p-4">
                        <p className="font-display text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                          Edit listing
                        </p>
                        <div className="grid gap-3 sm:grid-cols-2">
                          <Input
                            value={editDraft.name}
                            onChange={(e) => setEditDraft((d) => (d ? { ...d, name: e.target.value } : d))}
                            placeholder="Event name *"
                            disabled={busy}
                          />
                          <Input
                            value={editDraft.shortName}
                            onChange={(e) =>
                              setEditDraft((d) => (d ? { ...d, shortName: e.target.value } : d))
                            }
                            placeholder="Short name"
                            disabled={busy}
                          />
                          <Input
                            value={editDraft.eventDate}
                            onChange={(e) =>
                              setEditDraft((d) => (d ? { ...d, eventDate: e.target.value } : d))
                            }
                            placeholder="Event date *"
                            disabled={busy}
                          />
                          <Input
                            value={editDraft.location}
                            onChange={(e) =>
                              setEditDraft((d) => (d ? { ...d, location: e.target.value } : d))
                            }
                            placeholder="Location *"
                            disabled={busy}
                          />
                          <Input
                            value={editDraft.theme}
                            onChange={(e) => setEditDraft((d) => (d ? { ...d, theme: e.target.value } : d))}
                            placeholder="Theme"
                            disabled={busy}
                          />
                          <Input
                            value={editDraft.format}
                            onChange={(e) =>
                              setEditDraft((d) => (d ? { ...d, format: e.target.value } : d))
                            }
                            placeholder="Format"
                            disabled={busy}
                          />
                          <Input
                            value={editDraft.eligibility}
                            onChange={(e) =>
                              setEditDraft((d) => (d ? { ...d, eligibility: e.target.value } : d))
                            }
                            placeholder="Eligibility"
                            disabled={busy}
                          />
                          <Input
                            value={editDraft.teamSize}
                            onChange={(e) =>
                              setEditDraft((d) => (d ? { ...d, teamSize: e.target.value } : d))
                            }
                            placeholder="Team size"
                            disabled={busy}
                          />
                          <Input
                            value={editDraft.prize}
                            onChange={(e) => setEditDraft((d) => (d ? { ...d, prize: e.target.value } : d))}
                            placeholder="Prize"
                            disabled={busy}
                          />
                          <Input
                            value={editDraft.rulebookUrl}
                            onChange={(e) =>
                              setEditDraft((d) => (d ? { ...d, rulebookUrl: e.target.value } : d))
                            }
                            placeholder="Rulebook URL"
                            disabled={busy}
                          />
                          <Input
                            value={editDraft.lumaUrl}
                            onChange={(e) =>
                              setEditDraft((d) => (d ? { ...d, lumaUrl: e.target.value } : d))
                            }
                            placeholder="Registration / Luma URL"
                            disabled={busy}
                          />
                        </div>
                        <Textarea
                          value={editDraft.summary}
                          onChange={(e) =>
                            setEditDraft((d) => (d ? { ...d, summary: e.target.value } : d))
                          }
                          placeholder="Public summary"
                          disabled={busy}
                          rows={4}
                        />
                        <div className="flex flex-wrap gap-2">
                          <Button type="button" size="sm" disabled={busy || isBusy} onClick={() => void saveEdit()}>
                            Save changes
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={busy}
                            onClick={() => setEditingId(null)}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
        </>
      ) : (
        <>
          {isLoading ? (
            <p className="font-body text-sm text-muted-foreground">Loading host events…</p>
          ) : visibleHostEvents.length === 0 ? (
            <div className="rounded-lg border border-dashed border-white/15 bg-white/[0.02] px-5 py-10 text-center">
              <p className="font-display text-sm font-semibold text-foreground">No host ops events yet</p>
              <p className="mt-1 font-body text-sm text-muted-foreground">
                Hosts create drafts in the host portal. You can publish them here once they appear.
              </p>
              <Button asChild variant="outline" size="sm" className="mt-4">
                <Link to="/dashboard/host">Open host portal</Link>
              </Button>
            </div>
          ) : (
            <ul className="divide-y divide-white/10 overflow-hidden rounded-lg border border-white/10">
              {visibleHostEvents.map((event) => {
                const busy = Boolean(isBusy && busyEventId === event.id);
                const publicUrl = event.public_hackathon_id
                  ? getHostedHackathonUrl(event.public_hackathon_id)
                  : null;
                const isLive = event.status === "published" && Boolean(event.public_hackathon_id);

                return (
                  <li key={event.id} className="bg-white/[0.02] px-4 py-4 sm:px-5">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0 space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-display text-base font-semibold text-foreground sm:text-lg">
                            {event.name || "Untitled host event"}
                          </h3>
                          <Badge
                            variant="outline"
                            className={cn(
                              "font-display text-[10px] uppercase tracking-wide",
                              isLive
                                ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-300"
                                : "border-white/15 bg-white/[0.04] text-muted-foreground",
                            )}
                          >
                            {event.status}
                          </Badge>
                          <Badge
                            variant="outline"
                            className="border-sky-400/30 bg-sky-400/10 font-display text-[10px] uppercase tracking-wide text-sky-300"
                          >
                            Host ops
                          </Badge>
                        </div>
                        <p className="font-body text-sm text-muted-foreground">
                          {formatDateTime(event.start_at)} · {event.location || "Location TBD"}
                        </p>
                        <p className="line-clamp-2 font-body text-sm text-foreground/80">
                          {event.tagline || event.description || event.theme || "No description yet."}
                        </p>
                        <div className="flex flex-wrap items-center gap-3 pt-1">
                          {publicUrl && isLive ? (
                            <Link
                              to={publicUrl}
                              className="inline-flex items-center gap-1 font-display text-xs font-semibold text-primary hover:underline"
                            >
                              Public page
                              <ExternalLink className="h-3 w-3" />
                            </Link>
                          ) : (
                            <span className="font-display text-xs text-muted-foreground">
                              Not on public directory yet
                            </span>
                          )}
                          <Link
                            to="/dashboard/host"
                            className="font-display text-xs font-semibold text-muted-foreground hover:text-foreground hover:underline"
                          >
                            Manage in host portal
                          </Link>
                          <span className="font-mono text-[11px] text-muted-foreground/80">{event.id}</span>
                          <span className="font-mono text-[11px] text-muted-foreground/60">
                            owner {event.owner_id.slice(0, 8)}…
                          </span>
                        </div>
                      </div>

                      <div className="flex shrink-0 flex-wrap gap-2 sm:min-w-[220px]">
                        {!isLive ? (
                          <Button
                            type="button"
                            size="sm"
                            disabled={busy || isBusy}
                            className="gap-1.5"
                            onClick={() => void onPublishHostEvent(event.id)}
                          >
                            <Eye className="h-3.5 w-3.5" />
                            Publish to public
                          </Button>
                        ) : (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={busy || isBusy}
                            className="gap-1.5"
                            onClick={() => void onUnpublishHostEvent(event.id)}
                          >
                            <EyeOff className="h-3.5 w-3.5" />
                            Unpublish
                          </Button>
                        )}
                        <Button asChild type="button" size="sm" variant="outline">
                          <Link to="/dashboard/host">Edit brief</Link>
                        </Button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
