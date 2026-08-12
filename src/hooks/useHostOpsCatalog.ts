import { useEffect, useMemo, useState } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { getFirestoreDb } from "@/lib/firebaseClient";
import {
  mapHostEventFromFirestore,
  type HostEvent,
} from "@/lib/hostEvents";
import type { PortalHackathon } from "@/lib/hackathons";
import type { SessionUser } from "@/types/portal";

/** Build switcher rows from host events that already have a public listing. */
export function hostEventsToPortalHackathons(events: HostEvent[]): PortalHackathon[] {
  return events
    .filter((event) => Boolean(event.public_hackathon_id?.trim()))
    .map((event) => {
      const id = event.public_hackathon_id!.trim();
      const start = event.start_at ? new Date(event.start_at) : null;
      const end = event.end_at ? new Date(event.end_at) : null;
      const now = Date.now();
      let status: PortalHackathon["status"] = "upcoming";
      if (start && end) {
        const startMs = start.getTime();
        const endMs = end.getTime();
        if (now >= startMs && now <= endMs) status = "active";
        else if (now > endMs) status = "past";
      } else if (event.status === "published") {
        status = "upcoming";
      }
      return {
        id,
        name: event.name || "Hosted event",
        shortName: event.name?.trim().slice(0, 24) || "Event",
        eventDate:
          start && end
            ? `${start.toLocaleDateString(undefined, { month: "short", day: "numeric" })}–${end.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}`
            : "TBA",
        location: event.location || event.format || "Online",
        theme: event.theme || event.tagline || "Hosted event",
        status,
      };
    });
}

/**
 * Portal catalog for host screening / operations: only events the host (or admin)
 * can manage via host_events → public_hackathon_id.
 */
export function useHostOpsCatalog(sessionUser: SessionUser | null) {
  const db = getFirestoreDb();
  const [events, setEvents] = useState<HostEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionUser) {
      setEvents([]);
      setIsLoading(false);
      return;
    }

    const isAdmin = sessionUser.role === "admin";
    const isApprovedHost =
      sessionUser.role === "host" && sessionUser.hostApprovalStatus === "approved";
    if (!isAdmin && !isApprovedHost) {
      setEvents([]);
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    const load = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const snap = isAdmin
          ? await getDocs(collection(db, "host_events"))
          : await getDocs(
              query(collection(db, "host_events"), where("owner_id", "==", sessionUser.id)),
            );
        if (cancelled) return;
        setEvents(
          snap.docs.map((item) =>
            mapHostEventFromFirestore(item.id, item.data() as Record<string, unknown>),
          ),
        );
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Unable to load host events.");
        setEvents([]);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [db, sessionUser]);

  const catalog = useMemo(() => hostEventsToPortalHackathons(events), [events]);

  return { events, catalog, isLoading, error };
}
