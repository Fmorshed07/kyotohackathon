import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, Navigate, useLocation } from "react-router-dom";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { getFirestoreDb } from "@/lib/firebaseClient";
import { useFormDraftPersistence } from "@/hooks/useFormDraftPersistence";
import { usePortalAuth } from "@/hooks/usePortalAuth";
import { useHackathonCriteria } from "@/hooks/useHackathonCriteria";
import { useHackathonSelection } from "@/hooks/useHackathonSelection";
import { useUnsavedChangesGuard } from "@/hooks/useUnsavedChangesGuard";
import { formDraftStorageKey } from "@/lib/formDrafts";
import { subscribeToEventParticipants, type EventParticipant } from "@/lib/eventParticipants";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { JudgeDashboard } from "@/components/dashboard/JudgeDashboard";
import { JudgeFinalShortlistPanel } from "@/components/dashboard/JudgeFinalShortlistPanel";
import {
  clearJudgeWorkspaceBootstrap,
  readJudgeWorkspaceBootstrap,
} from "@/lib/inviteTokens";
import {
  fetchSubmissionsForHackathon,
  getHackathonsByIds,
  getUserAllowedHackathonIds,
  HACKATHON_STORAGE_KEYS,
  isHackathonId,
  PORTAL_HACKATHONS,
  withHackathonQuery,
  type HackathonId,
  type PortalHackathon,
} from "@/lib/hackathons";
import { fetchPortalHackathonCatalog } from "@/lib/aiHackathons";
import { canAccessStaffDashboard, isStaffRole } from "@/lib/portalRoutes";
import { buildJudgeStatistics } from "@/lib/judgingStatistics";
import {
  areAllCriteriaScored,
  buildFinalJudgeScoreFirestoreUpdate,
  buildJudgeScoreFirestoreUpdate,
  getFinalJudgeCriteriaScoresForJudge,
  getFinalJudgeNotesForJudge,
  getFinalJudgeTotalScoreForJudge,
  mapSubmissionForFinalJudge,
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
  type CriteriaScores,
  type JudgingCriterion,
  type JudgingCriterionId,
} from "@/components/dashboard/judgingCriteria";
import { sectionClass } from "@/components/dashboard/DashboardLayout";

type JudgeWorkspaceDraft = {
  scoresBySubmission: Record<
    string,
    {
      notes: string;
      criteria: CriteriaScores;
    }
  >;
  finalScoresBySubmission: Record<
    string,
    {
      notes: string;
      criteria: CriteriaScores;
    }
  >;
  top3Ranks: JudgeTop3Ranks;
};

function buildJudgeWorkspaceDraft(
  submissions: Submission[],
  top3Ranks: JudgeTop3Ranks,
  judgeId: string
): JudgeWorkspaceDraft {
  const scoresBySubmission: JudgeWorkspaceDraft["scoresBySubmission"] = {};
  const finalScoresBySubmission: JudgeWorkspaceDraft["finalScoresBySubmission"] = {};
  for (const submission of submissions) {
    scoresBySubmission[submission.id] = {
      notes: submission.judge_notes ?? "",
      criteria: submission.judge_criteria_scores ?? null,
    };
    finalScoresBySubmission[submission.id] = {
      notes: getFinalJudgeNotesForJudge(submission, judgeId),
      criteria: getFinalJudgeCriteriaScoresForJudge(submission, judgeId),
    };
  }
  return { scoresBySubmission, finalScoresBySubmission, top3Ranks };
}

