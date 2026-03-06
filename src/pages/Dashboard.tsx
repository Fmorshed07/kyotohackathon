import { Navigate } from "react-router-dom";
import { usePortalAuth } from "@/hooks/usePortalAuth";

export default function Dashboard() {
  const { sessionUser, loading: authLoading, signOut } = usePortalAuth();

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
    return <Navigate to="/dashboard/participant" replace />;
  }

  if (sessionUser.role === "judge") {
    if (sessionUser.judgeApprovalStatus === "pending") {
      return (
        <div className="flex min-h-svh items-center justify-center bg-background px-6">
          <div className="max-w-xl rounded-xl border border-border/50 bg-card/80 p-8 text-center">
            <p className="font-display text-sm uppercase tracking-[0.2em] text-muted-foreground">
              Judge approval pending
            </p>
            <p className="mt-2 text-sm text-foreground">
              Your judge account is waiting for admin approval. You will be able to access the judge
              dashboard after approval.
            </p>
            <button
              type="button"
              onClick={() => signOut()}
              className="mt-4 text-sm text-primary underline underline-offset-4"
            >
              Sign out
            </button>
          </div>
        </div>
      );
    }
    return <Navigate to="/dashboard/judge" replace />;
  }

  if (sessionUser.role === "admin") {
    return <Navigate to="/dashboard/admin" replace />;
  }

  if (sessionUser.role !== "participant" && sessionUser.role !== "judge" && sessionUser.role !== "admin") {
    return (
      <div className="flex min-h-svh items-center justify-center bg-background">
        <div className="rounded-xl border border-border/50 bg-card/80 p-8 text-center">
          <p className="font-display text-sm uppercase tracking-[0.2em] text-muted-foreground">
            No role assigned
          </p>
          <p className="mt-2 text-sm text-foreground">
            Your account does not have a participant, judge, or admin role. Please contact organisers or sign in with a different account.
          </p>
          <button
            type="button"
            onClick={() => signOut()}
            className="mt-4 text-sm text-primary underline underline-offset-4"
          >
            Sign out
          </button>
        </div>
      </div>
    );
  }

  return null;
}
