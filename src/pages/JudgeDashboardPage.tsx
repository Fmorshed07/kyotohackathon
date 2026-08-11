import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Navigate } from "react-router-dom";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { getFirestoreDb } from "@/lib/firebaseClient";
import { usePortalAuth } from "@/hooks/usePortalAuth";
import { useHackathonCriteria } from "@/hooks/useHackathonCriteria";
import { useHackathonSelection } from "@/hooks/useHackathonSelection";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { JudgeDashboard } from "@/components/dashboard/JudgeDashboard";
import {
  fetchSubmissionsForHackathon,
  getHackathonsByIds,
  getUserAllowedHackathonIds,
  HACKATHON_STORAGE_KEYS,
  isHackathonId,
  type HackathonId,
} from "@/lib/hackathons";
import { canAccessStaffDashboard, isStaffRole } from "@/lib/portalRoutes";
import { buildJudgeStatistics } from "@/lib/judgingStatistics";
import {
  areAllCriteriaScored,
  buildJudgeScoreFirestoreUpdate,
  mapSubmissionForJudge,
  sanitizeCriteriaScores,
} from "@/lib/judgeSubmissionScores";
import {
  buildJudgeRankingDocId,
  buildTop3RankingFirestorePayload,
  createEmptyTop3Ranks,
  parseTop3RankingFromFirestore,
  validateTop3Ranks,
} from "@/lib/judgeTop3Rankings";
import type { JudgeTop3Ranks, Submission, Top3RankSlot } from "@/types/portal";
import {
  calculateTotalFromCriteria,
  clampCriterionScore,
  type JudgingCriterionId,
} from "@/components/dashboard/judgingCriteria";
import { sectionClass } from "@/components/dashboard/DashboardLayout";

