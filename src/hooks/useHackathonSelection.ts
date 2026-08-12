import { useEffect, useMemo, useState } from "react";
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

export function useHackathonSelection(
  storageKey: string,
  allowedHackathonIds?: HackathonId[],
  hackathons: PortalHackathon[] = PORTAL_HACKATHONS,
  options: UseHackathonSelectionOptions = {},
) {
  const { syncUrl = false, preferCurrent = false } = options;
  const [searchParams, setSearchParams] = useSearchParams();

  const requestedFromUrl = (() => {
    if (!syncUrl) return null;
    const value = searchParams.get("hackathon") ?? searchParams.get("event");
    return value && isHackathonId(value) ? value : null;
  })();

  const switcherHackathons = useMemo(
    () => (preferCurrent ? filterCurrentHackathons(hackathons) : hackathons),
    [hackathons, preferCurrent],
  );

  const [selectedHackathonId, setSelectedHackathonIdState] = useState<HackathonId>(() => {
    if (requestedFromUrl) return requestedFromUrl;
    const stored = readStoredHackathonId(storageKey);
    if (stored) {
      if (!preferCurrent) return stored;
      const match = hackathons.find((entry) => entry.id === stored);
      if (match && isCurrentHackathon(match)) return stored;
    }
    return pickDefaultHackathonId(preferCurrent ? switcherHackathons : hackathons);
  });

  const setSelectedHackathonId = (hackathonId: HackathonId) => {
    if (!isHackathonId(hackathonId)) return;
    setSelectedHackathonIdState(hackathonId);
  };

  // URL wins when present (separate platform route per event).
  useEffect(() => {
    if (!syncUrl || !requestedFromUrl) return;
    if (requestedFromUrl !== selectedHackathonId) {
      setSelectedHackathonIdState(requestedFromUrl);
    }
  }, [requestedFromUrl, selectedHackathonId, syncUrl]);

  // Only clamp when an explicit allow-list is provided (judge / mentor scopes).
  useEffect(() => {
    if (!allowedHackathonIds || allowedHackathonIds.length === 0) return;
    if (!allowedHackathonIds.includes(selectedHackathonId)) {
      setSelectedHackathonIdState(allowedHackathonIds[0]);
    }
  }, [allowedHackathonIds, selectedHackathonId]);

  // After the live catalog loads, leave past editions for the latest active/upcoming event
  // unless the URL explicitly pins a past workspace.
  useEffect(() => {
    if (!preferCurrent || requestedFromUrl) return;
    const selected = hackathons.find((entry) => entry.id === selectedHackathonId);
    if (selected && isCurrentHackathon(selected)) return;
    if (switcherHackathons.length === 0) return;
    const nextId = pickDefaultHackathonId(switcherHackathons);
    if (nextId !== selectedHackathonId) {
      setSelectedHackathonIdState(nextId);
    }
  }, [hackathons, preferCurrent, requestedFromUrl, selectedHackathonId, switcherHackathons]);

  useEffect(() => {
    try {
      window.localStorage.setItem(storageKey, selectedHackathonId);
    } catch {
      // ignore quota / private mode
    }
  }, [selectedHackathonId, storageKey]);

  useEffect(() => {
    if (!syncUrl) return;
    const current = searchParams.get("hackathon") ?? searchParams.get("event");
    if (current === selectedHackathonId) return;
    const next = new URLSearchParams(searchParams);
    next.set("hackathon", selectedHackathonId);
    next.delete("event");
    setSearchParams(next, { replace: true });
  }, [searchParams, selectedHackathonId, setSearchParams, syncUrl]);

  return {
    selectedHackathonId,
    selectedHackathon: resolvePortalHackathon(selectedHackathonId, hackathons),
    setSelectedHackathonId,
  };
}
