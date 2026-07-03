import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import AnimatedBackground from "@/components/AnimatedBackground";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { GoogleAuthProvider, signInWithPopup, signOut as firebaseSignOut } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { getFirebaseAuth, getFirestoreDb } from "@/lib/firebaseClient";
import { getDashboardPathForUser } from "@/lib/portalRoutes";
import { usePortalAuth } from "@/hooks/usePortalAuth";
import { SITE_HACKATHON_ID } from "@/lib/hackathons";
import type { JudgeApprovalStatus, PortalRole } from "@/types/portal";

const sectionClass =
  "rounded-xl border border-border/50 bg-card/80 backdrop-blur-sm shadow-lg shadow-black/10";

type AuthRole = "participant" | "mentor";

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

const isStaffRole = (role: PortalRole | undefined) => role === "mentor" || role === "judge";

const GoogleIcon = () => (
  <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden>
    <path
      fill="currentColor"
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
    />
    <path
      fill="currentColor"
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
    />
    <path
      fill="currentColor"
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
    />
    <path
      fill="currentColor"
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
    />
  </svg>
);

export default function SignIn() {
  const navigate = useNavigate();
  const location = useLocation();
  const auth = getFirebaseAuth();
  const db = getFirestoreDb();
  const { sessionUser, loading: authLoading } = usePortalAuth();

  const searchMode = new URLSearchParams(location.search).get("mode");
  const stateMode = (location.state as { mode?: "signin" | "signup" })?.mode;
  const isSignupPath = location.pathname === "/signup";
  const initialMode =
    searchMode === "signin" || stateMode === "signin"
      ? "signin"
      : searchMode === "signup" || stateMode === "signup" || isSignupPath
        ? "signup"
        : "signup";

  const [authRole, setAuthRole] = useState<AuthRole>("participant");
  const [mode, setMode] = useState<"signin" | "signup">(initialMode);
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    const m = new URLSearchParams(location.search).get("mode");
    if (m === "signin" || m === "signup") {
      setMode(m);
      return;
    }
    if (location.pathname === "/signup") setMode("signup");
    if (location.pathname === "/signin") setMode("signin");
  }, [location.search, location.pathname]);

  useEffect(() => {
    if (authLoading) return;
    if (
      sessionUser?.role === "participant" ||
      sessionUser?.role === "mentor" ||
      sessionUser?.role === "judge" ||
      sessionUser?.role === "admin"
    ) {
      navigate(getDashboardPathForUser(sessionUser.role, sessionUser.judgeApprovalStatus), {
        replace: true,
      });
    }
  }, [authLoading, sessionUser, navigate]);

  const handleGoogleAuth = async () => {
    setIsAuthLoading(true);
    setAuthError(null);
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      const user = auth.currentUser;
      if (!user) return;

      const userRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userRef);
      const existingRole = normalizePortalRole(userSnap.data()?.role);
      const existingJudgeApprovalStatus = normalizeJudgeApprovalStatus(
        userSnap.data()?.judgeApprovalStatus
      );

      if (existingRole === "admin") {
        navigate("/dashboard/admin", { replace: true });
        return;
      }

      if (mode === "signin" && existingRole && existingRole !== authRole) {
        navigate(getDashboardPathForUser(existingRole, existingJudgeApprovalStatus), {
          replace: true,
        });
        return;
      }

      if (mode === "signin" && !existingRole) {
        await firebaseSignOut(auth);
        setAuthError("No account found for this Google account. Please sign up first.");
        return;
      }

      const targetRole = existingRole ?? authRole;
      const targetJudgeApprovalStatus = isStaffRole(targetRole)
        ? existingJudgeApprovalStatus ?? (existingRole ? "approved" : "pending")
        : undefined;

      await setDoc(
        userRef,
        {
          email: user.email,
          role: targetRole,
          ...(mode === "signup" ? { hackathon_id: SITE_HACKATHON_ID } : {}),
          ...(isStaffRole(targetRole) ? { judgeApprovalStatus: targetJudgeApprovalStatus } : {}),
        },
        { merge: true }
      );
      navigate(getDashboardPathForUser(targetRole, targetJudgeApprovalStatus), { replace: true });
    } catch (error: unknown) {
      const message =
        typeof error === "object" && error && "message" in error
          ? String((error as { message?: string }).message)
          : "An unknown error occurred during sign in.";
      setAuthError(message);
    } finally {
      setIsAuthLoading(false);
    }
  };

  if (
    authLoading ||
    (sessionUser &&
      (sessionUser.role === "participant" ||
        sessionUser.role === "mentor" ||
        sessionUser.role === "judge" ||
        sessionUser.role === "admin"))
  ) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">Redirecting to dashboard…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <AnimatedBackground />

      <main className="relative mx-auto max-w-5xl px-6 pt-12 pb-20">
        <section
          className={`${sectionClass} mb-8 flex flex-col gap-6 p-6 sm:flex-row sm:items-center sm:justify-between`}
          aria-label="Sign in header"
        >
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-primary/70">Impact Kyoto</p>
            <h1 className="mt-2 font-display text-2xl tracking-[0.18em] uppercase md:text-3xl">
              {mode === "signup" ? "Sign Up" : "Log In"}
            </h1>
            <p className="mt-2 max-w-xl text-sm text-muted-foreground">
              {mode === "signup"
                ? "Create your account as a participant or mentor using Google."
                : "Log in as a participant or mentor with your Google account."}
            </p>
          </div>
        </section>

        <section className={sectionClass} aria-labelledby="auth-heading">
          <Card className="border-0 bg-transparent shadow-none">
            <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pb-2">
              <div>
                <CardTitle id="auth-heading" className="text-sm uppercase tracking-[0.28em]">
                  {mode === "signup" ? "Create Account" : "Welcome Back"}
                </CardTitle>
                <p className="mt-1 text-xs text-muted-foreground">
                  Choose your role, then continue with Google.
                </p>
              </div>
              <Tabs
                value={authRole}
                onValueChange={(v) => setAuthRole(v as AuthRole)}
                className="w-full sm:w-auto"
              >
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="participant">Participant</TabsTrigger>
                  <TabsTrigger value="mentor">Mentor</TabsTrigger>
                </TabsList>
              </Tabs>
            </CardHeader>
            <CardContent className="space-y-5 pt-2">
              <div className="flex flex-wrap items-center gap-3">
                <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-muted/40 px-2 py-1 text-[0.7rem] uppercase tracking-[0.25em]">
                  <button
                    type="button"
                    className={`rounded-full px-3 py-1 transition ${
                      mode === "signup" ? "bg-primary text-primary-foreground" : "text-foreground/70"
                    }`}
                    onClick={() => setMode("signup")}
                  >
                    Sign Up
                  </button>
                  <button
                    type="button"
                    className={`rounded-full px-3 py-1 transition ${
                      mode === "signin" ? "bg-primary text-primary-foreground" : "text-foreground/70"
                    }`}
                    onClick={() => setMode("signin")}
                  >
                    Log In
                  </button>
                </div>
                <p className="text-[0.7rem] text-muted-foreground">
                  {mode === "signup"
                    ? `Register as a ${authRole}.`
                    : `Log in to your ${authRole} account.`}
                </p>
              </div>

              <Button
                type="button"
                variant="outline"
                className="w-full gap-2 tracking-[0.2em] uppercase"
                onClick={handleGoogleAuth}
                disabled={isAuthLoading}
              >
                <GoogleIcon />
                {isAuthLoading
                  ? "Please wait..."
                  : mode === "signup"
                    ? "Sign up with Google"
                    : "Log in with Google"}
              </Button>

              {authError && <p className="text-xs text-destructive">{authError}</p>}

              <p className="border-t border-border/40 pt-4 text-[0.7rem] text-muted-foreground">
                Participant and mentor accounts use Google sign-in only. Admin access is available at{" "}
                <a href="/admin" className="text-primary underline underline-offset-4">
                  /admin
                </a>
                .
              </p>
            </CardContent>
          </Card>
        </section>
      </main>
    </div>
  );
}
