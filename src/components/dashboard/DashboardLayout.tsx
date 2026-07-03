import {
  LayoutDashboard,
  FileText,
  ClipboardList,
  LogOut,
  Users,
  Scale,
  BarChart3,
  Trophy,
  CalendarRange,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { HackathonSelector } from "@/components/dashboard/HackathonSelector";
import type { HackathonId, PortalHackathon } from "@/lib/hackathons";
import type { SessionUser } from "@/types/portal";

type DashboardLayoutProps = {
  sessionUser: SessionUser;
  role: "participant" | "judge" | "mentor" | "admin";
  children: React.ReactNode;
  onSignOut: () => Promise<void>;
  hackathons?: PortalHackathon[];
  selectedHackathonId?: HackathonId;
  onHackathonChange?: (hackathonId: HackathonId) => void;
};

const sectionClass =
  "rounded-2xl border border-border/60 bg-card/85 backdrop-blur-sm shadow-xl shadow-black/20";

export function DashboardLayout({
  sessionUser,
  role,
  children,
  onSignOut,
  hackathons,
  selectedHackathonId,
  onHackathonChange,
}: DashboardLayoutProps) {
  const navigate = useNavigate();
  const isStaffDashboard = role === "judge" || role === "mentor";

  const handleSignOut = async () => {
    await onSignOut();
    navigate("/");
  };

  return (
    <SidebarProvider>
      <Sidebar side="left" className="border-r border-sidebar-border">
        <SidebarHeader className="border-b border-sidebar-border">
          <div className="flex h-14 items-center gap-2 bg-gradient-to-r from-sidebar-background to-sidebar-accent/20 px-3">
            <SidebarTrigger className="text-sidebar-foreground" />
            <span className="text-sm font-semibold tracking-normal text-sidebar-foreground">
              Impact Kyoto
            </span>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel className="text-xs font-medium tracking-normal text-muted-foreground">
              Dashboard
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <a href="#overview" className="cursor-pointer">
                      <LayoutDashboard className="h-4 w-4" />
                      <span>Overview</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                {role === "participant" && (
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild>
                      <a href="#my-project" className="cursor-pointer">
                        <FileText className="h-4 w-4" />
                        <span>My Project</span>
                      </a>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )}
                {isStaffDashboard && (
                  <>
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild>
                        <a href="#teams" className="cursor-pointer">
                          <Users className="h-4 w-4" />
                          <span>Teams</span>
                        </a>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild>
                        <a href="#submissions" className="cursor-pointer">
                          <ClipboardList className="h-4 w-4" />
                          <span>Submissions</span>
                        </a>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  </>
                )}
                {role === "admin" && (
                  <>
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild>
                        <a href="#manage-participants" className="cursor-pointer">
                          <Users className="h-4 w-4" />
                          <span>Manage Participants</span>
                        </a>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild>
                        <a href="#manage-judges" className="cursor-pointer">
                          <Scale className="h-4 w-4" />
                          <span>Manage Judges</span>
                        </a>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild>
                        <a href="#submission-marks" className="cursor-pointer">
                          <ClipboardList className="h-4 w-4" />
                          <span>Submission Marks</span>
                        </a>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild>
                        <a href="#analytics" className="cursor-pointer">
                          <BarChart3 className="h-4 w-4" />
                          <span>Analytics</span>
                        </a>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild>
                        <a href="#winner-detection" className="cursor-pointer">
                          <Trophy className="h-4 w-4" />
                          <span>Winner Detection</span>
                        </a>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  </>
                )}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
          {(role === "admin" || isStaffDashboard) &&
            hackathons &&
            selectedHackathonId &&
            onHackathonChange && (
              <SidebarGroup>
                <SidebarGroupLabel className="text-xs font-medium tracking-normal text-muted-foreground">
                  Hackathons
                </SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {hackathons.map((hackathon) => {
                      const isActive = hackathon.id === selectedHackathonId;
                      return (
                        <SidebarMenuItem key={hackathon.id}>
                          <SidebarMenuButton
                            isActive={isActive}
                            className="h-auto cursor-pointer py-2.5"
                            onClick={() => onHackathonChange(hackathon.id)}
                          >
                            <CalendarRange className="h-4 w-4 shrink-0" />
                            <span className="flex min-w-0 flex-col items-start gap-0.5">
                              <span className="truncate text-sm">{hackathon.shortName}</span>
                              <span className="truncate text-[0.65rem] text-muted-foreground">
                                {hackathon.eventDate}
                              </span>
                            </span>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      );
                    })}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            )}
        </SidebarContent>
        <SidebarFooter className="border-t border-sidebar-border">
          <div className="p-2">
            <div className="rounded-lg border border-sidebar-border bg-sidebar-accent/30 px-3 py-2">
              <p className="text-xs font-medium tracking-normal text-muted-foreground">
                Signed in as
              </p>
              <p className="truncate text-sm font-medium text-sidebar-foreground">
                {sessionUser.email}
              </p>
              <span className="mt-0.5 inline-flex items-center gap-1.5 text-xs font-medium text-primary">
                <span className="h-1.5 w-1.5 rounded-full bg-primary" aria-hidden />
                {sessionUser.role ?? "unassigned"}
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="mt-2 w-full justify-start gap-2 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              onClick={handleSignOut}
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </Button>
          </div>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <header className="sticky top-0 z-30 flex min-h-14 flex-col gap-3 border-b border-border/40 bg-background/85 px-3 py-3 backdrop-blur-sm sm:px-4 md:px-6">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
              <span className="text-sm font-semibold text-foreground">
                {role === "participant"
                  ? "Participant"
                  : role === "mentor"
                    ? "Mentor"
                    : role === "judge"
                      ? "Judge"
                      : "Admin"}{" "}
                Dashboard
              </span>
              <Badge variant="outline" className="text-[0.65rem] sm:text-xs">
                {sessionUser.role}
              </Badge>
            </div>
            <div className="hidden max-w-[46ch] text-right text-xs text-muted-foreground md:block">
              {sessionUser.email}
            </div>
          </div>
          {(role === "admin" || isStaffDashboard) &&
            selectedHackathonId &&
            onHackathonChange && (
              <HackathonSelector
                selectedHackathonId={selectedHackathonId}
                onSelect={onHackathonChange}
                compact
              />
            )}
        </header>
        <div className="flex-1 overflow-auto p-3 sm:p-4 md:p-6">
          <div className="mx-auto w-full max-w-[1400px]">
          {children}
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}

export { sectionClass };
