import { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { GoogleAuthProvider, signInWithPopup, signOut as firebaseSignOut } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import AnimatedBackground from "@/components/AnimatedBackground";
import BrandLogo from "@/components/BrandLogo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { getFirebaseAuth, getFirestoreDb } from "@/lib/firebaseClient";
import { usePortalAuth } from "@/hooks/usePortalAuth";

const sectionClass = "rounded-xl border border-border bg-card";

const GoogleIcon = () => (
  <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden>
    <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
    <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
    <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
    <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
  </svg>
);

export default function HostSignIn() {
  const navigate = useNavigate();
  const auth = getFirebaseAuth();
  const db = getFirestoreDb();
  const { sessionUser, loading } = usePortalAuth();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [fullName, setFullName] = useState("");
  const [organization, setOrganization] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && sessionUser?.role === "host") {
      navigate("/dashboard/host", { replace: true });
    }
  }, [loading, navigate, sessionUser]);

  const continueWithGoogle = async () => {
    setError(null);
    setIsLoading(true);
    try {
      const result = await signInWithPopup(auth, new GoogleAuthProvider());
      const user = result.user;
      if (!user.email) {
        await firebaseSignOut(auth);
        setError("Your Google account does not have an email address.");
        return;
      }

      const userRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userRef);
      const existingRole = userSnap.data()?.role;

      if (mode === "signin") {
        if (existingRole !== "host") {
          await firebaseSignOut(auth);
          setError(
            existingRole
              ? "This account is registered for a different portal role."
              : "No host account found. Request host access first.",
          );
          return;
        }
      } else if (existingRole && existingRole !== "host") {
        await firebaseSignOut(auth);
        setError("This Google account is already registered for a different portal role.");
        return;
      } else if (!existingRole) {
        await setDoc(userRef, {
          email: user.email,
          role: "host",
          hostApprovalStatus: "pending",
          fullName: fullName.trim() || user.displayName || "",
          organization: organization.trim(),
          hostRequestedAt: new Date().toISOString(),
        });
      }

      navigate("/dashboard/host", { replace: true });
    } catch (authError: unknown) {
      setError(
        typeof authError === "object" && authError && "message" in authError
          ? String((authError as { message?: string }).message)
          : "Unable to complete host sign in.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  if (loading) {
    return <div className="flex min-h-svh items-center justify-center bg-background text-sm text-muted-foreground">Loading...</div>;
  }
  if (sessionUser?.role === "host") return <Navigate to="/dashboard/host" replace />;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <AnimatedBackground />
      <main className="relative mx-auto max-w-4xl px-6 pb-20 pt-12">
        <section className={`${sectionClass} mb-8 flex flex-col gap-5 p-6 sm:flex-row sm:items-center sm:justify-between`}>
          <div className="flex items-center gap-5">
            <BrandLogo size="lg" href="/" priority />
            <div>
              <p className="font-display text-xs font-semibold uppercase tracking-[0.24em] text-primary">Cognisor Event Operations</p>
              <h1 className="mt-2 font-display text-2xl font-semibold tracking-tight md:text-3xl">Host portal</h1>
              <p className="mt-2 text-sm text-muted-foreground">Create approved events, issue QR tickets, manage judges, and run check-in.</p>
            </div>
          </div>
          <Badge variant="outline" className="w-fit border-primary/40 bg-primary/10 uppercase tracking-[0.14em] text-primary">Approval required</Badge>
        </section>

        <section className={sectionClass}>
          <Card className="border-0 bg-transparent shadow-none">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm uppercase tracking-[0.28em]">{mode === "signin" ? "Host sign in" : "Request host access"}</CardTitle>
              <p className="mt-2 text-sm text-muted-foreground">Host access is activated only after an admin approves the request.</p>
            </CardHeader>
            <CardContent className="space-y-5 pt-2">
              <div className="inline-flex items-center rounded-full border border-border/60 bg-muted/40 p-1 text-sm">
                <button type="button" onClick={() => setMode("signin")} className={`rounded-full px-4 py-2 ${mode === "signin" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>Sign in</button>
                <button type="button" onClick={() => setMode("signup")} className={`rounded-full px-4 py-2 ${mode === "signup" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>Request access</button>
              </div>

              {mode === "signup" ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2"><label htmlFor="host-name" className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Name</label><Input id="host-name" value={fullName} onChange={(event) => setFullName(event.target.value)} placeholder="Your name" /></div>
                  <div className="space-y-2"><label htmlFor="host-organization" className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Organization</label><Input id="host-organization" value={organization} onChange={(event) => setOrganization(event.target.value)} placeholder="Organization or community" /></div>
                </div>
              ) : null}

              {error ? <p className="text-sm text-destructive">{error}</p> : null}
              <Button type="button" className="w-full gap-2 uppercase tracking-[0.16em]" onClick={() => void continueWithGoogle()} disabled={isLoading}>
                <GoogleIcon />
                {isLoading ? "Please wait..." : mode === "signin" ? "Continue with Google" : "Request with Google"}
              </Button>
            </CardContent>
          </Card>
        </section>
      </main>
    </div>
  );
}
