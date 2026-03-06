import { useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import { collection, doc, getDocs, setDoc } from "firebase/firestore";
import { getFirestoreDb } from "@/lib/firebaseClient";
import { usePortalAuth } from "@/hooks/usePortalAuth";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { JudgeDashboard } from "@/components/dashboard/JudgeDashboard";
import type { Submission } from "@/types/portal";
import {
  JUDGING_CRITERIA,
  calculateTotalFromCriteria,
  clampCriterionScore,
  type JudgingCriterionId,
} from "@/components/dashboard/judgingCriteria";

export default function JudgeDashboardPage() {
  const { sessionUser, loading: authLoading, signOut } = usePortalAuth();
  const db = getFirestoreDb();

  const [judgeSubmissions, setJudgeSubmissions] = useState<Submission[]>([]);
  const [isLoadingSubmissions, setIsLoadingSubmissions] = useState(false);
  const [judgeMessage, setJudgeMessage] = useState<string | null>(null);

  const getCurrentJudgeCriteriaScores = (submission: Submission) => {
    if (!sessionUser) return submission.judge_criteria_scores ?? null;
    const criteriaFromMap = submission.judge_criteria_scores_by_judge?.[sessionUser.id];
    if (criteriaFromMap && typeof criteriaFromMap === "object") {
      return criteriaFromMap;
    }
    return submission.judge_criteria_scores ?? null;
  };

  const getCurrentJudgeScore = (submission: Submission) => {
    const criteriaScores = getCurrentJudgeCriteriaScores(submission);
    if (criteriaScores) {
      return calculateTotalFromCriteria(criteriaScores);
    }
    if (!sessionUser) return submission.judge_score ?? null;
    const scoreFromMap = submission.judge_scores?.[sessionUser.id];
    if (typeof scoreFromMap === "number") {
      return scoreFromMap;
    }
    return submission.judge_score ?? null;
  };

  useEffect(() => {
    if (!sessionUser || sessionUser.role !== "judge") return;

    const loadAllSubmissions = async () => {
      setIsLoadingSubmissions(true);
      try {
        const submissionsRef = collection(db, "submissions");
        const snapshot = await getDocs(submissionsRef);
        const submissions: Submission[] = snapshot.docs.map((docSnap) => {
          const data = docSnap.data() as Omit<Submission, "id">;
          const judgeScore = sessionUser ? data.judge_scores?.[sessionUser.id] : undefined;
          const judgeNotes = sessionUser ? data.judge_notes_by_judge?.[sessionUser.id] : undefined;
          const judgeCriteriaScores = sessionUser
            ? data.judge_criteria_scores_by_judge?.[sessionUser.id]
            : undefined;
          const criteriaScores = judgeCriteriaScores ?? data.judge_criteria_scores ?? null;
          return {
            id: docSnap.id,
            ...data,
            judge_score:
              criteriaScores && typeof criteriaScores === "object"
                ? calculateTotalFromCriteria(criteriaScores)
                : typeof judgeScore === "number"
                  ? judgeScore
                  : data.judge_score,
            judge_notes: typeof judgeNotes === "string" ? judgeNotes : data.judge_notes,
            judge_criteria_scores: criteriaScores,
          };
        });
        setJudgeSubmissions(submissions);
      } finally {
        setIsLoadingSubmissions(false);
      }
    };

    void loadAllSubmissions();
  }, [sessionUser, db]);

  const judgeSummary = useMemo(() => {
    if (!judgeSubmissions.length) {
      return { total: 0, scored: 0, averageScore: null as number | null };
    }
    const scoredSubmissions = judgeSubmissions.filter((s) => getCurrentJudgeScore(s) !== null);
    const scoredCount = scoredSubmissions.length;
    const averageScore =
      scoredCount === 0
        ? null
        : scoredSubmissions.reduce((sum, s) => sum + (getCurrentJudgeScore(s) ?? 0), 0) / scoredCount;
    return {
      total: judgeSubmissions.length,
      scored: scoredCount,
      averageScore,
    };
  }, [judgeSubmissions, sessionUser]);

  const handleJudgeNotesChange = (id: string, value: string) => {
    setJudgeSubmissions((current) =>
      current.map((s) =>
        s.id === id
          ? {
              ...s,
              judge_notes: value,
            }
          : s
      )
    );
  };

  const handleCriterionScoreChange = (
    id: string,
    criterionId: JudgingCriterionId,
    value: number | null
  ) => {
    setJudgeSubmissions((current) =>
      current.map((submission) => {
        if (submission.id !== id) return submission;

        const currentCriteria = { ...(submission.judge_criteria_scores ?? {}) };
        if (value === null) {
          currentCriteria[criterionId] = null;
        } else {
          const criterionMax =
            JUDGING_CRITERIA.find((criterion) => criterion.id === criterionId)?.weight ?? 20;
          currentCriteria[criterionId] = clampCriterionScore(value, criterionMax);
        }
        const totalScore = calculateTotalFromCriteria(currentCriteria);

        return {
          ...submission,
          judge_criteria_scores: currentCriteria,
          judge_score: totalScore,
        };
      })
    );
  };

  const handleJudgeSave = async (submission: Submission) => {
    if (!sessionUser) return;
    setJudgeMessage(null);
    try {
      const submissionRef = doc(db, "submissions", submission.id);
      const criteriaScores = submission.judge_criteria_scores ?? {};
      const score =
        Object.keys(criteriaScores).length > 0
          ? calculateTotalFromCriteria(criteriaScores)
          : typeof submission.judge_score === "number"
            ? submission.judge_score
            : null;
      const notes = submission.judge_notes ?? "";
      await setDoc(
        submissionRef,
        {
          judge_score: score,
          judge_notes: notes,
          judge_id: sessionUser.id,
          judge_criteria_scores: criteriaScores,
          judge_scores: {
            [sessionUser.id]: score,
          },
          judge_notes_by_judge: {
            [sessionUser.id]: notes,
          },
          judge_criteria_scores_by_judge: {
            [sessionUser.id]: criteriaScores,
          },
        },
        { merge: true }
      );
      setJudgeSubmissions((current) =>
        current.map((item) =>
          item.id === submission.id
            ? {
                ...item,
                judge_scores: {
                  ...(item.judge_scores ?? {}),
                  [sessionUser.id]: score,
                },
                judge_notes_by_judge: {
                  ...(item.judge_notes_by_judge ?? {}),
                  [sessionUser.id]: notes,
                },
                judge_criteria_scores_by_judge: {
                  ...(item.judge_criteria_scores_by_judge ?? {}),
                  [sessionUser.id]: criteriaScores,
                },
              }
            : item
        )
      );
      setJudgeMessage("Scores saved.");
    } catch (error: unknown) {
      const message =
        typeof error === "object" && error && "message" in error
          ? String((error as { message?: string }).message)
          : "An error occurred while saving scores.";
      setJudgeMessage(message);
    }
  };

  if (authLoading) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!sessionUser) {
    return <Navigate to="/signin" replace />;
  }

  if (sessionUser.role === "judge" && sessionUser.judgeApprovalStatus === "pending") {
    return <Navigate to="/dashboard" replace />;
  }

  if (sessionUser.role === "participant") {
    return <Navigate to="/dashboard/participant" replace />;
  }

  if (sessionUser.role !== "judge") {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <DashboardLayout sessionUser={sessionUser} role="judge" onSignOut={signOut}>
      <JudgeDashboard
        submissions={judgeSubmissions}
        isLoadingSubmissions={isLoadingSubmissions}
        judgeMessage={judgeMessage}
        summary={judgeSummary}
        onCriterionScoreChange={handleCriterionScoreChange}
        onNotesChange={handleJudgeNotesChange}
        onSave={handleJudgeSave}
      />
    </DashboardLayout>
  );
}
