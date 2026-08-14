import {
  Activity,
  LayoutDashboard,
  FileText,
  ClipboardList,
  LogOut,
  UserRound,
  Users,
  Scale,
  BarChart3,
  Ticket,
  Trophy,
  CalendarRange,
  Sparkles,
  Menu,
  X,
  LayoutGrid,
  ExternalLink,
  MessageCircle,
  Settings,
  ChevronsUpDown,
  Radar,
  ScanSearch,
  CalendarCheck2,
  BookOpen,
  Briefcase,
  Wand2,
  UserCog,
  Gavel,
  Medal,
  Mail,
  ShieldCheck,
  ChevronDown,
  ClipboardCheck,
  ListChecks,
  type LucideIcon,
} from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState, type ReactNode } from "react";
import BrandLogo from "@/components/BrandLogo";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import {
  PORTAL_HACKATHONS,
  filterCurrentHackathons,
  getEventBoardPath,
  getHackathonPublicUrl,
  getHackathonsByIds,
  getUserAllowedHackathonIds,
  withHackathonQuery,
  type HackathonId,
  type PortalHackathon,
} from "@/lib/hackathons";
import type { SessionUser } from "@/types/portal";
import { cn } from "@/lib/utils";

type DashboardLayoutProps = {
  sessionUser: SessionUser;
  role: "participant" | "judge" | "mentor" | "host" | "admin";
  children: React.ReactNode;
  onSignOut: () => Promise<void>;
  hackathons?: PortalHackathon[];
  selectedHackathonId?: HackathonId;
  onHackathonChange?: (hackathonId: HackathonId) => void;
};

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  external?: boolean;
  toHost?: boolean;
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
    badgeClass: "border-primary/40 bg-primary/10 text-primary",
  },
  mentor: {
    label: "Mentor",
    badgeClass: "border-community/40 bg-community/10 text-community",
  },
  host: {
    label: "Host",
    badgeClass: "border-community/40 bg-community/10 text-community",
  },
  admin: {
    label: "Admin",
    badgeClass: "border-accent/40 bg-accent/10 text-accent",
  },
};

const menuButtonClass =
  "group/nav dash-nav-item h-10 sm:h-11 hover:bg-primary/10 hover:text-primary data-[active=true]:bg-primary/15 data-[active=true]:font-medium data-[active=true]:text-primary";

/**
 * Multi-line sidebar rows: SidebarMenuButton defaults to overflow-hidden +
 * [&>span:last-child]:truncate (nowrap). Keep overflow clipped (no neon bleed) but
 * allow the label stack to wrap so dates stay readable.
 */
const multiLineMenuButtonClass =
  `${menuButtonClass} !h-auto min-h-11 items-center py-2.5 [&>span:last-child]:!overflow-hidden [&>span:last-child]:!whitespace-normal [&>span:last-child]:min-w-0`;

const navIconClass = "dash-nav-icon group-hover/nav:text-primary";

/** Keep long hosted-event ranges readable in the narrow sidebar. */
const formatNavEventDate = (eventDate: string) => {
  const trimmed = eventDate.trim();
  if (!trimmed) return "";
  const parts = trimmed.split(/\s+[–—-]\s+/);
  if (parts.length < 2) return trimmed;
  const start = parts[0] ?? "";
  const end = parts[1] ?? "";
  const startDay = start.match(/^([A-Za-z]{3}\s+\d{1,2})/);
  const endDay = end.match(/^([A-Za-z]{3}\s+\d{1,2})/);
  const year = end.match(/\b(20\d{2})\b/)?.[1] ?? start.match(/\b(20\d{2})\b/)?.[1];
  if (startDay && endDay && year) {
    return `${startDay[1]}–${endDay[1]}, ${year}`;
  }
  return start;
};

const groupLabelClass = "dash-nav-label !text-primary/70";

const ADMIN_HOME = "/dashboard/admin";

type AdminNavBuilder = (hackathonId?: HackathonId) => NavItem[];

