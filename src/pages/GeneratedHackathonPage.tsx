import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Clipboard,
  ExternalLink,
  FileText,
  MapPin,
  Sparkles,
  Trophy,
  Users,
} from "lucide-react";
import AnimatedBackground from "@/components/AnimatedBackground";
import { EventRichText } from "@/components/EventRichText";
import SiteHeader from "@/components/SiteHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { fetchAiHackathon, type HostedHackathon } from "@/lib/aiHackathons";
import {
  buildEventThemeStyle,
  getEventLayoutStyle,
  type EventLayoutStyle,
} from "@/lib/eventBranding";
import { getFirestoreDb } from "@/lib/firebaseClient";
import { cn } from "@/lib/utils";

type PublicCriterion = { id: string; title: string; weight: number; questions: string[] };

const participantSignupHref = (eventId: string) =>
  `/signup?role=participant&hackathon=${encodeURIComponent(eventId)}`;

const normalizeCriteria = (value: unknown): PublicCriterion[] => {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry, index) => {
    if (!entry || typeof entry !== "object") return [];
    const item = entry as Record<string, unknown>;
    const title = typeof item.title === "string" ? item.title.trim() : "";
    const weight = typeof item.weight === "number" ? item.weight : Number(item.weight);
    if (!title || !Number.isFinite(weight)) return [];
    return [{
      id: typeof item.id === "string" ? item.id : String(index),
      title,
      weight: Math.round(weight),
      questions: Array.isArray(item.questions)
        ? item.questions.filter((question): question is string => typeof question === "string")
        : [],
    }];
  });
};

function EventHeroMeta({
  event,
  isHosted,
  tone,
}: {
  event: HostedHackathon;
  isHosted: boolean;
  tone: "stage" | "card";
}) {
  const displayStyle = { fontFamily: "var(--event-display)" };
  const isStage = tone === "stage";

  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        {event.logoUrl ? (
          <img
            src={event.logoUrl}
            alt=""
            className={cn(
              "rounded-lg border object-cover shadow-lg",
              isStage
                ? "h-11 w-11 border-white/20 sm:h-12 sm:w-12"
                : "h-11 w-11 border-white/15",
            )}
          />
        ) : null}
        <div className="flex max-w-full flex-wrap gap-2">
          <Badge className="uppercase tracking-[0.16em]">
            {event.status === "active" ? "Live now" : event.status}
          </Badge>
          <Badge
            variant="outline"
            className={cn(
              isStage
                ? "border-primary/40 bg-black/40 text-primary backdrop-blur"
                : "border-primary/30 text-primary",
            )}
          >
            {event.format}
          </Badge>
          {isHosted ? (
            <Badge
              variant="outline"
              className={cn(
                isStage
                  ? "border-white/20 bg-black/40 text-foreground backdrop-blur"
                  : "border-white/15 text-muted-foreground",
              )}
            >
              Hosted event
            </Badge>
          ) : null}
        </div>
      </div>
      {event.organizerName ? (
        <p
          className={cn(
            "mt-4 text-xs font-semibold uppercase tracking-[0.2em] sm:mt-5",
            isStage ? "text-white/70" : "text-muted-foreground",
          )}
        >
          Presented by {event.organizerName}
        </p>
      ) : null}
      {event.theme ? (
        <p
          className={cn(
            "text-sm font-semibold uppercase tracking-[0.2em] text-primary",
            event.organizerName ? "mt-3 sm:mt-4" : "mt-4 sm:mt-5",
          )}
        >
          {event.theme}
        </p>
      ) : null}
      <h1
        className={cn(
          "mt-3 text-balance font-semibold leading-[1.05]",
          isStage
            ? "text-[1.85rem] text-white sm:text-5xl lg:text-6xl xl:text-7xl"
            : "text-[1.85rem] text-foreground sm:text-5xl lg:text-6xl",
        )}
        style={displayStyle}
      >
        {event.name}
      </h1>
      {event.tagline ? (
        <p
          className={cn(
            "mt-4 max-w-2xl text-base font-medium leading-snug sm:mt-5 sm:text-xl sm:leading-snug lg:text-2xl",
            isStage ? "text-white/88" : "text-foreground/90",
          )}
          style={displayStyle}
        >
          {event.tagline}
        </p>
      ) : null}
      <div
        className={cn(
          "mt-5 flex flex-col gap-2 text-sm sm:mt-7 sm:flex-row sm:flex-wrap sm:gap-3",
          isStage ? "text-white" : "text-foreground",
        )}
      >
        <span
          className={cn(
            "inline-flex min-w-0 items-start gap-2 rounded-lg border px-3 py-2.5 sm:items-center",
            isStage
              ? "border-white/15 bg-black/45 backdrop-blur"
              : "border-white/10 bg-black/15",
          )}
        >
          <CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-primary sm:mt-0" />
          <span className="min-w-0 break-words leading-snug">{event.eventDate}</span>
        </span>
        <span
          className={cn(
            "inline-flex min-w-0 items-start gap-2 rounded-lg border px-3 py-2.5 sm:items-center",
            isStage
              ? "border-white/15 bg-black/45 backdrop-blur"
              : "border-white/10 bg-black/15",
          )}
        >
          <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary sm:mt-0" />
          <span className="min-w-0 break-words leading-snug">{event.location}</span>
        </span>
      </div>
    </>
  );
}

