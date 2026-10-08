import { useEffect, useId, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { collection, getDocs } from "firebase/firestore";
import { ArrowDown, ArrowUpRight, CalendarDays, CirclePlay, Film, FolderKanban, LayoutGrid, ListVideo, MapPin, RefreshCw, Search, Sparkles, Users } from "lucide-react";
import AnimatedBackground from "@/components/AnimatedBackground";
import SiteHeader from "@/components/SiteHeader";
import { ProjectFeedMedia } from "@/components/projects/ProjectFeedMedia";
import { ProjectEngagementStats } from "@/components/projects/ProjectEngagementStats";
import { ProjectPublicLinks } from "@/components/projects/ProjectPublicLinks";
import { ProjectShareMenu } from "@/components/projects/ProjectShareMenu";
import { ProjectStarEmailDialog } from "@/components/projects/ProjectStarEmailDialog";
import { ProjectStarRating } from "@/components/projects/ProjectStarRating";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useProjectCommunityStars } from "@/hooks/useProjectCommunityStars";
import { useProjectShareCounts } from "@/hooks/useProjectShareCounts";
import { fetchPublishedHackathons, type HostedHackathon } from "@/lib/aiHackathons";
import { formatSubmissionDateTime } from "@/lib/datetime";
import { getFirestoreDb } from "@/lib/firebaseClient";
import { getHackathonById, getHackathonPublicUrl, getSubmissionHackathonId, PORTAL_HACKATHONS, type PortalHackathon } from "@/lib/hackathons";
import { projectFeedHttpUrl } from "@/lib/projectFeedMedia";
import { buildProjectPermalink, listPublicProjectLinks, toPublicGallerySubmission } from "@/lib/projectSocial";
import { compareStarStats, EMPTY_STAR_STATS } from "@/lib/projectStars";
import { countTeamBuilders, formatTeamMemberNames } from "@/lib/teamRoster";
import { cn } from "@/lib/utils";
import type { Submission } from "@/types/portal";

type FeedEvent = PortalHackathon | HostedHackathon;
type MediaFilter = "all" | "videos" | "projects";
type FeedSort = "newest" | "stars" | "title";

const hasVideo = (submission: Submission) => Boolean(projectFeedHttpUrl(submission.demo_video_url));
const submittedAt = (submission: Submission) => Date.parse(submission.created_at ?? "") || 0;
const initialFor = (title: string) => title.trim().slice(0, 2).toUpperCase() || "AI";

function EventLink({ event, className, children }: { event: FeedEvent; className?: string; children: React.ReactNode }) {
  const path = getHackathonPublicUrl(event.id);
  return /^https?:\/\//.test(path)
    ? <a href={path} target="_blank" rel="noreferrer" className={className}>{children}</a>
    : <Link to={path} className={className}>{children}</Link>;
}

function FeedDescription({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false);
  const descriptionId = useId();
  const isLong = text.length > 240 || text.split("\n").length > 4;
  return <div className="mt-3"><p id={descriptionId} className={cn("whitespace-pre-line break-words text-sm leading-relaxed text-muted-foreground", isLong && !expanded && "line-clamp-4")}>{text}</p>{isLong ? <button type="button" aria-expanded={expanded} aria-controls={descriptionId} onClick={() => setExpanded((value) => !value)} className="mt-2 text-xs font-semibold text-primary hover:underline">{expanded ? "Show less" : "Show more"}</button> : null}</div>;
}

