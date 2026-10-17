import { useMemo, useState } from "react";
import { ArrowRight, Radio, X } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useCommunityEvents } from "@/hooks/useCommunityEvents";
import { getHostedHackathonUrl, type HostedHackathon } from "@/lib/aiHackathons";
import { formatEventPreviewDate, getEventPreviews } from "@/lib/eventPreviews";

const isPublicEventRoute = (pathname: string) =>
  pathname === "/" ||
  pathname === "/hackathons" ||
  pathname.startsWith("/events/") ||
  pathname === "/projects" ||
  pathname.startsWith("/projects/");

export function OngoingEventNotice() {
  const { pathname } = useLocation();
  const path = pathname.replace(/\/+$/, "") || "/";
  // Do not load promotional event data on sign-in or private workspaces.
  return isPublicEventRoute(path) ? <PublicEventNotice pathname={path} /> : null;
}

function PublicEventNotice({ pathname }: { pathname: string }) {
  const { events, now, isLoading, isError } = useCommunityEvents();
  const live = useMemo(() => getEventPreviews(events, now).live, [events, now]);
  // Respect the current event page; elsewhere, focus on the live event ending
  // soonest. Never fall back to a past vote or advertise future events as live.
  const event = live.find(entry => getHostedHackathonUrl(entry.id) === pathname) ?? live[0];
  if (isLoading || isError || !event) return null;

  // A dismissal belongs to this edition, not to every future event. Keep the
  // selected notice dismissed instead of immediately replacing it with another.
  const noticeKey = `cognisor_ongoing_event_notice:${event.id}:${event.startAt}`;
  return <EventNoticeCard key={noticeKey} event={event} noticeKey={noticeKey} />;
}

function EventNoticeCard({ event, noticeKey }: { event: HostedHackathon; noticeKey: string }) {
  const [dismissed, setDismissed] = useState(() => {
    if (typeof window === "undefined") return false;
    try {
      return window.sessionStorage.getItem(noticeKey) === "1";
    } catch {
      return false;
    }
  });

  if (dismissed) return null;

  const dismiss = () => {
    setDismissed(true);
    try {
      window.sessionStorage.setItem(noticeKey, "1");
    } catch {
      // Private browsing or storage restrictions should not block dismissal.
    }
  };

  return (
    <aside
      aria-label="Ongoing event notification"
      aria-live="polite"
      className="fixed bottom-3 left-3 right-3 z-40 overflow-hidden rounded-lg border border-border bg-card shadow-lg sm:left-auto sm:right-5 sm:w-[350px]"
    >
      <button
        type="button"
        onClick={dismiss}
        className="absolute right-1 top-1 flex h-11 w-11 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        aria-label="Dismiss event notification"
      >
        <X className="h-4 w-4" aria-hidden="true" />
      </button>

      <div className="p-4">
        <p className="inline-flex items-center gap-2 pr-8 text-xs font-medium text-primary">
          <Radio className="h-4 w-4" aria-hidden="true" /> Live now
        </p>
        <h2 className="mt-2 break-words pr-5 font-display text-base font-medium text-foreground">
          {event.name}
        </h2>
        {event.location && <p className="mt-1 break-words text-xs text-muted-foreground">{event.location}</p>}
        <p className="mt-2 text-xs text-muted-foreground">
          Ends <time dateTime={event.endAt}>{formatEventPreviewDate(event.endAt!, event.timezone)}</time>
        </p>
        <Button asChild variant="ghost" size="sm" className="mt-2 h-auto min-h-10 w-full justify-between px-0 text-primary hover:bg-transparent">
          <Link to={getHostedHackathonUrl(event.id)} onClick={dismiss}>
            View event
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </Button>
      </div>
    </aside>
  );
}