function EventHeroActions({
  event,
  onCopy,
  copied,
  tone,
}: {
  event: HostedHackathon;
  onCopy: () => void;
  copied: boolean;
  tone: "stage" | "card";
}) {
  const isStage = tone === "stage";
  const btn = "w-full gap-2 sm:w-auto";

  return (
    <div className="mt-6 flex flex-col gap-2.5 sm:mt-8 sm:flex-row sm:flex-wrap sm:gap-3">
      {event.lumaUrl ? (
        <Button asChild size="lg" className={btn}>
          <a href={event.lumaUrl} target="_blank" rel="noreferrer">
            Register now
            <ExternalLink className="h-4 w-4" />
          </a>
        </Button>
      ) : null}
      <Button
        asChild
        size="lg"
        variant={event.lumaUrl ? "outline" : "default"}
        className={cn(btn, isStage && event.lumaUrl && "border-white/25 bg-black/35 text-white backdrop-blur hover:bg-black/55")}
      >
        <Link to={participantSignupHref(event.id)}>
          Join on Cognisor
          <Users className="h-4 w-4" />
        </Link>
      </Button>
      {event.rulebookUrl ? (
        <Button
          asChild
          size="lg"
          variant="outline"
          className={cn(
            btn,
            isStage && "border-white/25 bg-black/30 text-white backdrop-blur hover:bg-black/50",
          )}
        >
          <a href={event.rulebookUrl} target="_blank" rel="noreferrer">
            Rulebook
            <ExternalLink className="h-4 w-4" />
          </a>
        </Button>
      ) : null}
      <Button
        type="button"
        size="lg"
        variant={isStage ? "ghost" : "ghost"}
        className={cn(
          btn,
          isStage ? "text-white hover:bg-white/10 hover:text-white" : "",
        )}
        onClick={onCopy}
      >
        <Clipboard className="h-4 w-4" />
        {copied ? "Link copied" : isStage ? "Share" : "Share event"}
      </Button>
    </div>
  );
}

