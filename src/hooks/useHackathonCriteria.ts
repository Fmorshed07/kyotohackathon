import { useEffect, useState } from "react";
import { getFirestoreDb } from "@/lib/firebaseClient";
import { fetchHackathonCriteria } from "@/lib/hackathonCriteria";
import {
  DEFAULT_JUDGING_CRITERIA,
  type JudgingCriterion,
} from "@/components/dashboard/judgingCriteria";
import type { HackathonId } from "@/lib/hackathons";

export function useHackathonCriteria(hackathonId: HackathonId) {
  const [criteria, setCriteria] = useState<JudgingCriterion[]>(DEFAULT_JUDGING_CRITERIA);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const loadCriteria = async () => {
      setIsLoading(true);
      try {
        const db = getFirestoreDb();
        const loaded = await fetchHackathonCriteria(db, hackathonId);
        if (!cancelled) {
          setCriteria(loaded);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void loadCriteria();

    return () => {
      cancelled = true;
    };
  }, [hackathonId]);

  return { criteria, isLoading, setCriteria };
}
