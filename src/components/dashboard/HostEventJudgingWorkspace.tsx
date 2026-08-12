import { useEffect, useMemo, useState } from "react";
import { addDoc, collection, deleteDoc, doc, getDocs } from "firebase/firestore";
import {
  AdminJudgingSection,
} from "@/components/dashboard/AdminJudgingSection";
import type {
  AdminSubmissionRow,
  AdminUser,
  NewSubmissionInput,
} from "@/components/dashboard/AdminDashboard";
import type { JudgingCriterion } from "@/components/dashboard/judgingCriteria";
import { sectionClass } from "@/components/dashboard/DashboardLayout";
import { useHackathonCriteria } from "@/hooks/useHackathonCriteria";
import { saveHackathonCriteria } from "@/lib/hackathonCriteria";
import { getFirestoreDb } from "@/lib/firebaseClient";
import {
  fetchSubmissionsForHackathon,
  filterUsersForHackathon,
  getUserAllowedHackathonIds,
  getUserHackathonId,
  type PortalHackathon,
} from "@/lib/hackathons";
import { getJudgeTotalScoreForJudge } from "@/lib/judgeSubmissionScores";
import {
  buildAdminTop3RankingSummary,
  fetchJudgeRankingsForHackathon,
} from "@/lib/judgeTop3Rankings";
import { buildAdminJudgingStatistics } from "@/lib/judgingStatistics";
import { queueParticipantEmail } from "@/lib/participantEmail";
import type {
  HostApprovalStatus,
  JudgeApprovalStatus,
  PortalRole,
  Submission,
} from "@/types/portal";

const emptyNewSubmission = (): NewSubmissionInput => ({
  participantId: "",
  title: "",
  shortDescription: "",
  projectUrl: "",
  submissionPdfUrl: "",
  demoVideoUrl: "",
});

const normalizePortalRole = (value: unknown): PortalRole | undefined => {
  if (typeof value !== "string") return undefined;
  const normalized = value.trim().toLowerCase();
  if (normalized === "judge" || normalized === "judges") return "judge";
  if (normalized === "mentor" || normalized === "mentors") return "mentor";
  if (normalized === "host" || normalized === "hosts") return "host";
  if (normalized === "participant" || normalized === "participants") return "participant";
  if (normalized === "admin" || normalized === "admins") return "admin";
  return undefined;
};

const normalizeJudgeApprovalStatus = (value: unknown): JudgeApprovalStatus | undefined => {
  if (typeof value !== "string") return undefined;
  const normalized = value.trim().toLowerCase();
  if (normalized === "pending") return "pending";
  if (normalized === "approved") return "approved";
  return undefined;
};

const normalizeHostApprovalStatus = (value: unknown): HostApprovalStatus | undefined => {
  if (typeof value !== "string") return undefined;
  const normalized = value.trim().toLowerCase();
  if (normalized === "pending") return "pending";
  if (normalized === "approved") return "approved";
  return undefined;
};

const isStaffRole = (role: PortalRole) => role === "judge" || role === "mentor";

type HostEventJudgingWorkspaceProps = {
  hackathon: PortalHackathon;
  onMessage?: (message: string | null) => void;
};

