import { useEffect, useMemo, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { addDoc, collection, deleteDoc, deleteField, doc, getDocs, setDoc } from "firebase/firestore";
import { getFirestoreDb } from "@/lib/firebaseClient";
import { usePortalAuth } from "@/hooks/usePortalAuth";
import {
  grantAdminAccessByEmail,
  normalizeGrantEmail,
  type AdminGrantRecord,
} from "@/lib/adminGrants";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import {
  AdminDashboard,
  type AdminWorkspace,
  type NewSubmissionInput,
  type AdminSubmissionRow,
  type AdminUser,
} from "@/components/dashboard/AdminDashboard";
import {
  fetchSubmissionsForHackathon,
  filterUsersForHackathon,
  getUserAllowedHackathonIds,
  getUserHackathonId,
  HACKATHON_STORAGE_KEYS,
  PORTAL_HACKATHONS,
  type HackathonId,
} from "@/lib/hackathons";
import { useHackathonSelection } from "@/hooks/useHackathonSelection";
import { useHackathonCriteria } from "@/hooks/useHackathonCriteria";
import { saveHackathonCriteria } from "@/lib/hackathonCriteria";
import { getJudgeTotalScoreForJudge } from "@/lib/judgeSubmissionScores";
import {
  buildAdminTop3RankingSummary,
  fetchJudgeRankingsForHackathon,
} from "@/lib/judgeTop3Rankings";
import { buildAdminJudgingStatistics } from "@/lib/judgingStatistics";
import { sendParticipantEmail, queueParticipantEmail } from "@/lib/participantEmail";
import { buildInviteUrl } from "@/lib/inviteTokens";
import { createJudgeInvite } from "@/lib/portalInvites";
import { buildAdminTeamDetails } from "@/lib/teamRoster";
import {
  publishAiHackathon,
  publishManualHackathon,
  type AiHackathonDraft,
  type HostedHackathon,
  type ManualHackathonDraft,
} from "@/lib/aiHackathons";
import { useAdminHackathonCatalog } from "@/hooks/useAdminHackathonCatalog";
import {
  calculateTotalFromCriteria,
  DEFAULT_JUDGING_CRITERIA,
  type JudgingCriterion,
} from "@/components/dashboard/judgingCriteria";
import {
  emptyPlatformOps,
  evaluateApplicant,
  fetchPlatformOps,
  inferRoleFit,
  matchApplicantsIntoTeams,
  savePlatformOps,
  submissionQuality,
  suggestCriteriaScores,
  type PlatformOpsState,
} from "@/lib/platformOps";
import type {
  HostApprovalStatus,
  JudgeApprovalStatus,
  PortalRole,
  Submission,
  UserProfile,
} from "@/types/portal";

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

const normalizeHostApprovalStatus = (value: unknown): HostApprovalStatus | undefined => {
  if (typeof value !== "string") return undefined;
  const normalized = value.trim().toLowerCase();
  if (normalized === "pending") return "pending";
  if (normalized === "approved") return "approved";
  return undefined;
};

const normalizeJudgeApprovalStatus = (value: unknown): JudgeApprovalStatus | undefined => {
  if (typeof value !== "string") return undefined;
  const normalized = value.trim().toLowerCase();
  if (normalized === "pending") return "pending";
  if (normalized === "approved") return "approved";
  return undefined;
};

const isStaffRole = (role: PortalRole) => role === "judge" || role === "mentor";

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

export default function AdminDashboardPage() {
  const location = useLocation();
  const workspace: AdminWorkspace = location.pathname.includes("/create")
    ? "create"
    : location.pathname.includes("/people")
      ? "people"
      : location.pathname.includes("/judging")
        ? "judging"
        : "overview";
  const { sessionUser, loading: authLoading, signOut } = usePortalAuth();
  const db = getFirestoreDb();
  const {
    catalog: adminHackathons,
    upsertHostedEvent,
  } = useAdminHackathonCatalog(db, Boolean(sessionUser && sessionUser.role === "admin"));
  const { selectedHackathonId, selectedHackathon, setSelectedHackathonId } = useHackathonSelection(
    HACKATHON_STORAGE_KEYS.admin,
    undefined,
    adminHackathons,
    { syncUrl: true, preferCurrent: true },
  );
  const { criteria: judgingCriteria, isLoading: isLoadingCriteria, setCriteria: setJudgingCriteria } =
    useHackathonCriteria(selectedHackathonId);

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [userEmailLookup, setUserEmailLookup] = useState<Record<string, string>>({});
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [isLoadingSubmissions, setIsLoadingSubmissions] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [savingUserId, setSavingUserId] = useState<string | null>(null);
  const [pendingRoles, setPendingRoles] = useState<Record<string, PortalRole>>({});
  const [isCreatingSubmission, setIsCreatingSubmission] = useState(false);
  const [deletingSubmissionId, setDeletingSubmissionId] = useState<string | null>(null);
  const [isSavingCriteria, setIsSavingCriteria] = useState(false);
  const [adminGrantEmail, setAdminGrantEmail] = useState("");
  const [pendingAdminGrants, setPendingAdminGrants] = useState<AdminGrantRecord[]>([]);
  const [isGrantingAdmin, setIsGrantingAdmin] = useState(false);
  const [broadcastSubject, setBroadcastSubject] = useState("");
  const [broadcastMessage, setBroadcastMessage] = useState("");
  const [isSendingBroadcast, setIsSendingBroadcast] = useState(false);
  const [judgeRankings, setJudgeRankings] = useState<Awaited<
    ReturnType<typeof fetchJudgeRankingsForHackathon>
  >>([]);
  const [isLoadingTop3Rankings, setIsLoadingTop3Rankings] = useState(false);
  const [platformOps, setPlatformOps] = useState<PlatformOpsState>(emptyPlatformOps);
  const [isSavingOps, setIsSavingOps] = useState(false);
  const [platformOpsMessage, setPlatformOpsMessage] = useState<string | null>(null);
  const [activeOpsProjectId, setActiveOpsProjectId] = useState<string | null>(null);
  const [opsRubric, setOpsRubric] = useState<Record<string, number>>({});
  const [opsCopilotNote, setOpsCopilotNote] = useState("Select a submission, then run the copilot.");
  const [judgeInviteLabel, setJudgeInviteLabel] = useState("");
  const [judgeInviteHackathonIds, setJudgeInviteHackathonIds] = useState<HackathonId[]>([]);
  const [judgeInviteUrl, setJudgeInviteUrl] = useState<string | null>(null);
  const [judgeInviteMessage, setJudgeInviteMessage] = useState<string | null>(null);
  const [isCreatingJudgeInvite, setIsCreatingJudgeInvite] = useState(false);

  useEffect(() => {
    if (!sessionUser || sessionUser.role !== "admin") return;

    const loadUsers = async () => {
      setIsLoadingUsers(true);
      try {
        const usersRef = collection(db, "users");
        const snapshot = await getDocs(usersRef);
        const emailLookup: Record<string, string> = {};
        const allUsers: AdminUser[] = snapshot.docs
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
            const hostApprovalStatus = role === "host"
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
        setUsers(allUsers);
        setUserEmailLookup(emailLookup);
      } catch (error: unknown) {
        const text =
          typeof error === "object" && error && "message" in error
            ? String((error as { message?: string }).message)
            : "Failed to load users.";
        setMessage(text);
      } finally {
        setIsLoadingUsers(false);
      }
    };

    const loadPendingAdminGrants = async () => {
      try {
        const grantsRef = collection(db, "admin_grants");
        const snapshot = await getDocs(grantsRef);
        const grants = snapshot.docs
          .map((docSnap) => {
            const data = docSnap.data();
            if (typeof data.email !== "string" || !data.email.trim()) return null;
            return {
              email: data.email.trim(),
              grantedAt:
                typeof data.grantedAt === "string" ? data.grantedAt : new Date(0).toISOString(),
            } satisfies AdminGrantRecord;
          })
          .filter((grant): grant is AdminGrantRecord => grant !== null)
          .sort((left, right) => right.grantedAt.localeCompare(left.grantedAt));
        setPendingAdminGrants(grants);
      } catch (error: unknown) {
        const text =
          typeof error === "object" && error && "message" in error
            ? String((error as { message?: string }).message)
            : "Failed to load pending admin grants.";
        setMessage(text);
      }
    };

    const loadSubmissions = async () => {
      setIsLoadingSubmissions(true);
      try {
        const hackathonSubmissions = await fetchSubmissionsForHackathon(db, selectedHackathonId);
        setSubmissions(hackathonSubmissions);
      } catch (error: unknown) {
        const text =
          typeof error === "object" && error && "message" in error
            ? String((error as { message?: string }).message)
            : "Failed to load submissions.";
        setMessage(text);
      } finally {
        setIsLoadingSubmissions(false);
      }
    };

    const loadJudgeRankings = async () => {
      setIsLoadingTop3Rankings(true);
      try {
        const rankings = await fetchJudgeRankingsForHackathon(db, selectedHackathonId);
        setJudgeRankings(rankings);
      } catch (error: unknown) {
        const text =
          typeof error === "object" && error && "message" in error
            ? String((error as { message?: string }).message)
            : "Failed to load judge top 3 rankings.";
        setMessage(text);
      } finally {
        setIsLoadingTop3Rankings(false);
      }
    };

    void loadUsers();
    void loadPendingAdminGrants();
    void loadSubmissions();
    void loadJudgeRankings();
  }, [sessionUser, db, selectedHackathonId]);

  useEffect(() => {
    if (!sessionUser || sessionUser.role !== "admin") return;
    let cancelled = false;

    const loadOps = async () => {
      try {
        const state = await fetchPlatformOps(db, selectedHackathonId);
        if (cancelled) return;
        setPlatformOps(state);
        setPlatformOpsMessage(null);
        setActiveOpsProjectId(null);
        setOpsCopilotNote("Select a submission, then run the copilot.");
      } catch (error: unknown) {
        if (cancelled) return;
        const text =
          typeof error === "object" && error && "message" in error
            ? String((error as { message?: string }).message)
            : "Failed to load platform ops.";
        setPlatformOpsMessage(text);
      }
    };

    void loadOps();
    return () => {
      cancelled = true;
    };
  }, [sessionUser, db, selectedHackathonId]);

  useEffect(() => {
    setJudgeInviteHackathonIds((current) =>
      current.includes(selectedHackathonId) ? current : [selectedHackathonId]
    );
  }, [selectedHackathonId]);

  const getUserEmail = (identifier: string | null | undefined) => {
    if (!identifier) return null;
    const normalizedIdentifier = identifier.trim().toLowerCase();
    return userEmailLookup[identifier] ?? userEmailLookup[normalizedIdentifier] ?? null;
  };

  const hackathonUsers = useMemo(
    () =>
      filterUsersForHackathon(
        users.map((user) => ({
          ...user,
          hackathon_id: user.hackathonId,
          hackathon_ids: user.hackathonIds,
          hackathonIds: user.hackathonIds,
        })),
        selectedHackathonId,
        submissions
      ),
    [users, selectedHackathonId, submissions]
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
    [submissions, hackathonUsers, userEmailLookup, judgingCriteria, users]
  );

  const activeJudgeIds = new Set(
    adminSubmissionRows.flatMap((row) =>
      row.judgeMarks
        .filter((mark) => typeof mark.score === "number")
        .map((mark) => mark.judgeId)
    )
  );
  const totalJudgeMarks = adminSubmissionRows.reduce(
    (total, row) => total + row.judgeMarks.filter((mark) => typeof mark.score === "number").length,
    0
  );
  const registeredJudgeCount = hackathonUsers.filter((user) => isStaffRole(user.role)).length;
  const analytics = buildAdminJudgingStatistics(
    submissions,
    adminSubmissionRows.map((row) => row.averageScore),
    activeJudgeIds.size,
    registeredJudgeCount,
    totalJudgeMarks,
    judgingCriteria
  );

  const staffJudges = hackathonUsers.filter((user) => isStaffRole(user.role));
  const hostAccounts = users.filter((user) => user.role === "host");
  // Full staff list (not hackathon-scoped) so pending self-signup judges still appear in the approval queue.
  const judgeAccounts = users.filter((user) => isStaffRole(user.role));

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
        staffJudges.map((judge) => ({ id: judge.id, email: judge.email }))
      ),
    [judgeRankings, top3SubmissionLookup, staffJudges]
  );

  const handleRoleChange = (userId: string, role: PortalRole) => {
    setPendingRoles((current) => ({ ...current, [userId]: role }));
  };

  const handleSaveRole = async (user: AdminUser) => {
    const nextRole = pendingRoles[user.id] ?? user.role;
    if (nextRole === user.role) return;

    setMessage(null);
    setSavingUserId(user.id);
    try {
      const userRef = doc(db, "users", user.id);
      const nextJudgeApprovalStatus = isStaffRole(nextRole)
          ? isStaffRole(user.role) && user.judgeApprovalStatus !== "approved"
            ? "pending"
            : "approved"
          : null;
      const nextHostApprovalStatus = nextRole === "host"
        ? user.role === "host" ? user.hostApprovalStatus ?? "pending" : "pending"
        : null;
      await setDoc(
        userRef,
        {
          role: nextRole,
          judgeApprovalStatus: nextJudgeApprovalStatus,
          hostApprovalStatus: nextHostApprovalStatus,
          hackathon_id: selectedHackathonId,
          ...(isStaffRole(nextRole)
            ? {
                hackathon_ids: Array.from(
                  new Set([...(user.hackathonIds ?? []), selectedHackathonId])
                ),
              }
            : {}),
        },
        { merge: true }
      );
      setUsers((current) =>
        current.map((currentUser) =>
          currentUser.id === user.id
            ? {
                ...currentUser,
                role: nextRole,
                judgeApprovalStatus: isStaffRole(nextRole) ? nextJudgeApprovalStatus ?? "approved" : undefined,
                hostApprovalStatus: nextRole === "host" ? nextHostApprovalStatus ?? "pending" : undefined,
                hackathonId: selectedHackathonId,
                hackathonIds: isStaffRole(nextRole)
                  ? Array.from(new Set([...(currentUser.hackathonIds ?? []), selectedHackathonId]))
                  : currentUser.hackathonIds,
              }
            : currentUser
        )
      );
      setPendingRoles((current) => {
        const copy = { ...current };
        delete copy[user.id];
        return copy;
      });
      setMessage(`Updated ${user.email} to ${nextRole}.`);
    } catch (error: unknown) {
      const text =
        typeof error === "object" && error && "message" in error
          ? String((error as { message?: string }).message)
          : "Failed to update role.";
      setMessage(text);
    } finally {
      setSavingUserId(null);
    }
  };

  const handleApproveJudge = async (user: AdminUser) => {
    if (!isStaffRole(user.role) || user.judgeApprovalStatus === "approved") return;
    setMessage(null);
    setSavingUserId(user.id);
    try {
      const existingIds = user.hackathonIds ?? (user.hackathonId ? [user.hackathonId] : []);
      const nextHackathonIds = Array.from(new Set([...existingIds, selectedHackathonId]));
      const userRef = doc(db, "users", user.id);
      await setDoc(
        userRef,
        {
          judgeApprovalStatus: "approved",
          hackathon_id: nextHackathonIds[0] ?? selectedHackathonId,
          hackathon_ids: nextHackathonIds,
        },
        { merge: true }
      );
      setUsers((current) =>
        current.map((currentUser) =>
          currentUser.id === user.id
            ? {
                ...currentUser,
                judgeApprovalStatus: "approved",
                hackathonId: nextHackathonIds[0] ?? selectedHackathonId,
                hackathonIds: nextHackathonIds,
              }
            : currentUser
        )
      );
      setMessage(
        `Approved ${user.role} access for ${user.email} (${nextHackathonIds
          .map((id) => PORTAL_HACKATHONS.find((h) => h.id === id)?.shortName ?? id)
          .join(", ")}).`
      );
    } catch (error: unknown) {
      const text =
        typeof error === "object" && error && "message" in error
          ? String((error as { message?: string }).message)
          : "Failed to approve judge access.";
      setMessage(text);
    } finally {
      setSavingUserId(null);
    }
  };

  const handleRejectJudge = async (user: AdminUser) => {
    if (!isStaffRole(user.role) || user.judgeApprovalStatus === "approved") return;
    setMessage(null);
    setSavingUserId(user.id);
    try {
      const userRef = doc(db, "users", user.id);
      await setDoc(
        userRef,
        {
          role: "participant",
          judgeApprovalStatus: deleteField(),
        },
        { merge: true }
      );
      setUsers((current) =>
        current.map((currentUser) =>
          currentUser.id === user.id
            ? {
                ...currentUser,
                role: "participant",
                judgeApprovalStatus: undefined,
              }
            : currentUser
        )
      );
      setPendingRoles((current) => {
        const copy = { ...current };
        delete copy[user.id];
        return copy;
      });
      setMessage(`Rejected ${user.role} request for ${user.email}. Account converted to participant.`);
    } catch (error: unknown) {
      const text =
        typeof error === "object" && error && "message" in error
          ? String((error as { message?: string }).message)
          : "Failed to reject judge access.";
      setMessage(text);
    } finally {
      setSavingUserId(null);
    }
  };

  const handleApproveHost = async (user: AdminUser) => {
    if (user.role !== "host" || user.hostApprovalStatus === "approved") return;
    setMessage(null);
    setSavingUserId(user.id);
    try {
      await setDoc(doc(db, "users", user.id), { hostApprovalStatus: "approved" }, { merge: true });
      setUsers((current) => current.map((currentUser) =>
        currentUser.id === user.id ? { ...currentUser, hostApprovalStatus: "approved" } : currentUser,
      ));
      setMessage(`Approved host access for ${user.email}.`);
    } catch (error: unknown) {
      const text = typeof error === "object" && error && "message" in error
        ? String((error as { message?: string }).message)
        : "Failed to approve host access.";
      setMessage(text);
    } finally {
      setSavingUserId(null);
    }
  };

  const handleUpdateHackathonAccess = async (user: AdminUser, hackathonIds: HackathonId[]) => {
    if (!isStaffRole(user.role)) return;
    setMessage(null);
    setSavingUserId(user.id);
    try {
      const uniqueIds = Array.from(new Set(hackathonIds));
      const userRef = doc(db, "users", user.id);
      await setDoc(
        userRef,
        {
          hackathon_ids: uniqueIds,
          hackathon_id: uniqueIds[0] ?? selectedHackathonId,
        },
        { merge: true }
      );
      setUsers((current) =>
        current.map((currentUser) =>
          currentUser.id === user.id
            ? {
                ...currentUser,
                hackathonIds: uniqueIds,
                hackathonId: uniqueIds[0] ?? null,
              }
            : currentUser
        )
      );
      setMessage(
        uniqueIds.length === 0
          ? `Removed all event access for ${user.email}.`
          : `Updated event access for ${user.email}: ${uniqueIds
              .map((id) => PORTAL_HACKATHONS.find((h) => h.id === id)?.shortName ?? id)
              .join(", ")}.`
      );
    } catch (error: unknown) {
      const text =
        typeof error === "object" && error && "message" in error
          ? String((error as { message?: string }).message)
          : "Failed to update event access.";
      setMessage(text);
    } finally {
      setSavingUserId(null);
    }
  };

  const handleCreateSubmission = async (payload: NewSubmissionInput) => {
    if (!payload.participantId) {
      setMessage("Please select a participant for the new submission.");
      return;
    }

    setMessage(null);
    setIsCreatingSubmission(true);
    try {
      const submissionPayload: Omit<Submission, "id"> = {
        user_id: payload.participantId,
        hackathon_id: selectedHackathonId,
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
      setMessage("Submission added.");

      const participantEmail =
        users.find((user) => user.id === payload.participantId)?.email ??
        userEmailLookup[payload.participantId];
      if (participantEmail) {
        queueParticipantEmail({
          type: "admin_submission",
          toEmail: participantEmail,
          title: submissionPayload.title ?? undefined,
          hackathonName: selectedHackathon.name,
        });
      }
    } catch (error: unknown) {
      const text =
        typeof error === "object" && error && "message" in error
          ? String((error as { message?: string }).message)
          : "Failed to add submission.";
      setMessage(text);
    } finally {
      setIsCreatingSubmission(false);
    }
  };

  const handleSaveCriteria = async (criteria: JudgingCriterion[]) => {
    setMessage(null);
    setIsSavingCriteria(true);
    try {
      await saveHackathonCriteria(db, selectedHackathonId, criteria);
      setJudgingCriteria(criteria);
      setMessage(`Marking criteria updated for ${selectedHackathon.name}.`);
    } catch (error: unknown) {
      const text =
        typeof error === "object" && error && "message" in error
          ? String((error as { message?: string }).message)
          : "Failed to save marking criteria.";
      setMessage(text);
      throw error;
    } finally {
      setIsSavingCriteria(false);
    }
  };

  const handleCreateAiHackathon = async (
    draft: AiHackathonDraft,
    rulebookUrl: string,
  ): Promise<HostedHackathon> => {
    if (!sessionUser) throw new Error("You must be signed in as an admin to create an event.");
    const event = await publishAiHackathon(db, draft, rulebookUrl, sessionUser.id);
    upsertHostedEvent(event);
    setSelectedHackathonId(event.id);
    setMessage(`${event.name} was created and published.`);
    return event;
  };

  const handleCreateManualHackathon = async (
    draft: ManualHackathonDraft,
    rulebookUrl: string,
  ): Promise<HostedHackathon> => {
    if (!sessionUser) throw new Error("You must be signed in as an admin to create an event.");
    const event = await publishManualHackathon(db, draft, rulebookUrl, sessionUser.id);
    upsertHostedEvent(event);
    setSelectedHackathonId(event.id);
    setMessage(`${event.name} was manually created and published.`);
    return event;
  };

  const handleCreateJudgeInvite = async () => {
    if (!sessionUser) return;
    if (judgeInviteHackathonIds.length === 0) {
      setJudgeInviteMessage("Select at least one event.");
      return;
    }
    setIsCreatingJudgeInvite(true);
    setJudgeInviteMessage(null);
    try {
      const invite = await createJudgeInvite(db, {
        createdBy: sessionUser.id,
        createdByEmail: sessionUser.email,
        hackathonIds: judgeInviteHackathonIds,
        label: judgeInviteLabel,
      });
      setJudgeInviteUrl(buildInviteUrl("judge", invite.token));
      setJudgeInviteMessage("Judge invite link ready — share for direct portal access.");
    } catch (error: unknown) {
      setJudgeInviteMessage(
        error instanceof Error ? error.message : "Unable to create judge invite."
      );
    } finally {
      setIsCreatingJudgeInvite(false);
    }
  };

  const handleGrantAdminAccess = async () => {
    const email = adminGrantEmail.trim();
    if (!email) {
      setMessage("Enter an email address to grant admin access.");
      return;
    }

    setMessage(null);
    setIsGrantingAdmin(true);
    try {
      const result = await grantAdminAccessByEmail(db, email, (normalizedEmail) =>
        users.find((user) => normalizeGrantEmail(user.email) === normalizedEmail),
      );

      if (result.status === "invalid_email") {
        setMessage("Enter a valid email address.");
        return;
      }

      if (result.status === "already_admin") {
        setMessage(`${result.email} already has admin access.`);
        return;
      }

      if (result.status === "granted") {
        setUsers((current) =>
          current.map((currentUser) =>
            currentUser.id === result.userId
              ? { ...currentUser, role: "admin", judgeApprovalStatus: undefined }
              : currentUser,
          ),
        );
        setMessage(`Granted admin access to ${result.email}.`);
        setAdminGrantEmail("");
        return;
      }

      setPendingAdminGrants((current) => [
        {
          email: result.email,
          grantedAt: new Date().toISOString(),
        },
        ...current.filter((grant) => normalizeGrantEmail(grant.email) !== normalizeGrantEmail(result.email)),
      ]);
      setMessage(
        `${result.email} will receive admin access when they sign in with Google for the first time.`,
      );
      setAdminGrantEmail("");
    } catch (error: unknown) {
      const text =
        typeof error === "object" && error && "message" in error
          ? String((error as { message?: string }).message)
          : "Failed to grant admin access.";
      setMessage(text);
    } finally {
      setIsGrantingAdmin(false);
    }
  };

  const handleSendParticipantBroadcast = async () => {
    const subject = broadcastSubject.trim();
    const body = broadcastMessage.trim();
    if (!subject || !body) {
      setMessage("Enter a broadcast subject and message.");
      return;
    }

    const recipients = hackathonUsers
      .filter((user) => user.role === "participant")
      .map((user) => user.email.trim())
      .filter(Boolean);

    if (recipients.length === 0) {
      setMessage("No participants found for this hackathon.");
      return;
    }

    setMessage(null);
    setIsSendingBroadcast(true);
    try {
      const result = await sendParticipantEmail({
        type: "broadcast",
        subject,
        message: body,
        recipients,
        hackathonName: selectedHackathon.name,
      });

      if (result.ok === false) {
        setMessage(result.error);
        return;
      }

      const failedNote = result.failed ? ` (${result.failed} failed)` : "";
      setMessage(
        result.preview
          ? `Broadcast logged for ${result.sent ?? recipients.length} participants (SMTP not configured).${failedNote}`
          : `Broadcast sent to ${result.sent ?? recipients.length} participants.${failedNote}`,
      );
      setBroadcastSubject("");
      setBroadcastMessage("");
    } catch (error: unknown) {
      const text =
        typeof error === "object" && error && "message" in error
          ? String((error as { message?: string }).message)
          : "Failed to send broadcast.";
      setMessage(text);
    } finally {
      setIsSendingBroadcast(false);
    }
  };

  const handleDeleteSubmission = async (submissionId: string) => {
    setMessage(null);
    setDeletingSubmissionId(submissionId);
    try {
      await deleteDoc(doc(db, "submissions", submissionId));
      await deleteDoc(doc(db, "public_projects", submissionId)).catch(() => undefined);
      setSubmissions((current) => current.filter((submission) => submission.id !== submissionId));
      setMessage("Submission removed.");
    } catch (error: unknown) {
      const text =
        typeof error === "object" && error && "message" in error
          ? String((error as { message?: string }).message)
          : "Failed to remove submission.";
      setMessage(text);
    } finally {
      setDeletingSubmissionId(null);
    }
  };

  const persistPlatformOps = async (next: PlatformOpsState, note?: string) => {
    const withTime = { ...next, updatedAt: new Date().toISOString() };
    await savePlatformOps(db, selectedHackathonId, withTime);
    setPlatformOps(withTime);
    if (note) setPlatformOpsMessage(note);
  };

  const handleRunScreening = async () => {
    const participants = hackathonUsers.filter((user) => user.role === "participant");
    if (participants.length === 0) {
      setPlatformOpsMessage("No participants in this hackathon yet.");
      return;
    }
    setIsSavingOps(true);
    try {
      const applicants = { ...platformOps.applicants };
      participants.forEach((person) => {
        const evaluation = evaluateApplicant(person.profile, person.email);
        const existing = applicants[person.id];
        applicants[person.id] = {
          status:
            existing?.status && existing.status !== "pending"
              ? existing.status
              : evaluation.recommendation === "shortlisted"
                ? "shortlisted"
                : "pending",
          score: evaluation.score,
          teamName: existing?.teamName ?? null,
          checkedIn: existing?.checkedIn ?? false,
        };
      });
      await persistPlatformOps(
        { ...platformOps, applicants, screenedAt: new Date().toISOString() },
        `Screened ${participants.length} applicants for ${selectedHackathon.name}.`,
      );
    } catch (error: unknown) {
      const text =
        typeof error === "object" && error && "message" in error
          ? String((error as { message?: string }).message)
          : "Failed to run screening.";
      setPlatformOpsMessage(text);
    } finally {
      setIsSavingOps(false);
    }
  };

  const handleSetApplicantStatus = async (userId: string, status: "pending" | "shortlisted" | "passed") => {
    setIsSavingOps(true);
    try {
      const existing = platformOps.applicants[userId] ?? {
        status: "pending" as const,
        score: null,
        teamName: null,
        checkedIn: false,
      };
      await persistPlatformOps({
        ...platformOps,
        applicants: {
          ...platformOps.applicants,
          [userId]: { ...existing, status },
        },
      });
    } catch (error: unknown) {
      const text =
        typeof error === "object" && error && "message" in error
          ? String((error as { message?: string }).message)
          : "Failed to update applicant.";
      setPlatformOpsMessage(text);
    } finally {
      setIsSavingOps(false);
    }
  };

  const handleMatchTeams = async () => {
    const shortlisted = hackathonUsers
      .filter((user) => user.role === "participant" && platformOps.applicants[user.id]?.status === "shortlisted")
      .map((user) => ({ id: user.id, role: inferRoleFit(user.profile) }));

    if (shortlisted.length < 2) {
      setPlatformOpsMessage("Shortlist at least two people, then match.");
      return;
    }

    setIsSavingOps(true);
    try {
      const formed = matchApplicantsIntoTeams(shortlisted);
      const applicants = { ...platformOps.applicants };
      for (const team of formed) {
        for (const member of team.members) {
          const existing = applicants[member.id];
          applicants[member.id] = {
            status: "shortlisted",
            score: existing?.score ?? null,
            teamName: team.name,
            checkedIn: existing?.checkedIn ?? false,
          };
        }
      }

      for (const team of formed) {
        for (const member of team.members) {
          const submission = submissions.find((entry) => entry.user_id === member.id);
          if (!submission) continue;
          await setDoc(doc(db, "submissions", submission.id), { team_name: team.name }, { merge: true });
        }
      }

      setSubmissions((current) =>
        current.map((submission) => {
          const team = formed.find((entry) => entry.members.some((member) => member.id === submission.user_id));
          return team ? { ...submission, team_name: team.name } : submission;
        }),
      );

      await persistPlatformOps(
        { ...platformOps, applicants },
        `Matched ${formed.length} team${formed.length === 1 ? "" : "s"} and updated submissions.`,
      );
    } catch (error: unknown) {
      const text =
        typeof error === "object" && error && "message" in error
          ? String((error as { message?: string }).message)
          : "Failed to match teams.";
      setPlatformOpsMessage(text);
    } finally {
      setIsSavingOps(false);
    }
  };

  const handleToggleCheckIn = async (teamName: string) => {
    setIsSavingOps(true);
    try {
      const applicants = { ...platformOps.applicants };
      const members = Object.entries(applicants).filter(([, record]) => record.teamName === teamName);
      const nextCheckedIn = !members.every(([, record]) => record.checkedIn);
      for (const [id, record] of members) {
        applicants[id] = { ...record, checkedIn: nextCheckedIn };
      }
      await persistPlatformOps(
        { ...platformOps, applicants },
        nextCheckedIn ? `${teamName} checked in.` : `${teamName} check-in cleared.`,
      );
    } catch (error: unknown) {
      const text =
        typeof error === "object" && error && "message" in error
          ? String((error as { message?: string }).message)
          : "Failed to update check-in.";
      setPlatformOpsMessage(text);
    } finally {
      setIsSavingOps(false);
    }
  };

  const handleOpsBroadcast = async (messageBody: string) => {
    const recipients = hackathonUsers
      .filter((user) => user.role === "participant")
      .map((user) => user.email.trim())
      .filter(Boolean);

    if (recipients.length === 0) {
      setPlatformOpsMessage("No participants found for this hackathon.");
      return;
    }

    setIsSavingOps(true);
    try {
      const result = await sendParticipantEmail({
        type: "broadcast",
        subject: `Live update · ${selectedHackathon.name}`,
        message: messageBody,
        recipients,
        hackathonName: selectedHackathon.name,
      });
      if (result.ok === false) {
        setPlatformOpsMessage(result.error);
        return;
      }
      await persistPlatformOps(
        { ...platformOps, lastBroadcast: messageBody },
        result.preview
          ? `Broadcast logged for ${result.sent ?? recipients.length} participants (SMTP not configured).`
          : `Broadcast sent to ${result.sent ?? recipients.length} participants.`,
      );
    } catch (error: unknown) {
      const text =
        typeof error === "object" && error && "message" in error
          ? String((error as { message?: string }).message)
          : "Failed to send broadcast.";
      setPlatformOpsMessage(text);
    } finally {
      setIsSavingOps(false);
    }
  };

  const handleRunCopilot = () => {
    const submission = adminSubmissionRows.find((entry) => entry.id === activeOpsProjectId) ?? adminSubmissionRows[0];
    if (!submission) {
      setOpsCopilotNote("No submission to review yet.");
      return;
    }
    setActiveOpsProjectId(submission.id);
    const criteria = judgingCriteria.length ? judgingCriteria : DEFAULT_JUDGING_CRITERIA;
    const suggested = suggestCriteriaScores(criteria, submissionQuality(submission));
    setOpsRubric(suggested);
    setOpsCopilotNote(`Suggested marks for ${submission.title?.trim() || "this project"}. Save to lock the score.`);
  };

  const handleSaveOpsScore = async () => {
    const submissionId = activeOpsProjectId ?? adminSubmissionRows[0]?.id;
    if (!submissionId) return;
    const criteria = judgingCriteria.length ? judgingCriteria : DEFAULT_JUDGING_CRITERIA;
    const total = calculateTotalFromCriteria(opsRubric, criteria);
    setIsSavingOps(true);
    try {
      await persistPlatformOps(
        {
          ...platformOps,
          projectScores: { ...platformOps.projectScores, [submissionId]: total },
          projectCriteria: { ...platformOps.projectCriteria, [submissionId]: opsRubric },
        },
        `Saved ${total} pts. Rankings updated.`,
      );
      setOpsCopilotNote(`Saved at ${total} pts. Rankings updated.`);
    } catch (error: unknown) {
      const text =
        typeof error === "object" && error && "message" in error
          ? String((error as { message?: string }).message)
          : "Failed to save score.";
      setPlatformOpsMessage(text);
    } finally {
      setIsSavingOps(false);
    }
  };

  const handleCarryForward = async (targetId: HackathonId) => {
    const shortlistedIds = Object.entries(platformOps.applicants)
      .filter(([, record]) => record.status === "shortlisted")
      .map(([id]) => id);

    if (shortlistedIds.length === 0) {
      setPlatformOpsMessage("Shortlist applicants before carrying them forward.");
      return;
    }

    setIsSavingOps(true);
    try {
      for (const userId of shortlistedIds) {
        const user = users.find((entry) => entry.id === userId);
        if (!user) continue;
        const nextIds = Array.from(new Set([...(user.hackathonIds ?? []), selectedHackathonId, targetId]));
        await setDoc(
          doc(db, "users", userId),
          {
            hackathon_ids: nextIds,
            hackathon_id: user.hackathonId ?? selectedHackathonId,
          },
          { merge: true },
        );
      }

      setUsers((current) =>
        current.map((user) =>
          shortlistedIds.includes(user.id)
            ? {
                ...user,
                hackathonIds: Array.from(new Set([...(user.hackathonIds ?? []), selectedHackathonId, targetId])),
              }
            : user,
        ),
      );

      const targetOps = await fetchPlatformOps(db, targetId);
      const mergedApplicants = { ...targetOps.applicants };
      for (const userId of shortlistedIds) {
        const current = platformOps.applicants[userId];
        mergedApplicants[userId] = {
          status: "shortlisted",
          score: current?.score ?? null,
          teamName: current?.teamName ?? null,
          checkedIn: false,
        };
      }
      await savePlatformOps(db, targetId, {
        ...targetOps,
        applicants: mergedApplicants,
        screenedAt: targetOps.screenedAt ?? new Date().toISOString(),
        replayedTo: targetId,
        updatedAt: new Date().toISOString(),
      });

      await persistPlatformOps(
        { ...platformOps, replayedTo: targetId },
        `Carried ${shortlistedIds.length} applicants to ${PORTAL_HACKATHONS.find((item) => item.id === targetId)?.name ?? targetId}.`,
      );
      setSelectedHackathonId(targetId);
    } catch (error: unknown) {
      const text =
        typeof error === "object" && error && "message" in error
          ? String((error as { message?: string }).message)
          : "Failed to carry applicants forward.";
      setPlatformOpsMessage(text);
    } finally {
      setIsSavingOps(false);
    }
  };

  if (authLoading) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!sessionUser || sessionUser.role !== "admin") {
    return <Navigate to="/admin" replace />;
  }

  return (
    <DashboardLayout
      sessionUser={sessionUser}
      role="admin"
      onSignOut={signOut}
      hackathons={adminHackathons}
      selectedHackathonId={selectedHackathonId}
      onHackathonChange={setSelectedHackathonId}
    >
      <AdminDashboard
        workspace={workspace}
        selectedHackathon={selectedHackathon}
        hackathons={adminHackathons}
        judgingCriteria={judgingCriteria}
        isLoadingCriteria={isLoadingCriteria}
        isSavingCriteria={isSavingCriteria}
        onSaveCriteria={handleSaveCriteria}
        users={hackathonUsers}
        hostAccounts={hostAccounts}
        judgeAccounts={judgeAccounts}
        isLoadingUsers={isLoadingUsers}
        submissions={adminSubmissionRows}
        isLoadingSubmissions={isLoadingSubmissions}
        analytics={analytics}
        message={message}
        savingUserId={savingUserId}
        pendingRoles={pendingRoles}
        onRoleChange={handleRoleChange}
        onSaveRole={handleSaveRole}
        onApproveJudge={handleApproveJudge}
        onRejectJudge={handleRejectJudge}
        onApproveHost={handleApproveHost}
        onUpdateHackathonAccess={handleUpdateHackathonAccess}
        adminGrantEmail={adminGrantEmail}
        onAdminGrantEmailChange={setAdminGrantEmail}
        pendingAdminGrants={pendingAdminGrants}
        isGrantingAdmin={isGrantingAdmin}
        onGrantAdminAccess={handleGrantAdminAccess}
        broadcastSubject={broadcastSubject}
        onBroadcastSubjectChange={setBroadcastSubject}
        broadcastMessage={broadcastMessage}
        onBroadcastMessageChange={setBroadcastMessage}
        isSendingBroadcast={isSendingBroadcast}
        onSendParticipantBroadcast={handleSendParticipantBroadcast}
        isCreatingSubmission={isCreatingSubmission}
        deletingSubmissionId={deletingSubmissionId}
        onCreateSubmission={handleCreateSubmission}
        onDeleteSubmission={handleDeleteSubmission}
        top3RankingSummary={top3RankingSummary}
        isLoadingTop3Rankings={isLoadingTop3Rankings}
        top3SubmissionLookup={top3SubmissionLookup}
        platformOpsLive={{
          hackathon: selectedHackathon,
          hackathons: adminHackathons,
          participants: hackathonUsers.filter((user) => user.role === "participant"),
          submissions: adminSubmissionRows,
          judgingCriteria,
          ops: platformOps,
          isBusy: isSavingOps || isSendingBroadcast,
          statusMessage: platformOpsMessage,
          onHackathonChange: setSelectedHackathonId,
          onRunScreening: handleRunScreening,
          onSetApplicantStatus: handleSetApplicantStatus,
          onMatchTeams: handleMatchTeams,
          onToggleCheckIn: handleToggleCheckIn,
          onSendBroadcast: handleOpsBroadcast,
          onSelectProject: setActiveOpsProjectId,
          activeProjectId: activeOpsProjectId ?? adminSubmissionRows[0]?.id ?? null,
          rubric: opsRubric,
          onRubricChange: (criterionId, value) =>
            setOpsRubric((current) => ({ ...current, [criterionId]: value })),
          onRunCopilot: handleRunCopilot,
          onSaveScore: handleSaveOpsScore,
          copilotNote: opsCopilotNote,
          onCarryForward: handleCarryForward,
        }}
        onCreateAiHackathon={handleCreateAiHackathon}
        onCreateManualHackathon={handleCreateManualHackathon}
        judgeInviteLabel={judgeInviteLabel}
        onJudgeInviteLabelChange={setJudgeInviteLabel}
        judgeInviteHackathonIds={judgeInviteHackathonIds}
        onToggleJudgeInviteHackathon={(hackathonId) => {
          setJudgeInviteHackathonIds((current) =>
            current.includes(hackathonId)
              ? current.filter((id) => id !== hackathonId)
              : [...current, hackathonId]
          );
        }}
        judgeInviteUrl={judgeInviteUrl}
        judgeInviteMessage={judgeInviteMessage}
        isCreatingJudgeInvite={isCreatingJudgeInvite}
        onCreateJudgeInvite={handleCreateJudgeInvite}
      />
    </DashboardLayout>
  );
}
