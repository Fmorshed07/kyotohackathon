import { Link, Navigate } from "react-router-dom";
import { ArrowLeft, CalendarCheck2, Radar } from "lucide-react";
import { DashboardLayout, sectionClass } from "@/components/dashboard/DashboardLayout";
import { LiveOpsWorkspace } from "@/components/dashboard/LiveOpsWorkspace";
import { usePortalAuth } from "@/hooks/usePortalAuth";
import { useAdminPlatformOps } from "@/hooks/useAdminPlatformOps";
import { PORTAL_HACKATHONS } from "@/lib/hackathons";
import { Button } from "@/components/ui/button";

export default function PlatformOperationsPage() {
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
          <Link to="/dashboard/admin/screening">
            <Radar className="h-4 w-4" />
            Open screening agent
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
          <p className="font-body text-sm text-muted-foreground">Loading operations…</p>
        ) : (
          <LiveOpsWorkspace
            hackathon={ops.selectedHackathon}
            participants={ops.participants}
            submissions={ops.submissionRows}
            judgingCriteria={ops.judgingCriteria}
            ops={ops.platformOps}
            isBusy={ops.isSavingOps}
            statusMessage={ops.statusMessage}
            onHackathonChange={ops.setSelectedHackathonId}
            onMatchTeams={ops.handleMatchTeams}
            onToggleCheckIn={ops.handleToggleCheckIn}
            onSendBroadcast={ops.handleOpsBroadcast}
            onSelectProject={ops.setActiveOpsProjectId}
            activeProjectId={ops.activeOpsProjectId ?? ops.submissionRows[0]?.id ?? null}
            rubric={ops.opsRubric}
            onRubricChange={(criterionId, value) =>
              ops.setOpsRubric((current) => ({ ...current, [criterionId]: value }))
            }
            onRunCopilot={ops.handleRunCopilot}
            onSaveScore={ops.handleSaveOpsScore}
            copilotNote={ops.opsCopilotNote}
            onCarryForward={ops.handleCarryForward}
          />
        )}
      </section>
    </DashboardLayout>
  );
}
