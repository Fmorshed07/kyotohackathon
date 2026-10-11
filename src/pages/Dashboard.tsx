import { useEffect, useRef, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { deleteField, doc, setDoc } from "firebase/firestore";
import { usePortalAuth } from "@/hooks/usePortalAuth";
import { getFirebaseAuth, getFirestoreDb } from "@/lib/firebaseClient";
import {
  SITE_HACKATHON_ID,
  clearPendingHackathon,
  readPendingHackathon,
} from "@/lib/hackathons";
import { canAccessHostDashboard, canAccessStaffDashboard, participantNeedsOnboarding } from "@/lib/portalRoutes";

export default function Dashboard() {
  const navigate = useNavigate();
  const auth = getFirebaseAuth();
  const db = getFirestoreDb();
  const { sessionUser, loading: authLoading, signOut } = usePortalAuth();
  const [isClaimingParticipant, setIsClaimingParticipant] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [claimError, setClaimError] = useState<string | null>(null);
  const accountGenerationRef = useRef(0);
  const pendingActionRef = useRef<number | null>(null);

  useEffect(() => {
    accountGenerationRef.current += 1;
    pendingActionRef.current = null;
    setIsClaimingParticipant(false);
    setIsSigningOut(false);
    setClaimError(null);
    return () => { accountGenerationRef.current += 1; };
  }, [sessionUser?.id]);

  const claimParticipant = async () => {
    if (!sessionUser || auth.currentUser?.uid !== sessionUser.id) return;
    const generation = accountGenerationRef.current;
    if (pendingActionRef.current === generation) return;
    pendingActionRef.current = generation;
    const isCurrentAccount = () => accountGenerationRef.current === generation && auth.currentUser?.uid === sessionUser.id;
    setIsClaimingParticipant(true);
    setClaimError(null);
    try {
      const pendingHackathon = readPendingHackathon();
      const hackathonId =
        pendingHackathon ?? sessionUser.hackathonId ?? SITE_HACKATHON_ID;
      const nextIds = Array.from(
        new Set(
          [
            hackathonId,
            ...(sessionUser.hackathonIds ?? []),
            ...(pendingHackathon ? [pendingHackathon] : []),
          ].filter(Boolean)
        )
      );
      await setDoc(
        doc(db, "users", sessionUser.id),
        {
          email: sessionUser.email,
          role: "participant",
          hackathon_id: hackathonId,
          hackathon_ids: nextIds,
          ...(sessionUser.role === "judge" || sessionUser.role === "mentor"
            ? { judgeApprovalStatus: deleteField() }
            : {}),
        },
        { merge: true }
      );
      if (!isCurrentAccount()) return;
      if (readPendingHackathon() === pendingHackathon) clearPendingHackathon();
      navigate(
        pendingHackathon
          ? `/onboarding?hackathon=${encodeURIComponent(pendingHackathon)}`
          : "/onboarding",
        { replace: true }
      );
    } catch (error: unknown) {
      if (!isCurrentAccount()) return;
      const message =
        typeof error === "object" && error && "message" in error
          ? String((error as { message?: string }).message)
          : "Could not join as participant. Please try again.";
      setClaimError(message);
    } finally {
      if (accountGenerationRef.current === generation) {
        pendingActionRef.current = null;
        setIsClaimingParticipant(false);
      }
    }
  };

  const handleSignOut = async () => {
    if (!sessionUser || auth.currentUser?.uid !== sessionUser.id) return;
    const generation = accountGenerationRef.current;
    if (pendingActionRef.current === generation) return;
    pendingActionRef.current = generation;
    setIsSigningOut(true);
    setClaimError(null);
    try {
      await signOut();
    } catch {
      if (accountGenerationRef.current === generation && auth.currentUser?.uid === sessionUser.id) {
        setClaimError("Could not sign out. Please try again.");
      }
    } finally {
      if (accountGenerationRef.current === generation) {
        pendingActionRef.current = null;
        setIsSigningOut(false);
      }
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
      const pending = readPendingHackathon();
      return (
        <Navigate
          to={pending ? `/onboarding?hackathon=${encodeURIComponent(pending)}` : "/onboarding"}
          replace
        />
      );
    }
    return <Navigate to="/dashboard/participant" replace />;
  }

  if (sessionUser.role === "host") {
    if (canAccessHostDashboard(sessionUser.role, sessionUser.hostApprovalStatus)) {
      return <Navigate to="/dashboard/host" replace />;
    }
    return (
      <div className="flex min-h-svh items-center justify-center bg-background px-6">
        <div className="max-w-xl rounded-xl border border-border/50 bg-card/80 p-8 text-center">
          <p className="font-display text-sm uppercase tracking-[0.2em] text-muted-foreground">
            Host approval pending
          </p>
          <p className="mt-2 text-sm text-foreground">
            Your host request is waiting for admin approval. Meanwhile you can still join as a
            participant and use the builder dashboard.
          </p>
          {claimError ? <p role="alert" className="mt-3 text-xs text-destructive">{claimError}</p> : null}
          <div className="mt-5 grid gap-2 sm:grid-cols-2">
            <button
              type="button"
              disabled={isClaimingParticipant || isSigningOut}
              onClick={() => void claimParticipant()}
              className="rounded-lg border border-primary/40 bg-primary/10 px-3 py-2 text-sm font-medium text-primary disabled:opacity-60"
            >
              {isClaimingParticipant ? "Opening…" : "Open participant dashboard"}
            </button>
            <Link
              to="/signup?role=host"
              className="rounded-lg border border-border px-3 py-2 text-sm text-muted-foreground"
            >
              Host signup help
            </Link>
          </div>
          <button
            type="button"
            disabled={isClaimingParticipant || isSigningOut}
            onClick={() => void handleSignOut()}
            className="mt-4 text-sm text-muted-foreground underline underline-offset-4"
          >
            {isSigningOut ? "Signing out…" : "Sign out"}
          </button>
        </div>
      </div>
    );
  }

  if (sessionUser.role === "judge" || sessionUser.role === "mentor") {
    if (!canAccessStaffDashboard(sessionUser.role, sessionUser.judgeApprovalStatus)) {
      return (
        <div className="flex min-h-svh items-center justify-center bg-background px-6">
          <div className="max-w-xl rounded-xl border border-border/50 bg-card/80 p-8 text-center">
            <p className="font-display text-sm uppercase tracking-[0.2em] text-muted-foreground">
              {sessionUser.role === "mentor" ? "Mentor" : "Judge"} approval pending
            </p>
            <p className="mt-2 text-sm text-foreground">
              Your {sessionUser.role === "mentor" ? "mentor" : "judge"} account is waiting for admin
              approval. You can still open a participant workspace without waiting.
            </p>
            {claimError ? <p role="alert" className="mt-3 text-xs text-destructive">{claimError}</p> : null}
            <div className="mt-5 grid gap-2 sm:grid-cols-2">
              <button
                type="button"
                disabled={isClaimingParticipant || isSigningOut}
                onClick={() => void claimParticipant()}
                className="rounded-lg border border-primary/40 bg-primary/10 px-3 py-2 text-sm font-medium text-primary disabled:opacity-60"
              >
                {isClaimingParticipant ? "Opening…" : "Open participant dashboard"}
              </button>
              <Link
                to="/signup?role=judge"
                className="rounded-lg border border-border px-3 py-2 text-sm text-muted-foreground"
              >
                Judge signup help
              </Link>
            </div>
            <button
              type="button"
              disabled={isClaimingParticipant || isSigningOut}
              onClick={() => void handleSignOut()}
              className="mt-4 text-sm text-muted-foreground underline underline-offset-4"
            >
              {isSigningOut ? "Signing out…" : "Sign out"}
            </button>
          </div>
        </div>
      );
    }
    if (canAccessStaffDashboard(sessionUser.role, sessionUser.judgeApprovalStatus)) {
      return <Navigate to="/dashboard/judge" replace />;
    }
  }

  if (sessionUser.role === "admin") {
    return <Navigate to="/dashboard/admin" replace />;
  }

  return (
    <div className="flex min-h-svh items-center justify-center bg-background px-6">
      <div className="max-w-xl rounded-xl border border-border/50 bg-card/80 p-8 text-center">
        <p className="font-display text-sm uppercase tracking-[0.2em] text-muted-foreground">
          Choose a dashboard
        </p>
        <p className="mt-2 text-sm text-foreground">
          Your Google account is signed in. Pick how you want to continue — participant access is
          immediate.
        </p>
        {claimError ? <p role="alert" className="mt-3 text-xs text-destructive">{claimError}</p> : null}
        <div className="mt-5 grid gap-2">
          <button
            type="button"
            disabled={isClaimingParticipant || isSigningOut}
            onClick={() => void claimParticipant()}
            className="rounded-lg border border-primary/40 bg-primary/10 px-3 py-2 text-sm font-medium text-primary disabled:opacity-60"
          >
            {isClaimingParticipant ? "Opening…" : "Continue as participant"}
          </button>
          <Link
            to="/signup?role=judge"
            className="rounded-lg border border-border px-3 py-2 text-sm text-muted-foreground"
          >
            Join as judge / mentor
          </Link>
          <Link
            to="/signup?role=host"
            className="rounded-lg border border-border px-3 py-2 text-sm text-muted-foreground"
          >
            Request host access
          </Link>
        </div>
        <button
          type="button"
          disabled={isClaimingParticipant || isSigningOut}
          onClick={() => void handleSignOut()}
          className="mt-4 text-sm text-muted-foreground underline underline-offset-4"
        >
          {isSigningOut ? "Signing out…" : "Sign out"}
        </button>
      </div>
    </div>
  );
}