export function HostEventJudgingWorkspace({
  hackathon,
  onMessage,
}: HostEventJudgingWorkspaceProps) {
  const db = getFirestoreDb();
  const hackathonId = hackathon.id;
  const {
    criteria: judgingCriteria,
    isLoading: isLoadingCriteria,
    setCriteria: setJudgingCriteria,
  } = useHackathonCriteria(hackathonId);

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [userEmailLookup, setUserEmailLookup] = useState<Record<string, string>>({});
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [isLoadingSubmissions, setIsLoadingSubmissions] = useState(false);
  const [isCreatingSubmission, setIsCreatingSubmission] = useState(false);
  const [deletingSubmissionId, setDeletingSubmissionId] = useState<string | null>(null);
  const [isSavingCriteria, setIsSavingCriteria] = useState(false);
  const [newSubmission, setNewSubmission] = useState<NewSubmissionInput>(emptyNewSubmission);
  const [judgeRankings, setJudgeRankings] = useState<Awaited<
    ReturnType<typeof fetchJudgeRankingsForHackathon>
  >>([]);
  const [isLoadingTop3Rankings, setIsLoadingTop3Rankings] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setIsLoadingUsers(true);
      setIsLoadingSubmissions(true);
      setIsLoadingTop3Rankings(true);
      try {
        const [usersSnap, hackathonSubmissions, rankings] = await Promise.all([
          getDocs(collection(db, "users")),
          fetchSubmissionsForHackathon(db, hackathonId),
          fetchJudgeRankingsForHackathon(db, hackathonId),
        ]);

        if (cancelled) return;

        const emailLookup: Record<string, string> = {};
        const allUsers: AdminUser[] = usersSnap.docs
          .map((docSnap): AdminUser | null => {
            const data = docSnap.data();
            if (typeof data.email === "string" && data.email.trim()) {
              const normalizedEmail = data.email.trim().toLowerCase();
              emailLookup[docSnap.id] = data.email;
              emailLookup[normalizedEmail] = data.email;
            }
            const role = normalizePortalRole(data.role);
            if (!role || !data.email || typeof data.email !== "string") return null;
            const judgeApprovalStatus = isStaffRole(role)
              ? normalizeJudgeApprovalStatus(data.judgeApprovalStatus) ?? "approved"
              : undefined;
            const hostApprovalStatus =
              role === "host"
                ? normalizeHostApprovalStatus(data.hostApprovalStatus) ?? "pending"
                : undefined;
            const hackathonIds = getUserAllowedHackathonIds({
              hackathon_id: data.hackathon_id,
              hackathon_ids: data.hackathon_ids,
            });
            return {
              id: docSnap.id,
              email: data.email,
              role,
              judgeApprovalStatus,
              hostApprovalStatus,
              hackathonId: hackathonIds[0] ?? getUserHackathonId({ hackathon_id: data.hackathon_id }),
              hackathonIds,
            };
          })
          .filter((user): user is AdminUser => user !== null);

        setUsers(allUsers);
        setUserEmailLookup(emailLookup);
        setSubmissions(hackathonSubmissions);
        setJudgeRankings(rankings);
      } catch (error: unknown) {
        if (cancelled) return;
        const text =
          typeof error === "object" && error && "message" in error
            ? String((error as { message?: string }).message)
            : "Failed to load judging data.";
        onMessage?.(text);
      } finally {
        if (!cancelled) {
          setIsLoadingUsers(false);
          setIsLoadingSubmissions(false);
          setIsLoadingTop3Rankings(false);
        }
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
    // onMessage is a parent setter; omit to avoid reload loops.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally keyed on hackathonId only
  }, [db, hackathonId]);

  const getUserEmail = (userId: string) => userEmailLookup[userId] ?? null;

  const hackathonUsers = useMemo(
    () => filterUsersForHackathon(users, hackathonId, submissions),
    [users, hackathonId, submissions],
  );

  const participants = useMemo(
    () => hackathonUsers.filter((user) => user.role === "participant"),
    [hackathonUsers],
  );

  const participantById = hackathonUsers
    .filter((user) => user.role === "participant")
    .reduce<Record<string, AdminUser>>((acc, user) => {
      acc[user.id] = user;
      return acc;
    }, {});

  const judgeById = hackathonUsers
    .filter((user) => isStaffRole(user.role))
    .reduce<Record<string, AdminUser>>((acc, user) => {
      acc[user.id] = user;
      return acc;
    }, {});

  const adminSubmissionRows: AdminSubmissionRow[] = useMemo(
    () =>
      submissions
        .map((submission) => {
          const participantId = submission.user_id || submission.id;
          const participantEmail =
            getUserEmail(participantId) ??
            participantById[participantId]?.email ??
            "Unknown participant";
          const judgeIds = new Set<string>([
            ...Object.keys(submission.judge_scores ?? {}),
            ...Object.keys(submission.judge_criteria_scores_by_judge ?? {}),
            ...(submission.judge_id ? [submission.judge_id] : []),
          ]);

          const marksFromMap = Array.from(judgeIds).map((judgeId) => {
            const storedScore = submission.judge_scores?.[judgeId];
            const criteriaScores = submission.judge_criteria_scores_by_judge?.[judgeId];
            const resolvedScore =
              typeof storedScore === "number"
                ? storedScore
                : getJudgeTotalScoreForJudge(submission, judgeId, judgingCriteria);

            return {
              judgeId,
              judgeEmail: getUserEmail(judgeId) ?? judgeById[judgeId]?.email ?? "Unknown judge",
              score: resolvedScore,
              notes: submission.judge_notes_by_judge?.[judgeId] ?? null,
              criteriaScores:
                criteriaScores && typeof criteriaScores === "object" ? criteriaScores : undefined,
            };
          });

          const marks =
            marksFromMap.length > 0
              ? marksFromMap
              : submission.judge_id
                ? [
                    {
                      judgeId: submission.judge_id,
                      judgeEmail:
                        getUserEmail(submission.judge_id) ??
                        judgeById[submission.judge_id]?.email ??
                        "Unknown judge",
                      score: submission.judge_score ?? null,
                      notes: submission.judge_notes ?? null,
                    },
                  ]
                : [];

          const validScores = marks
            .map((mark) => mark.score)
            .filter((value): value is number => typeof value === "number");

          return {
            id: submission.id,
            participantId,
            participantEmail,
            teamName: submission.team_name ?? null,
            title: submission.title,
            shortDescription: submission.short_description,
            projectUrl: submission.project_url,
            submissionPdfUrl: submission.submission_pdf_url,
            demoVideoUrl: submission.demo_video_url,
            judgeMarks: marks,
            averageScore:
              validScores.length > 0
                ? validScores.reduce((total, score) => total + score, 0) / validScores.length
                : null,
            scoredByCount: validScores.length,
          };
        })
        .sort((a, b) => {
          const left = a.averageScore ?? -1;
          const right = b.averageScore ?? -1;
          return right - left;
        }),
    [submissions, hackathonUsers, userEmailLookup, judgingCriteria],
  );

  const activeJudgeIds = new Set(
    adminSubmissionRows.flatMap((row) =>
      row.judgeMarks
        .filter((mark) => typeof mark.score === "number")
        .map((mark) => mark.judgeId),
    ),
  );
  const totalJudgeMarks = adminSubmissionRows.reduce(
    (total, row) => total + row.judgeMarks.filter((mark) => typeof mark.score === "number").length,
    0,
  );
  const registeredJudgeCount = hackathonUsers.filter((user) => isStaffRole(user.role)).length;
  const analytics = buildAdminJudgingStatistics(
    submissions,
    adminSubmissionRows.map((row) => row.averageScore),
    activeJudgeIds.size,
    registeredJudgeCount,
    totalJudgeMarks,
    judgingCriteria,
  );

  const staffJudges = hackathonUsers.filter((user) => isStaffRole(user.role));

  const top3SubmissionLookup = useMemo(() => {
    const lookup = new Map<
      string,
      { id: string; title: string | null; team_name?: string | null; participantEmail: string }
    >();
    for (const submission of submissions) {
      const participantId = submission.user_id || submission.id;
      lookup.set(submission.id, {
        id: submission.id,
        title: submission.title,
        team_name: submission.team_name,
        participantEmail:
          getUserEmail(participantId) ??
          participantById[participantId]?.email ??
          "Unknown participant",
      });
    }
    return lookup;
  }, [submissions, userEmailLookup, hackathonUsers]);

  const top3RankingSummary = useMemo(
    () =>
      buildAdminTop3RankingSummary(
        judgeRankings,
        Array.from(top3SubmissionLookup.values()),
        staffJudges.map((judge) => ({ id: judge.id, email: judge.email })),
      ),
    [judgeRankings, top3SubmissionLookup, staffJudges],
  );

  const handleCreateSubmission = async (payload: NewSubmissionInput) => {
    if (!payload.participantId) {
      onMessage?.("Please select a participant for the new submission.");
      return;
    }

    setIsCreatingSubmission(true);
    try {
      const submissionPayload: Omit<Submission, "id"> = {
        user_id: payload.participantId,
        hackathon_id: hackathonId,
        title: payload.title.trim() || null,
        team_name: null,
        member_names: null,
        short_description: payload.shortDescription.trim() || null,
        project_url: payload.projectUrl.trim() || null,
        submission_pdf_url: payload.submissionPdfUrl.trim() || null,
        demo_video_url: payload.demoVideoUrl.trim() || null,
        created_at: new Date().toISOString(),
        judge_id: null,
        judge_score: null,
        judge_notes: null,
        judge_scores: null,
        judge_notes_by_judge: null,
        judge_criteria_scores: null,
        judge_criteria_scores_by_judge: null,
      };

      const ref = await addDoc(collection(db, "submissions"), submissionPayload);
      setSubmissions((current) => [...current, { id: ref.id, ...submissionPayload }]);
      setNewSubmission(emptyNewSubmission());
      onMessage?.("Submission added.");

      const participantEmail =
        users.find((user) => user.id === payload.participantId)?.email ??
        userEmailLookup[payload.participantId];
      if (participantEmail) {
        queueParticipantEmail({
          type: "admin_submission",
          toEmail: participantEmail,
          title: submissionPayload.title ?? undefined,
          hackathonName: hackathon.name,
        });
      }
    } catch (error: unknown) {
      const text =
        typeof error === "object" && error && "message" in error
          ? String((error as { message?: string }).message)
          : "Failed to add submission.";
      onMessage?.(text);
    } finally {
      setIsCreatingSubmission(false);
    }
  };

  const handleDeleteSubmission = async (submissionId: string) => {
    setDeletingSubmissionId(submissionId);
    try {
      await deleteDoc(doc(db, "submissions", submissionId));
      await deleteDoc(doc(db, "public_projects", submissionId)).catch(() => undefined);
      setSubmissions((current) => current.filter((submission) => submission.id !== submissionId));
      onMessage?.("Submission removed.");
    } catch (error: unknown) {
      const text =
        typeof error === "object" && error && "message" in error
          ? String((error as { message?: string }).message)
          : "Failed to remove submission.";
      onMessage?.(text);
    } finally {
      setDeletingSubmissionId(null);
    }
  };

  const handleSaveCriteria = async (criteria: JudgingCriterion[]) => {
    setIsSavingCriteria(true);
    try {
      await saveHackathonCriteria(db, hackathonId, criteria);
      setJudgingCriteria(criteria);
      onMessage?.(`Marking criteria updated for ${hackathon.name}.`);
    } catch (error: unknown) {
      const text =
        typeof error === "object" && error && "message" in error
          ? String((error as { message?: string }).message)
          : "Failed to save marking criteria.";
      onMessage?.(text);
      throw error;
    } finally {
      setIsSavingCriteria(false);
    }
  };

  return (
    <AdminJudgingSection
      selectedHackathon={hackathon}
      judgingCriteria={judgingCriteria}
      isLoadingCriteria={isLoadingCriteria}
      isSavingCriteria={isSavingCriteria}
      onSaveCriteria={handleSaveCriteria}
      participants={participants}
      submissions={adminSubmissionRows}
      isLoadingSubmissions={isLoadingSubmissions}
      isLoadingUsers={isLoadingUsers}
      analytics={analytics}
      isCreatingSubmission={isCreatingSubmission}
      deletingSubmissionId={deletingSubmissionId}
      newSubmission={newSubmission}
      onNewSubmissionChange={setNewSubmission}
      onCreateSubmission={handleCreateSubmission}
      onDeleteSubmission={handleDeleteSubmission}
      top3RankingSummary={top3RankingSummary}
      isLoadingTop3Rankings={isLoadingTop3Rankings}
      top3SubmissionLookup={top3SubmissionLookup}
    />
  );
}

export function HostJudgingUnavailableNotice() {
  return (
    <section id="judging" className={`${sectionClass} scroll-mt-24 p-6`}>
      <p className="dash-eyebrow">Judging & submissions</p>
      <h2 className="dash-title mt-2">Publish this event to unlock scoring</h2>
      <p className="dash-subtitle mt-2 max-w-2xl">
        Criteria, submissions, judge mark check, and top-3 boards appear here after this event has a
        public listing. Save the brief, then publish from Event details.
      </p>
    </section>
  );
}
