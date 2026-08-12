import { useEffect, useMemo, useState } from "react";
import type { Firestore } from "firebase/firestore";
import {
  buildAdminPortalCatalog,
  subscribeAllHackathonsForAdmin,
  type HostedHackathon,
} from "@/lib/aiHackathons";
import { PORTAL_HACKATHONS, type PortalHackathon } from "@/lib/hackathons";

/**
 * Live admin event catalog: static Impact editions + every Firestore-hosted
 * hackathon (AI Ideathon and future events), updated in realtime.
 */
export function useAdminHackathonCatalog(db: Firestore, enabled = true) {
  const [hostedEvents, setHostedEvents] = useState<HostedHackathon[]>([]);
  const [isLoading, setIsLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const unsubscribe = subscribeAllHackathonsForAdmin(
      db,
      (events) => {
        setHostedEvents(events);
        setIsLoading(false);
        setError(null);
      },
      (err) => {
        setError(err.message);
        setIsLoading(false);
      },
    );

    return () => unsubscribe();
  }, [db, enabled]);

  const catalog = useMemo(
    () => buildAdminPortalCatalog(hostedEvents),
    [hostedEvents],
  );

  const upsertHostedEvent = (event: HostedHackathon) => {
    setHostedEvents((current) => [event, ...current.filter((item) => item.id !== event.id)]);
  };

  const removeHostedEvent = (eventId: string) => {
    setHostedEvents((current) => current.filter((item) => item.id !== eventId));
  };

  return {
    hostedEvents,
    catalog: catalog.length > 0 ? catalog : PORTAL_HACKATHONS,
    isLoading,
    error,
    setHostedEvents,
    upsertHostedEvent,
    removeHostedEvent,
  };
}

export type AdminHackathonCatalog = PortalHackathon[];
