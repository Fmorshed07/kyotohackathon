import { doc, getDoc, setDoc, type Firestore } from "firebase/firestore";
import {
  DEFAULT_JUDGING_CRITERIA,
  normalizeJudgingCriteria,
  type JudgingCriterion,
} from "@/components/dashboard/judgingCriteria";
import type { HackathonId } from "@/lib/hackathons";
import { IMPACT_OSAKA_ID, IMPACT_OSAKA_DEFAULT_CRITERIA } from "@/lib/impactOsaka";

const HACKATHON_CRITERIA_COLLECTION = "hackathon_criteria";

export type HackathonCriteriaDocument = {
  criteria: JudgingCriterion[];
  updated_at: string;
};

export async function fetchHackathonCriteria(
  db: Firestore,
  hackathonId: HackathonId
): Promise<JudgingCriterion[]> {
  const fallback = hackathonId === IMPACT_OSAKA_ID
    ? IMPACT_OSAKA_DEFAULT_CRITERIA : DEFAULT_JUDGING_CRITERIA;
  try {
    const snapshot = await getDoc(doc(db, HACKATHON_CRITERIA_COLLECTION, hackathonId));
    if (!snapshot.exists()) {
      return fallback;
    }

    const data = snapshot.data();
    const normalized = normalizeJudgingCriteria(data.criteria);
    return normalized ?? fallback;
  } catch {
    return fallback;
  }
}

export async function saveHackathonCriteria(
  db: Firestore,
  hackathonId: HackathonId,
  criteria: JudgingCriterion[]
): Promise<void> {
  const payload: HackathonCriteriaDocument = {
    criteria,
    updated_at: new Date().toISOString(),
  };
  await setDoc(doc(db, HACKATHON_CRITERIA_COLLECTION, hackathonId), payload);
}
