import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { addDoc, collection, deleteDoc, doc, getDocs, setDoc } from "firebase/firestore";
import { getFirestoreDb } from "@/lib/firebaseClient";
import { usePortalAuth } from "@/hooks/usePortalAuth";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import {
  AdminDashboard,
  type NewSubmissionInput,
  type AdminSubmissionRow,
  type AdminUser,
} from "@/components/dashboard/AdminDashboard";
import type { JudgeApprovalStatus, PortalRole, Submission } from "@/types/portal";

const normalizePortalRole = (value: unknown): PortalRole | undefined => {
  if (typeof value !== "string") return undefined;
  const normalized = value.trim().toLowerCase();
  if (normalized === "judge" || normalized === "judges") return "judge";
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

export default function AdminDashboardPage() {
  const { sessionUser, loading: authLoading, signOut } = usePortalAuth();
  const db = getFirestoreDb();

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
            const judgeApprovalStatus =
              role === "judge"
                ? normalizeJudgeApprovalStatus(data.judgeApprovalStatus) ?? "approved"
                : undefined;
            return {
              id: docSnap.id,
              email: data.email,
              role,
              judgeApprovalStatus,
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

    const loadSubmissions = async () => {
      setIsLoadingSubmissions(true);
      try {
        const submissionsRef = collection(db, "submissions");
        const snapshot = await getDocs(submissionsRef);
        const allSubmissions: Submission[] = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...(docSnap.data() as Omit<Submission, "id">),
        }));
        setSubmissions(allSubmissions);
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
    void loadSubmissions();
  }, [sessionUser, db]);

  const getUserEmail = (identifier: string | null | undefined) => {
    if (!identifier) return null;
    const normalizedIdentifier = identifier.trim().toLowerCase();
    return userEmailLookup[identifier] ?? userEmailLookup[normalizedIdentifier] ?? null;
  };

  const participantById = users
    .filter((user) => user.role === "participant")
    .reduce<Record<string, AdminUser>>((acc, user) => {
      acc[user.id] = user;
      return acc;
    }, {});

  const judgeById = users
    .filter((user) => user.role === "judge")
    .reduce<Record<string, AdminUser>>((acc, user) => {
      acc[user.id] = user;
      return acc;
    }, {});

  const adminSubmissionRows: AdminSubmissionRow[] = submissions
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
    });

  const scoredRows = adminSubmissionRows.filter((row) => row.averageScore != null);
  const topScore =
    scoredRows.length > 0 ? Math.max(...scoredRows.map((row) => row.averageScore ?? 0)) : null;
  const winners =
    topScore == null
      ? []
      : scoredRows.filter((row) => row.averageScore != null && row.averageScore === topScore);
  const allScores = adminSubmissionRows.flatMap((row) =>
    row.judgeMarks
      .map((mark) => mark.score)
      .filter((score): score is number => typeof score === "number")
  );
  const activeJudgeIds = new Set(
    adminSubmissionRows.flatMap((row) =>
      row.judgeMarks
        .filter((mark) => typeof mark.score === "number")
        .map((mark) => mark.judgeId)
    )
  );
  const analytics = {
    totalSubmissions: adminSubmissionRows.length,
    scoredSubmissions: scoredRows.length,
    unscoredSubmissions: adminSubmissionRows.length - scoredRows.length,
    averageScore:
      allScores.length > 0
        ? allScores.reduce((total, score) => total + score, 0) / allScores.length
        : null,
    activeJudgeCount: activeJudgeIds.size,
  };

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
      const nextJudgeApprovalStatus =
        nextRole === "judge"
          ? user.role === "judge" && user.judgeApprovalStatus === "pending"
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
                judgeApprovalStatus: nextRole === "judge" ? nextJudgeApprovalStatus ?? "approved" : undefined,
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
    if (user.role !== "judge" || user.judgeApprovalStatus !== "pending") return;
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
      setMessage(`Approved judge access for ${user.email}.`);
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

  if (sessionUser.role === "participant") {
    return <Navigate to="/dashboard/participant" replace />;
  }

  if (sessionUser.role === "judge") {
    return <Navigate to="/dashboard/judge" replace />;
  }

  if (sessionUser.role !== "admin") {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <DashboardLayout sessionUser={sessionUser} role="admin" onSignOut={signOut}>
      <AdminDashboard
        users={users}
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
        isCreatingSubmission={isCreatingSubmission}
        deletingSubmissionId={deletingSubmissionId}
        onCreateSubmission={handleCreateSubmission}
        onDeleteSubmission={handleDeleteSubmission}
      />
    </DashboardLayout>
  );
}