function applyJudgeWorkspaceDraft(
  submissions: Submission[],
  draft: JudgeWorkspaceDraft,
  judgeId: string,
  criteria: JudgingCriterion[]
): Submission[] {
  return submissions.map((submission) => {
    const entry = draft.scoresBySubmission[submission.id];
    const finalEntry = draft.finalScoresBySubmission?.[submission.id];
    if (!entry && !finalEntry) return submission;
    const totalScore = entry
      ? Object.keys(entry.criteria ?? {}).length > 0 ? calculateTotalFromCriteria(entry.criteria, criteria) : null
      : submission.judge_score;
    const finalScore = finalEntry
      ? Object.keys(finalEntry.criteria ?? {}).length > 0
        ? calculateTotalFromCriteria(finalEntry.criteria, criteria)
        : null
      : getFinalJudgeTotalScoreForJudge(submission, judgeId, criteria);
    return {
      ...submission,
      judge_notes: entry?.notes ?? submission.judge_notes,
      judge_criteria_scores: entry ? entry.criteria : submission.judge_criteria_scores,
      judge_score: totalScore,
      judge_notes_by_judge: {
        ...(submission.judge_notes_by_judge ?? {}),
        ...(entry ? { [judgeId]: entry.notes } : {}),
      },
      judge_criteria_scores_by_judge: {
        ...(submission.judge_criteria_scores_by_judge ?? {}),
        ...(entry ? { [judgeId]: entry.criteria } : {}),
      },
      judge_scores: {
        ...(submission.judge_scores ?? {}),
        ...(entry ? { [judgeId]: totalScore } : {}),
      },
      final_judge_notes_by_judge: {
        ...(submission.final_judge_notes_by_judge ?? {}),
        ...(finalEntry ? { [judgeId]: finalEntry.notes } : {}),
      },
      final_judge_criteria_scores_by_judge: {
        ...(submission.final_judge_criteria_scores_by_judge ?? {}),
        ...(finalEntry ? { [judgeId]: finalEntry.criteria } : {}),
      },
      final_judge_scores: {
        ...(submission.final_judge_scores ?? {}),
        ...(finalEntry ? { [judgeId]: finalScore } : {}),
      },
    };
  });
}

