import { useMemo } from "react";
import { Link, Navigate, useLocation } from "react-router-dom";
import { Activity, ArrowLeft, CalendarCheck2 } from "lucide-react";
import { DashboardLayout, sectionClass } from "@/components/dashboard/DashboardLayout";
import { ScreeningAgentWorkspace } from "@/components/dashboard/ScreeningAgentWorkspace";
import { usePortalAuth } from "@/hooks/usePortalAuth";
import { useAdminPlatformOps } from "@/hooks/useAdminPlatformOps";
import { useHostOpsCatalog } from "@/hooks/useHostOpsCatalog";
import { HACKATHON_STORAGE_KEYS } from "@/lib/hackathons";
import { Button } from "@/components/ui/button";

export default function ScreeningAgentPage() {
  const location = useLocation();
  const isHostPortal = location.pathname.startsWith("/dashboard/host");
  const { sessionUser, loading: authLoading, signOut } = usePortalAuth();
  const hostCatalog = useHostOpsCatalog(isHostPortal ? sessionUser : null);

  const allowedHackathonIds = useMemo(
    () => (isHostPortal ? hostCatalog.catalog.map((event) => event.id) : undefined),
    [hostCatalog.catalog, isHostPortal],
  );

  const ops = useAdminPlatformOps(
    isHostPortal
      ? {
          catalogOverride: hostCatalog.catalog,
          storageKey: HACKATHON_STORAGE_KEYS.host,
          allowedHackathonIds,
          useAdminCatalog: false,
        }
      : undefined,
  );

  if (authLoading) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!sessionUser) {
    return <Navigate to={isHostPortal ? "/host/signin" : "/admin"} replace />;
  }

  if (isHostPortal) {
    if (sessionUser.role !== "host" && sessionUser.role !== "admin") {
      return <Navigate to="/dashboard" replace />;
    }
    if (sessionUser.role === "host" && sessionUser.hostApprovalStatus !== "approved") {
      return <Navigate to="/dashboard/host" replace />;
    }
  } else if (sessionUser.role !== "admin") {
    return <Navigate to="/admin" replace />;
  }

  const role = isHostPortal ? "host" : "admin";
  const homeHref = isHostPortal ? "/dashboard/host" : "/dashboard/admin";
  const opsHref = isHostPortal ? "/dashboard/host/operations" : "/dashboard/admin/operations";
  const catalogLoading = isHostPortal && hostCatalog.isLoading;
  const noHostEvents = isHostPortal && !hostCatalog.isLoading && hostCatalog.catalog.length === 0;

  return (
    <DashboardLayout
      sessionUser={sessionUser}
      role={role}
      onSignOut={signOut}
      hackathons={ops.hackathons}
      selectedHackathonId={ops.selectedHackathonId}
      onHackathonChange={ops.setSelectedHackathonId}
    >
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Button asChild variant="ghost" size="sm" className="gap-1.5">
          <Link to={homeHref}>
            <ArrowLeft className="h-4 w-4" />
            {isHostPortal ? "Host overview" : "Admin overview"}
          </Link>
        </Button>
        <Button asChild variant="outline" size="sm" className="gap-1.5">
          <Link to={opsHref}>
            <Activity className="h-4 w-4" />
            Open operations
          </Link>
        </Button>
        {!isHostPortal ? (
          <Button asChild variant="outline" size="sm" className="gap-1.5">
            <Link to="/dashboard/admin/events">
              <CalendarCheck2 className="h-4 w-4" />
              Event management
            </Link>
          </Button>
        ) : (
          <Button asChild variant="outline" size="sm" className="gap-1.5">
            <Link to="/dashboard/host#event-details">
              <CalendarCheck2 className="h-4 w-4" />
              Event details
            </Link>
          </Button>
        )}
      </div>

      <section className={sectionClass}>
        {catalogLoading || ops.isLoading ? (
          <p className="font-body text-sm text-muted-foreground">Loading applicants…</p>
        ) : noHostEvents ? (
          <div className="space-y-3 p-2">
            <p className="font-display text-lg font-semibold tracking-tight">
              Publish an event to open screening
            </p>
            <p className="text-sm text-muted-foreground">
              Screening runs on participants registered to your public event listing. Create and
              publish an event from the host dashboard first.
            </p>
            <Button asChild size="sm">
              <Link to="/dashboard/host#event-details">Go to event details</Link>
            </Button>
          </div>
        ) : (
          <ScreeningAgentWorkspace
            hackathon={ops.selectedHackathon}
            participants={ops.participants}
            ops={ops.platformOps}
            isBusy={ops.isSavingOps}
            statusMessage={ops.statusMessage ?? hostCatalog.error}
            onRunAll={ops.handleRunScreening}
            onSetStatus={ops.handleSetApplicantStatus}
          />
        )}
      </section>
    </DashboardLayout>
  );
}
