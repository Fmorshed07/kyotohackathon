import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import AnimatedBackground from "@/components/AnimatedBackground";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  signInWithPopup,
} from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { getFirebaseAuth, getFirestoreDb } from "@/lib/firebaseClient";
import { usePortalAuth } from "@/hooks/usePortalAuth";
import type { JudgeApprovalStatus, PortalRole } from "@/types/portal";

const sectionClass =
  "rounded-xl border border-border/50 bg-card/80 backdrop-blur-sm shadow-lg shadow-black/10";

type AuthRole = "participant" | "judge";

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

const canAccessJudgeDashboard = (
  role: PortalRole | undefined,
  judgeApprovalStatus: JudgeApprovalStatus | undefined
) => role === "judge" && judgeApprovalStatus !== "pending";

const getDashboardPathForUser = (
  role: PortalRole | undefined,
  judgeApprovalStatus: JudgeApprovalStatus | undefined
) => {
  if (role === "admin") return "/dashboard/admin";
  if (canAccessJudgeDashboard(role, judgeApprovalStatus)) return "/dashboard/judge";
  if (role === "judge") return "/dashboard";
  return "/dashboard/participant";
};

export default function SignIn() {
  const navigate = useNavigate();
  const location = useLocation();
  const auth = getFirebaseAuth();
  const db = getFirestoreDb();
  const { sessionUser, loading: authLoading } = usePortalAuth();

  const searchMode = new URLSearchParams(location.search).get("mode");
  const stateMode = (location.state as { mode?: "signin" | "signup" })?.mode;
  const initialMode =
    searchMode === "signin" || stateMode === "signin"
      ? "signin"
      : searchMode === "signup" || stateMode === "signup"
        ? "signup"
        : "signup";

  const [authRole, setAuthRole] = useState<AuthRole>("participant");
  const [mode, setMode] = useState<"signin" | "signup">(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    const m = new URLSearchParams(location.search).get("mode");
    if (m === "signin" || m === "signup") setMode(m);
  }, [location.search]);

  useEffect(() => {
    if (authLoading) return;
    if (
      sessionUser?.role === "participant" ||
      sessionUser?.role === "judge" ||
      sessionUser?.role === "admin"
    ) {
      navigate(getDashboardPathForUser(sessionUser.role, sessionUser.judgeApprovalStatus), { replace: true });
    }
  }, [authLoading, sessionUser, navigate]);

  const handleGoogleSignIn = async () => {
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
      const existingJudgeApprovalStatus = normalizeJudgeApprovalStatus(userSnap.data()?.judgeApprovalStatus);
      if (existingRole === "admin") {
        navigate("/admin", { replace: true });
        return;
      }
      const targetRole = existingRole ?? authRole;
      const targetJudgeApprovalStatus =
        targetRole === "judge"
          ? existingJudgeApprovalStatus ?? (existingRole ? "approved" : "pending")
          : undefined;

      await setDoc(
        userRef,
        {
          email: user.email,
          role: targetRole,
          ...(targetRole === "judge" ? { judgeApprovalStatus: targetJudgeApprovalStatus } : {}),
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

  const handleAuth = async () => {
    setIsAuthLoading(true);
    setAuthError(null);
    try {
      if (!email || !password) {
        setAuthError("Please enter both email and password.");
        return;
      }

      if (mode === "signup") {
        const credential = await createUserWithEmailAndPassword(auth, email, password);
        const user = credential.user;
        await setDoc(
          doc(db, "users", user.uid),
          {
            email: user.email,
            role: authRole,
            ...(authRole === "judge" ? { judgeApprovalStatus: "pending" } : {}),
          },
          { merge: true }
        );
        navigate(getDashboardPathForUser(authRole, authRole === "judge" ? "pending" : undefined), {
          replace: true,
        });
      } else {
        await signInWithEmailAndPassword(auth, email, password);
        const user = auth.currentUser;
        if (user) {
          const userDoc = await getDoc(doc(db, "users", user.uid));
          const existingRole = normalizePortalRole(userDoc.data()?.role);
          const existingJudgeApprovalStatus = normalizeJudgeApprovalStatus(
            userDoc.data()?.judgeApprovalStatus
          );
          if (existingRole === "admin") {
            navigate("/admin", { replace: true });
            return;
          }
          if (!existingRole) {
            await setDoc(
              doc(db, "users", user.uid),
              {
                email: user.email,
                role: authRole,
                ...(authRole === "judge" ? { judgeApprovalStatus: "pending" } : {}),
              },
              { merge: true }
            );
          }
          const nextRole = existingRole ?? authRole;
          const nextJudgeApprovalStatus =
            nextRole === "judge"
              ? existingJudgeApprovalStatus ?? (existingRole ? "approved" : "pending")
              : undefined;
          navigate(getDashboardPathForUser(nextRole, nextJudgeApprovalStatus), { replace: true });
        }
      }
    } catch (error: unknown) {
      const message =
        typeof error === "object" && error && "message" in error
          ? String((error as { message?: string }).message)
          : "An unknown error occurred during authentication.";
      setAuthError(message);
    } finally {
      setIsAuthLoading(false);
    }
  };

  if (
    authLoading ||
    (sessionUser &&
      (sessionUser.role === "participant" ||
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
              Sign In
            </h1>
            <p className="mt-2 max-w-xl text-sm text-muted-foreground">
              Sign in as a participant or judge to access your dashboard.
            </p>
          </div>
        </section>

        <section className={sectionClass} aria-labelledby="auth-heading">
          <Card className="border-0 bg-transparent shadow-none">
            <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pb-2">
              <div>
                <CardTitle id="auth-heading" className="text-sm uppercase tracking-[0.28em]">
                  Sign In or Create an Account
                </CardTitle>
                <p className="mt-1 text-xs text-muted-foreground">
                  Choose your role and sign in with Google or email.
                </p>
              </div>
              <Tabs
                value={authRole}
                onValueChange={(v) => {
                  const nextRole = v as AuthRole;
                  setAuthRole(nextRole);
                }}
                className="w-full sm:w-auto"
              >
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="participant">Participant</TabsTrigger>
                  <TabsTrigger value="judge">Judge</TabsTrigger>
                </TabsList>
              </Tabs>
            </CardHeader>
            <CardContent className="space-y-5 pt-2">
              <div className="flex flex-col gap-3">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full gap-2 tracking-[0.2em] uppercase"
                  onClick={handleGoogleSignIn}
                  disabled={isAuthLoading}
                >
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
                  {isAuthLoading ? "Please wait..." : "Continue with Google"}
                </Button>
                <p className="text-center text-[0.7rem] text-muted-foreground">
                  or use email and password below
                </p>
              </div>

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
                    Sign In
                  </button>
                </div>
                <p className="text-[0.7rem] text-muted-foreground">
                  {mode === "signup"
                    ? "Create a new account linked to this role."
                    : "Use the email and password you registered with."}
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-xs uppercase tracking-[0.22em] text-muted-foreground">
                    Email
                  </label>
                  <Input
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs uppercase tracking-[0.22em] text-muted-foreground">
                    Password
                  </label>
                  <Input
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
              </div>

              {authError && <p className="text-xs text-destructive">{authError}</p>}

              <div className="flex flex-col gap-4 border-t border-border/40 pt-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="max-w-md text-[0.7rem] text-muted-foreground">
                  Participant and judge use Firebase auth. Admin sign in is available on /admin.
                </p>
                <Button
                  onClick={handleAuth}
                  disabled={isAuthLoading}
                  className="shrink-0 tracking-[0.24em] uppercase"
                >
                  {isAuthLoading ? "Please wait..." : mode === "signup" ? "Create Account" : "Sign In"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </section>
      </main>
    </div>
  );
}