export default function JudgeDashboardPage() {
  const { sessionUser, loading: authLoading, signOut } = usePortalAuth();
  const db = getFirestoreDb();
  const location = useLocation();
  const isFinalShortlistPage = location.pathname === "/dashboard/judge/final-shortlist";

  const allowedHackathonIds = useMemo<HackathonId[]>(() => {
    if (!sessionUser) return [];
    const fromSession = getUserAllowedHackathonIds({
      hackathonId: sessionUser.hackathonId && isHackathonId(sessionUser.hackathonId)
        ? sessionUser.hackathonId
        : undefined,
      hackathonIds: (sessionUser.hackathonIds ?? []).filter(isHackathonId),
    });
    const bootstrap = readJudgeWorkspaceBootstrap();
    if (bootstrap && !fromSession.includes(bootstrap)) {
      return [bootstrap, ...fromSession];
    }
    return fromSession;
  }, [sessionUser]);

  useEffect(() => {
    if (!sessionUser) return;
    const bootstrap = readJudgeWorkspaceBootstrap();
    if (!bootstrap) return;
    const fromSession = getUserAllowedHackathonIds({
      hackathonId: sessionUser.hackathonId && isHackathonId(sessionUser.hackathonId)
        ? sessionUser.hackathonId
        : undefined,
      hackathonIds: (sessionUser.hackathonIds ?? []).filter(isHackathonId),
    });
    if (fromSession.includes(bootstrap)) {
      clearJudgeWorkspaceBootstrap();
    }
  }, [sessionUser]);

  const [eventCatalog, setEventCatalog] = useState<PortalHackathon[]>(PORTAL_HACKATHONS);

  useEffect(() => {
    void fetchPortalHackathonCatalog(db)
      .then(setEventCatalog)
      .catch((error: unknown) => {
        console.warn("[judge] Could not load live event catalog.", error);
      });
  }, [db]);

  const allowedHackathons = useMemo(
    () => getHackathonsByIds(allowedHackathonIds, eventCatalog),
    [allowedHackathonIds, eventCatalog]
  );

  const { selectedHackathonId, selectedHackathon, setSelectedHackathonId } = useHackathonSelection(
    HACKATHON_STORAGE_KEYS.judge,
    allowedHackathonIds,
    allowedHackathons,
    { syncUrl: true, preferCurrent: true },
  );
  const canAccessSelectedHackathon = allowedHackathonIds.includes(selectedHackathonId);
  const sessionAssignedIds = sessionUser ? getUserAllowedHackathonIds(sessionUser) : [];
  const canReadRoster = !authLoading && !isFinalShortlistPage
    && canAccessStaffDashboard(sessionUser?.role, sessionUser?.judgeApprovalStatus)
    && sessionAssignedIds.includes(selectedHackathonId);
  const participantScope = canReadRoster ? `${sessionUser!.id}:${sessionUser!.role}:${selectedHackathonId}` : null;
  const [participantRoster, setParticipantRoster] = useState<{
    scope: string | null; rows: EventParticipant[]; loading: boolean; error: string | null;
  }>({ scope: null, rows: [], loading: false, error: null });
  const [participantRetry, setParticipantRetry] = useState(0);

  useEffect(() => {
    setParticipantRoster({ scope: participantScope, rows: [], loading: Boolean(participantScope), error: null });
    if (!participantScope) return;
    let current = true;
    let unsubscribe: (() => void) | undefined;
    const fail = () => {
      if (current) setParticipantRoster({ scope: participantScope, rows: [], loading: false, error: "Could not load registered participants. Please try again." });
    };
    try {
      unsubscribe = subscribeToEventParticipants(db, selectedHackathonId, (rows) => {
        if (current) setParticipantRoster({ scope: participantScope, rows, loading: false, error: null });
      }, fail);
    } catch {
      fail();
    }
    return () => { current = false; unsubscribe?.(); };
  }, [db, participantScope, selectedHackathonId, participantRetry]);

  const visibleParticipants = participantRoster.scope === participantScope && participantScope ? participantRoster.rows : [];
  const isLoadingParticipants = Boolean(participantScope) && (participantRoster.scope !== participantScope || participantRoster.loading);
  const participantRosterError = participantRoster.scope === participantScope ? participantRoster.error : null;
  const { criteria: judgingCriteria, isLoading: isLoadingCriteria } =
    useHackathonCriteria(selectedHackathonId);

  const [judgeSubmissions, setJudgeSubmissions] = useState<Submission[]>([]);
  const [judgeSubmissionsBaseline, setJudgeSubmissionsBaseline] = useState<Submission[]>([]);
  const [isLoadingSubmissions, setIsLoadingSubmissions] = useState(true);
  const [workspaceLoadError, setWorkspaceLoadError] = useState<string | null>(null);
  const [loadRetry, setLoadRetry] = useState(0);
  const [judgeMessage, setJudgeMessage] = useState<string | null>(null);
  const [savingSubmissionId, setSavingSubmissionId] = useState<string | null>(null);
  const [savingFinalSubmissionId, setSavingFinalSubmissionId] = useState<string | null>(null);
  const [top3Ranks, setTop3Ranks] = useState<JudgeTop3Ranks>(createEmptyTop3Ranks);
  const [top3RanksBaseline, setTop3RanksBaseline] = useState<JudgeTop3Ranks>(createEmptyTop3Ranks);
  const [top3SavedAt, setTop3SavedAt] = useState<string | null>(null);
  const [isSavingTop3, setIsSavingTop3] = useState(false);
  const judgeSubmissionsRef = useRef(judgeSubmissions);

  useEffect(() => {
    judgeSubmissionsRef.current = judgeSubmissions;
  }, [judgeSubmissions]);

  const judgeId = sessionUser?.id ?? "";
  const judgeRole = sessionUser?.role;
  const workspaceScope = useMemo(
    () => ({ judgeId, selectedHackathonId, judgingCriteria }),
    [judgeId, selectedHackathonId, judgingCriteria],
  );
  const workspaceScopeRef = useRef<typeof workspaceScope | null>(workspaceScope);
  workspaceScopeRef.current = workspaceScope;
  const [loadedWorkspaceScope, setLoadedWorkspaceScope] = useState<typeof workspaceScope | null>(null);
  const isWorkspaceLoading = isLoadingSubmissions || isLoadingCriteria || loadedWorkspaceScope !== workspaceScope;
  useEffect(() => {
    workspaceScopeRef.current = workspaceScope;
    return () => { workspaceScopeRef.current = null; };
  }, [workspaceScope]);
  const pendingScoreWritesRef = useRef(new Map<string, Promise<void>>());
  const queueScoreWrite = useCallback(async (submissionId: string, write: () => Promise<void>) => {
    const key = `${judgeId}:${selectedHackathonId}:${submissionId}`;
    const writes = pendingScoreWritesRef.current;
    const previous = writes.get(key) ?? Promise.resolve();
    const next = previous.catch(() => {}).then(async () => {
      if (workspaceScopeRef.current === workspaceScope) await write();
    });
    writes.set(key, next);
    try {
      await next;
    } finally {
      if (writes.get(key) === next) writes.delete(key);
    }
  }, [judgeId, selectedHackathonId, workspaceScope]);

  const judgeDraftValue = useMemo(
    () => buildJudgeWorkspaceDraft(judgeSubmissions, top3Ranks, judgeId),
    [judgeSubmissions, top3Ranks, judgeId]
  );

  const judgeDraftBaseline = useMemo(
    () => buildJudgeWorkspaceDraft(judgeSubmissionsBaseline, top3RanksBaseline, judgeId),
    [judgeSubmissionsBaseline, top3RanksBaseline, judgeId]
  );

  const judgeDraftKey = formDraftStorageKey([
    "judge-workspace",
    judgeId,
    selectedHackathonId,
  ]);

  const {
    isDirty: isJudgeDraftDirty,
    pendingRestore: pendingJudgeRestore,
    consumePendingRestore: consumeJudgeRestore,
  } = useFormDraftPersistence<JudgeWorkspaceDraft>({
    storageKey: judgeDraftKey,
    value: judgeDraftValue,
    enabled: Boolean(judgeId) && canAccessSelectedHackathon && !isWorkspaceLoading,
    baseline: judgeDraftBaseline,
    debounceMs: 400,
  });

  useUnsavedChangesGuard(isJudgeDraftDirty);

  useEffect(() => {
    let current = true;
    if (!judgeId || (judgeRole !== "judge" && judgeRole !== "mentor")) return;
    if (!canAccessSelectedHackathon) {
      setJudgeSubmissions([]);
      setJudgeSubmissionsBaseline([]);
      setTop3Ranks(createEmptyTop3Ranks());
      setTop3RanksBaseline(createEmptyTop3Ranks());
      setLoadedWorkspaceScope(null);
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
      setWorkspaceLoadError(null);
      setJudgeMessage(null);
      setSavingSubmissionId(null);
      setSavingFinalSubmissionId(null);
      setIsSavingTop3(false);
      setLoadedWorkspaceScope(null);
      setJudgeSubmissions([]);
      setJudgeSubmissionsBaseline([]);
      setTop3Ranks(createEmptyTop3Ranks());
      setTop3RanksBaseline(createEmptyTop3Ranks());
      setTop3SavedAt(null);
      try {
        const submissions = await fetchSubmissionsForHackathon(db, selectedHackathonId);
        if (!current) return;
        const mappedSubmissions: Submission[] = submissions.map((data) =>
          mapSubmissionForJudge(
            {
              id: data.id,
              ...data,
            },
            judgeId,
            judgingCriteria
          )
        );
        setJudgeSubmissions(mappedSubmissions);
        setJudgeSubmissionsBaseline(mappedSubmissions);

        try {
          const rankingRef = doc(
            db,
            "judge_rankings",
            buildJudgeRankingDocId(judgeId, selectedHackathonId)
          );
          const rankingSnap = await getDoc(rankingRef);
          if (!current) return;
          const ranking = parseTop3RankingFromFirestore(
            rankingSnap.exists() ? (rankingSnap.data() as Record<string, unknown>) : undefined,
            judgeId,
            selectedHackathonId
          );
          setTop3Ranks(ranking.ranks);
          setTop3RanksBaseline(ranking.ranks);
          setTop3SavedAt(ranking.updated_at);
          setLoadedWorkspaceScope(workspaceScope);
        } catch (rankingError: unknown) {
          if (!current) return;
          const rankingMessage =
            typeof rankingError === "object" && rankingError && "message" in rankingError
              ? String((rankingError as { message?: string }).message)
              : "Failed to load your top 3 ranking.";
          setJudgeMessage(rankingMessage);
          setWorkspaceLoadError(rankingMessage);
        }
      } catch (error: unknown) {
        if (!current) return;
        const message =
          typeof error === "object" && error && "message" in error
            ? String((error as { message?: string }).message)
            : "Failed to load submissions.";
        setJudgeMessage(message);
        setWorkspaceLoadError(message);
      } finally {
        if (current) {
          setIsLoadingSubmissions(false);
        }
      }
    };

    if (!isLoadingCriteria) {
      void loadHackathonSubmissions();
    }
    return () => { current = false; };
  }, [
    judgeId,
    judgeRole,
    db,
    judgingCriteria,
    isLoadingCriteria,
    selectedHackathonId,
    canAccessSelectedHackathon,
    allowedHackathonIds.length,
    workspaceScope,
    loadRetry,
  ]);

  useEffect(() => {
    if (!pendingJudgeRestore || !judgeId || isWorkspaceLoading) return;
    const draft = pendingJudgeRestore.value as JudgeWorkspaceDraft;
    setJudgeSubmissions((current) =>
      applyJudgeWorkspaceDraft(current, draft, judgeId, judgingCriteria)
    );
    setTop3Ranks(draft.top3Ranks ?? createEmptyTop3Ranks());
    setJudgeMessage("Restored unsaved scoring draft from this browser.");
    consumeJudgeRestore();
  }, [
    pendingJudgeRestore,
    consumeJudgeRestore,
    judgeId,
    isWorkspaceLoading,
    judgingCriteria,
  ]);

  // Persist partial score progress to Firestore so sudden closes don't lose mid-scoring work.
  useEffect(() => {
    if (!sessionUser || !canAccessSelectedHackathon || isWorkspaceLoading) return;
    if (savingSubmissionId || savingFinalSubmissionId) return;
    if (!isJudgeDraftDirty) return;

    const timer = window.setTimeout(() => {
      void (async () => {
        const updates = judgeSubmissionsRef.current;
        const savedSubmissions = new Map<string, Submission>();
        let failedCount = 0;
        await Promise.all(
          updates.map(async (submission) => {
            const baseline = judgeSubmissionsBaseline.find((item) => item.id === submission.id);
            const notes = submission.judge_notes ?? "";
            const criteriaScores = submission.judge_criteria_scores ?? {};
            const finalNotes = getFinalJudgeNotesForJudge(submission, sessionUser.id);
            const finalCriteriaScores = getFinalJudgeCriteriaScoresForJudge(
              submission,
              sessionUser.id
            ) ?? {};
            const baselineNotes = baseline?.judge_notes ?? "";
            const baselineCriteria = baseline?.judge_criteria_scores ?? {};
            const baselineFinalNotes = baseline
              ? getFinalJudgeNotesForJudge(baseline, sessionUser.id)
              : "";
            const baselineFinalCriteria = baseline
              ? getFinalJudgeCriteriaScoresForJudge(baseline, sessionUser.id) ?? {}
              : {};
            const notesChanged = notes !== baselineNotes;
            const criteriaChanged =
              JSON.stringify(criteriaScores) !== JSON.stringify(baselineCriteria);
            const finalNotesChanged = finalNotes !== baselineFinalNotes;
            const finalCriteriaChanged =
              JSON.stringify(finalCriteriaScores) !== JSON.stringify(baselineFinalCriteria);
            if (!notesChanged && !criteriaChanged && !finalNotesChanged && !finalCriteriaChanged) return;

            const cleaned = sanitizeCriteriaScores(criteriaScores);
            const score = Object.keys(cleaned).length
              ? calculateTotalFromCriteria(cleaned, judgingCriteria)
              : null;
            const cleanedFinalCriteria = sanitizeCriteriaScores(finalCriteriaScores);
            const finalScore = Object.keys(cleanedFinalCriteria).length
              ? calculateTotalFromCriteria(cleanedFinalCriteria, judgingCriteria)
              : null;

            try {
              await queueScoreWrite(submission.id, () => updateDoc(
                doc(db, "submissions", submission.id),
                {
                  ...(notesChanged || criteriaChanged
                    ? buildJudgeScoreFirestoreUpdate(sessionUser.id, score, notes, cleaned)
                    : {}),
                  ...(finalNotesChanged || finalCriteriaChanged
                    ? buildFinalJudgeScoreFirestoreUpdate(
                        sessionUser.id,
                        finalScore,
                        finalNotes,
                        cleanedFinalCriteria
                      )
                    : {}),
                }
              ));
              if (workspaceScopeRef.current !== workspaceScope) return;
              savedSubmissions.set(submission.id, submission);
              setJudgeSubmissionsBaseline((current) => current.map((item) => item.id === submission.id ? submission : item));
            } catch {
              // Local draft remains.
              failedCount += 1;
            }
          })
        );

        if (workspaceScopeRef.current !== workspaceScope) return;
        if (savedSubmissions.size > 0) {
          // The ballot is saved separately; scoring writes never acknowledge it.
          setJudgeMessage(failedCount > 0 ? "Some scores could not be saved. Your unsaved draft is still in this browser." : "Scores draft autosaved.");
        } else if (failedCount > 0) {
          setJudgeMessage("Scores could not be autosaved. Your draft is still in this browser.");
        }
      })();
    }, 3000);

    return () => window.clearTimeout(timer);
  }, [
    sessionUser,
    canAccessSelectedHackathon,
    isWorkspaceLoading,
    savingSubmissionId,
    savingFinalSubmissionId,
    isJudgeDraftDirty,
    judgeSubmissions,
    judgeSubmissionsBaseline,
    judgingCriteria,
    top3Ranks,
    db,
    workspaceScope,
    queueScoreWrite,
  ]);

  const filteredJudgeSubmissions = judgeSubmissions;

  const finalRoundSubmissions = useMemo(
    () =>
      judgeSubmissions
        .filter((submission) => submission.final_shortlisted === true)
        .map((submission) => mapSubmissionForFinalJudge(submission, judgeId, judgingCriteria)),
    [judgeSubmissions, judgeId, judgingCriteria]
  );

  const finalJudgeSummary = useMemo(() => {
    const scores = finalRoundSubmissions
      .map((submission) => submission.judge_score)
      .filter((score): score is number => typeof score === "number");
    return {
      total: finalRoundSubmissions.length,
      scored: scores.length,
      averageScore:
        scores.length > 0
          ? scores.reduce((total, score) => total + score, 0) / scores.length
          : null,
    };
  }, [finalRoundSubmissions]);

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
          delete currentCriteria[criterionId];
        } else {
          const criterionMax =
            judgingCriteria.find((criterion) => criterion.id === criterionId)?.weight ?? 20;
          currentCriteria[criterionId] = clampCriterionScore(value, criterionMax);
        }
        const hasNumericScores = Object.values(currentCriteria).some(
          (score) => typeof score === "number"
        );
        const totalScore = hasNumericScores
          ? calculateTotalFromCriteria(currentCriteria, judgingCriteria)
          : null;

        return {
          ...submission,
          judge_criteria_scores: hasNumericScores ? currentCriteria : null,
          judge_score: totalScore,
          judge_scores: {
            ...(submission.judge_scores ?? {}),
            [sessionUser.id]: totalScore,
          },
          judge_criteria_scores_by_judge: {
            ...(submission.judge_criteria_scores_by_judge ?? {}),
            [sessionUser.id]: hasNumericScores ? currentCriteria : null,
          },
        };
      })
    );
  };

  const handleFinalJudgeNotesChange = (id: string, value: string) => {
    if (!sessionUser || !canAccessSelectedHackathon) return;
    setJudgeSubmissions((current) =>
      current.map((submission) =>
        submission.id === id
          ? {
              ...submission,
              final_judge_notes_by_judge: {
                ...(submission.final_judge_notes_by_judge ?? {}),
                [sessionUser.id]: value,
              },
            }
          : submission
      )
    );
  };

  const handleFinalCriterionScoreChange = (
    id: string,
    criterionId: JudgingCriterionId,
    value: number | null
  ) => {
    if (!sessionUser || !canAccessSelectedHackathon) return;
    setJudgeSubmissions((current) =>
      current.map((submission) => {
        if (submission.id !== id) return submission;

        const currentCriteria = {
          ...(getFinalJudgeCriteriaScoresForJudge(submission, sessionUser.id) ?? {}),
        };
        if (value === null) {
          delete currentCriteria[criterionId];
        } else {
          const criterionMax =
            judgingCriteria.find((criterion) => criterion.id === criterionId)?.weight ?? 20;
          currentCriteria[criterionId] = clampCriterionScore(value, criterionMax);
        }
        const hasNumericScores = Object.values(currentCriteria).some(
          (score) => typeof score === "number"
        );
        const totalScore = hasNumericScores
          ? calculateTotalFromCriteria(currentCriteria, judgingCriteria)
          : null;

        return {
          ...submission,
          final_judge_scores: {
            ...(submission.final_judge_scores ?? {}),
            [sessionUser.id]: totalScore,
          },
          final_judge_criteria_scores_by_judge: {
            ...(submission.final_judge_criteria_scores_by_judge ?? {}),
            [sessionUser.id]: hasNumericScores ? currentCriteria : null,
          },
        };
      })
    );
  };

  const handleJudgeSave = useCallback(
    async (submissionId: string) => {
      if (!sessionUser || !canAccessSelectedHackathon || isWorkspaceLoading) return;

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

        await queueScoreWrite(submission.id, () => updateDoc(
          submissionRef,
          buildJudgeScoreFirestoreUpdate(sessionUser.id, score, notes, cleanedCriteriaScores)
        ));

        if (workspaceScopeRef.current !== workspaceScope) return;
        // Acknowledging the submitted snapshot must not overwrite edits typed
        // while the network request was pending, or other unsaved scoring rounds.
        setJudgeSubmissionsBaseline((current) => current.map((item) =>
          item.id === submissionId ? {
            ...item,
            judge_score: score,
            judge_notes: notes,
            judge_criteria_scores: cleanedCriteriaScores,
            judge_scores: { ...(item.judge_scores ?? {}), [sessionUser.id]: score },
            judge_notes_by_judge: { ...(item.judge_notes_by_judge ?? {}), [sessionUser.id]: notes },
            judge_criteria_scores_by_judge: { ...(item.judge_criteria_scores_by_judge ?? {}), [sessionUser.id]: cleanedCriteriaScores },
          } : item,
        ));
        setJudgeMessage("Scores saved. You can still edit or redo them anytime.");
      } catch (error: unknown) {
        if (workspaceScopeRef.current !== workspaceScope) return;
        const message =
          typeof error === "object" && error && "message" in error
            ? String((error as { message?: string }).message)
            : "An error occurred while saving scores.";
        setJudgeMessage(message);
      } finally {
        if (workspaceScopeRef.current === workspaceScope) setSavingSubmissionId(null);
      }
    },
    [sessionUser, db, judgingCriteria, canAccessSelectedHackathon, isWorkspaceLoading, workspaceScope, queueScoreWrite]
  );

  const handleFinalJudgeSave = useCallback(
    async (submissionId: string) => {
      if (!sessionUser || !canAccessSelectedHackathon || isWorkspaceLoading) return;

      const submission = judgeSubmissionsRef.current.find((item) => item.id === submissionId);
      if (!submission) {
        setJudgeMessage("Could not find this finalist. Please refresh and try again.");
        return;
      }

      const criteriaScores = getFinalJudgeCriteriaScoresForJudge(submission, sessionUser.id) ?? {};
      if (!areAllCriteriaScored(criteriaScores, judgingCriteria)) {
        setJudgeMessage("Score every final-round criterion before saving.");
        return;
      }

      const cleanedCriteriaScores = sanitizeCriteriaScores(criteriaScores);
      const score = calculateTotalFromCriteria(cleanedCriteriaScores, judgingCriteria);
      const notes = getFinalJudgeNotesForJudge(submission, sessionUser.id);
      const applySavedFinalMark = (item: Submission): Submission =>
        item.id === submissionId
          ? {
              ...item,
              final_judge_scores: {
                ...(item.final_judge_scores ?? {}),
                [sessionUser.id]: score,
              },
              final_judge_notes_by_judge: {
                ...(item.final_judge_notes_by_judge ?? {}),
                [sessionUser.id]: notes,
              },
              final_judge_criteria_scores_by_judge: {
                ...(item.final_judge_criteria_scores_by_judge ?? {}),
                [sessionUser.id]: cleanedCriteriaScores,
              },
            }
          : item;

      setJudgeMessage(null);
      setSavingFinalSubmissionId(submissionId);
      try {
        await queueScoreWrite(submission.id, () => updateDoc(
          doc(db, "submissions", submission.id),
          buildFinalJudgeScoreFirestoreUpdate(
            sessionUser.id,
            score,
            notes,
            cleanedCriteriaScores
          )
        ));
        if (workspaceScopeRef.current !== workspaceScope) return;
        setJudgeSubmissionsBaseline((current) => current.map(applySavedFinalMark));
        setJudgeMessage("Final-round marks saved separately from the overall score.");
      } catch (error: unknown) {
        if (workspaceScopeRef.current !== workspaceScope) return;
        const message =
          typeof error === "object" && error && "message" in error
            ? String((error as { message?: string }).message)
            : "An error occurred while saving final-round marks.";
        setJudgeMessage(message);
      } finally {
        if (workspaceScopeRef.current === workspaceScope) setSavingFinalSubmissionId(null);
      }
    },
    [sessionUser, db, judgingCriteria, canAccessSelectedHackathon, isWorkspaceLoading, workspaceScope, queueScoreWrite]
  );

  const handleTop3RankChange = (slot: Top3RankSlot, submissionId: string | null) => {
    if (!canAccessSelectedHackathon) return;
    setTop3Ranks((current) => ({
      ...current,
      [slot]: submissionId,
    }));
  };

  const handleSaveTop3Ranking = useCallback(async () => {
    if (!sessionUser || !canAccessSelectedHackathon || isWorkspaceLoading) return;

    const finalistIds = judgeSubmissionsRef.current
      .filter((submission) => submission.final_shortlisted)
      .map((submission) => submission.id);
    if (finalistIds.length < 3) {
      setJudgeMessage("At least three finalists must be selected before the Top 3 ballot can be saved.");
      return;
    }
    const validationError = validateTop3Ranks(top3Ranks, finalistIds);
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
      if (workspaceScopeRef.current !== workspaceScope) return;
      setTop3SavedAt(payload.updated_at);
      setTop3RanksBaseline(top3Ranks);
      setJudgeMessage("Top 3 ranking saved.");
    } catch (error: unknown) {
      if (workspaceScopeRef.current !== workspaceScope) return;
      const message =
        typeof error === "object" && error && "message" in error
          ? String((error as { message?: string }).message)
          : "An error occurred while saving your top 3 ranking.";
      setJudgeMessage(message);
    } finally {
      if (workspaceScopeRef.current === workspaceScope) setIsSavingTop3(false);
    }
  }, [sessionUser, db, top3Ranks, selectedHackathonId, canAccessSelectedHackathon, isWorkspaceLoading, workspaceScope]);

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
      {workspaceLoadError ? (
        <div role="alert" className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm">
          <p>Could not load the scoring workspace: {workspaceLoadError}</p>
          <button type="button" className="mt-3 font-medium underline underline-offset-4" onClick={() => setLoadRetry((current) => current + 1)}>
            Retry loading scores
          </button>
        </div>
      ) : null}
      {allowedHackathons.length === 0 ? (
        <section className={sectionClass}>
          <p className="dash-eyebrow">Event access</p>
          <h2 className="dash-title">No events assigned</h2>
          <p className="dash-subtitle mt-2">
            Your account is approved, but an admin has not granted access to any hackathon yet.
            Ask an admin to assign you to an event.
          </p>
        </section>
      ) : isFinalShortlistPage ? (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Link
              to={withHackathonQuery("/dashboard/judge", selectedHackathon.id)}
              className="inline-flex min-h-10 items-center rounded-md border border-primary/40 bg-primary/10 px-4 text-sm font-semibold text-primary transition hover:bg-primary/20"
            >
              Back to overall scoring
            </Link>
          </div>
          <JudgeFinalShortlistPanel
            selectedHackathon={selectedHackathon}
            judgingCriteria={judgingCriteria}
            submissions={finalRoundSubmissions}
            isLoading={isWorkspaceLoading}
            onCriterionScoreChange={handleFinalCriterionScoreChange}
            onNotesChange={handleFinalJudgeNotesChange}
            onSave={handleFinalJudgeSave}
            savingSubmissionId={savingFinalSubmissionId}
            top3Ranks={top3Ranks}
            top3SavedAt={top3SavedAt}
            isSavingTop3={isSavingTop3}
            onTop3RankChange={handleTop3RankChange}
            onSaveTop3Ranking={handleSaveTop3Ranking}
          />
        </div>
      ) : (
        <JudgeDashboard
          selectedHackathon={selectedHackathon}
          participants={visibleParticipants}
          isLoadingParticipants={isLoadingParticipants}
          participantRosterError={participantRosterError}
          onRetryParticipants={() => setParticipantRetry((current) => current + 1)}
          judgingCriteria={judgingCriteria}
          submissions={filteredJudgeSubmissions}
          isLoadingSubmissions={isWorkspaceLoading}
          judgeMessage={judgeMessage}
          summary={judgeSummary}
          finalSummary={finalJudgeSummary}
          statistics={judgeStatistics}
          onCriterionScoreChange={handleCriterionScoreChange}
          onNotesChange={handleJudgeNotesChange}
          onSave={handleJudgeSave}
          savingSubmissionId={savingSubmissionId}
        />
      )}
    </DashboardLayout>
  );
}
