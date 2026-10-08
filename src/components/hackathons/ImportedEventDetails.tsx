import { CalendarDays, ExternalLink, MapPin, Ticket, Users } from "lucide-react";
import type { HostedHackathon } from "@/lib/aiHackathons";
import { downloadEventCalendar } from "@/lib/eventCalendar";
import { eventRegistrationLabel } from "@/lib/eventRegistration";
import { EventRichText } from "@/components/EventRichText";
import { Button } from "@/components/ui/button";

export default function ImportedEventDetails({ event }: { event: HostedHackathon }) {
  if (!event.sourceUrl) return null;
  const importedDate = event.sourceImportedAt && !Number.isNaN(Date.parse(event.sourceImportedAt))
    ? new Intl.DateTimeFormat("en-GB", { timeZone: event.timezone || "Asia/Tokyo", dateStyle: "medium" }).format(new Date(event.sourceImportedAt))
    : "";
  return (
    <section id="event-details" className="mt-6 space-y-6 sm:mt-8">
      <div className="grid gap-4 md:grid-cols-2">
        <article className="rounded-2xl border border-primary/25 bg-primary/10 p-5 sm:p-7">
          <Ticket className="h-6 w-6 text-primary" />
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <h2 className="font-display text-xl font-semibold">{event.status === "past" ? "Event ended" : event.registrationStatus === "waitlist" ? "Event full · waitlist open" : "Registration"}</h2>
            {event.ticketPriceLabel ? <span className="rounded-full border border-primary/25 bg-black/20 px-3 py-1 text-xs text-primary">{event.ticketPriceLabel}</span> : null}
          </div>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{event.status === "past" ? "Visit the official event page for updates from the organisers." : event.registrationNote}</p>
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">Availability was checked{importedDate ? ` on ${importedDate}` : " when imported"}. Luma shows the latest registration status.</p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Button asChild size="sm"><a href={event.lumaUrl} target="_blank" rel="noreferrer">{eventRegistrationLabel(event)}<ExternalLink className="ml-2 h-4 w-4" /></a></Button>
            {event.startAt && event.endAt ? <Button size="sm" variant="outline" onClick={() => downloadEventCalendar(event)}><CalendarDays className="mr-2 h-4 w-4" />Add to calendar</Button> : null}
          </div>
        </article>
        <article className="rounded-2xl border border-white/10 bg-card/70 p-5 sm:p-7">
          <MapPin className="h-6 w-6 text-primary" />
          <h2 className="mt-4 font-display text-xl font-semibold">Meet us in Tokyo</h2>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{event.location}</p>
          <p className="mt-3 text-sm font-medium text-foreground">{event.eventDate}</p>
          {event.timezone ? <p className="mt-1 text-xs text-muted-foreground">All programme times use {event.timezone}.</p> : null}
          {event.mapUrl ? <Button asChild variant="outline" size="sm" className="mt-5"><a href={event.mapUrl} target="_blank" rel="noreferrer">Get directions<ExternalLink className="ml-2 h-4 w-4" /></a></Button> : null}
        </article>
      </div>
      {event.focusAreas?.length ? <div className="rounded-2xl border border-white/10 bg-card/70 p-5 sm:p-7"><h2 className="font-display text-xl font-semibold">What you’ll explore</h2><div className="mt-4 flex flex-wrap gap-2">{event.focusAreas.map((area) => <span key={area} className="rounded-full border border-primary/20 bg-primary/10 px-3 py-2 text-sm text-primary">{area}</span>)}</div></div> : null}
      {event.organizerLinks?.length || event.hostProfiles?.length ? (
        <div className="rounded-2xl border border-white/10 bg-card/70 p-5 sm:p-7">
          <h2 className="font-display text-xl font-semibold">Organisers & hosts</h2>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">{event.organizerLinks?.map((organizer) => <a key={organizer.url} href={organizer.url} target="_blank" rel="noreferrer" className="flex min-w-0 items-center gap-3 rounded-xl border border-white/10 bg-black/15 p-4 transition-colors hover:border-primary/40">{organizer.imageUrl ? <img src={organizer.imageUrl} alt="" loading="lazy" className="h-12 w-12 shrink-0 rounded-lg bg-white object-contain" /> : null}<span className="min-w-0 flex-1 break-words text-sm font-medium">{organizer.name}</span><ExternalLink className="h-4 w-4 shrink-0 text-primary" /></a>)}</div>
          <div className="mt-5 flex flex-wrap gap-2">{event.hostProfiles?.map((host) => <a key={host.url} href={host.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-full border border-white/10 px-3 py-2 text-sm text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground">{host.imageUrl ? <img src={host.imageUrl} alt="" loading="lazy" className="h-6 w-6 rounded-full object-cover" /> : <Users className="h-4 w-4" />}{host.name}<ExternalLink className="h-3 w-3" /></a>)}</div>
          {event.cooperationNote ? <p className="mt-5 border-t border-white/10 pt-4 text-sm text-muted-foreground">{event.cooperationNote}</p> : null}
        </div>
      ) : null}
      {event.sourceDescription ? <details className="rounded-2xl border border-white/10 bg-card/70 p-5 sm:p-7"><summary className="cursor-pointer font-display text-lg font-semibold">Full event details</summary><EventRichText content={event.sourceDescription} className="mt-5" /></details> : null}
      <p className="text-xs text-muted-foreground">Event information from <a href={event.sourceUrl} target="_blank" rel="noreferrer" className="text-primary underline underline-offset-4">the official Luma listing</a>{importedDate ? `, checked ${importedDate}` : ""}.</p>
    </section>
  );
}
