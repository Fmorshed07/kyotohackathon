import { useEffect, useMemo, useState } from "react";
import { addDoc, collection, deleteDoc, doc, getDocs, setDoc } from "firebase/firestore";
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
  type NewSubmissionInput,
  type AdminSubmissionRow,
  type AdminUser,
} from "@/components/dashboard/AdminDashboard";
import {
  fetchSubmissionsForHackathon,
  filterUsersForHackathon,
  getUserHackathonId,
  HACKATHON_STORAGE_KEYS,
  PORTAL_HACKATHONS,
} from "@/lib/hackathons";
import { useHackathonSelection } from "@/hooks/useHackathonSelection";
import { useHackathonCriteria } from "@/hooks/useHackathonCriteria";
import { saveHackathonCriteria } from "@/lib/hackathonCriteria";
import { buildAdminJudgingStatistics } from "@/lib/judgingStatistics";
import type { JudgingCriterion } from "@/components/dashboard/judgingCriteria";
import type { JudgeApprovalStatus, PortalRole, Submission } from "@/types/portal";

const normalizePortalRole = (value: unknown): PortalRole | undefined => {
  if (typeof value !== "string") return undefined;
  const normalized = value.trim().toLowerCase();
  if (normalized === "judge" || normalized === "judges") return "judge";
  if (normalized === "mentor" || normalized === "mentors") return "mentor";
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

const isStaffRole = (role: PortalRole) => role === "judge" || role === "mentor";

export default function AdminDashboardPage() {
  const { sessionUser, loading: authLoading, signOut } = usePortalAuth();
  const db = getFirestoreDb();
  const { selectedHackathonId, selectedHackathon, setSelectedHackathonId } = useHackathonSelection(
    HACKATHON_STORAGE_KEYS.admin
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

  useEffect(() => {
    if (!sessionUser || sessionUser.role !== "admin") return;

    const loadUsers = async () => {
      setIsLoadingUsers(true);
      try {
        const usersRef = collection(db, "users");
        const snapshot = await getDocs(usersRef);
        const emailLookup: Record<string, string> = {};
        const allUsers: AdminUser[] = snapshot.docs
          .map((docSnap) => {
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
            return {
              id: docSnap.id,
              email: data.email,
              role,
              judgeApprovalStatus,
              hackathonId: getUserHackathonId({ hackathon_id: data.hackathon_id }),
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

    void loadUsers();
    void loadPendingAdminGrants();
    void loadSubmissions();
  }, [sessionUser, db, selectedHackathonId]);

  const getUserEmail = (identifier: string | null | undefined) => {
    if (!identifier) return null;
    const normalizedIdentifier = identifier.trim().toLowerCase();
    return userEmailLookup[identifier] ?? userEmailLookup[normalizedIdentifier] ?? null;
  };

  const hackathonUsers = useMemo(
    () =>
      filterUsersForHackathon(
        users.map((user) => ({ ...user, hackathon_id: user.hackathonId })),
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
      const marksFromMap = Object.entries(submission.judge_scores ?? {}).map(([judgeId, score]) => ({
        judgeId,
        judgeEmail: getUserEmail(judgeId) ?? judgeById[judgeId]?.email ?? "Unknown judge",
        score: typeof score === "number" ? score : null,
        notes: submission.judge_notes_by_judge?.[judgeId] ?? null,
      }));

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
    [submissions, hackathonUsers, userEmailLookup]
  );

  const scoredRows = adminSubmissionRows.filter((row) => row.averageScore != null);
  const topScore =
    scoredRows.length > 0 ? Math.max(...scoredRows.map((row) => row.averageScore ?? 0)) : null;
  const winners =
    topScore == null
      ? []
      : scoredRows.filter((row) => row.averageScore != null && row.averageScore === topScore);
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
          ? isStaffRole(user.role) && user.judgeApprovalStatus === "pending"
            ? "pending"
            : "approved"
          : null;
      await setDoc(
        userRef,
        {
          role: nextRole,
          judgeApprovalStatus: nextJudgeApprovalStatus,
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
    if (!isStaffRole(user.role) || user.judgeApprovalStatus !== "pending") return;
    setMessage(null);
    setSavingUserId(user.id);
    try {
      const userRef = doc(db, "users", user.id);
      await setDoc(userRef, { judgeApprovalStatus: "approved" }, { merge: true });
      setUsers((current) =>
        current.map((currentUser) =>
          currentUser.id === user.id
            ? {
                ...currentUser,
                judgeApprovalStatus: "approved",
              }
            : currentUser
        )
      );
      setMessage(`Approved ${user.role} access for ${user.email}.`);
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

  const handleDeleteSubmission = async (submissionId: string) => {
    setMessage(null);
    setDeletingSubmissionId(submissionId);
    try {
      await deleteDoc(doc(db, "submissions", submissionId));
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

  if (authLoading || !sessionUser) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <DashboardLayout
      sessionUser={sessionUser}
      role="admin"
      onSignOut={signOut}
      hackathons={PORTAL_HACKATHONS}
      selectedHackathonId={selectedHackathonId}
      onHackathonChange={setSelectedHackathonId}
    >
      <AdminDashboard
        selectedHackathon={selectedHackathon}
        judgingCriteria={judgingCriteria}
        isLoadingCriteria={isLoadingCriteria}
        isSavingCriteria={isSavingCriteria}
        onSaveCriteria={handleSaveCriteria}
        users={hackathonUsers}
        isLoadingUsers={isLoadingUsers}
        submissions={adminSubmissionRows}
        isLoadingSubmissions={isLoadingSubmissions}
        analytics={analytics}
        winner={{ topScore, winners }}
        message={message}
        savingUserId={savingUserId}
        pendingRoles={pendingRoles}
        onRoleChange={handleRoleChange}
        onSaveRole={handleSaveRole}
        onApproveJudge={handleApproveJudge}
        adminGrantEmail={adminGrantEmail}
        onAdminGrantEmailChange={setAdminGrantEmail}
        pendingAdminGrants={pendingAdminGrants}
        isGrantingAdmin={isGrantingAdmin}
        onGrantAdminAccess={handleGrantAdminAccess}
        isCreatingSubmission={isCreatingSubmission}
        deletingSubmissionId={deletingSubmissionId}
        onCreateSubmission={handleCreateSubmission}
        onDeleteSubmission={handleDeleteSubmission}
      />
    </DashboardLayout>
  );
}
