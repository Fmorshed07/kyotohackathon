import { useEffect, useState } from "react";
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
import SiteHeader from "@/components/SiteHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { fetchAiHackathon, type HostedHackathon } from "@/lib/aiHackathons";
import { getFirestoreDb } from "@/lib/firebaseClient";

type PublicCriterion = { id: string; title: string; weight: number; questions: string[] };

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
    return () => { isCurrent = false; };
  }, [hackathonId]);

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
    <div className="relative min-h-svh overflow-hidden bg-background">
      <AnimatedBackground />
      <SiteHeader />
      <main className="relative mx-auto max-w-6xl px-4 pb-20 pt-24 sm:px-6 lg:px-8">
        {isLoading ? (
          <p className="py-24 text-center text-sm text-muted-foreground">Loading event…</p>
        ) : !event ? (
          <section className="mx-auto max-w-xl rounded-2xl border border-white/10 bg-card/70 p-8 text-center shadow-2xl backdrop-blur">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">Event unavailable</p>
            <h1 className="mt-3 font-display text-3xl font-semibold text-foreground">This event is not live.</h1>
            <p className="mt-3 text-muted-foreground">The link may be incorrect, or the organiser has not published it yet.</p>
            <Button asChild variant="outline" className="mt-6 gap-2"><Link to="/hackathons"><ArrowLeft className="h-4 w-4" /> View hackathons</Link></Button>
          </section>
        ) : (
          <>
            <section className="relative overflow-hidden rounded-2xl border border-primary/20 bg-card/80 px-5 py-8 shadow-2xl backdrop-blur sm:px-8 sm:py-12">
              {(event.bannerImageUrl || event.coverImageUrl) ? (
                <img
                  src={event.bannerImageUrl || event.coverImageUrl}
                  alt={`${event.name} event banner`}
                  className="absolute inset-0 h-full w-full object-cover opacity-35"
                />
              ) : null}
              <div className="absolute inset-0 bg-gradient-to-r from-card via-card/90 to-card/45" aria-hidden />
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,hsl(var(--primary)/0.2),transparent_38%)]" aria-hidden />
              <div className="relative max-w-4xl">
                <div className="flex flex-wrap items-center gap-2"><Badge className="uppercase tracking-[0.16em]">{event.status === "active" ? "Live now" : event.status}</Badge><Badge variant="outline" className="border-primary/30 text-primary">{event.format}</Badge><Badge variant="outline" className="border-white/15 text-muted-foreground">{event.createdManually ? "Organiser-built" : "AI-assisted setup"}</Badge></div>
                <p className="mt-7 text-sm font-semibold uppercase tracking-[0.2em] text-primary">{event.theme}</p>
                <h1 className="mt-3 font-display text-4xl font-semibold leading-tight text-foreground sm:text-6xl">{event.name}</h1>
                <p className="mt-5 max-w-3xl text-base leading-relaxed text-muted-foreground sm:text-lg">{event.summary || "Full event information will be shared here by the organiser."}</p>
                <div className="mt-7 flex flex-wrap gap-3 text-sm text-foreground"><span className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-black/15 px-3 py-2"><CalendarDays className="h-4 w-4 text-primary" />{event.eventDate}</span><span className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-black/15 px-3 py-2"><MapPin className="h-4 w-4 text-primary" />{event.location}</span></div>
                <div className="mt-8 flex flex-wrap gap-3">
                  <Button asChild className="gap-2"><Link to="/signup">Join Cognisor <Users className="h-4 w-4" /></Link></Button>
                  {event.lumaUrl ? <Button asChild variant="outline" className="gap-2 border-primary/40 bg-background/60"><a href={event.lumaUrl} target="_blank" rel="noreferrer">Open live event <ExternalLink className="h-4 w-4" /></a></Button> : null}
                  {event.rulebookUrl ? <Button asChild variant="outline" className="gap-2"><a href={event.rulebookUrl} target="_blank" rel="noreferrer">Open rulebook <ExternalLink className="h-4 w-4" /></a></Button> : null}
                  <Button type="button" variant="ghost" className="gap-2" onClick={() => void copyEventLink()}><Clipboard className="h-4 w-4" />{copied ? "Link copied" : "Share event"}</Button>
                </div>
              </div>
            </section>

            <nav className="mt-5 flex flex-wrap gap-x-5 gap-y-2 rounded-xl border border-white/10 bg-card/60 px-5 py-3 text-sm text-muted-foreground backdrop-blur"><a href="#overview" className="hover:text-primary">Overview</a>{event.guests.length > 0 ? <a href="#guests" className="hover:text-primary">Guests</a> : null}{event.galleryUrls.length > 0 ? <a href="#gallery" className="hover:text-primary">Gallery</a> : null}<a href="#schedule" className="hover:text-primary">Schedule</a><a href="#judging" className="hover:text-primary">Judging</a><a href="#requirements" className="hover:text-primary">Requirements</a></nav>

            <section id="overview" className="mt-8 grid gap-4 sm:grid-cols-3">
              <article className="rounded-xl border border-white/10 bg-card/70 p-5 backdrop-blur"><Users className="h-5 w-5 text-primary" /><p className="mt-4 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Eligibility & teams</p><p className="mt-2 text-sm font-medium text-foreground">{event.eligibility}</p><p className="mt-2 text-sm text-muted-foreground">{event.teamSize}</p></article>
              <article className="rounded-xl border border-white/10 bg-card/70 p-5 backdrop-blur"><Trophy className="h-5 w-5 text-primary" /><p className="mt-4 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Prizes</p><p className="mt-2 text-sm font-medium text-foreground">{event.prize}</p><p className="mt-2 text-sm text-muted-foreground">Final awards are confirmed by the organiser.</p></article>
              <article className="rounded-xl border border-white/10 bg-card/70 p-5 backdrop-blur"><Sparkles className="h-5 w-5 text-primary" /><p className="mt-4 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Event format</p><p className="mt-2 text-sm font-medium text-foreground">{event.format}</p><p className="mt-2 text-sm text-muted-foreground">Follow the programme and rulebook for the latest joining details.</p></article>
            </section>

            {event.guests.length > 0 ? (
              <section id="guests" className="mt-8 rounded-2xl border border-white/10 bg-card/70 p-6 backdrop-blur sm:p-8">
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">People</p>
                <h2 className="mt-2 font-display text-3xl font-semibold text-foreground">Guests & speakers</h2>
                <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {event.guests.map((guest, index) => (
                    <article
                      key={`${guest.name}-${index}`}
                      className="overflow-hidden rounded-xl border border-white/10 bg-black/15"
                    >
                      {guest.imageUrl ? (
                        <img
                          src={guest.imageUrl}
                          alt={guest.name || "Guest"}
                          className="aspect-[4/3] w-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className="flex aspect-[4/3] w-full items-center justify-center bg-primary/10 text-primary">
                          <Users className="h-8 w-8" />
                        </div>
                      )}
                      <div className="p-4">
                        <h3 className="font-semibold text-foreground">{guest.name || "Guest"}</h3>
                        {guest.role ? <p className="mt-1 text-xs uppercase tracking-[0.14em] text-primary">{guest.role}</p> : null}
                        {guest.bio ? <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{guest.bio}</p> : null}
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            ) : null}

            {event.galleryUrls.length > 0 ? (
              <section id="gallery" className="mt-8 rounded-2xl border border-white/10 bg-card/70 p-6 backdrop-blur sm:p-8">
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">Moments</p>
                <h2 className="mt-2 font-display text-3xl font-semibold text-foreground">Event gallery</h2>
                <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
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
                        className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
                        loading="lazy"
                      />
                    </a>
                  ))}
                </div>
              </section>
            ) : null}

            <section className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(300px,0.9fr)]">
              <article id="schedule" className="rounded-2xl border border-white/10 bg-card/70 p-6 backdrop-blur sm:p-8"><p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">Programme</p><h2 className="mt-2 font-display text-3xl font-semibold text-foreground">Event schedule</h2>{event.schedule.length > 0 ? <ol className="mt-6 space-y-5">{event.schedule.map((item, index) => <li key={`${item.time}-${item.title}-${index}`} className="grid gap-2 border-l-2 border-primary/35 pl-4 sm:grid-cols-[120px_1fr]"><p className="text-sm font-semibold text-primary">{item.time || "TBC"}</p><div><h3 className="font-semibold text-foreground">{item.title}</h3>{item.description ? <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{item.description}</p> : null}</div></li>)}</ol> : <p className="mt-6 text-sm text-muted-foreground">The detailed schedule will be confirmed by the organiser.</p>}</article>
              <article id="requirements" className="rounded-2xl border border-white/10 bg-card/70 p-6 backdrop-blur sm:p-8"><p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">Before you apply</p><h2 className="mt-2 font-display text-3xl font-semibold text-foreground">Requirements</h2>{event.requirements.length > 0 ? <ul className="mt-6 space-y-3">{event.requirements.map((requirement, index) => <li key={`${requirement}-${index}`} className="flex gap-3 text-sm leading-relaxed text-muted-foreground"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />{requirement}</li>)}</ul> : <p className="mt-6 text-sm text-muted-foreground">Check the rulebook or event updates for entry requirements.</p>}{event.rulebookUrl ? <a href={event.rulebookUrl} target="_blank" rel="noreferrer" className="mt-6 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-primary hover:underline">Read the complete rulebook <ExternalLink className="h-3.5 w-3.5" /></a> : null}</article>
            </section>

            <section id="judging" className="mt-8 rounded-2xl border border-white/10 bg-card/70 p-6 backdrop-blur sm:p-8"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">Evaluation</p><h2 className="mt-2 font-display text-3xl font-semibold text-foreground">How projects are judged</h2><p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">The judging rubric is published with the event so teams can build with clear expectations.</p></div><FileText className="h-7 w-7 text-primary" /></div>{criteria.length > 0 ? <div className="mt-6 grid gap-3 md:grid-cols-2">{criteria.map((criterion) => <article key={criterion.id} className="rounded-xl border border-white/10 bg-black/15 p-4"><div className="flex items-start justify-between gap-3"><h3 className="font-semibold text-foreground">{criterion.title}</h3><Badge variant="outline" className="shrink-0 border-primary/30 text-primary">{criterion.weight} pts</Badge></div>{criterion.questions[0] ? <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{criterion.questions[0]}</p> : null}</article>)}</div> : <p className="mt-6 text-sm text-muted-foreground">The organiser will publish the final judging criteria before submissions open.</p>}</section>

            <section className="mt-8 rounded-2xl border border-primary/25 bg-primary/10 px-6 py-8 text-center sm:px-10"><p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">Ready to build?</p><h2 className="mt-2 font-display text-3xl font-semibold text-foreground">Join the Cognisor event community.</h2><p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">Create your portal account to participate in events, submit projects, and receive organiser updates.</p><Button asChild className="mt-6 gap-2"><Link to="/signup">Create participant account <ArrowLeft className="h-4 w-4 rotate-180" /></Link></Button></section>
          </>
        )}
      </main>
    </div>
  );
}