export default function JudgeDashboardPage() {
  const { sessionUser, loading: authLoading, signOut } = usePortalAuth();
  const db = getFirestoreDb();

  const allowedHackathonIds = useMemo<HackathonId[]>(() => {
    if (!sessionUser) return [];
    return getUserAllowedHackathonIds({
      hackathonId: sessionUser.hackathonId && isHackathonId(sessionUser.hackathonId)
        ? sessionUser.hackathonId
        : undefined,
      hackathonIds: (sessionUser.hackathonIds ?? []).filter(isHackathonId),
    });
  }, [sessionUser]);

  const allowedHackathons = useMemo(
    () => getHackathonsByIds(allowedHackathonIds),
    [allowedHackathonIds]
  );

  const { selectedHackathonId, selectedHackathon, setSelectedHackathonId } = useHackathonSelection(
    HACKATHON_STORAGE_KEYS.judge,
    allowedHackathonIds
  );
  const canAccessSelectedHackathon = allowedHackathonIds.includes(selectedHackathonId);
  const { criteria: judgingCriteria, isLoading: isLoadingCriteria } =
    useHackathonCriteria(selectedHackathonId);

  const [judgeSubmissions, setJudgeSubmissions] = useState<Submission[]>([]);
  const [isLoadingSubmissions, setIsLoadingSubmissions] = useState(false);
  const [judgeMessage, setJudgeMessage] = useState<string | null>(null);
  const [savingSubmissionId, setSavingSubmissionId] = useState<string | null>(null);
  const [top3Ranks, setTop3Ranks] = useState<JudgeTop3Ranks>(createEmptyTop3Ranks);
  const [top3SavedAt, setTop3SavedAt] = useState<string | null>(null);
  const [isSavingTop3, setIsSavingTop3] = useState(false);
  const judgeSubmissionsRef = useRef(judgeSubmissions);

  useEffect(() => {
    judgeSubmissionsRef.current = judgeSubmissions;
  }, [judgeSubmissions]);

  const judgeId = sessionUser?.id ?? "";

  useEffect(() => {
    if (!sessionUser || (sessionUser.role !== "judge" && sessionUser.role !== "mentor")) return;
    if (!canAccessSelectedHackathon) {
      setJudgeSubmissions([]);
      setTop3Ranks(createEmptyTop3Ranks());
      setTop3SavedAt(null);
      setIsLoadingSubmissions(false);
      setJudgeMessage(
        allowedHackathonIds.length === 0
          ? "No events assigned yet. Ask an admin to grant you access to a hackathon."
          : "You do not have access to this event."
      );
      return;
    }

    const loadHackathonSubmissions = async () => {
      setIsLoadingSubmissions(true);
      setJudgeMessage(null);
      setTop3Ranks(createEmptyTop3Ranks());
      setTop3SavedAt(null);
      try {
        const submissions = await fetchSubmissionsForHackathon(db, selectedHackathonId);
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

        try {
          const rankingRef = doc(
            db,
            "judge_rankings",
            buildJudgeRankingDocId(sessionUser.id, selectedHackathonId)
          );
          const rankingSnap = await getDoc(rankingRef);
          const ranking = parseTop3RankingFromFirestore(
            rankingSnap.exists() ? (rankingSnap.data() as Record<string, unknown>) : undefined,
            sessionUser.id,
            selectedHackathonId
          );
          setTop3Ranks(ranking.ranks);
          setTop3SavedAt(ranking.updated_at);
        } catch (rankingError: unknown) {
          const rankingMessage =
            typeof rankingError === "object" && rankingError && "message" in rankingError
              ? String((rankingError as { message?: string }).message)
              : "Failed to load your top 3 ranking.";
          setJudgeMessage(rankingMessage);
        }
      } catch (error: unknown) {
        const message =
          typeof error === "object" && error && "message" in error
            ? String((error as { message?: string }).message)
            : "Failed to load submissions.";
        setJudgeMessage(message);
      } finally {
        setIsLoadingSubmissions(false);
      }
    };

    if (!isLoadingCriteria) {
      void loadHackathonSubmissions();
    }
  }, [
    sessionUser,
    db,
    judgingCriteria,
    isLoadingCriteria,
    selectedHackathonId,
    canAccessSelectedHackathon,
    allowedHackathonIds.length,
  ]);

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
    if (!sessionUser || !canAccessSelectedHackathon) return;
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
    if (!sessionUser || !canAccessSelectedHackathon) return;
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

  const handleJudgeSave = useCallback(
    async (submissionId: string) => {
      if (!sessionUser || !canAccessSelectedHackathon) return;

      const submission = judgeSubmissionsRef.current.find((item) => item.id === submissionId);
      if (!submission) {
        setJudgeMessage("Could not find this submission. Please refresh and try again.");
        return;
      }

      const criteriaScores = submission.judge_criteria_scores ?? {};
      const cleanedCriteriaScores = sanitizeCriteriaScores(criteriaScores);

      if (!areAllCriteriaScored(criteriaScores, judgingCriteria)) {
        setJudgeMessage("Score every criterion before saving.");
        return;
      }

      const score = calculateTotalFromCriteria(cleanedCriteriaScores, judgingCriteria);
      const notes = submission.judge_notes ?? "";

      setJudgeMessage(null);
      setSavingSubmissionId(submissionId);
      try {
        const submissionRef = doc(db, "submissions", submission.id);

        await updateDoc(
          submissionRef,
          buildJudgeScoreFirestoreUpdate(sessionUser.id, score, notes, cleanedCriteriaScores)
        );

        const savedSnap = await getDoc(submissionRef);
        if (savedSnap.exists()) {
          const remapped = mapSubmissionForJudge(
            { id: savedSnap.id, ...(savedSnap.data() as Omit<Submission, "id">) },
            sessionUser.id,
            judgingCriteria
          );
          setJudgeSubmissions((current) =>
            current.map((item) => (item.id === submissionId ? remapped : item))
          );
        } else {
          setJudgeSubmissions((current) =>
            current.map((item) =>
              item.id === submission.id
                ? {
                    ...item,
                    judge_score: score,
                    judge_notes: notes,
                    judge_scores: {
                      ...(item.judge_scores ?? {}),
                      [sessionUser.id]: score,
                    },
                    judge_notes_by_judge: {
                      ...(item.judge_notes_by_judge ?? {}),
                      [sessionUser.id]: notes,
                    },
                    judge_criteria_scores: cleanedCriteriaScores,
                    judge_criteria_scores_by_judge: {
                      ...(item.judge_criteria_scores_by_judge ?? {}),
                      [sessionUser.id]: cleanedCriteriaScores,
                    },
                  }
                : item
            )
          );
        }

        setJudgeMessage("Scores saved.");
      } catch (error: unknown) {
        const message =
          typeof error === "object" && error && "message" in error
            ? String((error as { message?: string }).message)
            : "An error occurred while saving scores.";
        setJudgeMessage(message);
      } finally {
        setSavingSubmissionId(null);
      }
    },
    [sessionUser, db, judgingCriteria, canAccessSelectedHackathon]
  );

  const handleTop3RankChange = (slot: Top3RankSlot, submissionId: string | null) => {
    if (!canAccessSelectedHackathon) return;
    setTop3Ranks((current) => ({
      ...current,
      [slot]: submissionId,
    }));
  };

  const handleSaveTop3Ranking = useCallback(async () => {
    if (!sessionUser || !canAccessSelectedHackathon) return;

    const submissionIds = judgeSubmissionsRef.current.map((submission) => submission.id);
    const validationError = validateTop3Ranks(top3Ranks, submissionIds);
    if (validationError) {
      setJudgeMessage(validationError);
      return;
    }

    setJudgeMessage(null);
    setIsSavingTop3(true);
    try {
      const rankingRef = doc(
        db,
        "judge_rankings",
        buildJudgeRankingDocId(sessionUser.id, selectedHackathonId)
      );
      const payload = buildTop3RankingFirestorePayload(
        sessionUser.id,
        selectedHackathonId,
        top3Ranks
      );

      await setDoc(rankingRef, payload, { merge: true });
      setTop3SavedAt(payload.updated_at);
      setJudgeMessage("Top 3 ranking saved.");
    } catch (error: unknown) {
      const message =
        typeof error === "object" && error && "message" in error
          ? String((error as { message?: string }).message)
          : "An error occurred while saving your top 3 ranking.";
      setJudgeMessage(message);
    } finally {
      setIsSavingTop3(false);
    }
  }, [sessionUser, db, top3Ranks, selectedHackathonId, canAccessSelectedHackathon]);

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

  if (!canAccessStaffDashboard(sessionUser.role, sessionUser.judgeApprovalStatus)) {
    if (sessionUser.role === "participant") {
      return <Navigate to="/dashboard/participant" replace />;
    }
    if (isStaffRole(sessionUser.role) && sessionUser.judgeApprovalStatus === "pending") {
      return <Navigate to="/dashboard" replace />;
    }
    return <Navigate to="/dashboard" replace />;
  }

  const layoutRole = sessionUser.role === "mentor" ? "mentor" : "judge";

  return (
    <DashboardLayout
      sessionUser={sessionUser}
      role={layoutRole}
      onSignOut={signOut}
      hackathons={allowedHackathons}
      selectedHackathonId={
        allowedHackathons.length > 0 && canAccessSelectedHackathon
          ? selectedHackathonId
          : allowedHackathons[0]?.id
      }
      onHackathonChange={
        allowedHackathons.length > 0 ? setSelectedHackathonId : undefined
      }
    >
      {allowedHackathons.length === 0 ? (
        <section className={sectionClass}>
          <p className="dash-eyebrow">Event access</p>
          <h2 className="dash-title">No events assigned</h2>
          <p className="dash-subtitle mt-2">
            Your account is approved, but an admin has not granted access to any hackathon yet.
            Ask an admin to assign you to an event.
          </p>
        </section>
      ) : (
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
          savingSubmissionId={savingSubmissionId}
          top3Ranks={top3Ranks}
          top3SavedAt={top3SavedAt}
          isSavingTop3={isSavingTop3}
          onTop3RankChange={handleTop3RankChange}
          onSaveTop3Ranking={handleSaveTop3Ranking}
        />
      )}
    </DashboardLayout>
  );
}
