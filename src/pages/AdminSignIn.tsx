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
import {
  ensureAdminUserRecord,
  isReservedAdminUsername,
  normalizePortalRole,
  resolveAdminSignInEmail,
  signInOrCreateReservedAdmin,
} from "@/lib/adminAuth";
import { usePortalAuth } from "@/hooks/usePortalAuth";

const sectionClass =
  "rounded-xl border border-border/50 bg-card/80 backdrop-blur-sm shadow-lg shadow-black/10";

export default function AdminSignIn() {
  const navigate = useNavigate();
  const auth = getFirebaseAuth();
  const db = getFirestoreDb();
  const { sessionUser, loading: authLoading } = usePortalAuth();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (sessionUser?.role === "admin") {
      navigate("/dashboard/admin", { replace: true });
    }
  }, [authLoading, sessionUser, navigate]);

  const ensureAdminOrReject = async () => {
    const user = auth.currentUser;
    if (!user) return false;
    const userSnap = await getDoc(doc(db, "users", user.uid));
    const role = normalizePortalRole(userSnap.data()?.role);
    if (role === "admin") {
      navigate("/dashboard/admin", { replace: true });
      return true;
    }

    await firebaseSignOut(auth);
    setAuthError("Admin access only. Use /signin for participant or mentor accounts.");
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

  const handleCredentialSignIn = async () => {
    setIsAuthLoading(true);
    setAuthError(null);
    try {
      if (!username || !password) {
        setAuthError("Please enter both username and password.");
        return;
      }

      const email = resolveAdminSignInEmail(username);
      if (!email) {
        setAuthError("Please enter a valid username or email.");
        return;
      }

      const usingReservedAdminUsername = isReservedAdminUsername(username);

      if (auth.currentUser) {
        await firebaseSignOut(auth);
      }

      if (usingReservedAdminUsername) {
        await signInOrCreateReservedAdmin(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }

      const user = auth.currentUser;
      if (user && usingReservedAdminUsername) {
        await ensureAdminUserRecord(db, user.uid, email);
      }

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
          <p className="text-xs uppercase tracking-[0.3em] text-primary/70">Impact Kyoto</p>
          <h1 className="font-display text-2xl tracking-[0.18em] uppercase md:text-3xl">Admin Sign In</h1>
          <p className="max-w-xl text-sm text-muted-foreground">
            This page is restricted to admin accounts only. Participant and mentor sign-in is at{" "}
            <a href="/signin" className="text-primary underline underline-offset-4">
              /signin
            </a>
            .
          </p>
          {sessionUser && sessionUser.role !== "admin" ? (
            <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-100/90">
              You are signed in as {sessionUser.email}
              {sessionUser.role ? ` (${sessionUser.role})` : ""}. Admin sign-in will switch to an admin
              account.
            </p>
          ) : null}
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
                or use admin username and password
              </p>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-xs uppercase tracking-[0.22em] text-muted-foreground">
                    Username
                  </label>
                  <Input
                    type="text"
                    placeholder="admin"
                    autoComplete="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs uppercase tracking-[0.22em] text-muted-foreground">
                    Password
                  </label>
                  <Input
                    type="password"
                    placeholder="••••••••"
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        void handleCredentialSignIn();
                      }
                    }}
                  />
                </div>
              </div>

              {authError && <p className="text-xs text-destructive">{authError}</p>}

              <div className="flex justify-end border-t border-border/40 pt-4">
                <Button
                  onClick={handleCredentialSignIn}
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
