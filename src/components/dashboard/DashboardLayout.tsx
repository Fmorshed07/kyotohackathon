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
  Sparkles,
  Menu,
  X,
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
  useSidebar,
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

const roleThemes: Record<
  DashboardLayoutProps["role"],
  { label: string; badgeClass: string }
> = {
  participant: {
    label: "Participant",
    badgeClass: "border-primary/40 bg-primary/10 text-primary",
  },
  judge: {
    label: "Judge",
    badgeClass: "border-secondary/40 bg-secondary/10 text-secondary",
  },
  mentor: {
    label: "Mentor",
    badgeClass: "border-community/40 bg-community/10 text-community",
  },
  admin: {
    label: "Admin",
    badgeClass: "border-accent/40 bg-accent/10 text-accent",
  },
};

const menuButtonClass =
  "group/nav min-h-11 cursor-pointer rounded-lg text-[15px] font-medium transition-all duration-200 hover:bg-primary/10 hover:text-primary active:scale-[0.98] data-[active=true]:bg-primary/15 data-[active=true]:text-primary sm:min-h-12 sm:text-base";

const navIconClass =
  "h-5 w-5 shrink-0 text-muted-foreground transition-colors group-hover/nav:text-primary";

function MobileSidebarClose() {
  const { isMobile, setOpenMobile } = useSidebar();
  if (!isMobile) return null;

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="ml-auto h-10 w-10 shrink-0 text-sidebar-foreground md:hidden"
      onClick={() => setOpenMobile(false)}
      aria-label="Close menu"
    >
      <X className="h-5 w-5" />
    </Button>
  );
}

function MobileMenuTrigger() {
  const { toggleSidebar } = useSidebar();

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-card/60 text-foreground shadow-sm active:scale-95 md:hidden"
      onClick={toggleSidebar}
      aria-label="Open menu"
    >
      <Menu className="h-5 w-5" />
    </Button>
  );
}

function DashboardNavLink({
  href,
  children,
  onNavigate,
}: {
  href: string;
  children: React.ReactNode;
  onNavigate: () => void;
}) {
  const handleClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
    if (!href.startsWith("#")) return;

    event.preventDefault();
    const target = document.getElementById(href.slice(1));
    target?.scrollIntoView({ behavior: "smooth", block: "start" });
    onNavigate();
  };

  return (
    <a
      href={href}
      className="flex w-full items-center gap-2"
      onClick={handleClick}
    >
      {children}
    </a>
  );
}

