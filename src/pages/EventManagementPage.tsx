import { useCallback, useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { Activity, ArrowLeft, Radar } from "lucide-react";
import { DashboardLayout, sectionClass } from "@/components/dashboard/DashboardLayout";
import { EventManagementWorkspace } from "@/components/dashboard/EventManagementWorkspace";
import { usePortalAuth } from "@/hooks/usePortalAuth";
import { useHackathonSelection } from "@/hooks/useHackathonSelection";
import { useAdminHackathonCatalog } from "@/hooks/useAdminHackathonCatalog";
import { HACKATHON_STORAGE_KEYS, PORTAL_HACKATHONS, type HackathonStatus, type SubmissionMode } from "@/lib/hackathons";
import {
  deleteHostedHackathon,
  mergePortalCatalogIntoEvents,
  portalHackathonAsHosted,
  publishHostEventPublicly,
  setHackathonPublished,
  setHackathonStatus,
  setHackathonSubmissionMode,
  unpublishHostEventPublicly,
  updateHostedHackathon,
  type HostedHackathon,
  type HostedHackathonUpdate,
} from "@/lib/aiHackathons";
import {
  fetchAllHostEventsForAdmin,
  type HostEvent,
} from "@/lib/hostEvents";
import { getFirestoreDb } from "@/lib/firebaseClient";
import { Button } from "@/components/ui/button";

export default function EventManagementPage() {
  const { sessionUser, loading: authLoading, signOut } = usePortalAuth();
  const db = getFirestoreDb();
  const {
    hostedEvents: events,
    catalog: adminHackathons,
    isLoading: isCatalogLoading,
    setHostedEvents: setEvents,
  } = useAdminHackathonCatalog(db, Boolean(sessionUser && sessionUser.role === "admin"));
  const [hostEvents, setHostEvents] = useState<HostEvent[]>([]);
  const [isHostLoading, setIsHostLoading] = useState(true);
  const [isBusy, setIsBusy] = useState(false);
  const [busyEventId, setBusyEventId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const listingEvents = mergePortalCatalogIntoEvents(events);
  const isLoading = isCatalogLoading || isHostLoading;

  const { selectedHackathonId, setSelectedHackathonId } = useHackathonSelection(
    HACKATHON_STORAGE_KEYS.admin,
    undefined,
    adminHackathons,
    { syncUrl: true },
  );

  const reloadHostEvents = useCallback(async () => {
    setIsHostLoading(true);
    try {
      setHostEvents(await fetchAllHostEventsForAdmin(db));
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Could not load host events.");
    } finally {
      setIsHostLoading(false);
    }
  }, [db]);

  useEffect(() => {
    if (!sessionUser || sessionUser.role !== "admin") return;
    void reloadHostEvents();
  }, [reloadHostEvents, sessionUser]);

  const patchLocalEvent = (eventId: string, patch: Partial<HostedHackathon>) => {
    setEvents((current) => {
      const existing = current.find((event) => event.id === eventId);
      if (existing) {
        return current.map((event) =>
          event.id === eventId ? { ...event, ...patch } : event,
        );
      }
      const portal = PORTAL_HACKATHONS.find((entry) => entry.id === eventId);
      if (!portal) return current;
      return [{ ...portalHackathonAsHosted(portal), ...patch, id: eventId }, ...current];
    });
  };

  const runMutation = async (
    eventId: string,
    action: () => Promise<void>,
    successMessage: string,
    optimistic?: Partial<HostedHackathon>,
  ) => {
    setIsBusy(true);
    setBusyEventId(eventId);
    setStatusMessage(null);
    if (optimistic) patchLocalEvent(eventId, optimistic);
    try {
      await action();
      await reloadHostEvents();
      setStatusMessage(successMessage);
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Could not update the event.");
    } finally {
      setIsBusy(false);
      setBusyEventId(null);
    }
  };

  const handlePublish = (eventId: string) => {
    const event = listingEvents.find((item) => item.id === eventId);
    return runMutation(
      eventId,
      () => setHackathonPublished(db, eventId, true),
      `${event?.name ?? "Event"} is now published.`,
      { published: true },
    );
  };

  const handleUnpublish = (eventId: string) => {
    const event = listingEvents.find((item) => item.id === eventId);
    return runMutation(
      eventId,
      () => setHackathonPublished(db, eventId, false),
      `${event?.name ?? "Event"} was unpublished and is hidden from the public site.`,
      { published: false },
    );
  };

  const handleSetStatus = (eventId: string, status: HackathonStatus) => {
    const event = listingEvents.find((item) => item.id === eventId);
    const label =
      status === "active" ? "is now live" : status === "past" ? "was marked as past" : "is set to upcoming";
    return runMutation(
      eventId,
      () => setHackathonStatus(db, eventId, status),
      `${event?.name ?? "Event"} ${label}.`,
      {
        status,
        ...(status === "active" ? { published: true } : {}),
      },
    );
  };

  const handleSetSubmissionMode = (eventId: string, submissionMode: SubmissionMode) => {
    const event = listingEvents.find((item) => item.id === eventId);
    const label =
      submissionMode === "open"
        ? "is accepting submissions"
        : submissionMode === "paused"
          ? "has paused submissions"
          : "has closed submissions";
    return runMutation(
      eventId,
      () => setHackathonSubmissionMode(db, eventId, submissionMode),
      `${event?.name ?? "Event"} ${label}.`,
      { submissionMode },
    );
  };

  const handleSaveEvent = (eventId: string, patch: HostedHackathonUpdate) => {
    const event = listingEvents.find((item) => item.id === eventId);
    return runMutation(
      eventId,
      () => updateHostedHackathon(db, eventId, patch),
      `${event?.name ?? "Event"} details saved.`,
      patch,
    );
  };

  const handleDeleteEvent = (eventId: string) => {
    const event = listingEvents.find((item) => item.id === eventId);
    return runMutation(
      eventId,
      async () => {
        await deleteHostedHackathon(db, eventId);
        setEvents((current) => current.filter((item) => item.id !== eventId));
      },
      `${event?.name ?? "Event"} was removed from the public directory.`,
    );
  };

  const handlePublishHostEvent = (hostEventId: string) => {
    const hostEvent = hostEvents.find((item) => item.id === hostEventId);
    if (!hostEvent || !sessionUser) {
      setStatusMessage("Host event not found.");
      return;
    }
    return runMutation(
      hostEventId,
      async () => {
        // Keep the public listing owned by the host so host re-publish stays allowed.
        await publishHostEventPublicly(db, hostEvent, hostEvent.owner_id || sessionUser.id);
      },
      `${hostEvent.name || "Host event"} is now on the public directory.`,
    );
  };

  const handleUnpublishHostEvent = (hostEventId: string) => {
    const hostEvent = hostEvents.find((item) => item.id === hostEventId);
    if (!hostEvent) {
      setStatusMessage("Host event not found.");
      return;
    }
    return runMutation(
      hostEventId,
      async () => {
        await unpublishHostEventPublicly(db, hostEvent);
      },
      `${hostEvent.name || "Host event"} was unpublished.`,
    );
  };

  if (authLoading) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!sessionUser || sessionUser.role !== "admin") {
    return <Navigate to="/admin" replace />;
  }

  return (
    <DashboardLayout
      sessionUser={sessionUser}
      role="admin"
      onSignOut={signOut}
      hackathons={adminHackathons}
      selectedHackathonId={selectedHackathonId}
      onHackathonChange={setSelectedHackathonId}
    >
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Button asChild variant="ghost" size="sm" className="gap-1.5">
          <Link to="/dashboard/admin">
            <ArrowLeft className="h-4 w-4" />
            Admin overview
          </Link>
        </Button>
        <Button asChild variant="outline" size="sm" className="gap-1.5">
          <Link to="/dashboard/admin/screening">
            <Radar className="h-4 w-4" />
            Screening
          </Link>
        </Button>
        <Button asChild variant="outline" size="sm" className="gap-1.5">
          <Link to="/dashboard/admin/operations">
            <Activity className="h-4 w-4" />
            Operations
          </Link>
        </Button>
        <Button asChild variant="outline" size="sm" className="gap-1.5">
          <Link to="/dashboard/host">Host portal</Link>
        </Button>
      </div>

      <section className={sectionClass}>
        <EventManagementWorkspace
          events={listingEvents}
          hostEvents={hostEvents}
          isLoading={isLoading}
          isBusy={isBusy}
          busyEventId={busyEventId}
          statusMessage={statusMessage}
          onRefresh={reloadHostEvents}
          onPublish={handlePublish}
          onUnpublish={handleUnpublish}
          onSetStatus={handleSetStatus}
          onSetSubmissionMode={handleSetSubmissionMode}
          onSaveEvent={handleSaveEvent}
          onDeleteEvent={handleDeleteEvent}
          onPublishHostEvent={handlePublishHostEvent}
          onUnpublishHostEvent={handleUnpublishHostEvent}
        />
      </section>
    </DashboardLayout>
  );
}
