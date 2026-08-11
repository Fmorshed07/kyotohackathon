import { useEffect, useMemo, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import {
  ArrowUpRight,
  ExternalLink,
  FileText,
  FolderKanban,
  LayoutGrid,
  Play,
  Search,
  Sparkles,
  Users,
} from "lucide-react";
import { getFirestoreDb } from "@/lib/firebaseClient";
import { fetchPublishedHackathons, type HostedHackathon } from "@/lib/aiHackathons";
import {
  getHackathonById,
  getSubmissionHackathonId,
  PORTAL_HACKATHONS,
  type HackathonId,
  type PortalHackathon,
} from "@/lib/hackathons";
import AnimatedBackground from "@/components/AnimatedBackground";
import SiteHeader from "@/components/SiteHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Submission } from "@/types/portal";
import { cn } from "@/lib/utils";

type AssetKind = "demo" | "project" | "document";
type AssetFilter = "all" | AssetKind;
type GalleryEvent = PortalHackathon | HostedHackathon;

const isExternalUrl = (value: string | null | undefined) => {
  if (!value?.trim()) return "";
  const candidate = value.trim().match(/^https?:\/\//i) ? value.trim() : `https://${value.trim()}`;
  try {
    const url = new URL(candidate);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : "";
  } catch {
    return "";
  }
};

const getGoogleDriveFileId = (url: string) =>
  url.match(/drive\.google\.com\/file\/d\/([^/]+)/i)?.[1] ?? url.match(/[?&]id=([^&]+)/i)?.[1] ?? null;

const documentPreviewUrl = (url: string) => {
  const normalized = isExternalUrl(url);
  const fileId = getGoogleDriveFileId(normalized);
  if (fileId) return `https://drive.google.com/file/d/${fileId}/preview`;
  if (/dropbox\.com/i.test(normalized)) {
    return normalized.replace(/[?&]dl=\d/i, "").replace(/\?$/, "") + (normalized.includes("?") ? "&raw=1" : "?raw=1");
  }
  return normalized;
};

const youtubeVideoId = (url: string | null | undefined) => {
  const normalized = isExternalUrl(url);
  if (!normalized) return null;
  return normalized.match(/(?:youtu\.be\/|youtube(?:-nocookie)?\.com\/(?:watch\?v=|embed\/|shorts\/))([\w-]{6,})/i)?.[1] ?? null;
};

const getPreviewUrl = (submission: Submission, kind: AssetKind) => {
  if (kind === "demo") {
    const url = isExternalUrl(submission.demo_video_url);
    const videoId = youtubeVideoId(url);
    return videoId ? `https://www.youtube-nocookie.com/embed/${videoId}` : url;
  }
  if (kind === "document") return documentPreviewUrl(submission.submission_pdf_url ?? "");
  return isExternalUrl(submission.project_url);
};

const getAssetKinds = (submission: Submission): AssetKind[] => {
  const kinds: AssetKind[] = [];
  if (isExternalUrl(submission.demo_video_url)) kinds.push("demo");
  if (isExternalUrl(submission.project_url)) kinds.push("project");
  if (isExternalUrl(submission.submission_pdf_url)) kinds.push("document");
  return kinds;
};

const getBuilderCount = (submission: Submission) => {
  const names = submission.member_names?.split(/[,;\n]/).map((name) => name.trim()).filter(Boolean) ?? [];
  return Math.max(names.length, 1);
};

const getSubmittedAt = (submission: Submission) => {
  const timestamp = Date.parse(submission.created_at ?? "");
  return Number.isNaN(timestamp) ? 0 : timestamp;
};

const getEvent = (submission: Submission, eventById: Map<string, GalleryEvent>) => {
  const id = getSubmissionHackathonId(submission);
  return eventById.get(id) ?? getHackathonById(id);
};

const initialFor = (value: string) => value.trim().slice(0, 2).toUpperCase() || "AI";

function ProjectVisual({ submission }: { submission: Submission }) {
  const videoId = youtubeVideoId(submission.demo_video_url);
  const projectImage = isExternalUrl(submission.cover_url) || isExternalUrl(submission.gallery_urls?.[0]);
  const projectTitle = submission.title?.trim() || "Untitled project";
  const hasDemo = Boolean(videoId || isExternalUrl(submission.demo_video_url));

  return (
    <div className="relative aspect-[16/10] overflow-hidden bg-[radial-gradient(circle_at_top_right,hsl(var(--primary)/0.45),transparent_42%),linear-gradient(135deg,hsl(225_34%_12%),hsl(215_40%_6%))]">
      {videoId ? <img src={`https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`} alt="" className="absolute inset-0 h-full w-full object-cover opacity-80" loading="lazy" /> : projectImage ? <img src={projectImage} alt="" className="absolute inset-0 h-full w-full object-cover opacity-80" loading="lazy" /> : null}
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/15 to-transparent" />
      {!videoId && !projectImage ? <span className="absolute right-5 top-4 font-display text-6xl font-semibold tracking-tighter text-white/10">{initialFor(projectTitle)}</span> : null}
      <div className="absolute left-3 top-3 flex items-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-md bg-black/70 px-2.5 py-1 font-body text-[11px] font-semibold text-white backdrop-blur">
          {hasDemo ? <Play className="h-3 w-3 fill-current" /> : <FolderKanban className="h-3 w-3" />}
          {hasDemo ? "Demo" : "Project"}
        </span>
      </div>
      <div className="absolute inset-x-4 bottom-4 flex items-end justify-between gap-3">
        <p className="line-clamp-2 max-w-[75%] font-display text-lg font-semibold tracking-tight text-white">{projectTitle}</p>
        {hasDemo ? <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/40 bg-white/15 text-white backdrop-blur"><Play className="ml-0.5 h-4 w-4 fill-current" /></span> : null}
      </div>
    </div>
  );
}

function ProjectCard({
  submission,
  event,
  onPreview,
}: {
  submission: Submission;
  event: GalleryEvent;
  onPreview: (submission: Submission, kind?: AssetKind) => void;
}) {
  const assetKinds = getAssetKinds(submission);
  const title = submission.title?.trim() || "Untitled project";
  const team = submission.team_name?.trim() || "Solo builder";
  const builders = getBuilderCount(submission);

  return (
    <article className="group overflow-hidden rounded-2xl border border-white/[0.08] bg-card/75 shadow-[var(--surface-elevated)] backdrop-blur transition-all hover:-translate-y-1 hover:border-primary/45">
      <ProjectVisual submission={submission} />
      <div className="p-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="border-primary/30 bg-primary/5 text-[10px] text-primary">{event.shortName}</Badge>
          {assetKinds.map((kind) => <span key={kind} className="rounded-full bg-white/[0.06] px-2 py-0.5 text-[10px] font-medium capitalize text-muted-foreground">{kind}</span>)}
        </div>
        <h2 className="mt-3 truncate font-display text-lg font-semibold tracking-tight text-foreground">{title}</h2>
        <p className="mt-1 line-clamp-2 min-h-10 text-sm leading-relaxed text-muted-foreground">{submission.short_description?.trim() || event.theme}</p>
        <div className="mt-4 flex items-center justify-between gap-3 text-xs text-muted-foreground">
          <span className="inline-flex min-w-0 items-center gap-1.5"><Users className="h-3.5 w-3.5 text-primary" />{builders} {builders === 1 ? "Builder" : "Builders"}</span>
          <span className="truncate">{team}</span>
        </div>
        <div className="mt-4 flex items-center gap-2">
          <Button size="sm" className="flex-1 gap-1.5" onClick={() => onPreview(submission)} disabled={assetKinds.length === 0}>
            <Play className="h-3.5 w-3.5" /> Preview
          </Button>
          {isExternalUrl(submission.project_url) ? <Button asChild size="sm" variant="outline" className="px-3"><a href={isExternalUrl(submission.project_url)} target="_blank" rel="noreferrer" aria-label={`Open ${title}`}><ExternalLink className="h-3.5 w-3.5" /></a></Button> : null}
        </div>
      </div>
    </article>
  );
}

export default function ProjectGalleryPage() {
  const db = getFirestoreDb();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [hostedEvents, setHostedEvents] = useState<HostedHackathon[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [eventFilter, setEventFilter] = useState("all");
  const [assetFilter, setAssetFilter] = useState<AssetFilter>("all");
  const [sortMode, setSortMode] = useState<"newest" | "title" | "assets">("newest");
  const [previewSubmission, setPreviewSubmission] = useState<Submission | null>(null);
  const [previewKind, setPreviewKind] = useState<AssetKind>("demo");

  useEffect(() => {
    let isCurrent = true;
    setIsLoading(true);
    setLoadError(null);
    void Promise.all([
      getDocs(collection(db, "public_projects")),
      fetchPublishedHackathons(db).catch(() => [] as HostedHackathon[]),
    ])
      .then(([snapshot, events]) => {
        if (!isCurrent) return;
        setSubmissions(
          snapshot.docs
            .map((item) => ({ id: item.id, ...(item.data() as Omit<Submission, "id">) }) as Submission)
            // Only opted-in public copies. Explicit false is excluded; missing flag is legacy opt-in.
            .filter((item) => item.public_preview_consent !== false),
        );
        setHostedEvents(events);
      })
      .catch((error: unknown) => {
        if (isCurrent) setLoadError(error instanceof Error ? error.message : "Could not load project gallery.");
      })
      .finally(() => {
        if (isCurrent) setIsLoading(false);
      });
    return () => { isCurrent = false; };
  }, [db]);

  const eventById = useMemo(() => new Map<string, GalleryEvent>([
    ...PORTAL_HACKATHONS,
    ...hostedEvents,
  ].map((event) => [event.id, event])), [hostedEvents]);

  const eventOptions = useMemo(() => Array.from(new Set(submissions.map(getSubmissionHackathonId)))
    .map((id) => ({ id, event: eventById.get(id) ?? getHackathonById(id) }))
    .sort((left, right) => left.event.name.localeCompare(right.event.name)), [eventById, submissions]);

  const filteredSubmissions = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return submissions
      .filter((submission) => {
        const event = getEvent(submission, eventById);
        if (eventFilter !== "all" && getSubmissionHackathonId(submission) !== eventFilter) return false;
        if (assetFilter !== "all" && !getAssetKinds(submission).includes(assetFilter)) return false;
        if (!query) return true;
        return [submission.title, submission.team_name, submission.member_names, submission.short_description, event.name, event.theme]
          .filter(Boolean).join(" ").toLowerCase().includes(query);
      })
      .sort((left, right) => {
        if (sortMode === "title") return (left.title ?? "").localeCompare(right.title ?? "");
        if (sortMode === "assets") return getAssetKinds(right).length - getAssetKinds(left).length || getSubmittedAt(right) - getSubmittedAt(left);
        return getSubmittedAt(right) - getSubmittedAt(left);
      });
  }, [assetFilter, eventById, eventFilter, searchQuery, sortMode, submissions]);

  const openPreview = (submission: Submission, kind?: AssetKind) => {
    const available = getAssetKinds(submission);
    if (available.length === 0) return;
    setPreviewSubmission(submission);
    setPreviewKind(kind && available.includes(kind) ? kind : available[0]);
  };

  const activePreviewUrl = previewSubmission ? getPreviewUrl(previewSubmission, previewKind) : "";
  const previewAssets = previewSubmission ? getAssetKinds(previewSubmission) : [];

  return (
    <div className="relative min-h-svh bg-background text-foreground">
      <AnimatedBackground />
      <SiteHeader />
      <main className="relative mx-auto max-w-[1500px] px-4 pb-16 pt-20 sm:px-6 lg:px-8">
        <div className="space-y-7" id="overview">
        <section className="relative overflow-hidden rounded-2xl border border-primary/25 bg-card/80 px-5 py-7 shadow-[var(--surface-elevated)] sm:px-8 sm:py-9">
          <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-primary/20 blur-3xl" />
          <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <p className="dash-eyebrow">Public hackathon showcase</p>
              <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">Projects & demos</h1>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">Explore the projects participants chose to share publicly. Preview demos or documents in place, then open the original project when you want to explore further.</p>
            </div>
            <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/15 px-4 py-3 backdrop-blur">
              <Sparkles className="h-5 w-5 text-primary" />
              <div><p className="font-display text-xl font-semibold text-foreground">{submissions.length}</p><p className="text-xs text-muted-foreground">public projects</p></div>
            </div>
          </div>
        </section>

        <section className="grid gap-5 xl:grid-cols-[230px_minmax(0,1fr)]">
          <aside className="h-fit space-y-4 rounded-2xl border border-white/[0.08] bg-card/70 p-4 backdrop-blur xl:sticky xl:top-24">
            <div>
              <p className="font-display text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Event</p>
              <div className="mt-3 space-y-1.5">
                <button type="button" onClick={() => setEventFilter("all")} className={cn("w-full rounded-lg border px-3 py-2 text-left text-sm transition-colors", eventFilter === "all" ? "border-primary/40 bg-primary/10 text-primary" : "border-transparent text-muted-foreground hover:bg-white/[0.04] hover:text-foreground")}>All hackathons</button>
                {eventOptions.map(({ id, event }) => <button key={id} type="button" onClick={() => setEventFilter(id)} className={cn("w-full rounded-lg border px-3 py-2 text-left text-sm transition-colors", eventFilter === id ? "border-primary/40 bg-primary/10 text-primary" : "border-transparent text-muted-foreground hover:bg-white/[0.04] hover:text-foreground")}><span className="block truncate font-medium">{event.shortName}</span><span className="mt-0.5 block truncate text-[11px] opacity-70">{event.location}</span></button>)}
              </div>
            </div>
            <div className="border-t border-white/[0.08] pt-4">
              <p className="font-display text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Preview type</p>
              <div className="mt-3 space-y-1.5">
                {(["all", "demo", "project", "document"] as AssetFilter[]).map((filter) => <button key={filter} type="button" onClick={() => setAssetFilter(filter)} className={cn("w-full rounded-lg border px-3 py-2 text-left text-sm capitalize transition-colors", assetFilter === filter ? "border-primary/40 bg-primary/10 text-primary" : "border-transparent text-muted-foreground hover:bg-white/[0.04] hover:text-foreground")}>{filter === "all" ? "All project types" : `${filter}s`}</button>)}
              </div>
            </div>
          </aside>

          <main className="min-w-0">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="relative w-full sm:max-w-xl"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Search projects, teams, members, or themes" className="h-11 pl-9" /></div>
              <Select value={sortMode} onValueChange={(value: "newest" | "title" | "assets") => setSortMode(value)}><SelectTrigger className="h-11 w-full sm:w-40"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="newest">Newest</SelectItem><SelectItem value="assets">Most complete</SelectItem><SelectItem value="title">A–Z</SelectItem></SelectContent></Select>
            </div>
            <div className="mt-4 flex items-center justify-between gap-3"><p className="text-sm text-muted-foreground">{filteredSubmissions.length} of {submissions.length} projects</p><span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground"><LayoutGrid className="h-3.5 w-3.5" />Gallery view</span></div>

            {isLoading ? <div className="mt-5 rounded-2xl border border-white/10 bg-card/50 px-5 py-20 text-center text-sm text-muted-foreground">Loading submitted projects...</div> : loadError ? <div className="mt-5 rounded-2xl border border-destructive/30 bg-destructive/10 px-5 py-20 text-center text-sm text-destructive">{loadError}</div> : filteredSubmissions.length === 0 ? <div className="mt-5 rounded-2xl border border-dashed border-white/15 bg-card/40 px-5 py-20 text-center"><FolderKanban className="mx-auto h-9 w-9 text-muted-foreground/60" /><h2 className="mt-4 font-display text-xl font-semibold text-foreground">No matching projects yet</h2><p className="mt-2 text-sm text-muted-foreground">Only projects participants chose to share appear here. Try a different search or filter.</p></div> : <div className="mt-5 grid gap-4 sm:grid-cols-2 2xl:grid-cols-3">{filteredSubmissions.map((submission) => <ProjectCard key={submission.id} submission={submission} event={getEvent(submission, eventById)} onPreview={openPreview} />)}</div>}
          </main>
        </section>
        </div>
      </main>

      <Dialog open={Boolean(previewSubmission)} onOpenChange={(open) => { if (!open) setPreviewSubmission(null); }}>
        <DialogContent className="max-h-[92svh] max-w-5xl overflow-y-auto border-white/10 bg-background p-0">
          {previewSubmission ? <div className="p-5 sm:p-7"><DialogHeader><p className="dash-eyebrow">Project preview</p><DialogTitle className="pr-8 font-display text-2xl text-foreground">{previewSubmission.title?.trim() || "Untitled project"}</DialogTitle><DialogDescription className="max-w-3xl leading-relaxed">{previewSubmission.short_description?.trim() || "Open the submitted asset below."}</DialogDescription></DialogHeader><div className="mt-5 flex flex-wrap gap-2">{previewAssets.map((kind) => <button key={kind} type="button" onClick={() => setPreviewKind(kind)} className={cn("rounded-lg border px-3 py-2 text-xs font-semibold capitalize transition-colors", previewKind === kind ? "border-primary/45 bg-primary/15 text-primary" : "border-white/10 text-muted-foreground hover:text-foreground")}>{kind === "document" ? "PDF / document" : kind}</button>)}</div><div className="mt-4 overflow-hidden rounded-xl border border-white/10 bg-black"><iframe title={`${previewSubmission.title ?? "Project"} ${previewKind} preview`} src={activePreviewUrl} className="h-[min(60svh,620px)] w-full bg-black" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen /></div><div className="mt-4 flex flex-wrap items-center justify-between gap-3"><p className="text-xs text-muted-foreground">If a provider blocks embedded previews, open it in a new tab.</p><Button asChild variant="outline" size="sm" className="gap-1.5"><a href={activePreviewUrl} target="_blank" rel="noreferrer">Open original <ArrowUpRight className="h-3.5 w-3.5" /></a></Button></div></div> : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
