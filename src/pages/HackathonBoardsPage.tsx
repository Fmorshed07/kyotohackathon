import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  ArrowUpRight,
  ExternalLink,
  Filter,
  LayoutGrid,
  MapPin,
  Search,
  Sparkles,
  Clock,
  Users,
} from "lucide-react";
import { collection, doc, getDoc, getDocs } from "firebase/firestore";
import { ProjectPublicLinks } from "@/components/projects/ProjectPublicLinks";
import { ProjectShareMenu } from "@/components/projects/ProjectShareMenu";
import { ProjectStarRating } from "@/components/projects/ProjectStarRating";
import { usePortalAuth } from "@/hooks/usePortalAuth";
import { useProjectCommunityStars } from "@/hooks/useProjectCommunityStars";
import { getFirestoreDb } from "@/lib/firebaseClient";
import { listPublicProjectLinks, toPublicGallerySubmission } from "@/lib/projectSocial";
import {
  buildParticipantHackathonSummaries,
  collectAccessibleHackathonIds,
  DEFAULT_HACKATHON_ID,
  getEventBoardPath,
  getHackathonsByIds,
  getParticipantEventWorkspacePath,
  getSubmissionHackathonId,
  getUserAllowedHackathonIds,
  isHackathonId,
  pickPreferredHackathonId,
  PORTAL_HACKATHONS,
  resolvePortalHackathon,
  submissionBelongsToHackathon,
  type HackathonId,
  type PortalHackathon,
} from "@/lib/hackathons";
import { fetchPortalHackathonCatalog } from "@/lib/aiHackathons";
import { getDashboardPathForUser } from "@/lib/portalRoutes";
import type { Submission } from "@/types/portal";
import { countTeamBuilders, formatTeamMemberNames, isSubmissionCollaborator } from "@/lib/teamRoster";
import { listAccessibleSubmissions } from "@/lib/portalInvites";
import { cn } from "@/lib/utils";
import { formatSubmissionDateTime } from "@/lib/datetime";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
const DISCORD_URL = "https://discord.gg/cQEFjQDFm";

const statusStyles: Record<PortalHackathon["status"], string> = {
  active: "border-primary/50 bg-primary/15 text-primary",
  upcoming: "border-white/15 bg-white/5 text-white/60",
  past: "border-white/10 bg-transparent text-white/40",
};

const statusLabel: Record<PortalHackathon["status"], string> = {
  active: "Live",
  upcoming: "Upcoming",
  past: "Past",
};

function projectStatus(submission: Submission) {
  if (submission.project_url?.trim() && submission.demo_video_url?.trim()) {
    return { label: "Ready", className: "border-primary/40 bg-primary/10 text-primary" };
  }
  if (submission.project_url?.trim() || submission.submission_pdf_url?.trim()) {
    return { label: "Submitted", className: "border-white/20 bg-white/5 text-foreground/80" };
  }
  return { label: "Draft", className: "border-white/10 bg-transparent text-muted-foreground" };
}