const buildAdminOperateNav: AdminNavBuilder = (hackathonId) => [
  { href: withHackathonQuery(ADMIN_HOME, hackathonId), label: "Overview", icon: LayoutDashboard },
  {
    href: withHackathonQuery("/dashboard/admin/screening", hackathonId),
    label: "Screening agent",
    icon: Radar,
  },
  {
    href: withHackathonQuery("/dashboard/admin/project-screening", hackathonId),
    label: "Project agent",
    icon: ScanSearch,
  },
  {
    href: withHackathonQuery("/dashboard/admin/operations", hackathonId),
    label: "Operations",
    icon: Activity,
  },
  {
    href: withHackathonQuery("/dashboard/admin/events", hackathonId),
    label: "Event management",
    icon: CalendarCheck2,
  },
];

const buildAdminCreateNav: AdminNavBuilder = (hackathonId) => [
  {
    href: withHackathonQuery("/dashboard/admin/create", hackathonId),
    label: "Create event",
    icon: Wand2,
  },
  { href: "/dashboard/host", label: "Host ops", icon: Ticket, toHost: true },
];

const buildAdminPeopleNav: AdminNavBuilder = (hackathonId) => [
  {
    href: withHackathonQuery("/dashboard/admin/people", hackathonId),
    label: "People & access",
    icon: Users,
  },
  {
    href: withHackathonQuery("/dashboard/admin/people#manage-participants", hackathonId),
    label: "Participants",
    icon: Users,
  },
  {
    href: withHackathonQuery("/dashboard/admin/people#event-teams", hackathonId),
    label: "Teams",
    icon: Users,
  },
  {
    href: withHackathonQuery("/dashboard/admin/people#manage-judges", hackathonId),
    label: "Judges",
    icon: Scale,
  },
  {
    href: withHackathonQuery("/dashboard/admin/people#manage-hosts", hackathonId),
    label: "Host approvals",
    icon: UserCog,
  },
  {
    href: withHackathonQuery("/dashboard/admin/people#manage-judge-approvals", hackathonId),
    label: "Judge approvals",
    icon: ShieldCheck,
  },
  {
    href: withHackathonQuery("/dashboard/admin/people#judge-invites", hackathonId),
    label: "Judge invites",
    icon: Mail,
  },
];

const buildAdminScoringNav: AdminNavBuilder = (hackathonId) => [
  {
    href: withHackathonQuery("/dashboard/admin/judging", hackathonId),
    label: "Judging overview",
    icon: Gavel,
  },
  {
    href: withHackathonQuery("/dashboard/admin/judging#marking-criteria", hackathonId),
    label: "Criteria",
    icon: ListChecks,
  },
  {
    href: withHackathonQuery("/dashboard/admin/judging#analytics", hackathonId),
    label: "Analytics",
    icon: BarChart3,
  },
  {
    href: withHackathonQuery("/dashboard/admin/judging#project-marks", hackathonId),
    label: "Theme marks",
    icon: ScanSearch,
  },
  {
    href: withHackathonQuery("/dashboard/admin/judging#judge-marks", hackathonId),
    label: "Mark check",
    icon: ClipboardCheck,
  },
  {
    href: withHackathonQuery("/dashboard/admin/judging#top-3-marks", hackathonId),
    label: "Top 3 by score",
    icon: Medal,
  },
  {
    href: withHackathonQuery("/dashboard/admin/judging#top-3-ranking", hackathonId),
    label: "Top 3 ballots",
    icon: Trophy,
  },
  {
    href: withHackathonQuery("/dashboard/admin/judging#submission-marks", hackathonId),
    label: "Submissions",
    icon: ClipboardList,
  },
];

function scrollToHashId(id: string) {
  const target = document.getElementById(id);
  if (!target) return false;
  target.scrollIntoView({ behavior: "smooth", block: "start" });
  return true;
}

function scheduleHashScroll(id: string) {
  const attempts = [0, 80, 250, 500];
  for (const delay of attempts) {
    window.setTimeout(() => {
      scrollToHashId(id);
    }, delay);
  }
}

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
      className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-border bg-card text-foreground active:scale-95 md:hidden"
      onClick={toggleSidebar}
      aria-label="Open menu"
    >
      <Menu className="h-5 w-5" />
    </Button>
  );
}

