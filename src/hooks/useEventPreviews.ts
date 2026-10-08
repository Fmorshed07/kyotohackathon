import { useEffect, useMemo, useState } from "react";
import {
  fetchPortalHackathonCatalog,
  fetchPublishedHackathons,
  mergePublicEventPreviews,
  type HostedHackathon,
} from "@/lib/aiHackathons";
import { getFirestoreDb } from "@/lib/firebaseClient";
import { getEventPreviews, getEventTimeRange } from "@/lib/eventPreviews";
import { mergeLumaCalendarArchive } from "@/lib/lumaCalendarArchive";

export function useEventPreviews() {
  const [events, setEvents] = useState<HostedHackathon[]>([]);
  const [now, setNow] = useState(Date.now);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let current = true;
    let fetching = false;
    const load = async () => {
      if (fetching) return;
      fetching = true;
      try {
        const db = getFirestoreDb();
        const published = await fetchPublishedHackathons(db);
        if (!current) return;
        const catalog = await fetchPortalHackathonCatalog(db, published);
        if (!current) return;
        setEvents(mergePublicEventPreviews(published, catalog));
        setNow(Date.now());
        setHasError(false);
      } catch {
        if (!current) return;
        setEvents([]);
        setHasError(true);
      } finally {
        fetching = false;
        if (current) setIsLoading(false);
      }
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") void load();
    };
    void load();
    const refresh = window.setInterval(() => {
      if (document.visibilityState === "visible") void load();
    }, 5 * 60_000);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      current = false;
      window.clearInterval(refresh);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [refreshKey]);

  // Move cards between upcoming, live and past at the nearest boundary.
  // A minute heartbeat also accounts for system clock changes.
  useEffect(() => {
    const currentTime = Date.now();
    const boundaries = events.flatMap((event) => {
      const range = getEventTimeRange(event);
      return event.published && range ? [range.start, range.end] : [];
    }).filter((time) => time > currentTime);
    const delay = Math.min(60_000, ...boundaries.map((time) => time - currentTime));
    const tick = window.setTimeout(() => setNow(Date.now()), Math.max(1, delay));
    const updateClock = () => setNow(Date.now());
    window.addEventListener("focus", updateClock);
    document.addEventListener("visibilitychange", updateClock);
    return () => {
      window.clearTimeout(tick);
      window.removeEventListener("focus", updateClock);
      document.removeEventListener("visibilitychange", updateClock);
    };
  }, [events, now]);

  const { live, upcoming, past } = useMemo(() => getEventPreviews(mergeLumaCalendarArchive(events, now), now), [events, now]);
  const refresh = () => {
    setIsLoading(true);
    setHasError(false);
    setRefreshKey((key) => key + 1);
  };
  return { live, upcoming, past, isLoading, hasError, refresh };
}