function ProjectCard({
  submission,
  hackathon,
  highlighted = false,
  starFill,
  myRating,
  ratingDisabled,
  onRate,
}: {
  submission: Submission;
  hackathon: PortalHackathon;
  highlighted?: boolean;
  starFill: number;
  myRating: number;
  ratingDisabled: boolean;
  onRate: (stars: number) => void;
}) {
  const builders = countTeamBuilders(submission);
  const memberLabel = formatTeamMemberNames(submission).split("\n").filter(Boolean).join(" · ");
  const status = projectStatus(submission);
  const title = submission.title?.trim() || "Untitled project";
  const team = submission.team_name?.trim() || "Solo builder";
  const initial = (team[0] ?? "P").toUpperCase();
  const links = listPublicProjectLinks(submission);
  const isPublic = submission.public_preview_consent !== false;

  return (
    <article
      id={`board-project-${submission.id}`}
      className={cn(
        "group relative flex overflow-hidden rounded-xl border bg-card/70 transition-colors hover:border-primary/40",
        highlighted ? "border-primary/60 ring-2 ring-primary/30" : "border-white/[0.08]",
      )}
    >
      <div
        className="pointer-events-none absolute inset-x-10 top-0 h-px opacity-50"
        style={{ background: "var(--flare)" }}
        aria-hidden
      />

      <div className="flex min-w-0 flex-1 flex-col gap-4 p-4 sm:flex-row sm:items-stretch sm:gap-5 sm:p-5">
        <div className="flex shrink-0 flex-row items-center gap-3 sm:w-28 sm:flex-col sm:items-center sm:justify-center sm:border-r sm:border-white/[0.06] sm:pr-5">
          <span
            className="flex h-12 w-12 items-center justify-center rounded-full border border-primary/35 bg-primary/15 font-display text-lg font-bold text-primary"
            aria-hidden
          >
            {initial}
          </span>
          <div className="min-w-0 text-left sm:text-center">
            <p className="truncate font-display text-sm font-semibold text-foreground">{team}</p>
            <p className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              Team
            </p>
          </div>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex rounded-full border border-white/15 bg-white/[0.04] px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              {hackathon.shortName}
            </span>
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em]",
                status.className,
              )}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />
              {status.label}
            </span>
            {highlighted ? (
              <span className="inline-flex rounded-full border border-primary/40 bg-primary/15 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-primary">
                Your team
              </span>
            ) : null}
          </div>

          <h3 className="mt-2 font-display text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
            {title}
          </h3>
          <p className="mt-2 line-clamp-2 font-body text-sm leading-relaxed text-muted-foreground">
            {submission.short_description?.trim() || hackathon.theme}
          </p>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <p className="inline-flex max-w-full items-center gap-1.5 text-xs text-muted-foreground">
              <Users className="h-3.5 w-3.5 shrink-0 text-primary/80" />
              <span className="font-semibold text-foreground/90">{builders}</span>
              {builders === 1 ? "Builder" : "Builders"}
              {memberLabel ? (
                <span className="truncate text-muted-foreground/90">· {memberLabel}</span>
              ) : null}
              {formatSubmissionDateTime(submission.created_at) ? (
                <span className="inline-flex items-center gap-1 text-muted-foreground/90">
                  <Clock className="h-3.5 w-3.5 shrink-0 text-primary/80" />
                  {formatSubmissionDateTime(submission.created_at)}
                </span>
              ) : null}
            </p>
            {links.length > 0 ? (
              <ProjectPublicLinks links={links} />
            ) : (
              <span className="text-xs text-muted-foreground/70">No public link yet</span>
            )}
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <ProjectStarRating fill={starFill} myRating={myRating} disabled={ratingDisabled} onRate={onRate} />
            {isPublic ? <ProjectShareMenu projectId={submission.id} title={title} teamName={team} /> : null}
          </div>
        </div>
      </div>

      <div className="hidden w-28 shrink-0 flex-col items-center justify-center border-l border-white/[0.06] bg-white/[0.02] px-3 text-center sm:flex">
        <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Event</p>
        <p className="mt-2 font-display text-sm font-semibold leading-tight text-foreground">
          {hackathon.shortName}
        </p>
        <p className="mt-1 font-mono text-[10px] text-muted-foreground">{hackathon.eventDate}</p>
      </div>
    </article>
  );
}

