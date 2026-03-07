import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { getFirestoreDb } from "@/lib/firebaseClient";
import { usePortalAuth } from "@/hooks/usePortalAuth";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { ParticipantDashboard } from "@/components/dashboard/ParticipantDashboard";
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

  const [participantSubmission, setParticipantSubmission] = useState<Submission | null>(null);
  const [participantForm, setParticipantForm] = useState(initialParticipantForm);
  const [isSubmittingProject, setIsSubmittingProject] = useState(false);
  const [submissionMessage, setSubmissionMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionUser || sessionUser.role !== "participant") return;

    const loadSubmission = async () => {
      try {
        const submissionRef = doc(db, "submissions", sessionUser.id);
        const submissionSnap = await getDoc(submissionRef);
        if (!submissionSnap.exists()) return;

        const data = {
          id: submissionSnap.id,
          ...(submissionSnap.data() as Omit<Submission, "id">),
        } as Submission;
        setParticipantSubmission(data);
        setParticipantForm({
          title: data.title ?? "",
          shortDescription: data.short_description ?? "",
          projectUrl: data.project_url ?? "",
          submissionPdfUrl: data.submission_pdf_url ?? "",
          demoVideoUrl: data.demo_video_url ?? "",
          teamName: data.team_name ?? "",
          memberNames: data.member_names ?? "",
        });
      } catch {
        // ignore load errors and keep editable form state
      }
    };

    void loadSubmission();
  }, [sessionUser, db]);

  const handleParticipantSubmit = async () => {
    if (!sessionUser) return;

    setIsSubmittingProject(true);
    setSubmissionMessage(null);
    try {
      const payload = {
        user_id: sessionUser.id,
        title: participantForm.title,
        short_description: participantForm.shortDescription,
        project_url: participantForm.projectUrl,
        submission_pdf_url: participantForm.submissionPdfUrl,
        demo_video_url: participantForm.demoVideoUrl,
        team_name: participantForm.teamName,
        member_names: participantForm.memberNames,
        role: "participant",
      };
      const submissionRef = doc(db, "submissions", sessionUser.id);
      await setDoc(submissionRef, payload, { merge: true });
      const submissionSnap = await getDoc(submissionRef);
      if (submissionSnap.exists()) {
        const data = {
          id: submissionSnap.id,
          ...(submissionSnap.data() as Omit<Submission, "id">),
        } as Submission;
        setParticipantSubmission(data);
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

  if (sessionUser.role === "judge") {
    return <Navigate to="/dashboard/judge" replace />;
  }

  if (sessionUser.role !== "participant") {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <DashboardLayout sessionUser={sessionUser} role="participant" onSignOut={signOut}>
      <ParticipantDashboard
        participantForm={participantForm}
        setParticipantForm={setParticipantForm}
        participantSubmission={participantSubmission}
        submissionMessage={submissionMessage}
        isSubmittingProject={isSubmittingProject}
        onSave={handleParticipantSubmit}
      />
    </DashboardLayout>
  );
}
