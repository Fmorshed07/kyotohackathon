import { useEffect, useState } from "react";
import {
  DEFAULT_HACKATHON_ID,
  getHackathonById,
  isHackathonId,
  type HackathonId,
} from "@/lib/hackathons";

export function useHackathonSelection(storageKey: string) {
  const [selectedHackathonId, setSelectedHackathonId] = useState<HackathonId>(() => {
    if (typeof window === "undefined") return DEFAULT_HACKATHON_ID;
    const stored = window.localStorage.getItem(storageKey);
    if (stored && isHackathonId(stored)) return stored;
    return DEFAULT_HACKATHON_ID;
  });

  useEffect(() => {
    window.localStorage.setItem(storageKey, selectedHackathonId);
  }, [selectedHackathonId, storageKey]);

  return {
    selectedHackathonId,
    selectedHackathon: getHackathonById(selectedHackathonId),
    setSelectedHackathonId,
  };
}
