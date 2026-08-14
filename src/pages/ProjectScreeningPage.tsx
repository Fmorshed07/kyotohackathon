import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, useLocation } from "react-router-dom";
import { Activity, ArrowLeft, CalendarCheck2, Radar } from "lucide-react";
import { DashboardLayout, sectionClass } from "@/components/dashboard/DashboardLayout";
import { ProjectScreeningWorkspace } from "@/components/dashboard/ProjectScreeningWorkspace";
import { usePortalAuth } from "@/hooks/usePortalAuth";
import { useAdminPlatformOps } from "@/hooks/useAdminPlatformOps";
import { useHostOpsCatalog } from "@/hooks/useHostOpsCatalog";
import { fetchPortalHackathonCatalog } from "@/lib/aiHackathons";
import { getFirestoreDb } from "@/lib/firebaseClient";
import {
  getHackathonsByIds,
  getUserAllowedHackathonIds,
  HACKATHON_STORAGE_KEYS,
  isHackathonId,
  PORTAL_HACKATHONS,
  type PortalHackathon,
} from "@/lib/hackathons";
import { canAccessStaffDashboard } from "@/lib/portalRoutes";
import { Button } from "@/components/ui/button";

export default function ProjectScreeningPage() {
  const location = useLocation();
  const isHostPortal = location.pathname.startsWith("/dashboard/host");
  const isJudgePortal = location.pathname.startsWith("/dashboard/judge");
  const { sessionUser, loading: authLoading, signOut } = usePortalAuth();
  const hostCatalog = useHostOpsCatalog(isHostPortal ? sessionUser : null);
  const db = getFirestoreDb();
  const [judgeCatalog, setJudgeCatalog] = useState<PortalHackathon[]>(PORTAL_HACKATHONS);
  const [judgeCatalogLoading, setJudgeCatalogLoading] = useState(isJudgePortal);

  const judgeAllowedIds = useMemo(() => {
    if (!isJudgePortal || !sessionUser) return [];
    return getUserAllowedHackathonIds({
      hackathonId: sessionUser.hackathonId && isHackathonId(sessionUser.hackathonId)
        ? sessionUser.hackathonId
        : undefined,
      hackathonIds: (sessionUser.hackathonIds ?? []).filter(isHackathonId),
    });
  }, [isJudgePortal, sessionUser]);

  useEffect(() => {
    if (!isJudgePortal) return;
    let cancelled = false;
    setJudgeCatalogLoading(true);
    void fetchPortalHackathonCatalog(db)
      .then((catalog) => {
        if (!cancelled) setJudgeCatalog(catalog);
      })
      .catch(() => {
        if (!cancelled) setJudgeCatalog(PORTAL_HACKATHONS);
      })
      .finally(() => {
        if (!cancelled) setJudgeCatalogLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [db, isJudgePortal]);

  const judgeEvents = useMemo(
    () => getHackathonsByIds(judgeAllowedIds, judgeCatalog),
    [judgeAllowedIds, judgeCatalog],
  );

  const allowedHackathonIds = useMemo(() => {
    if (isHostPortal) return hostCatalog.catalog.map((event) => event.id);
    if (isJudgePortal) return judgeAllowedIds;
    return undefined;
  }, [hostCatalog.catalog, isHostPortal, isJudgePortal, judgeAllowedIds]);

  const ops = useAdminPlatformOps(
    isHostPortal
      ? {
          catalogOverride: hostCatalog.catalog,
          storageKey: HACKATHON_STORAGE_KEYS.host,
          allowedHackathonIds,
          useAdminCatalog: false,
        }
      : isJudgePortal
        ? {
            catalogOverride: judgeEvents,
            storageKey: HACKATHON_STORAGE_KEYS.judge,
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
    return <Navigate to={isHostPortal ? "/host/signin" : isJudgePortal ? "/signin" : "/admin"} replace />;
  }

  if (isHostPortal) {
    if (sessionUser.role !== "host" && sessionUser.role !== "admin") {
      return <Navigate to="/dashboard" replace />;
    }
    if (sessionUser.role === "host" && sessionUser.hostApprovalStatus !== "approved") {
      return <Navigate to="/dashboard/host" replace />;
    }
  } else if (isJudgePortal) {
    if (!canAccessStaffDashboard(sessionUser.role, sessionUser.judgeApprovalStatus)) {
      return <Navigate to="/dashboard" replace />;
    }
  } else if (sessionUser.role !== "admin") {
    return <Navigate to="/admin" replace />;
  }

  const role = isHostPortal ? "host" : isJudgePortal ? (sessionUser.role === "mentor" ? "mentor" : "judge") : "admin";
  const homeHref = isHostPortal ? "/dashboard/host" : isJudgePortal ? "/dashboard/judge" : "/dashboard/admin";
  const homeLabel = isHostPortal ? "Host overview" : isJudgePortal ? "Judge overview" : "Admin overview";
  const catalogLoading =
    (isHostPortal && hostCatalog.isLoading) || (isJudgePortal && judgeCatalogLoading);
  const noHostEvents = isHostPortal && !hostCatalog.isLoading && hostCatalog.catalog.length === 0;
  const noJudgeEvents = isJudgePortal && !judgeCatalogLoading && judgeEvents.length === 0;

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
            {homeLabel}
          </Link>
        </Button>
        {!isJudgePortal && (
          <>
            <Button asChild variant="outline" size="sm" className="gap-1.5">
              <Link to={isHostPortal ? "/dashboard/host/screening" : "/dashboard/admin/screening"}>
                <Radar className="h-4 w-4" />
                Applicant screening
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm" className="gap-1.5">
              <Link to={isHostPortal ? "/dashboard/host/operations" : "/dashboard/admin/operations"}>
                <Activity className="h-4 w-4" />
                Open operations
              </Link>
            </Button>
          </>
        )}
        {isJudgePortal ? (
          <Button asChild variant="outline" size="sm" className="gap-1.5">
            <Link to="/dashboard/judge#project-marks">Theme marks</Link>
          </Button>
        ) : !isHostPortal ? (
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
          <p className="font-body text-sm text-muted-foreground">Loading concepts…</p>
        ) : noHostEvents ? (
          <div className="space-y-3 p-2">
            <p className="font-display text-lg font-semibold tracking-tight">
              Publish an event to screen concepts
            </p>
            <p className="text-sm text-muted-foreground">
              The project agent scores write-ups against your public event theme. Create and publish
              an event from the host dashboard first.
            </p>
            <Button asChild size="sm">
              <Link to="/dashboard/host#event-details">Go to event details</Link>
            </Button>
          </div>
        ) : noJudgeEvents ? (
          <div className="space-y-3 p-2">
            <p className="font-display text-lg font-semibold tracking-tight">No events assigned</p>
            <p className="text-sm text-muted-foreground">
              Ask an admin to grant you access to a hackathon before screening concepts.
            </p>
          </div>
        ) : (
          <ProjectScreeningWorkspace
            hackathon={ops.selectedHackathon}
            participants={ops.participants}
            submissions={ops.submissionRows}
            ops={ops.platformOps}
            isBusy={ops.isSavingOps}
            statusMessage={ops.statusMessage ?? hostCatalog.error}
            readOnly={isJudgePortal}
            onRunAll={ops.handleRunProjectScreening}
            onSetStatus={ops.handleSetProjectScreenStatus}
          />
        )}
      </section>
    </DashboardLayout>
  );
}
