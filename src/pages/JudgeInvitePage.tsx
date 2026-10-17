import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { ArrowRight, CheckCircle2, Loader2, Scale } from "lucide-react";
import BrandLogo from "@/components/BrandLogo";
import { Button } from "@/components/ui/button";
import { usePortalAuth } from "@/hooks/usePortalAuth";
import { getFirebaseAuth, getFirestoreDb } from "@/lib/firebaseClient";
import { getHackathonById } from "@/lib/hackathons";
import { clearPendingInvite, getJudgeDashboardPathAfterInvite, stashPendingInvite } from "@/lib/inviteTokens";
import { getJudgeInvite, judgeInviteProblem, redeemJudgeInvite } from "@/lib/portalInvites";
import type { PortalJudgeInvite } from "@/types/portal";

function onboardingError(error: unknown) {
  const code = typeof error === "object" && error && "code" in error ? String(error.code) : "";
  if (code === "auth/popup-closed-by-user" || code === "auth/cancelled-popup-request") return "Google sign-in was cancelled. Continue when you're ready.";
  if (code === "auth/popup-blocked") return "Allow the Google sign-in popup, then try again.";
  if (code.includes("permission-denied")) return "We couldn't activate this invitation. Ask the organiser to check the link's permissions, then try again.";
  return error instanceof Error ? error.message : "Couldn't open your judge workspace. Please try again.";
}

