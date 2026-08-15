import { useEffect, useMemo, useState, type ReactNode } from "react";
import { addDoc, collection, deleteDoc, deleteField, doc, getDocs, setDoc } from "firebase/firestore";
import {
  AdminJudgingSection,
} from "@/components/dashboard/AdminJudgingSection";
import { AdminTeamsPanel } from "@/components/dashboard/AdminTeamsPanel";
import {
  JudgeApprovalPanel,
  type AdminSubmissionRow,
  type AdminUser,
  type NewSubmissionInput,
} from "@/components/dashboard/AdminDashboard";
import type { JudgingCriterion } from "@/components/dashboard/judgingCriteria";
import { sectionClass } from "@/components/dashboard/DashboardLayout";
import { useHackathonCriteria } from "@/hooks/useHackathonCriteria";
import { saveHackathonCriteria } from "@/lib/hackathonCriteria";
import { getFirestoreDb } from "@/lib/firebaseClient";
import {
  fetchSubmissionsForHackathon,
  filterUsersForHackathon,
  getSubmissionHackathonId,
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
import { buildAdminTeamDetails } from "@/lib/teamRoster";
import { setSubmissionPublicPreview } from "@/lib/projectSocial";
import { setSubmissionFinalShortlist } from "@/lib/finalShortlist";
import type {
  HostApprovalStatus,
  JudgeApprovalStatus,
  PortalRole,
  Submission,
  UserProfile,
} from "@/types/portal";

const emptyNewSubmission = (): NewSubmissionInput => ({
  participantId: "",
  title: "",
  shortDescription: "",
  projectUrl: "",
  submissionPdfUrl: "",
  demoVideoUrl: "",
});

const getStringField = (value: unknown) => (typeof value === "string" ? value : "");

const mapUserProfile = (data: Record<string, unknown>): UserProfile => ({
  fullName: getStringField(data.fullName),
  avatarUrl: getStringField(data.avatarUrl),
  headline: getStringField(data.headline),
  bio: getStringField(data.bio),
  publicRole: getStringField(data.publicRole),
  experienceLevel: getStringField(data.experienceLevel),
  organization: getStringField(data.organization),
  location: getStringField(data.location),
  timezone: getStringField(data.timezone),
  languages: getStringField(data.languages),
  lookingFor: getStringField(data.lookingFor),
  githubUsername: getStringField(data.githubUsername),
  githubProfileUrl: getStringField(data.githubProfileUrl),
  linkedinUrl: getStringField(data.linkedinUrl),
  portfolioUrl: getStringField(data.portfolioUrl),
  xUrl: getStringField(data.xUrl),
  discordHandle: getStringField(data.discordHandle),
  skills: getStringField(data.skills),
  interests: getStringField(data.interests),
  profileUpdatedAt: getStringField(data.profileUpdatedAt),
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

type HostEventJudgingSlots = {
  teams: ReactNode;
  approvals: ReactNode;
  judging: ReactNode;
};

type HostEventJudgingWorkspaceProps = {
  hackathon: PortalHackathon;
  onMessage?: (message: string | null) => void;
  children?: (slots: HostEventJudgingSlots) => ReactNode;
};

export function HostEventJudgingWorkspace({
  hackathon,
  onMessage,
  children,
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
  const [publishingSubmissionId, setPublishingSubmissionId] = useState<string | null>(null);
  const [shortlistingSubmissionId, setShortlistingSubmissionId] = useState<string | null>(null);
  const [isSavingCriteria, setIsSavingCriteria] = useState(false);
  const [newSubmission, setNewSubmission] = useState<NewSubmissionInput>(emptyNewSubmission);
  const [judgeRankings, setJudgeRankings] = useState<Awaited<
    ReturnType<typeof fetchJudgeRankingsForHackathon>
  >>([]);
  const [isLoadingTop3Rankings, setIsLoadingTop3Rankings] = useState(false);
  const [savingUserId, setSavingUserId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setIsLoadingUsers(true);
      setIsLoadingSubmissions(true);
      setIsLoadingTop3Rankings(true);

      const loadErrors: string[] = [];

      const usersResult = await getDocs(collection(db, "users"))
        .then((usersSnap) => {
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
                ? normalizeJudgeApprovalStatus(data.judgeApprovalStatus) ?? "pending"
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
                profile: mapUserProfile(data),
              };
            })
            .filter((user): user is AdminUser => user !== null);
          return { allUsers, emailLookup };
        })
        .catch((error: unknown) => {
          loadErrors.push(
            typeof error === "object" && error && "message" in error
              ? String((error as { message?: string }).message)
              : "Failed to load users.",
          );
          return { allUsers: [] as AdminUser[], emailLookup: {} as Record<string, string> };
        });

      const hackathonSubmissions = await fetchSubmissionsForHackathon(db, hackathonId).catch(
        (error: unknown) => {
          loadErrors.push(
            typeof error === "object" && error && "message" in error
              ? String((error as { message?: string }).message)
              : "Failed to load submissions.",
          );
          return [] as Awaited<ReturnType<typeof fetchSubmissionsForHackathon>>;
        },
      );

      const rankings = await fetchJudgeRankingsForHackathon(db, hackathonId).catch(
        (error: unknown) => {
          loadErrors.push(
            typeof error === "object" && error && "message" in error
              ? String((error as { message?: string }).message)
              : "Failed to load judge rankings.",
          );
          return [] as Awaited<ReturnType<typeof fetchJudgeRankingsForHackathon>>;
        },
      );

      if (cancelled) return;

      setUsers(usersResult.allUsers);
      setUserEmailLookup(usersResult.emailLookup);
      setSubmissions(hackathonSubmissions);
      setJudgeRankings(rankings);
      if (loadErrors.length > 0) {
        onMessage?.(loadErrors[0]);
      }
      setIsLoadingUsers(false);
      setIsLoadingSubmissions(false);
      setIsLoadingTop3Rankings(false);
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

          const team = buildAdminTeamDetails({
            submission,
            ownerEmail: participantEmail,
            ownerName: participantById[participantId]?.profile?.fullName ?? undefined,
            ownerProfile: participantById[participantId]?.profile ?? null,
            memberProfiles: Object.fromEntries(
              users.map((user) => [user.id, user.profile ?? null])
            ),
          });

          return {
            id: submission.id,
            hackathonId: getSubmissionHackathonId(submission),
            participantId,
            participantEmail,
            teamName: team.teamName === "Unnamed team" ? submission.team_name ?? null : team.teamName,
            teamLeaderName: team.leaderName,
            teamLeaderEmail: team.leaderEmail,
            memberCount: team.memberCount,
            members: team.members,
            extraMemberNames: team.extraMemberNames,
            title: submission.title,
            shortDescription: submission.short_description,
            projectUrl: submission.project_url,
            submissionPdfUrl: submission.submission_pdf_url,
            demoVideoUrl: submission.demo_video_url,
            isPublic: submission.public_preview_consent === true,
            isFinalShortlisted: submission.final_shortlisted === true,
            finalShortlistedAt: submission.final_shortlisted_at ?? null,
            judgeMarks: marks,
            averageScore:
              validScores.length > 0
                ? validScores.reduce((total, score) => total + score, 0) / validScores.length
                : null,
            scoredByCount: validScores.length,
            createdAt: submission.created_at ?? null,
            updatedAt: submission.updated_at ?? null,
          };
        })
        .sort((a, b) => {
          const left = a.averageScore ?? -1;
          const right = b.averageScore ?? -1;
          return right - left;
        }),
    [submissions, hackathonUsers, userEmailLookup, judgingCriteria, users],
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
  const judgeAccounts = useMemo(
    () => users.filter((user) => isStaffRole(user.role)),
    [users],
  );

  const handleApproveJudge = async (user: AdminUser) => {
    if (!isStaffRole(user.role) || user.judgeApprovalStatus === "approved") return;
    setSavingUserId(user.id);
    try {
      const existingIds = user.hackathonIds ?? (user.hackathonId ? [user.hackathonId] : []);
      // Put this event first so Firestore rules can verify host ownership via hackathon_id.
      const nextHackathonIds = Array.from(new Set([hackathonId, ...existingIds]));
      await setDoc(
        doc(db, "users", user.id),
        {
          judgeApprovalStatus: "approved",
          hackathon_id: hackathonId,
          hackathon_ids: nextHackathonIds,
        },
        { merge: true },
      );
      setUsers((current) =>
        current.map((currentUser) =>
          currentUser.id === user.id
            ? {
                ...currentUser,
                judgeApprovalStatus: "approved",
                hackathonId,
                hackathonIds: nextHackathonIds,
              }
            : currentUser,
        ),
      );
      onMessage?.(
        `Approved ${user.role} access for ${user.email} on ${hackathon.shortName}.`,
      );
    } catch (error: unknown) {
      const text =
        typeof error === "object" && error && "message" in error
          ? String((error as { message?: string }).message)
          : "Failed to approve judge access.";
      onMessage?.(text);
    } finally {
      setSavingUserId(null);
    }
  };

  const handleRejectJudge = async (user: AdminUser) => {
    if (!isStaffRole(user.role) || user.judgeApprovalStatus === "approved") return;
    setSavingUserId(user.id);
    try {
      await setDoc(
        doc(db, "users", user.id),
        {
          role: "participant",
          judgeApprovalStatus: deleteField(),
        },
        { merge: true },
      );
      setUsers((current) =>
        current.map((currentUser) =>
          currentUser.id === user.id
            ? {
                ...currentUser,
                role: "participant",
                judgeApprovalStatus: undefined,
              }
            : currentUser,
        ),
      );
      onMessage?.(
        `Rejected ${user.role} request for ${user.email}. Account converted to participant.`,
      );
    } catch (error: unknown) {
      const text =
        typeof error === "object" && error && "message" in error
          ? String((error as { message?: string }).message)
          : "Failed to reject judge access.";
      onMessage?.(text);
    } finally {
      setSavingUserId(null);
    }
  };

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

  const handleSetSubmissionPublic = async (submissionId: string, makePublic: boolean) => {
    const submission = submissions.find((item) => item.id === submissionId);
    if (!submission) {
      onMessage?.("Submission not found.");
      return;
    }

    setPublishingSubmissionId(submissionId);
    try {
      const updatedAt = await setSubmissionPublicPreview(
        db,
        { ...submission, hackathon_id: submission.hackathon_id || hackathonId },
        makePublic,
      );
      setSubmissions((current) =>
        current.map((item) =>
          item.id === submissionId
            ? { ...item, public_preview_consent: makePublic, updated_at: updatedAt }
            : item,
        ),
      );
      onMessage?.(
        makePublic
          ? "Project is now on hackathon boards and the public gallery."
          : "Project was hidden from boards and the public gallery.",
      );
    } catch (error: unknown) {
      const text =
        typeof error === "object" && error && "message" in error
          ? String((error as { message?: string }).message)
          : makePublic
            ? "Failed to make project public."
            : "Failed to unpublish project.";
      onMessage?.(text);
    } finally {
      setPublishingSubmissionId(null);
    }
  };

  const handleSetFinalShortlisted = async (submissionId: string, shortlisted: boolean) => {
    const submission = submissions.find((item) => item.id === submissionId);
    if (!submission) {
      onMessage?.("Submission not found.");
      return;
    }

    setShortlistingSubmissionId(submissionId);
    try {
      const update = await setSubmissionFinalShortlist(db, submissionId, shortlisted);
      setSubmissions((current) =>
        current.map((item) =>
          item.id === submissionId
            ? {
                ...item,
                final_shortlisted: update.final_shortlisted,
                final_shortlisted_at: update.final_shortlisted_at,
                updated_at: update.updated_at,
              }
            : item,
        ),
      );
      onMessage?.(
        shortlisted
          ? `${submission.team_name?.trim() || submission.title?.trim() || "Team"} added to the final shortlist.`
          : `${submission.team_name?.trim() || submission.title?.trim() || "Team"} removed from the final shortlist.`,
      );
    } catch (error: unknown) {
      const text =
        typeof error === "object" && error && "message" in error
          ? String((error as { message?: string }).message)
          : "Failed to update the final shortlist.";
      onMessage?.(text);
    } finally {
      setShortlistingSubmissionId(null);
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

  const slots: HostEventJudgingSlots = {
    teams: (
      <AdminTeamsPanel
        selectedHackathon={hackathon}
        submissions={adminSubmissionRows}
        isLoading={isLoadingSubmissions}
        publishingSubmissionId={publishingSubmissionId}
        onSetSubmissionPublic={handleSetSubmissionPublic}
      />
    ),
    approvals: (
      <JudgeApprovalPanel
        judges={judgeAccounts}
        selectedHackathon={hackathon}
        savingUserId={savingUserId}
        onApproveJudge={handleApproveJudge}
        onRejectJudge={handleRejectJudge}
      />
    ),
    judging: (
      <AdminJudgingSection
        selectedHackathon={hackathon}
        hackathons={[hackathon]}
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
        publishingSubmissionId={publishingSubmissionId}
        shortlistingSubmissionId={shortlistingSubmissionId}
        newSubmission={newSubmission}
        onNewSubmissionChange={setNewSubmission}
        onCreateSubmission={handleCreateSubmission}
        onDeleteSubmission={handleDeleteSubmission}
        onSetSubmissionPublic={handleSetSubmissionPublic}
        onSetFinalShortlisted={handleSetFinalShortlisted}
        top3RankingSummary={top3RankingSummary}
        isLoadingTop3Rankings={isLoadingTop3Rankings}
        top3SubmissionLookup={top3SubmissionLookup}
      />
    ),
  };

  if (children) return <>{children(slots)}</>;

  return (
    <>
      {slots.teams}
      {slots.approvals}
      {slots.judging}
    </>
  );
}

export function HostJudgingUnavailableNotice() {
  return (
    <section id="judging" className={`${sectionClass} scroll-mt-24 p-6`}>
      <p className="dash-eyebrow">Judging & submissions</p>
      <h2 className="dash-title mt-2">Publish this event to unlock scoring</h2>
      <p className="dash-subtitle mt-2 max-w-2xl">
        Judge approvals, criteria, submissions, mark check, and top-3 boards appear here after this
        event has a public listing. Save the brief, then publish from Event details.
      </p>
    </section>
  );
}
