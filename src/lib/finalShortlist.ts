import { doc, setDoc, type Firestore } from "firebase/firestore";
import type { Submission } from "@/types/portal";

export type FinalShortlistUpdate = {
  final_shortlisted: boolean;
  final_shortlisted_at: string | null;
  updated_at: string;
};

export function isFinalShortlisted(
  submission: Pick<Submission, "final_shortlisted">,
): boolean {
  return submission.final_shortlisted === true;
}

export function getFinalShortlist<T extends Pick<Submission, "final_shortlisted">>(
  submissions: T[],
): T[] {
  return submissions.filter(isFinalShortlisted);
}

export function buildFinalShortlistUpdate(
  shortlisted: boolean,
  updatedAt = new Date().toISOString(),
): FinalShortlistUpdate {
  return {
    final_shortlisted: shortlisted,
    final_shortlisted_at: shortlisted ? updatedAt : null,
    updated_at: updatedAt,
  };
}

export async function setSubmissionFinalShortlist(
  db: Firestore,
  submissionId: string,
  shortlisted: boolean,
  updatedAt = new Date().toISOString(),
): Promise<FinalShortlistUpdate> {
  const update = buildFinalShortlistUpdate(shortlisted, updatedAt);
  await setDoc(doc(db, "submissions", submissionId), update, { merge: true });
  return update;
}