/** One link, one Google action for new and returning judges. Mount keyed by token. */
export default function JudgeInvitePage({ token }: { token: string }) {
  const navigate = useNavigate();
  const auth = getFirebaseAuth();
  const db = getFirestoreDb();
  const { sessionUser, loading: authLoading } = usePortalAuth();
  const [invite, setInvite] = useState<PortalJudgeInvite | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState<{ userId: string; eventId: string | null } | null>(null);
  const [profileDelayed, setProfileDelayed] = useState(false);
  const mounted = useRef(true);
  const busyRef = useRef(false);
  const attempted = useRef("");

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  useEffect(() => {
    let current = true;
    setLoading(true);
    setLoadError("");
    void getJudgeInvite(db, token).then(result => {
      if (current) setInvite(result);
    }).catch(cause => {
      if (current) setLoadError(onboardingError(cause));
    }).finally(() => { if (current) setLoading(false); });
    return () => { current = false; };
  }, [db, token, retry]);

  const activate = useCallback(async (account: { uid: string; email: string | null; displayName?: string | null }) => {
    if (auth.currentUser?.uid !== account.uid || !mounted.current) return;
    attempted.current = account.uid;
    const result = await redeemJudgeInvite(db, token, {
      userId: account.uid,
      email: account.email ?? "",
      displayName: account.displayName ?? undefined,
    });
    if (mounted.current && auth.currentUser?.uid === account.uid) {
      clearPendingInvite("judge");
      setReady({ userId: account.uid, eventId: result.primaryHackathonId });
    }
  }, [auth, db, token]);

  // Wait for the authoritative profile update before leaving this page. Otherwise
  // a new judge can bounce into the pending-approval dashboard during the write.
  useEffect(() => {
    if (!ready || busy || authLoading || sessionUser?.id !== ready.userId || auth.currentUser?.uid !== ready.userId) return;
    if (sessionUser.role !== "judge" || sessionUser.judgeApprovalStatus !== "approved") return;
    if (ready.eventId && !sessionUser.hackathonIds?.includes(ready.eventId) && sessionUser.hackathonId !== ready.eventId) return;
    navigate(getJudgeDashboardPathAfterInvite(ready.eventId), { replace: true });
  }, [ready, busy, authLoading, sessionUser, auth, navigate]);

  useEffect(() => {
    if (!ready || auth.currentUser?.uid !== ready.userId) return;
    setProfileDelayed(false);
    const timer = window.setTimeout(() => setProfileDelayed(true), 10000);
    return () => window.clearTimeout(timer);
  }, [ready, sessionUser?.id, auth]);

  const problem = judgeInviteProblem(invite, sessionUser?.id);
  const eligible = !sessionUser?.role || sessionUser.role === "judge" || sessionUser.role === "mentor";

  const continueWithCurrentAccount = useCallback(async () => {
    const account = auth.currentUser;
    if (!account || busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setError("");
    try { await activate(account); }
    catch (cause) {
      if (mounted.current && auth.currentUser?.uid === account.uid) setError(onboardingError(cause));
    } finally {
      busyRef.current = false;
      if (mounted.current) setBusy(false);
    }
  }, [auth, activate]);

  useEffect(() => {
    if (loading || authLoading || loadError || problem || !eligible || !sessionUser || busy || ready?.userId === sessionUser.id) return;
    if (auth.currentUser?.uid !== sessionUser.id || attempted.current === sessionUser.id) return;
    void continueWithCurrentAccount();
  }, [loading, authLoading, loadError, problem, eligible, sessionUser, busy, ready, auth, continueWithCurrentAccount]);

  async function continueWithGoogle() {
    if (busyRef.current || loading || problem || loadError) return;
    busyRef.current = true;
    setBusy(true);
    setError("");
    setReady(null);
    stashPendingInvite("judge", token);
    let accountId: string | undefined;
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: "select_account" });
      const result = await signInWithPopup(auth, provider);
      accountId = result.user.uid;
      await activate(result.user);
    } catch (cause) {
      if (mounted.current && (!accountId || auth.currentUser?.uid === accountId)) setError(onboardingError(cause));
    } finally {
      busyRef.current = false;
      if (mounted.current) setBusy(false);
    }
  }

  const waitingForProfile = ready?.userId === auth.currentUser?.uid && !!ready;
  const pending = busy || waitingForProfile;
  return <main className="flex min-h-svh items-center justify-center bg-background px-4 py-12 text-foreground">
    <div className="w-full max-w-lg">
      <div className="mb-8 flex justify-center"><BrandLogo size="md" showWordmark href="/" /></div>
      <section className="rounded-2xl border border-border bg-card p-6 sm:p-9" aria-labelledby="judge-welcome">
        <Scale className="mb-5 h-8 w-8 text-primary" aria-hidden="true" />
        <p className="mb-2 text-xs uppercase tracking-[0.18em] text-primary">Judge invitation</p>
        <h1 id="judge-welcome" className="font-display text-3xl font-medium tracking-tight">You're invited to judge.</h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">One link. Sign in with Google and go straight to your event workspace. New accounts are created automatically—no separate application or approval wait.</p>
        {loading || authLoading ? <p role="status" className="mt-6">Checking your invitation…</p> : loadError || problem ? <div className="mt-6 space-y-4">
          <p role="alert" className="text-sm text-red-400">{loadError || problem}</p>
          {loadError && <Button variant="outline" onClick={() => setRetry(value => value + 1)}>Retry invitation</Button>}
          <Button asChild variant="ghost"><Link to="/">Back home</Link></Button>
        </div> : <>
          <div className="my-6 rounded-xl border border-primary/20 bg-primary/5 p-4">
            <p className="mb-2 text-xs uppercase tracking-wider text-muted-foreground">Your judging workspace</p>
            <ul className="space-y-2 text-sm">{invite?.hackathon_ids.map(id => {
              const event = getHackathonById(id);
              return <li key={id} className="flex items-start gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" /><span className="break-words">{event.id === id ? event.name : id}</span></li>;
            })}</ul>
          </div>
          {sessionUser && !eligible ? <div className="space-y-4">
            <p className="text-sm text-muted-foreground">You're signed in as a {sessionUser.role}. Your existing role won't be changed. Choose a judge account below, or ask the organiser to update your role.</p>
            {sessionUser.role === "admin" && <Button asChild variant="outline"><Link to="/dashboard/admin">Open admin dashboard</Link></Button>}
          </div> : null}
          {pending ? <p role="status" className="flex items-center gap-2 text-sm"><Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />{waitingForProfile ? "Access activated. Opening your workspace…" : "Setting up your judge access…"}</p> : <div className="space-y-3">
            {error && eligible && sessionUser && <Button className="w-full" onClick={() => void continueWithCurrentAccount()}>Retry opening workspace <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" /></Button>}
            <Button className="w-full" variant={sessionUser ? "outline" : "default"} onClick={() => void continueWithGoogle()}>{sessionUser ? "Use another Google account" : "Continue with Google"}<ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" /></Button>
          </div>}
          {error && <p role="alert" className="mt-4 text-sm text-red-400">{error}</p>}
          {waitingForProfile && profileDelayed && <div className="mt-4 text-sm text-muted-foreground"><p>Your access is saved, but your account is taking longer to refresh.</p><Button className="mt-3" variant="outline" onClick={() => window.location.reload()}>Reload workspace</Button></div>}
          <p className="mt-5 text-xs leading-relaxed text-muted-foreground">This invitation activates judge access for the listed event. Please don't forward it without the organiser's permission.</p>
        </>}
      </section>
    </div>
  </main>;
}
