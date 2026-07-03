import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { collection, doc, getDoc, getDocs, query, setDoc, where } from "firebase/firestore";
import { getDashboardPathForUser } from "@/lib/portalRoutes";
import { getFirestoreDb } from "@/lib/firebaseClient";
import { usePortalAuth } from "@/hooks/usePortalAuth";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { ParticipantDashboard } from "@/components/dashboard/ParticipantDashboard";
import { getSubmissionHackathonId, SITE_HACKATHON_ID } from "@/lib/hackathons";
import type { Submission } from "@/types/portal";

const initialParticipantForm = {
  title: "",
  shortDescription: "",
  projectUrl: "",
  submissionPdfUrl: "",
  demoVideoUrl: "",
  teamName: "",
  memberNames: "",
};

export default function ParticipantDashboardPage() {
  const { sessionUser, loading: authLoading, signOut } = usePortalAuth();
  const db = getFirestoreDb();

  const [participantSubmissions, setParticipantSubmissions] = useState<Submission[]>([]);
  const [participantSubmission, setParticipantSubmission] = useState<Submission | null>(null);
  const [activeSubmissionId, setActiveSubmissionId] = useState<string | null>(null);
  const [participantForm, setParticipantForm] = useState(initialParticipantForm);
  const [isSubmittingProject, setIsSubmittingProject] = useState(false);
  const [submissionMessage, setSubmissionMessage] = useState<string | null>(null);

  const mapSubmissionToForm = (data: Submission) => ({
    title: data.title ?? "",
    shortDescription: data.short_description ?? "",
    projectUrl: data.project_url ?? "",
    submissionPdfUrl: data.submission_pdf_url ?? "",
    demoVideoUrl: data.demo_video_url ?? "",
    teamName: data.team_name ?? "",
    memberNames: data.member_names ?? "",
  });

  useEffect(() => {
    if (!sessionUser || sessionUser.role !== "participant") return;

    const loadSubmission = async () => {
      try {
        const kyotoSubmissionsQuery = query(
          collection(db, "submissions"),
          where("user_id", "==", sessionUser.id),
          where("hackathon_id", "==", SITE_HACKATHON_ID)
        );
        const kyotoSubmissionsSnap = await getDocs(kyotoSubmissionsQuery);
        const kyotoSubmissions = kyotoSubmissionsSnap.docs.map((docSnap) => ({
          id: docSnap.id,
          ...(docSnap.data() as Omit<Submission, "id">),
        })) as Submission[];

        const sortedSubmissions = kyotoSubmissions.sort((left, right) => {
          const leftDate = Date.parse(left.created_at ?? "");
          const rightDate = Date.parse(right.created_at ?? "");
          if (Number.isNaN(leftDate) && Number.isNaN(rightDate)) return 0;
          if (Number.isNaN(leftDate)) return 1;
          if (Number.isNaN(rightDate)) return -1;
          return rightDate - leftDate;
        });

        if (sortedSubmissions.length > 0) {
          const activeSubmission = sortedSubmissions[0];
          setParticipantSubmissions(sortedSubmissions);
          setActiveSubmissionId(activeSubmission.id);
          setParticipantSubmission(activeSubmission);
          setParticipantForm(mapSubmissionToForm(activeSubmission));
        }
      } catch {
        // ignore load errors and keep editable form state
      }
    };

    void loadSubmission();
  }, [sessionUser, db]);

  const handleSelectSubmission = (submissionId: string) => {
    const selectedSubmission = participantSubmissions.find((submission) => submission.id === submissionId);
    if (!selectedSubmission) return;

    setActiveSubmissionId(selectedSubmission.id);
    setParticipantSubmission(selectedSubmission);
    setParticipantForm(mapSubmissionToForm(selectedSubmission));
    setSubmissionMessage(null);
  };

  const handleParticipantSubmit = async () => {
    if (!sessionUser) return;

    setIsSubmittingProject(true);
    setSubmissionMessage(null);
    try {
      const hasKyotoSubmission =
        participantSubmission &&
        activeSubmissionId &&
        getSubmissionHackathonId(participantSubmission) === SITE_HACKATHON_ID;

      const payload = {
        user_id: sessionUser.id,
        hackathon_id: SITE_HACKATHON_ID,
        title: participantForm.title,
        short_description: participantForm.shortDescription,
        project_url: participantForm.projectUrl,
        submission_pdf_url: participantForm.submissionPdfUrl,
        demo_video_url: participantForm.demoVideoUrl,
        team_name: participantForm.teamName,
        member_names: participantForm.memberNames,
        role: "participant",
        created_at: hasKyotoSubmission
          ? (participantSubmission?.created_at ?? new Date().toISOString())
          : new Date().toISOString(),
      };

      const submissionRef = hasKyotoSubmission
        ? doc(db, "submissions", activeSubmissionId!)
        : doc(collection(db, "submissions"));

      if (hasKyotoSubmission) {
        await setDoc(submissionRef, payload, { merge: true });
      } else {
        await setDoc(submissionRef, payload);
      }

      const submissionSnap = await getDoc(submissionRef);
      if (submissionSnap.exists()) {
        const data = {
          id: submissionSnap.id,
          ...(submissionSnap.data() as Omit<Submission, "id">),
        } as Submission;
        setActiveSubmissionId(data.id);
        setParticipantSubmission(data);
        setParticipantSubmissions((current) => {
          const existingIndex = current.findIndex((submission) => submission.id === data.id);
          if (existingIndex === -1) {
            return [data, ...current];
          }
          const updated = [...current];
          updated[existingIndex] = data;
          return updated;
        });
        setSubmissionMessage("Submission saved successfully.");
      }
    } catch (error: unknown) {
      const message =
        typeof error === "object" && error && "message" in error
          ? String((error as { message?: string }).message)
          : "An error occurred while saving your submission.";
      setSubmissionMessage(message);
    } finally {
      setIsSubmittingProject(false);
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
    return (
      <Navigate
        to={getDashboardPathForUser(sessionUser.role, sessionUser.judgeApprovalStatus)}
        replace
      />
    );
  }

  if (sessionUser.role !== "participant") {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <DashboardLayout sessionUser={sessionUser} role="participant" onSignOut={signOut}>
      <ParticipantDashboard
        participantForm={participantForm}
        setParticipantForm={setParticipantForm}
        participantSubmissions={participantSubmissions}
        activeSubmissionId={activeSubmissionId}
        onSelectSubmission={handleSelectSubmission}
        participantSubmission={participantSubmission}
        submissionMessage={submissionMessage}
        isSubmittingProject={isSubmittingProject}
        onSave={handleParticipantSubmit}
      />
    </DashboardLayout>
  );
}