function EventHero({
  event,
  layout,
  onCopy,
  copied,
}: {
  event: HostedHackathon;
  layout: EventLayoutStyle;
  onCopy: () => void;
  copied: boolean;
}) {
  const heroImage = event.bannerImageUrl || event.coverImageUrl;
  const isHosted = Boolean(event.hostEventId);

  if (layout === "stage") {
    return (
      <section className="relative isolate overflow-hidden border-b border-white/10">
        {/* Poster band: clean on mobile so HTML never fights artwork text */}
        <div className="relative h-[min(52vh,380px)] w-full overflow-hidden bg-black sm:h-[min(56vh,460px)] md:absolute md:inset-0 md:h-full md:min-h-[min(72vh,720px)]">
          {heroImage ? (
            <img
              src={heroImage}
              alt=""
              className="absolute inset-0 h-full w-full object-contain object-center md:object-cover"
            />
          ) : (
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,hsl(var(--primary)/0.28),transparent_55%),linear-gradient(180deg,#05070b_0%,#000_100%)]" />
          )}
          {/* Soft fade into content on small screens only */}
          <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-background to-transparent md:hidden" />
          {/* Desktop cinematic scrim — strong enough for readable overlay copy */}
          <div className="absolute inset-0 hidden bg-gradient-to-t from-background via-background/80 to-background/25 md:block" />
          <div className="absolute inset-0 hidden bg-[radial-gradient(circle_at_20%_20%,hsl(var(--primary)/0.18),transparent_42%)] md:block" />
        </div>

        <div className="relative mx-auto flex w-full max-w-6xl flex-col justify-end px-4 pb-8 pt-5 sm:px-6 sm:pb-10 md:min-h-[min(72vh,720px)] md:pb-14 md:pt-28 lg:px-8">
          <div className="max-w-4xl animate-in fade-in slide-in-from-bottom-4 duration-700 md:rounded-2xl md:border md:border-white/10 md:bg-black/55 md:p-8 md:shadow-2xl md:backdrop-blur-xl lg:p-10">
            <EventHeroMeta event={event} isHosted={isHosted} tone="stage" />
            <EventHeroActions event={event} onCopy={onCopy} copied={copied} tone="stage" />
          </div>
        </div>
      </section>
    );
  }

  return (
    <section
      className={cn(
        "relative overflow-hidden border border-primary/20 bg-card/80 shadow-2xl backdrop-blur",
        layout === "folio" ? "rounded-[1.5rem] sm:rounded-[2rem]" : "rounded-2xl",
      )}
    >
      {heroImage ? (
        <div className="relative aspect-[16/10] w-full overflow-hidden border-b border-white/10 sm:aspect-[21/9]">
          <img
            src={heroImage}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-card via-card/40 to-transparent" />
        </div>
      ) : null}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,hsl(var(--primary)/0.18),transparent_40%)]" />
      <div
        className={cn(
          "relative max-w-4xl px-4 py-7 sm:px-8 sm:py-10",
          layout === "folio" && "sm:px-10 sm:py-14",
          !heroImage && "px-5 py-8 sm:px-8 sm:py-12",
        )}
      >
        <EventHeroMeta event={event} isHosted={isHosted} tone="card" />
        <EventHeroActions event={event} onCopy={onCopy} copied={copied} tone="card" />
      </div>
    </section>
  );
}

