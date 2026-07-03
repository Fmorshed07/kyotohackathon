import { useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import { doc, setDoc } from "firebase/firestore";
import { getFirestoreDb } from "@/lib/firebaseClient";
import { usePortalAuth } from "@/hooks/usePortalAuth";
import { useHackathonCriteria } from "@/hooks/useHackathonCriteria";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { JudgeDashboard } from "@/components/dashboard/JudgeDashboard";
import { fetchSubmissionsForHackathon, getHackathonById, SITE_HACKATHON_ID } from "@/lib/hackathons";
import { buildJudgeStatistics } from "@/lib/judgingStatistics";
import {
  buildJudgeScoreFirestoreUpdate,
  mapSubmissionForJudge,
} from "@/lib/judgeSubmissionScores";
import type { Submission } from "@/types/portal";
import {
  calculateTotalFromCriteria,
  clampCriterionScore,
  type JudgingCriterionId,
} from "@/components/dashboard/judgingCriteria";

export default function JudgeDashboardPage() {
  const { sessionUser, loading: authLoading, signOut } = usePortalAuth();
  const db = getFirestoreDb();
  const selectedHackathon = getHackathonById(SITE_HACKATHON_ID);
  const { criteria: judgingCriteria, isLoading: isLoadingCriteria } =
    useHackathonCriteria(SITE_HACKATHON_ID);

  const [judgeSubmissions, setJudgeSubmissions] = useState<Submission[]>([]);
  const [isLoadingSubmissions, setIsLoadingSubmissions] = useState(false);
  const [judgeMessage, setJudgeMessage] = useState<string | null>(null);

  const judgeId = sessionUser?.id ?? "";

  useEffect(() => {
    if (!sessionUser || (sessionUser.role !== "judge" && sessionUser.role !== "mentor")) return;

    const loadKyotoSubmissions = async () => {
      setIsLoadingSubmissions(true);
      try {
        const submissions = await fetchSubmissionsForHackathon(db, SITE_HACKATHON_ID);
        const mappedSubmissions: Submission[] = submissions.map((data) =>
          mapSubmissionForJudge(
            {
              id: data.id,
              ...data,
            },
            sessionUser.id,
            judgingCriteria
          )
        );
        setJudgeSubmissions(mappedSubmissions);
      } finally {
        setIsLoadingSubmissions(false);
      }
    };

    if (!isLoadingCriteria) {
      void loadKyotoSubmissions();
    }
  }, [sessionUser, db, judgingCriteria, isLoadingCriteria]);

  const filteredJudgeSubmissions = judgeSubmissions;

  const judgeStatistics = useMemo(
    () =>
      judgeId ? buildJudgeStatistics(filteredJudgeSubmissions, judgeId, judgingCriteria) : null,
    [filteredJudgeSubmissions, judgeId, judgingCriteria]
  );

  const judgeSummary = useMemo(() => {
    if (!judgeStatistics) {
      return { total: 0, scored: 0, averageScore: null as number | null };
    }
    return {
      total: judgeStatistics.totalSubmissions,
      scored: judgeStatistics.scoredSubmissions,
      averageScore: judgeStatistics.averageScore,
    };
  }, [judgeStatistics]);

  const handleJudgeNotesChange = (id: string, value: string) => {
    if (!sessionUser) return;
    setJudgeSubmissions((current) =>
      current.map((submission) => {
        if (submission.id !== id) return submission;
        return {
          ...submission,
          judge_notes: value,
          judge_notes_by_judge: {
            ...(submission.judge_notes_by_judge ?? {}),
            [sessionUser.id]: value,
          },
        };
      })
    );
  };

  const handleCriterionScoreChange = (
    id: string,
    criterionId: JudgingCriterionId,
    value: number | null
  ) => {
    if (!sessionUser) return;
    setJudgeSubmissions((current) =>
      current.map((submission) => {
        if (submission.id !== id) return submission;

        const currentCriteria = { ...(submission.judge_criteria_scores ?? {}) };
        if (value === null) {
          currentCriteria[criterionId] = null;
        } else {
          const criterionMax =
            judgingCriteria.find((criterion) => criterion.id === criterionId)?.weight ?? 20;
          currentCriteria[criterionId] = clampCriterionScore(value, criterionMax);
        }
        const totalScore = calculateTotalFromCriteria(currentCriteria, judgingCriteria);

        return {
          ...submission,
          judge_criteria_scores: currentCriteria,
          judge_score: totalScore,
          judge_scores: {
            ...(submission.judge_scores ?? {}),
            [sessionUser.id]: totalScore,
          },
          judge_criteria_scores_by_judge: {
            ...(submission.judge_criteria_scores_by_judge ?? {}),
            [sessionUser.id]: currentCriteria,
          },
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
          ? calculateTotalFromCriteria(criteriaScores, judgingCriteria)
          : typeof submission.judge_score === "number"
            ? submission.judge_score
            : null;
      const notes = submission.judge_notes ?? "";

      await setDoc(
        submissionRef,
        buildJudgeScoreFirestoreUpdate(sessionUser.id, score, notes, criteriaScores),
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

  if (sessionUser.role === "judge" || sessionUser.role === "mentor") {
    if (sessionUser.judgeApprovalStatus === "pending") {
      return <Navigate to="/dashboard" replace />;
    }
  } else if (sessionUser.role === "participant") {
    return <Navigate to="/dashboard/participant" replace />;
  } else {
    return <Navigate to="/dashboard" replace />;
  }

  const layoutRole = sessionUser.role === "mentor" ? "mentor" : "judge";

  return (
    <DashboardLayout
      sessionUser={sessionUser}
      role={layoutRole}
      onSignOut={signOut}
    >
      <JudgeDashboard
        selectedHackathon={selectedHackathon}
        judgingCriteria={judgingCriteria}
        submissions={filteredJudgeSubmissions}
        isLoadingSubmissions={isLoadingSubmissions || isLoadingCriteria}
        judgeMessage={judgeMessage}
        summary={judgeSummary}
        statistics={judgeStatistics}
        onCriterionScoreChange={handleCriterionScoreChange}
        onNotesChange={handleJudgeNotesChange}
        onSave={handleJudgeSave}
      />
    </DashboardLayout>
  );
}