const DISCORD_URL = "https://discord.gg/cQEFjQDFm";
const PEER_PORTAL_URL = "https://peerportal.app";

function DashboardNavLink({
  href,
  children,
  onNavigate,
  external,
}: {
  href: string;
  children: React.ReactNode;
  onNavigate: () => void;
  external?: boolean;
}) {
  const navigate = useNavigate();
  const location = useLocation();

  if (external) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        className="flex w-full items-center gap-2"
        onClick={onNavigate}
      >
        {children}
      </a>
    );
  }

  const hashIndex = href.indexOf("#");
  const hasHash = hashIndex >= 0;
  const pathAndQuery = hasHash ? href.slice(0, hashIndex) : href;
  const hashId = hasHash ? href.slice(hashIndex + 1) : "";
  const pathOnly = pathAndQuery.split("?")[0] || pathAndQuery;

  // In-page section links (and /dashboard/admin/people#section from other admin routes).
  if (hasHash && hashId) {
    const handleClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
      event.preventDefault();
      const targetPath = pathOnly || location.pathname;
      const onTargetPage = targetPath === location.pathname;

      if (onTargetPage && scrollToHashId(hashId)) {
        window.history.replaceState(null, "", `${location.pathname}${location.search}#${hashId}`);
        onNavigate();
        return;
      }

      if (onTargetPage) {
        // Section may still be mounting — keep URL in sync and retry scroll.
        window.history.replaceState(null, "", `${location.pathname}${location.search}#${hashId}`);
        scheduleHashScroll(hashId);
        onNavigate();
        return;
      }

      navigate(pathAndQuery ? `${pathAndQuery}#${hashId}` : `#${hashId}`);
      scheduleHashScroll(hashId);
      onNavigate();
    };

    return (
      <a href={href} className="flex w-full items-center gap-2" onClick={handleClick}>
        {children}
      </a>
    );
  }

  return (
    <Link to={href} className="flex w-full items-center gap-2" onClick={onNavigate}>
      {children}
    </Link>
  );
}

/** When landing on /dashboard/admin#judging (legacy) or in-page hashes, scroll or redirect. */
function AdminHashScroll() {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const id = location.hash.replace(/^#/, "").trim();
    if (!id) return;

    // Legacy overview hashes → dedicated admin workspaces.
    if (location.pathname === "/dashboard/admin" || location.pathname === "/dashboard/admin/") {
      const createHashes = new Set(["ai-event-builder", "manual-event-builder"]);
      const peopleHashes = new Set([
        "manage-participants",
        "event-teams",
        "manage-judges",
        "manage-hosts",
        "manage-judge-approvals",
        "judge-invites",
        "host-analytics",
        "grant-admin-access",
        "participant-broadcast",
        "manage-all-users",
        "manage-judge-pending",
      ]);
      const judgingHashes = new Set([
        "judging",
        "marking-criteria",
        "analytics",
        "judge-marks",
        "top-3-marks",
        "top-3-ranking",
        "submission-marks",
      ]);
      if (createHashes.has(id)) {
        navigate(`/dashboard/admin/create${location.search}`, { replace: true });
        return;
      }
      if (peopleHashes.has(id)) {
        navigate(`/dashboard/admin/people${location.search}#${id}`, { replace: true });
        return;
      }
      if (judgingHashes.has(id)) {
        navigate(`/dashboard/admin/judging${location.search}#${id}`, { replace: true });
        return;
      }
    }

    if (
      !location.pathname.startsWith("/dashboard/admin") &&
      location.pathname !== "/dashboard/host"
    ) {
      return;
    }
    scheduleHashScroll(id);
  }, [location.hash, location.pathname, location.search, navigate]);

  return null;
}

