import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { deleteField, doc, setDoc } from "firebase/firestore";
import { usePortalAuth } from "@/hooks/usePortalAuth";
import { getFirestoreDb } from "@/lib/firebaseClient";
import { SITE_HACKATHON_ID } from "@/lib/hackathons";
import { participantNeedsOnboarding } from "@/lib/portalRoutes";

export default function Dashboard() {
  const navigate = useNavigate();
  const db = getFirestoreDb();
  const { sessionUser, loading: authLoading, signOut } = usePortalAuth();
  const [isClaimingParticipant, setIsClaimingParticipant] = useState(false);
  const [claimError, setClaimError] = useState<string | null>(null);

  const claimParticipant = async () => {
    if (!sessionUser) return;
    setIsClaimingParticipant(true);
    setClaimError(null);
    try {
      const hackathonId = sessionUser.hackathonId ?? SITE_HACKATHON_ID;
      await setDoc(
        doc(db, "users", sessionUser.id),
        {
          email: sessionUser.email,
          role: "participant",
          hackathon_id: hackathonId,
          hackathon_ids: sessionUser.hackathonIds?.length
            ? sessionUser.hackathonIds
            : [hackathonId],
          ...(sessionUser.role === "judge" || sessionUser.role === "mentor"
            ? { judgeApprovalStatus: deleteField() }
            : {}),
        },
        { merge: true }
      );
      navigate("/onboarding", { replace: true });
    } catch (error: unknown) {
      const message =
        typeof error === "object" && error && "message" in error
          ? String((error as { message?: string }).message)
          : "Could not join as participant. Please try again.";
      setClaimError(message);
    } finally {
      setIsClaimingParticipant(false);
    }
  };

  if (authLoading) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">Loading…</p>
      </div>
    );
  }

  if (!sessionUser) {
    return <Navigate to="/signin" replace />;
  }

  if (sessionUser.role === "participant") {
    if (participantNeedsOnboarding(sessionUser)) {
      return <Navigate to="/onboarding" replace />;
    }
    return <Navigate to="/dashboard/participant" replace />;
  }

  if (sessionUser.role === "host") {
    return <Navigate to="/dashboard/host" replace />;
  }

  if (sessionUser.role === "judge" || sessionUser.role === "mentor") {
    if (sessionUser.judgeApprovalStatus === "pending") {
      return (
        <div className="flex min-h-svh items-center justify-center bg-background px-6">
          <div className="max-w-xl rounded-xl border border-border/50 bg-card/80 p-8 text-center">
            <p className="font-display text-sm uppercase tracking-[0.2em] text-muted-foreground">
              {sessionUser.role === "mentor" ? "Mentor" : "Judge"} approval pending
            </p>
            <p className="mt-2 text-sm text-foreground">
              Your {sessionUser.role === "mentor" ? "mentor" : "judge"} account is waiting for admin
              approval. You will be able to access the dashboard after approval.
            </p>
            <p className="mt-3 text-sm text-muted-foreground">
              Want to build instead? Participants do not need admin approval.
            </p>
            {claimError ? <p className="mt-3 text-xs text-destructive">{claimError}</p> : null}
            <div className="mt-4 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <button
                type="button"
                disabled={isClaimingParticipant}
                onClick={() => void claimParticipant()}
                className="text-sm text-primary underline underline-offset-4 disabled:opacity-60"
              >
                {isClaimingParticipant ? "Joining…" : "Join as participant"}
              </button>
              <button
                type="button"
                onClick={() => signOut()}
                className="text-sm text-muted-foreground underline underline-offset-4"
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      );
    }
    return <Navigate to="/dashboard/judge" replace />;
  }

  if (sessionUser.role === "admin") {
    return <Navigate to="/dashboard/admin" replace />;
  }

  return (
    <div className="flex min-h-svh items-center justify-center bg-background px-6">
      <div className="max-w-xl rounded-xl border border-border/50 bg-card/80 p-8 text-center">
        <p className="font-display text-sm uppercase tracking-[0.2em] text-muted-foreground">
          Finish signup
        </p>
        <p className="mt-2 text-sm text-foreground">
          Your Google account is signed in, but participant enrollment is not finished yet. No admin
          approval is required.
        </p>
        {claimError ? <p className="mt-3 text-xs text-destructive">{claimError}</p> : null}
        <div className="mt-4 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <button
            type="button"
            disabled={isClaimingParticipant}
            onClick={() => void claimParticipant()}
            className="text-sm text-primary underline underline-offset-4 disabled:opacity-60"
          >
            {isClaimingParticipant ? "Joining…" : "Continue as participant"}
          </button>
          <Link to="/signup" className="text-sm text-muted-foreground underline underline-offset-4">
            Back to signup
          </Link>
          <button
            type="button"
            onClick={() => signOut()}
            className="text-sm text-muted-foreground underline underline-offset-4"
          >
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
}
