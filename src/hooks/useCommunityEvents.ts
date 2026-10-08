import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchPublishedHackathons, fetchPortalHackathonCatalog, portalHackathonAsHosted } from "@/lib/aiHackathons";
import { getFirestoreDb } from "@/lib/firebaseClient";
import { getEventTimeRange } from "@/lib/eventPreviews";
import { mergeLumaCalendarArchive } from "@/lib/lumaCalendarArchive";

/** One cached catalog shared by the map, event showcase, and work collection. */
export function useCommunityEvents() {
  const [now, setNow] = useState(Date.now);
  const query = useQuery({
    queryKey: ["public-community-events"],
    queryFn: async () => {
      const db = getFirestoreDb();
      const published = await fetchPublishedHackathons(db);
      const catalog = await fetchPortalHackathonCatalog(db, published);
      const byId = new Map(published.filter(event => event.published).map(event => [event.id, event]));
      // The public catalog omits unpublished/hidden editions. Never reintroduce them.
      return catalog.map(event => byId.get(event.id) ?? portalHackathonAsHosted(event));
    },
    staleTime: 60_000,
    refetchInterval: 5 * 60_000,
    refetchIntervalInBackground: false,
    retry: 1,
  });
  useEffect(() => {
    let timer: number | undefined;
    const tick = () => {
      window.clearTimeout(timer);
      const current = Date.now();
      setNow(current);
      if (document.visibilityState === "hidden") return;
      const boundaries = (query.data ?? []).flatMap(event => {
        const range = getEventTimeRange(event);
        return range ? [range.start, range.end].filter(time => time > current) : [];
      });
      // Switch at the actual event boundary, and periodically recover from clock changes.
      const delay = Math.min(30_000, ...boundaries.map(time => time - current));
      timer = window.setTimeout(tick, Math.max(1, delay));
    };
    tick();
    document.addEventListener("visibilitychange", tick);
    return () => { window.clearTimeout(timer); document.removeEventListener("visibilitychange", tick); };
  }, [query.data]);
  const events = useMemo(() => mergeLumaCalendarArchive(query.data ?? [], now), [query.data, now]);
  return { ...query, events, now };
}
