import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import AnimatedBackground from "@/components/AnimatedBackground";
import BrandLogo from "@/components/BrandLogo";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GoogleAuthProvider, signInWithPopup, signOut as firebaseSignOut } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { getFirebaseAuth, getFirestoreDb } from "@/lib/firebaseClient";
import { getDashboardPathForUser, isStaffRole, participantNeedsOnboarding } from "@/lib/portalRoutes";
import { consumePendingAdminGrant, hasPendingAdminGrant } from "@/lib/adminGrants";
import { usePortalAuth } from "@/hooks/usePortalAuth";
import type { JudgeApprovalStatus, PortalRole, SessionUser } from "@/types/portal";

const sectionClass = "rounded-xl border border-border bg-card";

type AuthRole = "participant" | "judge" | "host";

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

const pathForSession = (user: Pick<SessionUser, "role" | "judgeApprovalStatus" | "onboardingCompletedAt" | "profile">) =>
  getDashboardPathForUser(user.role, user.judgeApprovalStatus, {
    needsOnboarding: participantNeedsOnboarding(user),
  });

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

const roleCopy: Record<
  AuthRole,
  { signupHint: string; signinHint: string; headerSignup: string; headerSignin: string }
> = {
  participant: {
    signupHint:
      "Anyone can join. Sign up with Google, then choose your event during onboarding or from the dashboard.",
    signinHint: "Log in with Google to open your participant workspace.",
    headerSignup: "Join a hackathon",
    headerSignin: "Welcome back",
  },
  judge: {
    signupHint: "Register as a judge. Accounts require admin approval before you can score submissions.",
    signinHint: "Log in with Google to open your judging workspace.",
    headerSignup: "Join as a judge",
    headerSignin: "Welcome back, judge",
  },
  host: {
    signupHint: "Request host access. An admin must approve you before you can run events.",
    signinHint: "Log in with Google to open your host portal.",
    headerSignup: "Request host access",
    headerSignin: "Welcome back, host",
  },
};

