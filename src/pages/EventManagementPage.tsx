import { useCallback, useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { Activity, ArrowLeft, Radar } from "lucide-react";
import { DashboardLayout, sectionClass } from "@/components/dashboard/DashboardLayout";
import { EventManagementWorkspace } from "@/components/dashboard/EventManagementWorkspace";
import { usePortalAuth } from "@/hooks/usePortalAuth";
import { useHackathonSelection } from "@/hooks/useHackathonSelection";
import { HACKATHON_STORAGE_KEYS, PORTAL_HACKATHONS, type HackathonStatus } from "@/lib/hackathons";
import {
  fetchAllHackathonsForAdmin,
  setHackathonPublished,
  setHackathonStatus,
  type HostedHackathon,
} from "@/lib/aiHackathons";
import { getFirestoreDb } from "@/lib/firebaseClient";
import { Button } from "@/components/ui/button";

export default function EventManagementPage() {
  const { sessionUser, loading: authLoading, signOut } = usePortalAuth();
  const db = getFirestoreDb();
  const [events, setEvents] = useState<HostedHackathon[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isBusy, setIsBusy] = useState(false);
  const [busyEventId, setBusyEventId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

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
      const next = await fetchAllHackathonsForAdmin(db);
      setEvents(next);
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
      </div>

      <section className={sectionClass}>
        <EventManagementWorkspace
          events={events}
          isLoading={isLoading}
          isBusy={isBusy}
          busyEventId={busyEventId}
          statusMessage={statusMessage}
          onPublish={handlePublish}
          onUnpublish={handleUnpublish}
          onSetStatus={handleSetStatus}
        />
      </section>
    </DashboardLayout>
  );
}
