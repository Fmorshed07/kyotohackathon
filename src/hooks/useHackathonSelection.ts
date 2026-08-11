import { useEffect, useState } from "react";
import {
  DEFAULT_HACKATHON_ID,
  getHackathonById,
  isHackathonId,
  PORTAL_HACKATHONS,
  type PortalHackathon,
  type HackathonId,
} from "@/lib/hackathons";

export function useHackathonSelection(
  storageKey: string,
  allowedHackathonIds?: HackathonId[],
  hackathons: PortalHackathon[] = PORTAL_HACKATHONS,
) {
  const [selectedHackathonId, setSelectedHackathonId] = useState<HackathonId>(() => {
    if (typeof window === "undefined") return DEFAULT_HACKATHON_ID;
    const stored = window.localStorage.getItem(storageKey);
    if (stored && isHackathonId(stored)) return stored;
    return DEFAULT_HACKATHON_ID;
  });

  useEffect(() => {
    if (!allowedHackathonIds || allowedHackathonIds.length === 0) return;
    if (!allowedHackathonIds.includes(selectedHackathonId)) {
      setSelectedHackathonId(allowedHackathonIds[0]);
    }
  }, [allowedHackathonIds, selectedHackathonId]);

  useEffect(() => {
    window.localStorage.setItem(storageKey, selectedHackathonId);
  }, [selectedHackathonId, storageKey]);

  return {
    selectedHackathonId,
    selectedHackathon:
      hackathons.find((hackathon) => hackathon.id === selectedHackathonId) ??
      getHackathonById(selectedHackathonId),
    setSelectedHackathonId,
  };
}