export default function ProjectFeedPage({ videoOnly = false }: { videoOnly?: boolean }) {
  const db = getFirestoreDb();
  const [searchParams] = useSearchParams();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [hostedEvents, setHostedEvents] = useState<HostedHackathon[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [query, setQuery] = useState("");
  const [eventFilter, setEventFilter] = useState(() => searchParams.get("event") || "all");
  const [mediaFilter, setMediaFilter] = useState<MediaFilter>("all");
  const [sort, setSort] = useState<FeedSort>("newest");
  const [autoplayEnabled, setAutoplayEnabled] = useState(() => !window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  const [reducedMotion, setReducedMotion] = useState(() => window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  const stars = useProjectCommunityStars();
  const shares = useProjectShareCounts();

  useEffect(() => {
    let current = true;
    setLoading(true);
    setLoadError(false);
    void Promise.all([
      getDocs(collection(db, "public_projects")),
      fetchPublishedHackathons(db).catch(() => [] as HostedHackathon[]),
    ]).then(([snapshot, events]) => {
      if (!current) return;
      setSubmissions(snapshot.docs.map((item) => toPublicGallerySubmission(item.id, item.data())).filter((item): item is Submission => item !== null));
      setHostedEvents(events);
    }).catch(() => { if (current) setLoadError(true); })
      .finally(() => { if (current) setLoading(false); });
    return () => { current = false; };
  }, [db, refreshKey]);

  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => { setReducedMotion(preference.matches); setAutoplayEnabled(!preference.matches); };
    preference.addEventListener("change", update);
    return () => preference.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    setEventFilter(searchParams.get("event") || "all");
  }, [searchParams]);

  const eventById = useMemo(() => new Map<string, FeedEvent>([...PORTAL_HACKATHONS, ...hostedEvents].map((event) => [event.id, event])), [hostedEvents]);
  const baseSubmissions = useMemo(() => videoOnly ? submissions.filter(hasVideo) : submissions, [submissions, videoOnly]);
  const eventOptions = useMemo(() => Array.from(new Set(baseSubmissions.map(getSubmissionHackathonId)))
    .map((id) => ({ id, event: eventById.get(id) ?? getHackathonById(id), count: baseSubmissions.filter((submission) => getSubmissionHackathonId(submission) === id).length }))
    .sort((left, right) => left.event.name.localeCompare(right.event.name)), [baseSubmissions, eventById]);

  const filtered = useMemo(() => {
    const search = query.trim().toLowerCase();
    return baseSubmissions.filter((submission) => {
      const eventId = getSubmissionHackathonId(submission);
      if (eventFilter !== "all" && eventId !== eventFilter) return false;
      if (!videoOnly && mediaFilter === "videos" && !hasVideo(submission)) return false;
      if (!videoOnly && mediaFilter === "projects" && hasVideo(submission)) return false;
      const event = eventById.get(eventId) ?? getHackathonById(eventId);
      return !search || [submission.title, submission.team_name, submission.short_description, formatTeamMemberNames(submission), event.name, event.theme].filter(Boolean).join(" ").toLowerCase().includes(search);
    }).sort((left, right) => {
      if (sort === "title") return (left.title ?? "").localeCompare(right.title ?? "");
      if (sort === "stars") return compareStarStats(stars.statsById[left.id] ?? EMPTY_STAR_STATS, stars.statsById[right.id] ?? EMPTY_STAR_STATS) || submittedAt(right) - submittedAt(left);
      return submittedAt(right) - submittedAt(left);
    });
  }, [baseSubmissions, eventById, eventFilter, mediaFilter, query, sort, stars.statsById, videoOnly]);

  const videoCount = baseSubmissions.filter(hasVideo).length;
  const clearFilters = () => { setQuery(""); setEventFilter("all"); setMediaFilter("all"); };
  const title = videoOnly ? "Video previews" : "The project feed";

  return (
    <div className="relative min-h-svh bg-background text-foreground">
      <AnimatedBackground />
      <SiteHeader />
      <main className="relative mx-auto max-w-6xl px-4 pb-16 pt-24 sm:px-6 lg:px-8">
        <header className="mb-7 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="dash-eyebrow inline-flex items-center gap-2"><Sparkles className="h-3.5 w-3.5" aria-hidden />Made by the community</p>
            <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight sm:text-4xl">{title}<span className="text-primary">.</span></h1>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground">{videoOnly ? "Watch demos, meet the builders, and discover what they made. Scroll to preview a video, then explore the full project." : "Fresh ideas. Real demos. Meet the builders behind them. Scroll to discover what the community is making."}</p>
          </div>
          <nav aria-label="Project views" className="flex shrink-0 items-center gap-1 rounded-xl border border-border bg-card/70 p-1 backdrop-blur">
            <Link to="/feed" aria-current={!videoOnly ? "page" : undefined} className={cn("inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors", !videoOnly ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground")}><ListVideo className="h-4 w-4" aria-hidden />Feed</Link>
            <Link to="/videos" aria-current={videoOnly ? "page" : undefined} className={cn("inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors", videoOnly ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground")}><CirclePlay className="h-4 w-4" aria-hidden />Videos</Link>
            <Link to="/projects" className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground"><LayoutGrid className="h-4 w-4" aria-hidden />Gallery</Link>
          </nav>
        </header>

        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
          <section aria-label={videoOnly ? "Video preview feed" : "Project feed"} className="min-w-0">
            <div className="rounded-2xl border border-border bg-card/80 p-4 shadow-[var(--surface-elevated)] backdrop-blur sm:p-5">
              <div className="flex flex-col gap-3 sm:flex-row">
                <div className="relative min-w-0 flex-1"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden /><Input aria-label="Search projects" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search projects, teams, or ideas" className="h-11 rounded-xl pl-10" /></div>
                <Select value={sort} onValueChange={(value: FeedSort) => setSort(value)}>
                  <SelectTrigger aria-label="Sort projects" className="h-11 w-full rounded-xl sm:w-40"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="newest">Newest first</SelectItem><SelectItem value="stars">Most starred</SelectItem><SelectItem value="title">A–Z</SelectItem></SelectContent>
                </Select>
              </div>
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                {videoOnly ? <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary"><Film className="h-3.5 w-3.5" aria-hidden />Video demos only</span> : <div className="flex flex-wrap gap-2" aria-label="Preview filters">
                  {([{ id: "all", label: "Everything" }, { id: "videos", label: "Video demos" }, { id: "projects", label: "Projects & images" }] as const).map((filter) => <button key={filter.id} type="button" aria-pressed={mediaFilter === filter.id} onClick={() => setMediaFilter(filter.id)} className={cn("rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors", mediaFilter === filter.id ? "border-primary/30 bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/25 hover:text-foreground")}>{filter.label}</button>)}
                </div>}
                <div className="flex items-center gap-2"><Switch id="feed-autoplay" checked={autoplayEnabled} onCheckedChange={setAutoplayEnabled} /><label htmlFor="feed-autoplay" className="cursor-pointer text-xs text-muted-foreground">Autoplay</label></div>
              </div>
              <div className="mt-4 lg:hidden"><Select value={eventFilter} onValueChange={setEventFilter}><SelectTrigger aria-label="Filter by event" className="rounded-xl"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All events</SelectItem>{eventOptions.map(({ id, event }) => <SelectItem key={id} value={id}>{event.name}</SelectItem>)}{eventFilter !== "all" && !eventOptions.some(({ id }) => id === eventFilter) ? <SelectItem value={eventFilter}>{getHackathonById(eventFilter).name}</SelectItem> : null}</SelectContent></Select></div>
              <p className="mt-3 text-xs leading-relaxed text-muted-foreground">{reducedMotion && !autoplayEnabled ? "Autoplay starts off for your reduced motion preference. Enable it or press play to watch a demo." : "Supported videos start muted and pause when you scroll past. Other previews use their own play controls."}</p>
            </div>

            <div className="my-4 flex items-center justify-between px-1"><p role="status" className="text-xs text-muted-foreground">{loading ? "Loading previews…" : `${filtered.length} ${videoOnly ? "video" : "project"}${filtered.length === 1 ? "" : "s"}${eventFilter !== "all" || query || (!videoOnly && mediaFilter !== "all") ? ` of ${baseSubmissions.length}` : ""}`}</p><span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground"><ArrowDown className="h-3 w-3" aria-hidden />Scroll to discover</span></div>

            {loading ? <div aria-busy="true" className="space-y-5">{[0, 1].map((index) => <div key={index} className="overflow-hidden rounded-2xl border border-border bg-card/60"><div className="flex items-center gap-3 p-5"><div className="h-10 w-10 rounded-xl bg-muted motion-safe:animate-pulse" /><div className="space-y-2"><div className="h-3 w-32 rounded bg-muted motion-safe:animate-pulse" /><div className="h-2 w-20 rounded bg-muted motion-safe:animate-pulse" /></div></div><div className="aspect-video bg-muted/70 motion-safe:animate-pulse" /><div className="space-y-3 p-5"><div className="h-4 w-2/3 rounded bg-muted motion-safe:animate-pulse" /><div className="h-3 w-full rounded bg-muted motion-safe:animate-pulse" /></div></div>)}<span className="sr-only">Loading project feed</span></div> : loadError ? (
              <div role="alert" className="rounded-2xl border border-destructive/25 bg-card/70 px-6 py-14 text-center"><RefreshCw className="mx-auto h-8 w-8 text-muted-foreground" aria-hidden /><h2 className="mt-4 font-display text-xl font-semibold">We couldn’t load the feed</h2><p className="mt-2 text-sm text-muted-foreground">Please try again in a moment.</p><Button className="mt-5 gap-2" onClick={() => setRefreshKey((value) => value + 1)}><RefreshCw className="h-4 w-4" aria-hidden />Try again</Button></div>
            ) : filtered.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border bg-card/60 px-6 py-16 text-center"><span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">{videoOnly ? <Film className="h-6 w-6 text-primary" aria-hidden /> : <FolderKanban className="h-6 w-6 text-primary" aria-hidden />}</span><h2 className="mt-5 font-display text-xl font-semibold">{baseSubmissions.length === 0 ? videoOnly ? "The next demo starts here" : "The next big idea starts here" : videoOnly ? "No matching video demos" : "No matching projects"}</h2><p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">{baseSubmissions.length === 0 ? videoOnly ? "Videos appear when builders share their project demos publicly. Come back to see what they’re making." : "Projects appear here when builders choose to share them publicly. Come back to discover their work." : "Try another event, search term, or preview filter."}</p>{baseSubmissions.length ? <Button variant="outline" className="mt-5" onClick={clearFilters}>Clear filters</Button> : <Button asChild className="mt-5"><Link to="/hackathons">Explore events <ArrowUpRight className="ml-2 h-4 w-4" aria-hidden /></Link></Button>}</div>
            ) : <div className="space-y-5">
              {filtered.map((submission) => {
                const event = eventById.get(getSubmissionHackathonId(submission)) ?? getHackathonById(getSubmissionHackathonId(submission));
                const projectTitle = submission.title?.trim() || "Untitled project";
                const team = submission.team_name?.trim() || submission.owner_name?.trim() || "Independent builder";
                const date = formatSubmissionDateTime(submission.created_at);
                const builders = countTeamBuilders(submission);
                const imageUrl = submission.cover_url || submission.gallery_urls?.[0];
                return <article key={submission.id} aria-label={`${projectTitle} by ${team}`} className="overflow-hidden rounded-2xl border border-border bg-card/85 shadow-[var(--surface-elevated)] backdrop-blur">
                  <div className="flex items-center justify-between gap-3 px-4 py-4 sm:px-5"><div className="flex min-w-0 items-center gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 font-display text-xs font-semibold text-primary" aria-hidden>{initialFor(team)}</span><div className="min-w-0"><p className="truncate text-sm font-semibold">{team}</p><div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground"><EventLink event={event} className="hover:text-primary">{event.shortName}</EventLink>{date ? <><span aria-hidden>·</span><time dateTime={submission.created_at || undefined}>{date}</time></> : null}</div></div></div><Badge variant="outline" className="shrink-0 border-primary/25 bg-primary/5 text-[10px] text-primary">{hasVideo(submission) ? "Video demo" : "Project"}</Badge></div>
                  <ProjectFeedMedia title={projectTitle} videoUrl={submission.demo_video_url} imageUrl={imageUrl} autoplayEnabled={autoplayEnabled && !stars.emailPrompt} reducedMotion={reducedMotion} />
                  <div className="px-4 py-5 sm:px-5"><div className="flex items-start justify-between gap-3"><Link to={buildProjectPermalink(submission.id, "")} className="font-display text-xl font-semibold tracking-tight transition-colors hover:text-primary sm:text-2xl">{projectTitle}</Link><ProjectShareMenu projectId={submission.id} title={projectTitle} teamName={team} description={submission.short_description} imageUrl={imageUrl} demoVideoUrl={submission.demo_video_url} eventName={event.shortName} onShare={() => shares.recordShare(submission.id)} /></div>{submission.short_description?.trim() ? <FeedDescription text={submission.short_description.trim()} /> : null}
                    <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2"><span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground"><Users className="h-3.5 w-3.5 text-primary" aria-hidden />{builders} {builders === 1 ? "builder" : "builders"}</span><EventLink event={event} className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary"><CalendarDays className="h-3.5 w-3.5 text-primary" aria-hidden />{event.name}</EventLink></div>
                    <ProjectPublicLinks links={listPublicProjectLinks(submission)} className="mt-4" />
                    <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4"><div className="flex flex-wrap items-center gap-3"><ProjectStarRating fill={stars.communityFill(submission.id)} myRating={stars.myRatingById[submission.id] ?? 0} disabled={stars.pendingId === submission.id || (stars.myRatingById[submission.id] ?? 0) > 0} onRate={(value) => void stars.rate(submission.id, value)} /><ProjectEngagementStats starCount={stars.statsById[submission.id]?.count ?? 0} shareCount={shares.shareCount(submission.id)} /></div><Link to={buildProjectPermalink(submission.id, "")} className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline">Explore project <ArrowUpRight className="h-3.5 w-3.5" aria-hidden /></Link></div>
                  </div>
                </article>;
              })}
              <p className="py-6 text-center text-xs text-muted-foreground">You’re all caught up. More ideas are on the way.</p>
            </div>}
          </section>

          <aside className="space-y-5 lg:sticky lg:top-24">
            <section className="rounded-2xl border border-primary/20 bg-card/80 p-5 shadow-[var(--surface-elevated)] backdrop-blur"><p className="dash-eyebrow">Community in motion</p><div className="mt-5 grid grid-cols-2 gap-3"><div><p className="font-display text-3xl font-semibold">{loading ? "—" : baseSubmissions.length}</p><p className="mt-1 text-xs text-muted-foreground">{videoOnly ? "video previews" : "shared projects"}</p></div><div className="border-l border-border pl-4"><p className="font-display text-3xl font-semibold text-primary">{loading ? "—" : videoOnly ? eventOptions.length : videoCount}</p><p className="mt-1 text-xs text-muted-foreground">{videoOnly ? "events" : "video demos"}</p></div></div><p className="mt-5 text-xs leading-relaxed text-muted-foreground">Ideas from real builders. Give a project stars or share it with someone who would love it.</p></section>
            <section className="hidden rounded-2xl border border-border bg-card/75 p-5 backdrop-blur lg:block"><h2 className="font-display text-sm font-semibold">Explore by event</h2><div className="mt-4 space-y-1.5"><button type="button" aria-pressed={eventFilter === "all"} onClick={() => setEventFilter("all")} className={cn("flex w-full items-center justify-between rounded-xl border px-3 py-2.5 text-left text-sm transition-colors", eventFilter === "all" ? "border-primary/25 bg-primary/10 text-primary" : "border-transparent text-muted-foreground hover:bg-muted/50")}><span>All events</span><span className="text-xs opacity-75">{baseSubmissions.length}</span></button>{eventOptions.map(({ id, event, count }) => <button key={id} type="button" aria-pressed={eventFilter === id} onClick={() => setEventFilter(id)} className={cn("flex w-full items-start justify-between gap-2 rounded-xl border px-3 py-2.5 text-left transition-colors", eventFilter === id ? "border-primary/25 bg-primary/10 text-primary" : "border-transparent text-muted-foreground hover:bg-muted/50")}><span className="min-w-0"><span className="block text-sm font-medium">{event.name}</span><span className="mt-1 flex items-center gap-1 text-[11px] opacity-70"><MapPin className="h-3 w-3 shrink-0" aria-hidden />{event.location}</span></span><span className="mt-1 text-xs opacity-75">{count}</span></button>)}</div></section>
            <section className="rounded-2xl border border-border bg-card/75 p-5 backdrop-blur"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10"><CalendarDays className="h-4 w-4 text-primary" aria-hidden /></span><h2 className="mt-4 font-display text-lg font-semibold">Find your next event</h2><p className="mt-2 text-sm leading-relaxed text-muted-foreground">Meet the community, build something new, and share what you make.</p><Button asChild variant="outline" className="mt-4 w-full gap-2"><Link to="/hackathons">Explore events <ArrowUpRight className="h-4 w-4" aria-hidden /></Link></Button></section>
          </aside>
        </div>
      </main>
      <ProjectStarEmailDialog open={Boolean(stars.emailPrompt)} pending={stars.pendingId === stars.emailPrompt?.projectId} onCancel={stars.cancelStarEmail} onSubmit={(email) => void stars.submitStarEmail(email)} />
    </div>
  );
}