export default function HackathonBoardsPage() {
  const { hackathonId: hackathonIdParam } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { sessionUser, loading: authLoading } = usePortalAuth();
  const { myRatingById, pendingId, communityFill, rate } = useProjectCommunityStars();
  const db = getFirestoreDb();

  const requestedHackathonId: HackathonId | null =
    hackathonIdParam && isHackathonId(hackathonIdParam) ? hackathonIdParam : null;
  const joinedViaInvite = searchParams.get("joined") === "1";
  const joinedTeamName = searchParams.get("team")?.trim() || null;
  const joinedProjectId = searchParams.get("project")?.trim() || null;

  const [eventCatalog, setEventCatalog] = useState<PortalHackathon[]>(PORTAL_HACKATHONS);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [mySubmissions, setMySubmissions] = useState<Submission[]>([]);
  const [enrolledHackathonIds, setEnrolledHackathonIds] = useState<HackathonId[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "ready" | "submitted" | "draft">("all");

  const selectedHackathonId: HackathonId = requestedHackathonId ?? DEFAULT_HACKATHON_ID;
  const selectedHackathon = resolvePortalHackathon(selectedHackathonId, eventCatalog);

  useEffect(() => {
    if (!sessionUser) return;

    let cancelled = false;

    const load = async () => {
      setIsLoading(true);

      const userSnap = await getDoc(doc(db, "users", sessionUser.id)).catch(() => null);
      const userData = userSnap?.exists() ? userSnap.data() : undefined;
      const allowedIds = getUserAllowedHackathonIds({
        hackathon_id:
          typeof userData?.hackathon_id === "string"
            ? userData.hackathon_id
            : sessionUser.hackathonId,
        hackathon_ids: userData?.hackathon_ids ?? sessionUser.hackathonIds,
      });
      if (requestedHackathonId && (joinedViaInvite || allowedIds.includes(requestedHackathonId))) {
        if (!allowedIds.includes(requestedHackathonId)) allowedIds.push(requestedHackathonId);
      }

      const catalog = await fetchPortalHackathonCatalog(db).catch(() => PORTAL_HACKATHONS);

      // Opt-in board feed: public_projects is readable without private submission access.
      const boardQuery = requestedHackathonId
        ? getDocs(collection(db, "public_projects"))
        : Promise.resolve(null);

      const [boardSnapshot, ownRows] = await Promise.all([
        boardQuery
          .then((snapshot) => snapshot)
          .catch(() => null),
        listAccessibleSubmissions(db, sessionUser.id).catch(() => [] as Submission[]),
      ]);

      const boardRows = boardSnapshot
        ? boardSnapshot.docs
            .map((docSnap) => toPublicGallerySubmission(docSnap.id, docSnap.data() as Record<string, unknown>))
            .filter((project): project is Submission => project != null)
            .filter((project) =>
              requestedHackathonId
                ? submissionBelongsToHackathon(project, requestedHackathonId)
                : false,
            )
        : [];

      const merged = new Map<string, Submission>();
      for (const row of boardRows) merged.set(row.id, row);
      if (requestedHackathonId) {
        for (const row of ownRows) {
          if (submissionBelongsToHackathon(row, requestedHackathonId)) {
            merged.set(row.id, merged.get(row.id) ?? row);
          }
        }
      }

      const nextRows = Array.from(merged.values()).sort((a, b) => {
        const aJoined =
          a.id === joinedProjectId ||
          (joinedTeamName != null && a.team_name?.trim() === joinedTeamName);
        const bJoined =
          b.id === joinedProjectId ||
          (joinedTeamName != null && b.team_name?.trim() === joinedTeamName);
        if (aJoined !== bJoined) return aJoined ? -1 : 1;
        return (b.created_at ?? "").localeCompare(a.created_at ?? "");
      });

      if (!cancelled) {
        setEventCatalog(catalog);
        setSubmissions(nextRows);
        setMySubmissions(ownRows);
        setEnrolledHackathonIds(allowedIds);
        setIsLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [db, joinedProjectId, joinedTeamName, joinedViaInvite, requestedHackathonId, sessionUser]);

  const accessibleHackathonIds = useMemo(() => {
    const ids = collectAccessibleHackathonIds({
      enrolledIds: enrolledHackathonIds,
      sessionHackathonId: sessionUser?.hackathonId,
      sessionHackathonIds: sessionUser?.hackathonIds,
      submissions: mySubmissions,
    });
    if (joinedViaInvite && requestedHackathonId && !ids.includes(requestedHackathonId)) {
      return [...ids, requestedHackathonId];
    }
    return ids;
  }, [
    enrolledHackathonIds,
    joinedViaInvite,
    mySubmissions,
    requestedHackathonId,
    sessionUser,
  ]);

  const myHackathonSummaries = useMemo(
    () => buildParticipantHackathonSummaries(mySubmissions, enrolledHackathonIds, eventCatalog),
    [enrolledHackathonIds, eventCatalog, mySubmissions],
  );

  const boardHackathons = useMemo(() => {
    const catalog =
      sessionUser?.role === "admin" || sessionUser?.role === "host"
        ? eventCatalog
        : getHackathonsByIds(accessibleHackathonIds, eventCatalog);
    // Boards nav: live + upcoming — past editions stay off the switcher.
    return catalog.filter(
      (hackathon) => hackathon.status === "active" || hackathon.status === "upcoming",
    );
  }, [accessibleHackathonIds, eventCatalog, sessionUser?.role]);

  const preferredBoardId = useMemo(
    () =>
      pickPreferredHackathonId(accessibleHackathonIds, {
        requestedId: requestedHackathonId,
        primaryId: sessionUser?.hackathonId,
        submissionHackathonIds: mySubmissions.map(getSubmissionHackathonId),
      }) ??
      (sessionUser?.role === "admin" || sessionUser?.role === "host"
        ? boardHackathons[0]?.id ??
          eventCatalog.find((entry) => entry.status === "active" || entry.status === "upcoming")?.id ??
          null
        : null),
    [
      accessibleHackathonIds,
      boardHackathons,
      eventCatalog,
      mySubmissions,
      requestedHackathonId,
      sessionUser,
    ],
  );

  const highlightedSubmissionId = useMemo(() => {
    if (joinedProjectId && submissions.some((entry) => entry.id === joinedProjectId)) {
      return joinedProjectId;
    }
    if (joinedTeamName) {
      return (
        submissions.find((entry) => entry.team_name?.trim() === joinedTeamName)?.id ??
        (sessionUser?.id
          ? submissions.find((entry) => isSubmissionCollaborator(entry, sessionUser.id))?.id ?? null
          : null)
      );
    }
    if (joinedViaInvite && sessionUser?.id) {
      return submissions.find((entry) => isSubmissionCollaborator(entry, sessionUser.id))?.id ?? null;
    }
    return null;
  }, [joinedProjectId, joinedTeamName, joinedViaInvite, sessionUser?.id, submissions]);

  useEffect(() => {
    if (!highlightedSubmissionId || isLoading) return;
    const node = document.getElementById(`board-project-${highlightedSubmissionId}`);
    node?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [highlightedSubmissionId, isLoading]);

  const ownSubmissionOnBoard = useMemo(
    () =>
      submissions.find(
        (submission) =>
          sessionUser?.id &&
          isSubmissionCollaborator(submission, sessionUser.id) &&
          getSubmissionHackathonId(submission) === selectedHackathonId,
      ) ?? null,
    [selectedHackathonId, sessionUser?.id, submissions],
  );

  const filteredSubmissions = useMemo(() => {
    const queryText = searchQuery.trim().toLowerCase();
    return submissions.filter((submission) => {
      const status = projectStatus(submission).label.toLowerCase();
      if (statusFilter !== "all" && status !== statusFilter) return false;
      if (!queryText) return true;
      const haystack = [
        submission.title,
        submission.team_name,
        submission.member_names,
        formatTeamMemberNames(submission),
        submission.short_description,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(queryText);
    });
  }, [searchQuery, statusFilter, submissions]);

  if (authLoading || (sessionUser && isLoading)) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">Loading boards...</p>
      </div>
    );
  }

  if (!sessionUser) {
    return <Navigate to="/signin" replace />;
  }

  const dashboardPath = getDashboardPathForUser(
    sessionUser.role,
    sessionUser.judgeApprovalStatus,
  );
  const canBrowseAllBoards = sessionUser.role === "admin" || sessionUser.role === "host";
  const canViewSelected =
    canBrowseAllBoards ||
    accessibleHackathonIds.includes(selectedHackathonId) ||
    joinedViaInvite;

  if (!requestedHackathonId) {
    if (preferredBoardId) {
      return <Navigate to={getEventBoardPath(preferredBoardId)} replace />;
    }
    return <Navigate to={dashboardPath} replace />;
  }

  if (!canViewSelected) {
    if (preferredBoardId && preferredBoardId !== requestedHackathonId) {
      return <Navigate to={getEventBoardPath(preferredBoardId)} replace />;
    }
    return <Navigate to={dashboardPath} replace />;
  }

  return (
    <div className="dash-ambient min-h-svh bg-background text-foreground">
      <header className="sticky top-0 z-30 border-b border-white/[0.08] bg-black/80 backdrop-blur-xl supports-[backdrop-filter]:bg-black/70">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-3 px-3 py-3 sm:px-5 md:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-10 w-10 shrink-0"
              onClick={() => navigate(dashboardPath)}
              aria-label="Back to dashboard"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="min-w-0">
              <p className="font-display text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-primary">
                Hackathon boards
              </p>
              <h1 className="truncate font-display text-lg font-semibold tracking-tight sm:text-xl">
                {selectedHackathon.name}
              </h1>
            </div>
          </div>
          <Button asChild variant="outline" className="hidden sm:inline-flex">
            <Link to={dashboardPath}>
              Dashboard
              <ArrowUpRight className="ml-1.5 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1400px] gap-6 px-3 py-5 sm:px-5 md:grid-cols-[240px_1fr] md:px-8 md:py-8">
        <aside className="space-y-4 md:sticky md:top-24 md:self-start">
          <section className="rounded-xl border border-white/[0.08] bg-card/60 p-4 backdrop-blur-md">
            <p className="font-display text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Total
            </p>
            <p className="mt-2 font-display text-3xl font-semibold text-foreground">
              {submissions.length}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">Projects on this board</p>
            {ownSubmissionOnBoard ? (
              <p className="mt-3 rounded-lg border border-primary/25 bg-primary/10 px-3 py-2 text-xs text-primary">
                {joinedViaInvite ? "You just joined this team" : "Your project is on this board"}
                {ownSubmissionOnBoard.team_name?.trim()
                  ? `: ${ownSubmissionOnBoard.team_name.trim()}`
                  : ownSubmissionOnBoard.title?.trim()
                    ? `: ${ownSubmissionOnBoard.title.trim()}`
                    : ""}
              </p>
            ) : null}
          </section>

          {myHackathonSummaries.length > 0 ? (
            <section className="rounded-xl border border-primary/20 bg-primary/5 p-4 backdrop-blur-md">
              <p className="mb-3 inline-flex items-center gap-2 font-display text-xs font-semibold uppercase tracking-[0.16em] text-primary">
                <Sparkles className="h-3.5 w-3.5" />
                Your events
              </p>
              <ul className="space-y-2">
                {myHackathonSummaries.map((summary) => {
                  const isActive = summary.hackathon.id === selectedHackathonId;
                  return (
                    <li key={summary.hackathon.id}>
                      <Link
                        to={getEventBoardPath(summary.hackathon.id)}
                        className={cn(
                          "block rounded-lg border px-3 py-2.5 transition-colors",
                          isActive
                            ? "border-primary/40 bg-primary/15 text-foreground"
                            : "border-white/10 bg-background/30 text-muted-foreground hover:border-primary/25 hover:text-foreground",
                        )}
                      >
                        <span className="flex items-center justify-between gap-2">
                          <span className="truncate font-display text-sm font-semibold text-foreground">
                            {summary.hackathon.shortName}
                          </span>
                          <Badge variant="outline" className="text-[0.55rem] uppercase">
                            {statusLabel[summary.hackathon.status]}
                          </Badge>
                        </span>
                        <span className="mt-1 block text-[11px] text-muted-foreground">
                          {summary.submissionCount > 0
                            ? `${summary.submissionCount} of your submission${summary.submissionCount === 1 ? "" : "s"}`
                            : "Registered"}
                        </span>
                        {summary.latestTitle ? (
                          <span className="mt-0.5 block truncate text-[11px] text-foreground/80">
                            {summary.latestTitle}
                          </span>
                        ) : null}
                      </Link>
                    </li>
                  );
                })}
              </ul>
              {sessionUser.role === "participant" ? (
                <Button asChild variant="ghost" size="sm" className="mt-3 w-full justify-start px-2">
                  <Link to="/dashboard/participant">
                    Open my workspace
                    <ArrowUpRight className="ml-1.5 h-3.5 w-3.5" />
                  </Link>
                </Button>
              ) : null}
            </section>
          ) : null}

          <section className="rounded-xl border border-white/[0.08] bg-card/60 p-4 backdrop-blur-md">
            <p className="mb-3 inline-flex items-center gap-2 font-display text-xs font-semibold uppercase tracking-[0.16em] text-primary/70">
              <LayoutGrid className="h-3.5 w-3.5" />
              Boards
            </p>
            <ul className="space-y-1.5">
              {boardHackathons.map((hackathon) => {
                const isActive = hackathon.id === selectedHackathonId;
                return (
                  <li key={hackathon.id}>
                    <Link
                      to={getEventBoardPath(hackathon.id)}
                      className={cn(
                        "flex items-start gap-2 rounded-lg border px-3 py-2.5 transition-colors",
                        isActive
                          ? "border-primary/35 bg-primary/10 text-foreground"
                          : "border-transparent text-muted-foreground hover:border-white/10 hover:bg-white/[0.03] hover:text-foreground",
                      )}
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-display text-sm font-semibold">
                          {hackathon.shortName}
                        </span>
                        <span className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground">
                          <MapPin className="h-3 w-3 shrink-0" />
                          {hackathon.location}
                        </span>
                      </span>
                      <span
                        className={cn(
                          "mt-0.5 shrink-0 rounded-full border px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.12em]",
                          statusStyles[hackathon.status],
                        )}
                      >
                        {statusLabel[hackathon.status]}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>

          <section className="rounded-xl border border-white/[0.08] bg-card/60 p-4 backdrop-blur-md">
            <p className="mb-3 inline-flex items-center gap-2 font-display text-xs font-semibold uppercase tracking-[0.16em] text-primary/70">
              <Filter className="h-3.5 w-3.5" />
              Status
            </p>
            <div className="flex flex-wrap gap-2">
              {(
                [
                  ["all", "All"],
                  ["ready", "Ready"],
                  ["submitted", "Submitted"],
                  ["draft", "Draft"],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setStatusFilter(value)}
                  className={cn(
                    "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                    statusFilter === value
                      ? "border-primary/40 bg-primary/15 text-primary"
                      : "border-white/10 text-muted-foreground hover:border-white/20 hover:text-foreground",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </section>

          <a
            href={DISCORD_URL}
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-between rounded-xl border border-primary/30 bg-primary/10 px-4 py-3 text-sm font-medium text-primary transition-colors hover:bg-primary/15"
          >
            Join Discord
            <ExternalLink className="h-4 w-4" />
          </a>
        </aside>

        <main className="min-w-0 space-y-4">
          {joinedViaInvite ? (
            <div className="rounded-xl border border-primary/30 bg-primary/10 px-4 py-3 text-sm text-primary">
              {joinedTeamName
                ? `You joined ${joinedTeamName}. This is the event board for that invite.`
                : "You joined this team. This is the event board for that invite."}
            </div>
          ) : null}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-display text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                Project board
              </p>
              <p className="mt-1 text-sm text-muted-foreground">{selectedHackathon.theme}</p>
            </div>
            <div className="relative w-full sm:max-w-xs">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search projects..."
                className="pl-9"
              />
            </div>
          </div>

          {isLoading ? (
            <div className="rounded-xl border border-white/[0.08] bg-card/40 px-5 py-12 text-center text-sm text-muted-foreground">
              Loading projects...
            </div>
          ) : filteredSubmissions.length === 0 ? (
            <div className="rounded-xl border border-dashed border-white/15 bg-card/30 px-5 py-14 text-center">
              <LayoutGrid className="mx-auto h-8 w-8 text-muted-foreground/60" />
              <p className="mt-4 font-display text-lg font-semibold text-foreground">
                No projects on this board yet
              </p>
              <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
                {sessionUser.role === "participant"
                  ? `Opt-in projects for ${selectedHackathon.name} will appear here once you and other participants share them.`
                  : `Opt-in projects for ${selectedHackathon.name} will appear here once participants share them. Admins do not submit entries on this board.`}
              </p>
              {sessionUser.role === "participant" ? (
                <Button asChild className="mt-6">
                  <Link to={getParticipantEventWorkspacePath(selectedHackathonId)}>
                    Submit your project
                  </Link>
                </Button>
              ) : (
                <Button asChild variant="outline" className="mt-6">
                  <Link to={getDashboardPathForUser(sessionUser.role, sessionUser.judgeApprovalStatus)}>
                    Back to dashboard
                  </Link>
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredSubmissions.map((submission) => (
                <ProjectCard
                  key={submission.id}
                  submission={submission}
                  hackathon={selectedHackathon}
                  highlighted={submission.id === highlightedSubmissionId}
                  starFill={communityFill(submission.id)}
                  myRating={myRatingById[submission.id] ?? 0}
                  ratingDisabled={pendingId === submission.id}
                  onRate={(stars) => void rate(submission.id, stars)}
                />
              ))}
            </div>
          )}

          {!isLoading && filteredSubmissions.length > 0 ? (
            <p className="pt-2 text-center font-mono text-xs text-muted-foreground">
              Showing {filteredSubmissions.length} of {submissions.length} projects
            </p>
          ) : null}
        </main>
      </div>
    </div>
  );
}