function NavMenuItems({
  items,
  onNavigate,
}: {
  items: NavItem[];
  onNavigate: () => void;
}) {
  return (
    <>
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <SidebarMenuItem key={`${item.href}-${item.label}`}>
            <SidebarMenuButton asChild className={menuButtonClass}>
              {item.toHost ? (
                <Link
                  to={item.href}
                  onClick={onNavigate}
                  className="flex w-full items-center gap-2"
                >
                  <Icon className={navIconClass} />
                  <span>{item.label}</span>
                </Link>
              ) : (
                <DashboardNavLink
                  href={item.href}
                  onNavigate={onNavigate}
                  external={item.external}
                >
                  <Icon className={navIconClass} />
                  <span>{item.label}</span>
                </DashboardNavLink>
              )}
            </SidebarMenuButton>
          </SidebarMenuItem>
        );
      })}
    </>
  );
}

function NavSection({
  label,
  children,
  className,
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <SidebarGroup className={cn("dash-nav-section", className)}>
      <SidebarGroupLabel className={groupLabelClass}>{label}</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu className="gap-0.5">{children}</SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}

function CollapsibleNavSection({
  label,
  items,
  onNavigate,
  defaultOpen = true,
}: {
  label: string;
  items: NavItem[];
  onNavigate: () => void;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="dash-nav-section group/collapsible">
      <SidebarGroup>
        <SidebarGroupLabel asChild className={cn(groupLabelClass, "h-8 cursor-pointer")}>
          <CollapsibleTrigger className="flex w-full items-center justify-between gap-2 outline-none ring-sidebar-ring transition-colors hover:text-primary focus-visible:ring-2">
            <span>{label}</span>
            <ChevronDown
              className={cn(
                "h-3.5 w-3.5 shrink-0 text-primary/50 transition-transform duration-200",
                open && "rotate-180",
              )}
              aria-hidden
            />
          </CollapsibleTrigger>
        </SidebarGroupLabel>
        <CollapsibleContent className="overflow-hidden data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down">
          <SidebarGroupContent>
            <SidebarMenu className="gap-0.5">
              <NavMenuItems items={items} onNavigate={onNavigate} />
            </SidebarMenu>
          </SidebarGroupContent>
        </CollapsibleContent>
      </SidebarGroup>
    </Collapsible>
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
  const location = useLocation();
  const { isMobile, setOpenMobile } = useSidebar();
  const isStaffDashboard = role === "judge" || role === "mentor";
  const isParticipantHome = location.pathname === "/dashboard/participant";
  const isParticipantTeamPage = location.pathname === "/dashboard/participant/team";
  const isParticipantProfilePage = location.pathname === "/dashboard/participant/profile";
  const roleTheme = roleThemes[role];
  const userInitial = (sessionUser.email?.[0] ?? "?").toUpperCase();

  // Participants, judges, and mentors only see boards for their assigned events.
  // Admins use the live catalog passed from the dashboard (includes hosted events).
  // Boards nav: active + upcoming so live hosted events stay reachable.
  const catalogHackathons =
    hackathons && hackathons.length > 0
      ? hackathons
      : role === "admin"
        ? PORTAL_HACKATHONS
        : getHackathonsByIds(
            getUserAllowedHackathonIds({
              hackathonId: sessionUser.hackathonId,
              hackathonIds: sessionUser.hackathonIds,
            }),
          );
  const boardHackathons = catalogHackathons.filter(
    (hackathon) => hackathon.status === "active" || hackathon.status === "upcoming",
  );
  // Admins need every edition in the switcher (including past) so switching
  // never hides the event they just left. Other roles stay on live/upcoming.
  const switcherHackathons =
    role === "admin"
      ? catalogHackathons
      : filterCurrentHackathons(catalogHackathons, {
          includeId: selectedHackathonId,
        });

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

  const handleOpenSettings = () => {
    closeMobileNav();
    if (role === "participant") {
      navigate("/dashboard/participant/profile");
      return;
    }
    const target =
      document.getElementById("settings") ??
      document.getElementById("overview");
    target?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleHackathonChange = (hackathonId: HackathonId) => {
    onHackathonChange?.(hackathonId);
    closeMobileNav();
  };

  return (
    <>
      <Sidebar side="left" className="dash-sidebar border-r border-sidebar-border">
        <SidebarHeader className="border-b border-white/[0.06]">
          <div className="flex h-14 items-center gap-2 px-3 sm:h-16 sm:gap-2.5">
            <SidebarTrigger className="hidden text-sidebar-foreground/80 hover:text-primary md:inline-flex" />
            <BrandLogo
              size="sm"
              showWordmark
              wordmark="COGNISOR"
              sublabel="Hackathons"
              href="/"
              className="min-w-0 flex-1"
              wordmarkClassName="text-[14px] tracking-[0.2em] text-white sm:text-[15px]"
              sublabelClassName="mt-1.5 text-[0.7rem] tracking-[0.24em] text-primary/70 sm:text-xs"
            />
            <MobileSidebarClose />
          </div>
        </SidebarHeader>
        <SidebarContent className="dash-sidebar-scroll overscroll-contain px-1.5 pb-3">
          {role === "admin" ? (
            <>
              <NavSection label="Operate">
                <NavMenuItems
                  items={buildAdminOperateNav(selectedHackathonId)}
                  onNavigate={closeMobileNav}
                />
              </NavSection>
              <CollapsibleNavSection
                label="Create"
                items={buildAdminCreateNav(selectedHackathonId)}
                onNavigate={closeMobileNav}
                defaultOpen={false}
              />
              <CollapsibleNavSection
                label="People"
                items={buildAdminPeopleNav(selectedHackathonId)}
                onNavigate={closeMobileNav}
                defaultOpen
              />
              <CollapsibleNavSection
                label="Judging"
                items={buildAdminScoringNav(selectedHackathonId)}
                onNavigate={closeMobileNav}
                defaultOpen={false}
              />
            </>
          ) : (
            <NavSection label="Dashboard">
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={role === "participant" ? isParticipantHome : undefined}
                  className={menuButtonClass}
                >
                  <DashboardNavLink
                    href={
                      role === "host"
                        ? "/dashboard/host#overview"
                        : role === "participant"
                          ? "/dashboard/participant#overview"
                          : "#overview"
                    }
                    onNavigate={closeMobileNav}
                  >
                    <LayoutDashboard className={navIconClass} />
                    <span>Overview</span>
                  </DashboardNavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
              {role === "participant" && (
                <>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild className={menuButtonClass}>
                      <DashboardNavLink
                        href="/dashboard/participant#my-hackathons"
                        onNavigate={closeMobileNav}
                      >
                        <CalendarRange className={navIconClass} />
                        <span>My Hackathons</span>
                      </DashboardNavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      asChild
                      isActive={isParticipantTeamPage}
                      className={menuButtonClass}
                    >
                      <DashboardNavLink
                        href="/dashboard/participant/team"
                        onNavigate={closeMobileNav}
                      >
                        <Users className={navIconClass} />
                        <span>My Team</span>
                      </DashboardNavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      asChild
                      isActive={isParticipantProfilePage}
                      className={menuButtonClass}
                    >
                      <DashboardNavLink
                        href="/dashboard/participant/profile"
                        onNavigate={closeMobileNav}
                      >
                        <UserRound className={navIconClass} />
                        <span>My Profile</span>
                      </DashboardNavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild className={menuButtonClass}>
                      <DashboardNavLink
                        href="/dashboard/participant#my-project"
                        onNavigate={closeMobileNav}
                      >
                        <FileText className={navIconClass} />
                        <span>My Project</span>
                      </DashboardNavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild className={menuButtonClass}>
                      <DashboardNavLink href="/projects" onNavigate={closeMobileNav}>
                        <LayoutGrid className={navIconClass} />
                        <span>Projects & demos</span>
                      </DashboardNavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </>
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
                      <DashboardNavLink
                        href="/dashboard/judge/project-screening"
                        onNavigate={closeMobileNav}
                      >
                        <ScanSearch className={navIconClass} />
                        <span>Project agent</span>
                      </DashboardNavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild className={menuButtonClass}>
                      <DashboardNavLink href="/dashboard/judge#project-marks" onNavigate={closeMobileNav}>
                        <BarChart3 className={navIconClass} />
                        <span>Theme marks</span>
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
              {role === "host" && (
                <>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild className={menuButtonClass}>
                      <DashboardNavLink
                        href="/dashboard/host/screening"
                        onNavigate={closeMobileNav}
                      >
                        <Radar className={navIconClass} />
                        <span>Screening agent</span>
                      </DashboardNavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild className={menuButtonClass}>
                      <DashboardNavLink
                        href="/dashboard/host/project-screening"
                        onNavigate={closeMobileNav}
                      >
                        <ScanSearch className={navIconClass} />
                        <span>Project agent</span>
                      </DashboardNavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild className={menuButtonClass}>
                      <DashboardNavLink
                        href="/dashboard/host/operations"
                        onNavigate={closeMobileNav}
                      >
                        <Activity className={navIconClass} />
                        <span>Operations</span>
                      </DashboardNavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild className={menuButtonClass}>
                      <DashboardNavLink
                        href="/dashboard/host#event-details"
                        onNavigate={closeMobileNav}
                      >
                        <CalendarRange className={navIconClass} />
                        <span>Event details</span>
                      </DashboardNavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild className={menuButtonClass}>
                      <DashboardNavLink href="/dashboard/host#tickets" onNavigate={closeMobileNav}>
                        <Ticket className={navIconClass} />
                        <span>Tickets & QR</span>
                      </DashboardNavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild className={menuButtonClass}>
                      <DashboardNavLink href="/dashboard/host#check-in" onNavigate={closeMobileNav}>
                        <ClipboardCheck className={navIconClass} />
                        <span>Check-in</span>
                      </DashboardNavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </>
              )}
            </NavSection>
          )}

          {role === "host" && (
            <NavSection label="Scoring">
              <NavMenuItems
                items={[
                  { href: "/dashboard/host#judges", label: "Judges", icon: Scale },
                  {
                    href: "/dashboard/host#manage-judge-approvals",
                    label: "Judge approvals",
                    icon: ShieldCheck,
                  },
                  { href: "/dashboard/host#judging", label: "Judging", icon: Gavel },
                  { href: "/dashboard/host#judge-marks", label: "Mark check", icon: ClipboardCheck },
                  { href: "/dashboard/host#submission-marks", label: "Submissions", icon: ClipboardList },
                  { href: "/dashboard/host#marking-criteria", label: "Criteria", icon: ListChecks },
                  { href: "/dashboard/host#analytics", label: "Analytics", icon: BarChart3 },
                  { href: "/dashboard/host#project-marks", label: "Theme marks", icon: ScanSearch },
                  { href: "/dashboard/host#top-3-marks", label: "Top 3 by score", icon: Medal },
                  { href: "/dashboard/host#top-3-ranking", label: "Top 3 ballots", icon: Trophy },
                ]}
                onNavigate={closeMobileNav}
              />
            </NavSection>
          )}

          <NavSection label="Boards">
            {role === "admin" && (
              <SidebarMenuItem>
                <SidebarMenuButton asChild className={menuButtonClass}>
                  <DashboardNavLink href="/boards" onNavigate={closeMobileNav}>
                    <LayoutGrid className={navIconClass} />
                    <span>All boards</span>
                  </DashboardNavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )}
            {boardHackathons.map((hackathon) => (
              <SidebarMenuItem key={hackathon.id}>
                <SidebarMenuButton asChild className={multiLineMenuButtonClass}>
                  <DashboardNavLink
                    href={getEventBoardPath(hackathon.id)}
                    onNavigate={closeMobileNav}
                  >
                    <CalendarRange className={navIconClass} />
                    <span className="flex min-w-0 flex-col items-start gap-0.5">
                      <span className="w-full truncate">{hackathon.shortName} Board</span>
                      <span className="dash-nav-meta w-full">
                        {formatNavEventDate(hackathon.eventDate)}
                      </span>
                    </span>
                  </DashboardNavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
            {(role === "participant" || isStaffDashboard) &&
            boardHackathons.length === 0 ? (
              <SidebarMenuItem>
                <p className="px-2 py-2 text-xs text-muted-foreground">
                  {role === "participant"
                    ? "Your event board appears here after you register for a hackathon."
                    : "Assigned event boards appear here after an admin grants you access."}
                </p>
              </SidebarMenuItem>
            ) : null}
            {role === "host" && boardHackathons.length === 0 ? (
              <SidebarMenuItem>
                <p className="px-2 py-2 text-xs text-muted-foreground">
                  Event boards appear here after you publish an event.
                </p>
              </SidebarMenuItem>
            ) : null}
          </NavSection>

          {(role === "admin" || isStaffDashboard || role === "participant" || role === "host") &&
            switcherHackathons.length > 0 &&
            selectedHackathonId &&
            onHackathonChange && (
              <NavSection label="Hackathons">
                {switcherHackathons.map((hackathon) => {
                  const isActive = hackathon.id === selectedHackathonId;
                  return (
                    <SidebarMenuItem key={hackathon.id}>
                      <SidebarMenuButton
                        isActive={isActive}
                        className={multiLineMenuButtonClass}
                        onClick={() => handleHackathonChange(hackathon.id)}
                      >
                        <CalendarRange className={navIconClass} />
                        <span className="flex min-w-0 flex-col items-start gap-0.5">
                          <span className="w-full truncate font-medium tracking-tight">
                            {hackathon.shortName}
                          </span>
                          <span className="dash-nav-meta w-full">
                            {formatNavEventDate(hackathon.eventDate)}
                          </span>
                        </span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </NavSection>
            )}

          <NavSection label="Resources">
            <SidebarMenuItem>
              <SidebarMenuButton asChild className={menuButtonClass}>
                <DashboardNavLink href="/resources" onNavigate={closeMobileNav}>
                  <BookOpen className={navIconClass} />
                  <span>Guide</span>
                </DashboardNavLink>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton asChild className={menuButtonClass}>
                <DashboardNavLink
                  href={DISCORD_URL}
                  onNavigate={closeMobileNav}
                  external
                >
                  <MessageCircle className={navIconClass} />
                  <span>Discord</span>
                  <ExternalLink className="ml-auto h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                </DashboardNavLink>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton asChild className={menuButtonClass}>
                <DashboardNavLink
                  href={
                    selectedHackathonId
                      ? getHackathonPublicUrl(selectedHackathonId)
                      : "/hackathons"
                  }
                  onNavigate={closeMobileNav}
                >
                  <Sparkles className={navIconClass} />
                  <span>Event site</span>
                </DashboardNavLink>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton asChild className={menuButtonClass}>
                <DashboardNavLink
                  href={PEER_PORTAL_URL}
                  onNavigate={closeMobileNav}
                  external
                >
                  <Briefcase className={navIconClass} />
                  <span>Get hired here</span>
                  <ExternalLink className="ml-auto h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                </DashboardNavLink>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </NavSection>
        </SidebarContent>
        <SidebarFooter className="border-t border-white/[0.06]">
          <div className="p-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="dash-profile-chip"
                  aria-label="Open profile menu"
                >
                  <span
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary font-display text-sm font-bold tracking-tight text-primary-foreground shadow-[0_0_20px_hsl(199_100%_50%/0.45)] sm:h-10 sm:w-10 sm:text-base"
                    aria-hidden
                  >
                    {userInitial}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-display text-[14px] font-medium tracking-tight text-sidebar-foreground sm:text-[15px]">
                      {sessionUser.email}
                    </span>
                    <span className="mt-0.5 inline-flex items-center gap-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-primary sm:mt-1 sm:text-[11px]">
                      <span
                        className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary"
                        aria-hidden
                      />
                      {sessionUser.role ?? "unassigned"}
                    </span>
                  </span>
                  <ChevronsUpDown
                    className="h-4 w-4 shrink-0 text-muted-foreground"
                    aria-hidden
                  />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                side="top"
                align="start"
                sideOffset={8}
                className="w-[var(--radix-dropdown-menu-trigger-width)] min-w-[14rem] border-sidebar-border bg-popover"
              >
                <DropdownMenuLabel className="font-normal">
                  <span className="block truncate text-sm font-medium text-foreground">
                    {sessionUser.email}
                  </span>
                  <span className="mt-0.5 block font-display text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                    {roleTheme.label}
                  </span>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="cursor-pointer gap-2 text-sm"
                  onSelect={handleOpenSettings}
                >
                  <Settings className="h-4 w-4" />
                  Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="cursor-pointer gap-2 text-sm text-destructive focus:bg-destructive/15 focus:text-destructive"
                  onSelect={() => {
                    void handleSignOut();
                  }}
                >
                  <LogOut className="h-4 w-4" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset className="dash-ambient min-h-0 min-w-0 flex-1">
        <header className="dash-mobile-header dash-topbar sticky top-0 z-30 flex min-h-14 shrink-0 flex-col gap-3 border-b border-white/[0.08] bg-black/80 px-3 py-3 backdrop-blur-xl supports-[backdrop-filter]:bg-black/70 sm:px-4 md:px-6">
          <div className="flex items-start gap-3">
            <MobileMenuTrigger />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="font-display text-lg font-semibold leading-tight tracking-[-0.03em] text-foreground sm:text-2xl md:text-3xl">
                  {roleTheme.label} Dashboard
                </h1>
                <Badge
                  variant="outline"
                  className={`font-mono text-[0.6rem] font-semibold uppercase tracking-[0.16em] sm:text-[0.7rem] ${roleTheme.badgeClass}`}
                >
                  {sessionUser.role}
                </Badge>
              </div>
              <p className="mt-1 truncate text-xs text-muted-foreground sm:text-sm md:hidden">
                {sessionUser.email}
              </p>
            </div>
          </div>
          {(role === "admin" || isStaffDashboard || role === "participant" || role === "host") &&
            hackathons &&
            selectedHackathonId &&
            onHackathonChange && (
              <HackathonSelector
                hackathons={switcherHackathons.length > 0 ? switcherHackathons : hackathons}
                selectedHackathonId={selectedHackathonId}
                onSelect={onHackathonChange}
                compact
              />
            )}
        </header>
        <div className="dash-content px-3 py-4 sm:px-5 sm:py-5 md:px-8 md:py-8">
          <div className="mx-auto w-full max-w-[1400px] space-y-6 sm:space-y-8 md:space-y-10">
            {children}
            {role !== "participant" && (
              <section
                id="settings"
                className="dash-card space-y-4 p-4 sm:p-6 md:p-8"
                aria-labelledby="account-settings-heading"
              >
                <div>
                  <p className="dash-eyebrow">Account</p>
                  <h2 id="account-settings-heading" className="dash-title">
                    Settings
                  </h2>
                  <p className="dash-subtitle">
                    Manage your Cognisor portal account for this dashboard.
                  </p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-lg border border-border/70 bg-background/40 px-4 py-3">
                    <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
                      Signed in as
                    </p>
                    <p className="mt-1 truncate text-sm font-medium text-foreground">
                      {sessionUser.email}
                    </p>
                  </div>
                  <div className="rounded-lg border border-border/70 bg-background/40 px-4 py-3">
                    <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
                      Role
                    </p>
                    <p className="mt-1 text-sm font-medium text-foreground">
                      {roleTheme.label}
                    </p>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="min-h-11 gap-2"
                  onClick={() => {
                    void handleSignOut();
                  }}
                >
                  <LogOut className="h-4 w-4" />
                  Sign out
                </Button>
              </section>
            )}
          </div>
        </div>
      </SidebarInset>
    </>
  );
}

export function DashboardLayout(props: DashboardLayoutProps) {
  return (
    <SidebarProvider className="min-h-svh h-auto">
      <AdminHashScroll />
      <DashboardLayoutContent {...props} />
    </SidebarProvider>
  );
}

export { sectionClass } from "@/components/dashboard/dashboardStyles";
