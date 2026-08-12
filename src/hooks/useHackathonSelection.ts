import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  filterCurrentHackathons,
  isCurrentHackathon,
  isHackathonId,
  pickDefaultHackathonId,
  PORTAL_HACKATHONS,
  resolvePortalHackathon,
  type PortalHackathon,
  type HackathonId,
} from "@/lib/hackathons";

type UseHackathonSelectionOptions = {
  /** Keep `?hackathon=` in sync so each event is a bookmarkable workspace. */
  syncUrl?: boolean;
  /** Prefer live/upcoming editions when the stored pick is a past event. */
  preferCurrent?: boolean;
};

function readStoredHackathonId(storageKey: string): HackathonId | null {
  if (typeof window === "undefined") return null;
  try {
    const stored = window.localStorage.getItem(storageKey);
    return stored && isHackathonId(stored) ? stored : null;
  } catch {
    return null;
  }
}

function replaceHackathonSearchParam(
  searchParams: URLSearchParams,
  hackathonId: HackathonId,
): URLSearchParams {
  const next = new URLSearchParams(searchParams);
  next.set("hackathon", hackathonId);
  next.delete("event");
  return next;
}

function resolveInitialId(
  storageKey: string,
  hackathons: PortalHackathon[],
  preferCurrent: boolean,
  requestedFromUrl: HackathonId | null,
): HackathonId {
  if (requestedFromUrl) return requestedFromUrl;
  const stored = readStoredHackathonId(storageKey);
  if (stored) {
    if (!preferCurrent) return stored;
    const match = hackathons.find((entry) => entry.id === stored);
    // Keep stored id while the live catalog hydrates.
    if (!match || isCurrentHackathon(match)) return stored;
  }
  const pool = preferCurrent ? filterCurrentHackathons(hackathons) : hackathons;
  return pickDefaultHackathonId(pool);
}

/**
 * Event workspace selection.
 *
 * Click updates React state immediately and writes `?hackathon=`.
 * URL adoption (back/forward, deep links) runs only after the address bar
 * catches up — never reverts a click while setSearchParams is in flight.
 */
export function useHackathonSelection(
  storageKey: string,
  allowedHackathonIds?: HackathonId[],
  hackathons: PortalHackathon[] = PORTAL_HACKATHONS,
  options: UseHackathonSelectionOptions = {},
) {
  const { syncUrl = false, preferCurrent = false } = options;
  const [searchParams, setSearchParams] = useSearchParams();

  const urlHackathonId = useMemo(() => {
    if (!syncUrl) return null;
    const value = searchParams.get("hackathon") ?? searchParams.get("event");
    return value && isHackathonId(value) ? value : null;
  }, [searchParams, syncUrl]);

  const switcherHackathons = useMemo(
    () => (preferCurrent ? filterCurrentHackathons(hackathons) : hackathons),
    [hackathons, preferCurrent],
  );

  const [selectedHackathonId, setSelectedHackathonIdState] = useState<HackathonId>(() =>
    resolveInitialId(storageKey, hackathons, preferCurrent, urlHackathonId),
  );

  /** After a user click, ignore stale URL values until the query matches this id. */
  const pendingUrlWriteRef = useRef<HackathonId | null>(null);

  const commitSelection = (hackathonId: HackathonId, writeUrl: boolean) => {
    setSelectedHackathonIdState(hackathonId);
    if (!syncUrl || !writeUrl) return;
    if (urlHackathonId === hackathonId) {
      pendingUrlWriteRef.current = null;
      return;
    }
    pendingUrlWriteRef.current = hackathonId;
    setSearchParams(replaceHackathonSearchParam(searchParams, hackathonId), { replace: true });
  };

  const setSelectedHackathonId = (hackathonId: HackathonId) => {
    if (!isHackathonId(hackathonId)) return;
    commitSelection(hackathonId, true);
  };

  // Adopt URL for deep links / back-forward — but never while a click write is in flight.
  useEffect(() => {
    if (!syncUrl) return;

    if (pendingUrlWriteRef.current) {
      if (urlHackathonId === pendingUrlWriteRef.current) {
        pendingUrlWriteRef.current = null;
      }
      return;
    }

    if (!urlHackathonId) return;
    setSelectedHackathonIdState((current) =>
      current === urlHackathonId ? current : urlHackathonId,
    );
  }, [syncUrl, urlHackathonId]);

  // Judge / mentor allow-list.
  useEffect(() => {
    if (!allowedHackathonIds || allowedHackathonIds.length === 0) return;
    if (allowedHackathonIds.includes(selectedHackathonId)) return;
    commitSelection(allowedHackathonIds[0], true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allowedHackathonIds, selectedHackathonId, syncUrl, urlHackathonId, searchParams]);

  // Prefer live events only when the URL does not pin a workspace.
  useEffect(() => {
    if (!preferCurrent || urlHackathonId || pendingUrlWriteRef.current) return;
    const selected = hackathons.find((entry) => entry.id === selectedHackathonId);
    if (selected && isCurrentHackathon(selected)) return;
    if (!selected && selectedHackathonId) return;
    if (switcherHackathons.length === 0) return;
    const nextId = pickDefaultHackathonId(switcherHackathons);
    if (nextId === selectedHackathonId) return;
    commitSelection(nextId, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    hackathons,
    preferCurrent,
    urlHackathonId,
    selectedHackathonId,
    switcherHackathons,
    syncUrl,
    searchParams,
  ]);

  useEffect(() => {
    try {
      window.localStorage.setItem(storageKey, selectedHackathonId);
    } catch {
      // ignore quota / private mode
    }
  }, [selectedHackathonId, storageKey]);

  // Seed URL when absent. Never overwrite a different explicit pin.
  useEffect(() => {
    if (!syncUrl || urlHackathonId || pendingUrlWriteRef.current) return;
    if (preferCurrent) {
      const selected = hackathons.find((entry) => entry.id === selectedHackathonId);
      const canUpgrade =
        (!selected || !isCurrentHackathon(selected)) && switcherHackathons.length > 0;
      if (canUpgrade) return;
    }
    pendingUrlWriteRef.current = selectedHackathonId;
    setSearchParams(replaceHackathonSearchParam(searchParams, selectedHackathonId), {
      replace: true,
    });
  }, [
    hackathons,
    preferCurrent,
    urlHackathonId,
    selectedHackathonId,
    setSearchParams,
    switcherHackathons,
    syncUrl,
    searchParams,
  ]);

  return {
    selectedHackathonId,
    selectedHackathon: resolvePortalHackathon(selectedHackathonId, hackathons),
    setSelectedHackathonId,
  };
}