export default function GeneratedHackathonPage() {
  const { hackathonId } = useParams<{ hackathonId: string }>();
  const [event, setEvent] = useState<HostedHackathon | null>(null);
  const [criteria, setCriteria] = useState<PublicCriterion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!hackathonId) {
      setIsLoading(false);
      return;
    }
    let isCurrent = true;
    const db = getFirestoreDb();
    void Promise.all([
      fetchAiHackathon(db, hackathonId),
      getDoc(doc(db, "hackathon_criteria", hackathonId)),
    ])
      .then(([result, criteriaSnapshot]) => {
        if (!isCurrent) return;
        setEvent(result);
        setCriteria(normalizeCriteria(criteriaSnapshot.data()?.criteria));
      })
      .catch(() => {
        if (isCurrent) setEvent(null);
      })
      .finally(() => {
        if (isCurrent) setIsLoading(false);
      });
    return () => {
      isCurrent = false;
    };
  }, [hackathonId]);

  const themeStyle = useMemo(
    () =>
      buildEventThemeStyle({
        accentHex: event?.accentColor,
        fontPreset: event?.fontPreset,
      }),
    [event?.accentColor, event?.fontPreset],
  );
  const layout = getEventLayoutStyle(event?.layoutStyle);
  const displayStyle = { fontFamily: "var(--event-display)" };

  const copyEventLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="relative min-h-svh overflow-hidden bg-background" style={themeStyle}>
      <AnimatedBackground />
      <SiteHeader />
      <main
        className={cn(
          "relative pb-[max(5rem,env(safe-area-inset-bottom))] pt-14 sm:pt-16",
          layout === "stage" ? "" : "mx-auto max-w-6xl px-4 pt-20 sm:px-6 sm:pt-24 lg:px-8",
        )}
      >
        {isLoading ? (
          <p className="py-24 text-center text-sm text-muted-foreground">Loading event…</p>
        ) : !event ? (
          <section className="mx-auto max-w-xl rounded-2xl border border-white/10 bg-card/70 p-8 text-center shadow-2xl backdrop-blur">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">Event unavailable</p>
            <h1 className="mt-3 text-3xl font-semibold text-foreground" style={displayStyle}>
              This event is not live.
            </h1>
            <p className="mt-3 text-muted-foreground">
              The link may be incorrect, or the organiser has not published it yet.
            </p>
            <Button asChild variant="outline" className="mt-6 gap-2">
              <Link to="/hackathons">
                <ArrowLeft className="h-4 w-4" /> View hackathons
              </Link>
            </Button>
          </section>
        ) : (
          <>
            <EventHero event={event} layout={layout} onCopy={() => void copyEventLink()} copied={copied} />

            <div
              className={cn(
                layout === "stage" ? "mx-auto max-w-6xl px-4 sm:px-6 lg:px-8" : "",
                layout === "signal" ? "mt-6 grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)]" : "",
              )}
            >
              <nav
                aria-label="Event sections"
                className={cn(
                  "mt-4 rounded-xl border border-white/10 bg-card/70 text-sm text-muted-foreground backdrop-blur sm:mt-5",
                  layout === "signal"
                    ? "sticky top-20 flex h-fit flex-col items-stretch gap-1 p-3 sm:top-24"
                    : "overflow-x-auto overscroll-x-contain [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
                )}
              >
                <div
                  className={cn(
                    layout === "signal"
                      ? "flex flex-col gap-1"
                      : "flex w-max min-w-full items-center gap-1 px-2 py-2 sm:gap-1.5 sm:px-3",
                  )}
                >
                  {[
                    { href: "#overview", label: "Overview", show: true },
                    { href: "#about", label: "About", show: Boolean(event.summary) },
                    { href: "#guests", label: "Guests", show: event.guests.length > 0 },
                    { href: "#gallery", label: "Gallery", show: event.galleryUrls.length > 0 },
                    { href: "#schedule", label: "Schedule", show: true },
                    { href: "#judging", label: "Judging", show: true },
                    { href: "#requirements", label: "Requirements", show: true },
                  ]
                    .filter((item) => item.show)
                    .map((item) => (
                      <a
                        key={item.href}
                        href={item.href}
                        className={cn(
                          "shrink-0 rounded-lg px-3 py-2 transition-colors hover:bg-white/5 hover:text-primary",
                          layout === "signal" && "w-full",
                        )}
                      >
                        {item.label}
                      </a>
                    ))}
                </div>
              </nav>

              <div>
                {event.summary ? (
                  <section
                    id="about"
                    className={cn(
                      "mt-6 rounded-2xl border border-white/10 bg-card/70 p-4 backdrop-blur sm:mt-8 sm:p-8",
                      layout === "folio" && "border-0 bg-transparent p-0 sm:p-0",
                    )}
                  >
                    <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">About</p>
                    <h2 className="mt-2 text-2xl font-semibold text-foreground sm:text-3xl" style={displayStyle}>
                      The brief
                    </h2>
                    <div className="mt-5 max-w-3xl">
                      <EventRichText content={event.summary} className="sm:text-lg" />
                    </div>
                  </section>
                ) : null}

                <section
                  id="overview"
                  className={cn(
                    "mt-6 grid gap-3 sm:mt-8 sm:gap-4",
                    layout === "signal" ? "sm:grid-cols-2" : "sm:grid-cols-3",
                  )}
                >
                  <article className="rounded-xl border border-white/10 bg-card/70 p-5 backdrop-blur transition hover:border-primary/30">
                    <Users className="h-5 w-5 text-primary" />
                    <p className="mt-4 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                      Eligibility & teams
                    </p>
                    <p className="mt-2 text-sm font-medium text-foreground">{event.eligibility}</p>
                    <p className="mt-2 text-sm text-muted-foreground">{event.teamSize}</p>
                  </article>
                  <article className="rounded-xl border border-white/10 bg-card/70 p-5 backdrop-blur transition hover:border-primary/30">
                    <Trophy className="h-5 w-5 text-primary" />
                    <p className="mt-4 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                      Prizes
                    </p>
                    <p className="mt-2 text-sm font-medium text-foreground">{event.prize}</p>
                    <p className="mt-2 text-sm text-muted-foreground">
                      Final awards are confirmed by the organiser.
                    </p>
                  </article>
                  <article className="rounded-xl border border-white/10 bg-card/70 p-5 backdrop-blur transition hover:border-primary/30 sm:col-span-1">
                    <Sparkles className="h-5 w-5 text-primary" />
                    <p className="mt-4 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                      Event format
                    </p>
                    <p className="mt-2 text-sm font-medium text-foreground">{event.format}</p>
                    <p className="mt-2 text-sm text-muted-foreground">
                      Follow the programme and rulebook for the latest joining details.
                    </p>
                  </article>
                </section>

                {event.guests.length > 0 ? (
                  <section id="guests" className="mt-6 rounded-2xl border border-white/10 bg-card/70 p-4 backdrop-blur sm:mt-8 sm:p-8">
                    <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">People</p>
                    <h2 className="mt-2 text-2xl font-semibold text-foreground sm:text-3xl" style={displayStyle}>
                      Guests & speakers
                    </h2>
                    <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {event.guests.map((guest, index) => (
                        <article
                          key={`${guest.name}-${index}`}
                          className="group overflow-hidden rounded-xl border border-white/10 bg-black/15 transition hover:-translate-y-0.5 hover:border-primary/30"
                        >
                          {guest.imageUrl ? (
                            <img
                              src={guest.imageUrl}
                              alt={guest.name || "Guest"}
                              className="aspect-[4/3] w-full object-cover transition duration-500 group-hover:scale-[1.03]"
                              loading="lazy"
                            />
                          ) : (
                            <div className="flex aspect-[4/3] w-full items-center justify-center bg-primary/10 text-primary">
                              <Users className="h-8 w-8" />
                            </div>
                          )}
                          <div className="p-4">
                            <h3 className="font-semibold text-foreground" style={displayStyle}>
                              {guest.name || "Guest"}
                            </h3>
                            {guest.role ? (
                              <p className="mt-1 text-xs uppercase tracking-[0.14em] text-primary">{guest.role}</p>
                            ) : null}
                            {guest.bio ? (
                              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{guest.bio}</p>
                            ) : null}
                          </div>
                        </article>
                      ))}
                    </div>
                  </section>
                ) : null}

                {event.galleryUrls.length > 0 ? (
                  <section id="gallery" className="mt-6 rounded-2xl border border-white/10 bg-card/70 p-4 backdrop-blur sm:mt-8 sm:p-8">
                    <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">Moments</p>
                    <h2 className="mt-2 text-2xl font-semibold text-foreground sm:text-3xl" style={displayStyle}>
                      Event gallery
                    </h2>
                    <div className="mt-5 grid grid-cols-2 gap-2 sm:mt-6 sm:gap-3 md:grid-cols-3 lg:grid-cols-4">
                      {event.galleryUrls.map((url, index) => (
                        <a
                          key={`${url}-${index}`}
                          href={url}
                          target="_blank"
                          rel="noreferrer"
                          className="group aspect-square overflow-hidden rounded-xl border border-white/10 bg-black/20"
                        >
                          <img
                            src={url}
                            alt={`${event.name} gallery ${index + 1}`}
                            className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]"
                            loading="lazy"
                          />
                        </a>
                      ))}
                    </div>
                  </section>
                ) : null}

                <section className="mt-6 grid gap-6 sm:mt-8 sm:gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(280px,0.9fr)]">
                  <article id="schedule" className="rounded-2xl border border-white/10 bg-card/70 p-4 backdrop-blur sm:p-8">
                    <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">Programme</p>
                    <h2 className="mt-2 text-2xl font-semibold text-foreground sm:text-3xl" style={displayStyle}>
                      Event schedule
                    </h2>
                    {event.schedule.length > 0 ? (
                      <ol className="mt-6 space-y-5">
                        {event.schedule.map((item, index) => (
                          <li
                            key={`${item.time}-${item.title}-${index}`}
                            className="grid gap-2 border-l-2 border-primary/35 pl-4 sm:grid-cols-[140px_1fr]"
                          >
                            <p className="text-sm font-semibold text-primary">{item.time || "TBC"}</p>
                            <div>
                              <h3 className="font-semibold text-foreground" style={displayStyle}>
                                {item.title}
                              </h3>
                              {item.description ? (
                                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                                  {item.description}
                                </p>
                              ) : null}
                            </div>
                          </li>
                        ))}
                      </ol>
                    ) : (
                      <p className="mt-6 text-sm text-muted-foreground">
                        The detailed schedule will be confirmed by the organiser.
                      </p>
                    )}
                  </article>
                  <article id="requirements" className="rounded-2xl border border-white/10 bg-card/70 p-4 backdrop-blur sm:p-8">
                    <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">Before you apply</p>
                    <h2 className="mt-2 text-2xl font-semibold text-foreground sm:text-3xl" style={displayStyle}>
                      Requirements
                    </h2>
                    {event.requirements.length > 0 ? (
                      <ul className="mt-6 space-y-3">
                        {event.requirements.map((requirement, index) => (
                          <li key={`${requirement}-${index}`} className="flex gap-3 text-sm leading-relaxed text-muted-foreground">
                            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                            {requirement}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="mt-6 text-sm text-muted-foreground">
                        Check the rulebook or event updates for entry requirements.
                      </p>
                    )}
                    {event.rulebookUrl ? (
                      <a
                        href={event.rulebookUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-6 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-primary hover:underline"
                      >
                        Read the complete rulebook <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    ) : null}
                  </article>
                </section>

                <section id="judging" className="mt-6 rounded-2xl border border-white/10 bg-card/70 p-4 backdrop-blur sm:mt-8 sm:p-8">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">Evaluation</p>
                      <h2 className="mt-2 text-2xl font-semibold text-foreground sm:text-3xl" style={displayStyle}>
                        How projects are judged
                      </h2>
                      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                        The judging rubric is published with the event so teams can build with clear expectations.
                      </p>
                    </div>
                    <FileText className="h-7 w-7 text-primary" />
                  </div>
                  {criteria.length > 0 ? (
                    <div className="mt-6 grid gap-3 md:grid-cols-2">
                      {criteria.map((criterion) => (
                        <article key={criterion.id} className="rounded-xl border border-white/10 bg-black/15 p-4">
                          <div className="flex items-start justify-between gap-3">
                            <h3 className="font-semibold text-foreground" style={displayStyle}>
                              {criterion.title}
                            </h3>
                            <Badge variant="outline" className="shrink-0 border-primary/30 text-primary">
                              {criterion.weight} pts
                            </Badge>
                          </div>
                          {criterion.questions[0] ? (
                            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                              {criterion.questions[0]}
                            </p>
                          ) : null}
                        </article>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-6 text-sm text-muted-foreground">
                      The organiser will publish the final judging criteria before submissions open.
                    </p>
                  )}
                </section>

                <section className="mt-6 overflow-hidden rounded-2xl border border-primary/25 bg-gradient-to-br from-primary/15 via-card/80 to-card/60 px-4 py-8 text-center sm:mt-8 sm:px-10 sm:py-10">
                  <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">
                    {event.lumaUrl ? "Ready to take part?" : "Ready to build?"}
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold text-foreground sm:text-3xl" style={displayStyle}>
                    {event.organizerName
                      ? `Join ${event.organizerName}'s event`
                      : "Join this event community"}
                  </h2>
                  <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                    {event.lumaUrl
                      ? "Register through the organiser link, then create a Cognisor account to submit and collaborate."
                      : "Create your portal account to participate, submit projects, and receive organiser updates."}
                  </p>
                  <div className="mt-6 flex flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:justify-center sm:gap-3">
                    {event.lumaUrl ? (
                      <Button asChild className="w-full gap-2 sm:w-auto">
                        <a href={event.lumaUrl} target="_blank" rel="noreferrer">
                          Open registration <ExternalLink className="h-4 w-4" />
                        </a>
                      </Button>
                    ) : null}
                    <Button asChild variant={event.lumaUrl ? "outline" : "default"} className="w-full gap-2 sm:w-auto">
                      <Link to={participantSignupHref(event.id)}>
                        Create participant account <ArrowLeft className="h-4 w-4 rotate-180" />
                      </Link>
                    </Button>
                  </div>
                </section>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