function DashboardLayoutContent({
  sessionUser,
  role,
  children,
  onSignOut,
  hackathons,
  selectedHackathonId,
  onHackathonChange,
}: DashboardLayoutProps) {
  const navigate = useNavigate();
  const { isMobile, setOpenMobile } = useSidebar();
  const isStaffDashboard = role === "judge" || role === "mentor";
  const roleTheme = roleThemes[role];
  const userInitial = (sessionUser.email?.[0] ?? "?").toUpperCase();

  const closeMobileNav = () => {
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  const handleSignOut = async () => {
    closeMobileNav();
    await onSignOut();
    navigate("/");
  };

  const handleHackathonChange = (hackathonId: HackathonId) => {
    onHackathonChange?.(hackathonId);
    closeMobileNav();
  };

  return (
    <>
      <Sidebar side="left" className="dash-sidebar border-r border-sidebar-border">
        <SidebarHeader className="border-b border-sidebar-border">
          <div className="flex h-16 items-center gap-2.5 bg-gradient-to-r from-sidebar-background via-sidebar-background to-sidebar-accent/15 px-3">
            <SidebarTrigger className="hidden text-sidebar-foreground md:inline-flex" />
            <span
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-primary via-secondary to-accent shadow-[0_0_16px_hsl(199_89%_68%/0.35)]"
              aria-hidden
            >
              <Sparkles className="h-4 w-4 text-background" />
            </span>
            <span className="flex min-w-0 flex-1 flex-col leading-tight">
              <span className="font-display text-base font-bold tracking-wide text-sidebar-foreground sm:text-lg">
                Impact Kyoto
              </span>
              <span className="font-display text-[0.68rem] font-medium uppercase tracking-[0.22em] text-primary/80 sm:text-xs">
                Portal
              </span>
            </span>
            <MobileSidebarClose />
          </div>
        </SidebarHeader>
        <SidebarContent className="overscroll-contain">
          <SidebarGroup>
            <SidebarGroupLabel className="font-display text-xs font-semibold uppercase tracking-[0.18em] text-primary/60 sm:text-sm">
              Dashboard
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild className={menuButtonClass}>
                    <DashboardNavLink href="#overview" onNavigate={closeMobileNav}>
                      <LayoutDashboard className={navIconClass} />
                      <span>Overview</span>
                    </DashboardNavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                {role === "participant" && (
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild className={menuButtonClass}>
                      <DashboardNavLink href="#my-project" onNavigate={closeMobileNav}>
                        <FileText className={navIconClass} />
                        <span>My Project</span>
                      </DashboardNavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )}
                {isStaffDashboard && (
                  <>
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild className={menuButtonClass}>
                        <DashboardNavLink href="#teams" onNavigate={closeMobileNav}>
                          <Users className={navIconClass} />
                          <span>Teams</span>
                        </DashboardNavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild className={menuButtonClass}>
                        <DashboardNavLink href="#top-3-ranking" onNavigate={closeMobileNav}>
                          <Trophy className={navIconClass} />
                          <span>Top 3 Ranking</span>
                        </DashboardNavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild className={menuButtonClass}>
                        <DashboardNavLink href="#submissions" onNavigate={closeMobileNav}>
                          <ClipboardList className={navIconClass} />
                          <span>Submissions</span>
                        </DashboardNavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  </>
                )}
                {role === "admin" && (
                  <>
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild className={menuButtonClass}>
                        <DashboardNavLink href="#manage-participants" onNavigate={closeMobileNav}>
                          <Users className={navIconClass} />
                          <span>Manage Participants</span>
                        </DashboardNavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild className={menuButtonClass}>
                        <DashboardNavLink href="#manage-judges" onNavigate={closeMobileNav}>
                          <Scale className={navIconClass} />
                          <span>Manage Judges</span>
                        </DashboardNavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild className={menuButtonClass}>
                        <DashboardNavLink href="#judge-marks" onNavigate={closeMobileNav}>
                          <Scale className={navIconClass} />
                          <span>Judge Marks</span>
                        </DashboardNavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild className={menuButtonClass}>
                        <DashboardNavLink href="#submission-marks" onNavigate={closeMobileNav}>
                          <ClipboardList className={navIconClass} />
                          <span>Submissions</span>
                        </DashboardNavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild className={menuButtonClass}>
                        <DashboardNavLink href="#analytics" onNavigate={closeMobileNav}>
                          <BarChart3 className={navIconClass} />
                          <span>Analytics</span>
                        </DashboardNavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild className={menuButtonClass}>
                        <DashboardNavLink href="#winner-detection" onNavigate={closeMobileNav}>
                          <Trophy className={navIconClass} />
                          <span>Winner Detection</span>
                        </DashboardNavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild className={menuButtonClass}>
                        <DashboardNavLink href="#top-3-ranking" onNavigate={closeMobileNav}>
                          <Trophy className={navIconClass} />
                          <span>Top 3 Ranking</span>
                        </DashboardNavLink>
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
                <SidebarGroupLabel className="font-display text-xs font-semibold uppercase tracking-[0.18em] text-primary/60 sm:text-sm">
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
                            className={`h-auto min-h-11 py-2.5 ${menuButtonClass} ${
                              isActive
                                ? "border border-primary/30 shadow-[0_0_14px_-4px_hsl(199_89%_68%/0.4)]"
                                : "border border-transparent"
                            }`}
                            onClick={() => handleHackathonChange(hackathon.id)}
                          >
                            <CalendarRange
                              className={`h-5 w-5 shrink-0 ${isActive ? "text-primary" : "text-muted-foreground"}`}
                            />
                            <span className="flex min-w-0 flex-col items-start gap-0.5">
                              <span className="truncate text-base font-medium">
                                {hackathon.shortName}
                              </span>
                              <span className="truncate text-xs text-muted-foreground sm:text-sm">
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
          <div className="p-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
            <div className="relative overflow-hidden rounded-xl border border-sidebar-border bg-gradient-to-br from-sidebar-accent/25 via-sidebar-background to-sidebar-background px-3 py-3">
              <div className="flex items-center gap-2.5">
                <span
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-secondary font-display text-sm font-bold text-background shadow-[0_0_12px_hsl(199_89%_68%/0.35)]"
                  aria-hidden
                >
                  {userInitial}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-base font-medium text-sidebar-foreground">
                    {sessionUser.email}
                  </span>
                  <span className="mt-0.5 inline-flex items-center gap-1.5 font-display text-xs font-semibold uppercase tracking-[0.12em] text-primary sm:text-sm">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" aria-hidden />
                    {sessionUser.role ?? "unassigned"}
                  </span>
                </span>
              </div>
            </div>
            <Button
              variant="ghost"
              size="default"
              className="mt-2 min-h-11 w-full justify-start gap-2 text-base text-sidebar-foreground hover:bg-destructive/15 hover:text-destructive"
              onClick={handleSignOut}
            >
              <LogOut className="h-5 w-5" />
              Sign out
            </Button>
          </div>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset className="dash-ambient min-h-0 min-w-0 flex-1">
        <header className="dash-mobile-header sticky top-0 z-30 flex min-h-14 shrink-0 flex-col gap-3 border-b border-white/10 bg-background/90 px-3 py-3 backdrop-blur-xl supports-[backdrop-filter]:bg-background/75 sm:px-4 md:px-6">
          <div className="flex items-start gap-3">
            <MobileMenuTrigger />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="font-display text-lg font-bold leading-tight tracking-tight text-foreground sm:text-2xl md:text-3xl">
                  {roleTheme.label}{" "}
                  <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                    Dashboard
                  </span>
                </h1>
                <Badge
                  variant="outline"
                  className={`font-display text-[0.65rem] font-semibold uppercase tracking-[0.1em] sm:text-sm ${roleTheme.badgeClass}`}
                >
                  {sessionUser.role}
                </Badge>
              </div>
              <p className="mt-1 truncate text-xs text-muted-foreground sm:text-sm md:hidden">
                {sessionUser.email}
              </p>
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
        <div className="dash-content px-3 py-4 sm:px-5 sm:py-5 md:px-8 md:py-8">
          <div className="mx-auto w-full max-w-[1400px] space-y-6 sm:space-y-8 md:space-y-10">
            {children}
          </div>
        </div>
      </SidebarInset>
    </>
  );
}

export function DashboardLayout(props: DashboardLayoutProps) {
  return (
    <SidebarProvider className="min-h-svh h-auto">
      <DashboardLayoutContent {...props} />
    </SidebarProvider>
  );
}

export { sectionClass } from "@/components/dashboard/dashboardStyles";
