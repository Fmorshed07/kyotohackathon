import { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import {
  GoogleAuthProvider,
  signInWithPopup,
  signOut as firebaseSignOut,
} from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import AnimatedBackground from "@/components/AnimatedBackground";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { getFirebaseAuth, getFirestoreDb } from "@/lib/firebaseClient";
import { loginWithReservedAdminCredentials, normalizePortalRole } from "@/lib/adminAuth";
import { consumePendingAdminGrant } from "@/lib/adminGrants";
import { usePortalAuth } from "@/hooks/usePortalAuth";

const sectionClass =
  "rounded-xl border border-border/50 bg-card/80 backdrop-blur-sm shadow-lg shadow-black/10";

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

export default function AdminSignIn() {
  const navigate = useNavigate();
  const auth = getFirebaseAuth();
  const db = getFirestoreDb();
  const { sessionUser, loading: authLoading } = usePortalAuth();

  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("");
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (sessionUser?.role === "admin") {
      navigate("/dashboard/admin", { replace: true });
    }
  }, [authLoading, sessionUser, navigate]);

  const handleCredentialSignIn = async () => {
    setIsAuthLoading(true);
    setAuthError(null);
    try {
      if (!username || !password) {
        setAuthError("Please enter both username and password.");
        return;
      }

      if (auth.currentUser) {
        await firebaseSignOut(auth);
      }

      await loginWithReservedAdminCredentials(auth, db, username, password);
      navigate("/dashboard/admin", { replace: true });
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

  const handleGoogleSignIn = async () => {
    setIsAuthLoading(true);
    setAuthError(null);
    try {
      if (auth.currentUser) {
        await firebaseSignOut(auth);
      }

      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      if (!user.email) {
        await firebaseSignOut(auth);
        setAuthError("Your Google account does not have an email address.");
        return;
      }

      const userRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userRef);
      const existingRole = normalizePortalRole(userSnap.data()?.role);
      const hasPendingAdminGrant = await consumePendingAdminGrant(db, user.email);

      if (existingRole !== "admin" && !hasPendingAdminGrant) {
        await firebaseSignOut(auth);
        setAuthError("This Google account does not have admin access.");
        return;
      }

      await setDoc(
        userRef,
        {
          email: user.email,
          role: "admin",
        },
        { merge: true },
      );
      navigate("/dashboard/admin", { replace: true });
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
            Use the admin username and password, or sign in with a Google account that has been granted admin access.
          </p>
        </section>

        <section className={sectionClass} aria-labelledby="admin-auth-heading">
          <Card className="border-0 bg-transparent shadow-none">
            <CardHeader className="pb-2">
              <CardTitle id="admin-auth-heading" className="text-sm uppercase tracking-[0.28em]">
                Admin login
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5 pt-2">
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

              {authError ? <p className="text-xs text-destructive">{authError}</p> : null}

              <div className="flex flex-col gap-3 border-t border-border/40 pt-4 sm:flex-row sm:justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => void handleGoogleSignIn()}
                  disabled={isAuthLoading}
                  className="tracking-[0.18em] uppercase"
                >
                  <GoogleIcon />
                  Continue with Google
                </Button>
                <Button
                  onClick={() => void handleCredentialSignIn()}
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
