import { useCallback, useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { Activity, ArrowLeft, Radar } from "lucide-react";
import { DashboardLayout, sectionClass } from "@/components/dashboard/DashboardLayout";
import { EventManagementWorkspace } from "@/components/dashboard/EventManagementWorkspace";
import { usePortalAuth } from "@/hooks/usePortalAuth";
import { useHackathonSelection } from "@/hooks/useHackathonSelection";
import { HACKATHON_STORAGE_KEYS, PORTAL_HACKATHONS, type HackathonStatus } from "@/lib/hackathons";
import {
  deleteHostedHackathon,
  fetchAllHackathonsForAdmin,
  mergePortalCatalogIntoEvents,
  publishHostEventPublicly,
  setHackathonPublished,
  setHackathonStatus,
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
  const [events, setEvents] = useState<HostedHackathon[]>([]);
  const [hostEvents, setHostEvents] = useState<HostEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isBusy, setIsBusy] = useState(false);
  const [busyEventId, setBusyEventId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const listingEvents = mergePortalCatalogIntoEvents(events);

  const adminHackathons = [
    ...PORTAL_HACKATHONS,
    ...events.filter((event) => !PORTAL_HACKATHONS.some((item) => item.id === event.id)),
  ];

  const { selectedHackathonId, setSelectedHackathonId } = useHackathonSelection(
    HACKATHON_STORAGE_KEYS.admin,
    undefined,
    adminHackathons,
  );

  const reloadEvents = useCallback(async (options?: { silent?: boolean }) => {
    if (!options?.silent) setIsLoading(true);
    try {
      const [nextEvents, nextHostEvents] = await Promise.all([
        fetchAllHackathonsForAdmin(db),
        fetchAllHostEventsForAdmin(db),
      ]);
      setEvents(nextEvents);
      setHostEvents(nextHostEvents);
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Could not load events.");
    } finally {
      if (!options?.silent) setIsLoading(false);
    }
  }, [db]);

  useEffect(() => {
    if (!sessionUser || sessionUser.role !== "admin") return;
    void reloadEvents();
  }, [reloadEvents, sessionUser]);

  const runMutation = async (
    eventId: string,
    action: () => Promise<void>,
    successMessage: string,
  ) => {
    setIsBusy(true);
    setBusyEventId(eventId);
    setStatusMessage(null);
    try {
      await action();
      await reloadEvents({ silent: true });
      setStatusMessage(successMessage);
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Could not update the event.");
    } finally {
      setIsBusy(false);
      setBusyEventId(null);
    }
  };

  const handlePublish = (eventId: string) => {
    const event = events.find((item) => item.id === eventId);
    return runMutation(
      eventId,
      () => setHackathonPublished(db, eventId, true),
      `${event?.name ?? "Event"} is now published.`,
    );
  };

  const handleUnpublish = (eventId: string) => {
    const event = events.find((item) => item.id === eventId);
    return runMutation(
      eventId,
      () => setHackathonPublished(db, eventId, false),
      `${event?.name ?? "Event"} was unpublished and is hidden from the public site.`,
    );
  };

  const handleSetStatus = (eventId: string, status: HackathonStatus) => {
    const event = events.find((item) => item.id === eventId);
    const label =
      status === "active" ? "is now live" : status === "past" ? "was marked as past" : "is set to upcoming";
    return runMutation(
      eventId,
      () => setHackathonStatus(db, eventId, status),
      `${event?.name ?? "Event"} ${label}.`,
    );
  };

  const handleSaveEvent = (eventId: string, patch: HostedHackathonUpdate) => {
    const event = events.find((item) => item.id === eventId);
    return runMutation(
      eventId,
      () => updateHostedHackathon(db, eventId, patch),
      `${event?.name ?? "Event"} details saved.`,
    );
  };

  const handleDeleteEvent = (eventId: string) => {
    const event = events.find((item) => item.id === eventId);
    return runMutation(
      eventId,
      () => deleteHostedHackathon(db, eventId),
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
          onRefresh={() => reloadEvents()}
          onPublish={handlePublish}
          onUnpublish={handleUnpublish}
          onSetStatus={handleSetStatus}
          onSaveEvent={handleSaveEvent}
          onDeleteEvent={handleDeleteEvent}
          onPublishHostEvent={handlePublishHostEvent}
          onUnpublishHostEvent={handleUnpublishHostEvent}
        />
      </section>
    </DashboardLayout>
  );
}
