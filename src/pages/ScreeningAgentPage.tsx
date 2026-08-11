import { Link, Navigate } from "react-router-dom";
import { Activity, ArrowLeft, CalendarCheck2 } from "lucide-react";
import { DashboardLayout, sectionClass } from "@/components/dashboard/DashboardLayout";
import { ScreeningAgentWorkspace } from "@/components/dashboard/ScreeningAgentWorkspace";
import { usePortalAuth } from "@/hooks/usePortalAuth";
import { useAdminPlatformOps } from "@/hooks/useAdminPlatformOps";
import { PORTAL_HACKATHONS } from "@/lib/hackathons";
import { Button } from "@/components/ui/button";

export default function ScreeningAgentPage() {
  const { sessionUser, loading: authLoading, signOut } = usePortalAuth();
  const ops = useAdminPlatformOps();

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
      hackathons={PORTAL_HACKATHONS}
      selectedHackathonId={ops.selectedHackathonId}
      onHackathonChange={ops.setSelectedHackathonId}
    >
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Button asChild variant="ghost" size="sm" className="gap-1.5">
          <Link to="/dashboard/admin">
            <ArrowLeft className="h-4 w-4" />
            Admin overview
          </Link>
        </Button>
        <Button asChild variant="outline" size="sm" className="gap-1.5">
          <Link to="/dashboard/admin/operations">
            <Activity className="h-4 w-4" />
            Open operations
          </Link>
        </Button>
        <Button asChild variant="outline" size="sm" className="gap-1.5">
          <Link to="/dashboard/admin/events">
            <CalendarCheck2 className="h-4 w-4" />
            Event management
          </Link>
        </Button>
      </div>

      <section className={sectionClass}>
        {ops.isLoading ? (
          <p className="font-body text-sm text-muted-foreground">Loading applicants…</p>
        ) : (
          <ScreeningAgentWorkspace
            hackathon={ops.selectedHackathon}
            participants={ops.participants}
            ops={ops.platformOps}
            isBusy={ops.isSavingOps}
            statusMessage={ops.statusMessage}
            onRunAll={ops.handleRunScreening}
            onSetStatus={ops.handleSetApplicantStatus}
          />
        )}
      </section>
    </DashboardLayout>
  );
}
