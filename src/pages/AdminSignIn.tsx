import { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import {
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut as firebaseSignOut,
} from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import AnimatedBackground from "@/components/AnimatedBackground";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { getFirebaseAuth, getFirestoreDb } from "@/lib/firebaseClient";
import { usePortalAuth } from "@/hooks/usePortalAuth";

const sectionClass =
  "rounded-xl border border-border/50 bg-card/80 backdrop-blur-sm shadow-lg shadow-black/10";

const getDashboardPathForCurrentRole = (role?: string) =>
  role === "admin" ? "/dashboard/admin" : role === "judge" ? "/dashboard/judge" : "/dashboard/participant";

export default function AdminSignIn() {
  const navigate = useNavigate();
  const auth = getFirebaseAuth();
  const db = getFirestoreDb();
  const { sessionUser, loading: authLoading } = usePortalAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading || !sessionUser?.role) return;
    navigate(getDashboardPathForCurrentRole(sessionUser.role), { replace: true });
  }, [authLoading, sessionUser, navigate]);

  const ensureAdminOrReject = async () => {
    const user = auth.currentUser;
    if (!user) return false;
    const userSnap = await getDoc(doc(db, "users", user.uid));
    const role = userSnap.data()?.role;
    if (role === "admin") {
      navigate("/dashboard/admin", { replace: true });
      return true;
    }

    await firebaseSignOut(auth);
    setAuthError("Admin access only. Please use /signin for participant or judge access.");
    return false;
  };

  const handleGoogleSignIn = async () => {
    setIsAuthLoading(true);
    setAuthError(null);
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      await ensureAdminOrReject();
    } catch (error: unknown) {
      const message =
        typeof error === "object" && error && "message" in error
          ? String((error as { message?: string }).message)
          : "An unknown error occurred during admin sign in.";
      setAuthError(message);
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleEmailSignIn = async () => {
    setIsAuthLoading(true);
    setAuthError(null);
    try {
      if (!email || !password) {
        setAuthError("Please enter both email and password.");
        return;
      }
      await signInWithEmailAndPassword(auth, email, password);
      await ensureAdminOrReject();
    } catch (error: unknown) {
      const message =
        typeof error === "object" && error && "message" in error
          ? String((error as { message?: string }).message)
          : "An unknown error occurred during admin authentication.";
      setAuthError(message);
    } finally {
      setIsAuthLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (sessionUser?.role === "admin") {
    return <Navigate to="/dashboard/admin" replace />;
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <AnimatedBackground />
      <main className="relative mx-auto max-w-3xl px-6 pt-12 pb-20">
        <section
          className={`${sectionClass} mb-8 flex flex-col gap-4 p-6`}
          aria-label="Admin sign in header"
        >
          <p className="text-xs uppercase tracking-[0.3em] text-primary/70">Impact Tokyo</p>
          <h1 className="font-display text-2xl tracking-[0.18em] uppercase md:text-3xl">Admin Sign In</h1>
          <p className="max-w-xl text-sm text-muted-foreground">
            This page is restricted to admin accounts only.
          </p>
        </section>

        <section className={sectionClass} aria-labelledby="admin-auth-heading">
          <Card className="border-0 bg-transparent shadow-none">
            <CardHeader className="pb-2">
              <CardTitle id="admin-auth-heading" className="text-sm uppercase tracking-[0.28em]">
                Authenticate as Admin
              </CardTitle>
              <p className="mt-1 text-xs text-muted-foreground">
                Use Google or email/password. Non-admin users will be denied.
              </p>
            </CardHeader>
            <CardContent className="space-y-5 pt-2">
              <Button
                type="button"
                variant="outline"
                className="w-full gap-2 tracking-[0.2em] uppercase"
                onClick={handleGoogleSignIn}
                disabled={isAuthLoading}
              >
                {isAuthLoading ? "Please wait..." : "Continue with Google"}
              </Button>

              <p className="text-center text-[0.7rem] text-muted-foreground">
                or use admin email and password
              </p>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-xs uppercase tracking-[0.22em] text-muted-foreground">
                    Email
                  </label>
                  <Input
                    type="email"
                    placeholder="admin@example.com"
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

              <div className="flex justify-end border-t border-border/40 pt-4">
                <Button
                  onClick={handleEmailSignIn}
                  disabled={isAuthLoading}
                  className="tracking-[0.24em] uppercase"
                >
                  {isAuthLoading ? "Please wait..." : "Sign In"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </section>
      </main>
    </div>
  );
}