export default function SignIn() {
  const navigate = useNavigate();
  const location = useLocation();
  const auth = getFirebaseAuth();
  const db = getFirestoreDb();
  const { sessionUser, loading: authLoading } = usePortalAuth();

  const searchMode = new URLSearchParams(location.search).get("mode");
  const searchRole = new URLSearchParams(location.search).get("role");
  const stateMode = (location.state as { mode?: "signin" | "signup"; role?: AuthRole })?.mode;
  const stateRole = (location.state as { mode?: "signin" | "signup"; role?: AuthRole })?.role;
  const isSignupPath = location.pathname === "/signup";
  const initialMode =
    searchMode === "signin" || stateMode === "signin"
      ? "signin"
      : searchMode === "signup" || stateMode === "signup" || isSignupPath
        ? "signup"
        : "signup";
  const initialRole: AuthRole =
    searchRole === "judge" || searchRole === "host" || searchRole === "participant"
      ? searchRole
      : stateRole === "judge" || stateRole === "host" || stateRole === "participant"
        ? stateRole
        : "participant";

  const [authRole, setAuthRole] = useState<AuthRole>(initialRole);
  const [mode, setMode] = useState<"signin" | "signup">(initialMode);
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const m = params.get("mode");
    const r = params.get("role");
    if (m === "signin" || m === "signup") {
      setMode(m);
    } else if (location.pathname === "/signup") {
      setMode("signup");
    } else if (location.pathname === "/signin") {
      setMode("signin");
    }
    if (r === "participant" || r === "judge" || r === "host") {
      setAuthRole(r);
    }
  }, [location.search, location.pathname]);

  useEffect(() => {
    if (authLoading) return;
    if (
      sessionUser?.role === "participant" ||
      sessionUser?.role === "mentor" ||
      sessionUser?.role === "judge" ||
      sessionUser?.role === "host" ||
      sessionUser?.role === "admin"
    ) {
      navigate(pathForSession(sessionUser), { replace: true });
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
      const existingData = userSnap.data() ?? {};
      const existingRole = normalizePortalRole(existingData.role);
      const existingJudgeApprovalStatus = normalizeJudgeApprovalStatus(
        existingData.judgeApprovalStatus
      );

      if (existingRole === "admin") {
        navigate("/dashboard/admin", { replace: true });
        return;
      }

      const hasAdminGrant = await hasPendingAdminGrant(db, user.email);

      if (mode === "signin" && !existingRole && !hasAdminGrant) {
        await firebaseSignOut(auth);
        setAuthError("No account found for this Google account. Please sign up first.");
        return;
      }

      // Returning users keep their existing portal role (mentor/judge/host/participant).
      if (mode === "signin" && existingRole && !hasAdminGrant) {
        if (existingRole !== authRole && existingRole !== "mentor") {
          // Mentors share the judge tab; otherwise warn on role mismatch but still route home.
          setAuthError(
            `This account is registered as a ${existingRole}. Opening that workspace instead.`
          );
        }
        navigate(
          pathForSession({
            role: existingRole,
            judgeApprovalStatus: existingJudgeApprovalStatus,
            onboardingCompletedAt:
              typeof existingData.onboardingCompletedAt === "string"
                ? existingData.onboardingCompletedAt
                : null,
            profile: {
              fullName: typeof existingData.fullName === "string" ? existingData.fullName : null,
              profileUpdatedAt:
                typeof existingData.profileUpdatedAt === "string"
                  ? existingData.profileUpdatedAt
                  : null,
            },
          }),
          { replace: true }
        );
        return;
      }

      if (mode === "signup" && existingRole && existingRole !== authRole && !hasAdminGrant) {
        await firebaseSignOut(auth);
        setAuthError(
          `This Google account is already registered as a ${existingRole}. Use Log In instead.`
        );
        return;
      }

      // Event enrollment for participants happens in onboarding / dashboard — not here.
      const targetRole = hasAdminGrant ? "admin" : (existingRole ?? authRole);
      const isNewParticipantSignup =
        mode === "signup" && targetRole === "participant" && !existingRole;
      const isNewJudgeSignup = mode === "signup" && targetRole === "judge" && !existingRole;
      const isNewHostSignup = mode === "signup" && targetRole === "host" && !existingRole;
      const targetJudgeApprovalStatus = isStaffRole(targetRole)
        ? existingJudgeApprovalStatus ?? (existingRole ? "approved" : "pending")
        : undefined;

      await setDoc(
        userRef,
        {
          email: user.email,
          role: targetRole,
          ...(isNewJudgeSignup || (isStaffRole(targetRole) && !existingRole)
            ? { judgeApprovalStatus: targetJudgeApprovalStatus ?? "pending" }
            : {}),
          ...(isNewHostSignup
            ? {
                hostApprovalStatus: "pending",
                fullName: user.displayName || "",
                hostRequestedAt: new Date().toISOString(),
              }
            : {}),
        },
        { merge: true }
      );

      if (hasAdminGrant) {
        await consumePendingAdminGrant(db, user.email);
      }

      if (isNewParticipantSignup) {
        navigate("/onboarding", { replace: true });
        return;
      }

      navigate(
        pathForSession({
          role: targetRole,
          judgeApprovalStatus: targetJudgeApprovalStatus ?? existingJudgeApprovalStatus,
          onboardingCompletedAt:
            typeof existingData.onboardingCompletedAt === "string"
              ? existingData.onboardingCompletedAt
              : null,
          profile: {
            fullName: typeof existingData.fullName === "string" ? existingData.fullName : null,
            profileUpdatedAt:
              typeof existingData.profileUpdatedAt === "string"
                ? existingData.profileUpdatedAt
                : null,
          },
        }),
        { replace: true }
      );
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
        sessionUser.role === "host" ||
        sessionUser.role === "admin"))
  ) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">Redirecting…</p>
      </div>
    );
  }

  const copy = roleCopy[authRole];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <AnimatedBackground />

      <main className="relative mx-auto max-w-5xl px-6 pt-12 pb-20">
        <section
          className={`${sectionClass} mb-8 flex flex-col gap-6 p-6 sm:flex-row sm:items-center sm:justify-between`}
          aria-label="Sign in header"
        >
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:gap-6">
            <BrandLogo size="lg" href="/" priority />
            <div>
              <p className="font-display text-xs font-semibold uppercase tracking-[0.24em] text-primary">
                Cognisor Hackathons
              </p>
              <h1 className="mt-2 font-display text-2xl font-semibold tracking-tight md:text-3xl">
                {mode === "signup" ? copy.headerSignup : copy.headerSignin}
              </h1>
              <p className="mt-2 max-w-xl text-sm text-muted-foreground">
                {mode === "signup" ? copy.signupHint : copy.signinHint}
              </p>
            </div>
          </div>
        </section>

        <section className={sectionClass} aria-labelledby="auth-heading">
          <Card className="border-0 bg-transparent shadow-none">
            <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pb-2">
              <div>
                <CardTitle id="auth-heading" className="text-sm uppercase tracking-[0.28em]">
                  {mode === "signup" ? "Create Account" : "Log In"}
                </CardTitle>
                <p className="mt-1 text-xs text-muted-foreground">
                  Choose your role, then continue with Google.
                </p>
              </div>
              <Tabs
                value={authRole}
                onValueChange={(value) => {
                  setAuthRole(value as AuthRole);
                  setAuthError(null);
                }}
                className="w-full sm:w-auto"
              >
                <TabsList className="grid w-full grid-cols-3 sm:w-[22rem]">
                  <TabsTrigger value="participant">Participant</TabsTrigger>
                  <TabsTrigger value="judge">Judge</TabsTrigger>
                  <TabsTrigger value="host">Host</TabsTrigger>
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
                    ? authRole === "participant"
                      ? "You'll pick your event in onboarding and can add more from the dashboard."
                      : authRole === "judge"
                        ? "Judge accounts need admin approval before scoring."
                        : "Host accounts need admin approval before running events."
                    : `Log in to your ${authRole} account.`}
                </p>
              </div>

              {(authRole === "judge" || authRole === "host") && mode === "signup" ? (
                <div className="rounded-xl border border-border/60 bg-muted/20 px-4 py-3 text-xs text-muted-foreground">
                  {authRole === "judge"
                    ? "After signup, an admin must approve your judge account before you can access scoring tools."
                    : "After signup, an admin must approve your host account before you can create events, issue tickets, or manage check-in."}
                </div>
              ) : null}

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
                    ? `Sign up as ${authRole}`
                    : `Log in as ${authRole}`}
              </Button>

              {authError && <p className="text-xs text-destructive">{authError}</p>}

              <p className="border-t border-border/40 pt-4 text-[0.7rem] text-muted-foreground">
                Participant accounts are active immediately — choose your event during onboarding.
                Judge and host accounts need admin approval.{" "}
                <Link to="/admin" className="underline underline-offset-2 hover:text-foreground">
                  Admin
                </Link>
              </p>
            </CardContent>
          </Card>
        </section>
      </main>
    </div>
  );
}
