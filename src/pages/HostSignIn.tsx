import { useEffect, useState, type ReactNode } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { GoogleAuthProvider, signInWithPopup, signOut as firebaseSignOut } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { ArrowLeft, ArrowRight, CalendarDays, Check, MapPin, Sparkles } from "lucide-react";
import AnimatedBackground from "@/components/AnimatedBackground";
import BrandLogo from "@/components/BrandLogo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { getFirebaseAuth, getFirestoreDb } from "@/lib/firebaseClient";
import { usePortalAuth } from "@/hooks/usePortalAuth";
import {
  buildHostApplication,
  emptyHostApplicationDraft,
  getHostApplicationStepError,
  type HostApplicationDraft,
} from "@/lib/hostApplication";

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
  const [signupStep, setSignupStep] = useState(0);
  const [application, setApplication] = useState<HostApplicationDraft>(emptyHostApplicationDraft);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && sessionUser?.role === "host") {
      navigate("/dashboard/host", { replace: true });
    }
  }, [loading, navigate, sessionUser]);

  const continueWithGoogle = async () => {
    setError(null);
    if (mode === "signup") {
      for (let step = 0; step < 3; step += 1) {
        const validationError = getHostApplicationStepError(step, {
          fullName,
          organization,
          draft: application,
        });
        if (validationError) {
          setSignupStep(step);
          setError(validationError);
          return;
        }
      }
    }
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
        await setDoc(
          userRef,
          {
            email: user.email,
            role: "host",
            hostApprovalStatus: "pending",
            fullName: fullName.trim() || user.displayName || "",
            organization: organization.trim(),
            hostRequestedAt: new Date().toISOString(),
            hostApplication: buildHostApplication(application),
          },
          { merge: true },
        );
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

  const updateApplication = (field: keyof HostApplicationDraft, value: string) => {
    setApplication((current) => ({ ...current, [field]: value }));
  };

  const goToNextStep = () => {
    const validationError = getHostApplicationStepError(signupStep, {
      fullName,
      organization,
      draft: application,
    });
    if (validationError) {
      setError(validationError);
      return;
    }
    setError(null);
    setSignupStep((current) => Math.min(2, current + 1));
  };

  const signupSteps = ["About you", "Event plan", "Goals & support"];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <AnimatedBackground />
      <main className="relative mx-auto max-w-5xl px-4 pb-20 pt-8 sm:px-6 sm:pt-12">
        <section className={`${sectionClass} mb-8 flex flex-col gap-5 p-6 sm:flex-row sm:items-center sm:justify-between`}>
          <div className="flex items-center gap-5">
            <BrandLogo size="lg" href="/" priority />
            <div>
              <p className="font-display text-xs font-semibold uppercase tracking-[0.24em] text-primary">Cognisor Event Operations</p>
              <h1 className="mt-2 font-display text-2xl font-semibold tracking-tight md:text-3xl">Host portal</h1>
              <p className="mt-2 text-sm text-muted-foreground">Create approved events, issue QR tickets, manage judges, run check-in, and review submissions & judging marks.</p>
            </div>
          </div>
          <Badge variant="outline" className="w-fit border-primary/40 bg-primary/10 uppercase tracking-[0.14em] text-primary">Approval required</Badge>
        </section>

        <section className={sectionClass}>
          <Card className="border-0 bg-transparent shadow-none">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm uppercase tracking-[0.28em]">{mode === "signin" ? "Host sign in" : "Request host access"}</CardTitle>
              <p className="mt-2 text-sm text-muted-foreground">
                {mode === "signin"
                  ? "Host access is activated only after an admin approves the request."
                  : "Tell us what you want to host so the team can review and support your event."}
              </p>
            </CardHeader>
            <CardContent className="space-y-5 pt-2">
              <div className="inline-flex items-center rounded-full border border-border/60 bg-muted/40 p-1 text-sm">
                <button type="button" onClick={() => { setMode("signin"); setError(null); }} className={`rounded-full px-4 py-2 ${mode === "signin" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>Sign in</button>
                <button type="button" onClick={() => { setMode("signup"); setSignupStep(0); setError(null); }} className={`rounded-full px-4 py-2 ${mode === "signup" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>Request access</button>
              </div>

              {mode === "signup" ? (
                <div className="space-y-6">
                  <div className="grid grid-cols-3 gap-2" aria-label="Host onboarding progress">
                    {signupSteps.map((label, index) => (
                      <div key={label} className="min-w-0">
                        <div className={`h-1 rounded-full ${index <= signupStep ? "bg-primary" : "bg-muted"}`} />
                        <div className="mt-2 flex items-center gap-1.5">
                          <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[10px] font-bold ${index < signupStep ? "border-emerald-400/40 bg-emerald-500/10 text-emerald-300" : index === signupStep ? "border-primary/50 bg-primary/10 text-primary" : "border-border text-muted-foreground"}`}>
                            {index < signupStep ? <Check className="h-3 w-3" /> : index + 1}
                          </span>
                          <span className={`truncate text-[10px] font-semibold uppercase tracking-wider sm:text-xs ${index === signupStep ? "text-foreground" : "text-muted-foreground"}`}>{label}</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {signupStep === 0 ? (
                    <div className="space-y-5 rounded-xl border border-white/10 bg-muted/10 p-4 sm:p-5">
                      <div>
                        <p className="dash-eyebrow">Step 1</p>
                        <h2 className="mt-1 text-xl font-semibold">Tell us about the host</h2>
                        <p className="mt-1 text-sm text-muted-foreground">The person or organization responsible for the event.</p>
                      </div>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <Field label="Your name" htmlFor="host-name" required>
                          <Input id="host-name" value={fullName} onChange={(event) => setFullName(event.target.value)} placeholder="Full name" />
                        </Field>
                        <Field label="Organization or community" htmlFor="host-organization" required>
                          <Input id="host-organization" value={organization} onChange={(event) => setOrganization(event.target.value)} placeholder="Organization, university, or community" />
                        </Field>
                        <Field label="Your role" htmlFor="host-title">
                          <Input id="host-title" value={application.organizerTitle} onChange={(event) => updateApplication("organizerTitle", event.target.value)} placeholder="Founder, community lead, lecturer…" />
                        </Field>
                        <Field label="Website or profile" htmlFor="host-website">
                          <Input id="host-website" type="url" value={application.website} onChange={(event) => updateApplication("website", event.target.value)} placeholder="https://…" />
                        </Field>
                      </div>
                    </div>
                  ) : null}

                  {signupStep === 1 ? (
                    <div className="space-y-5 rounded-xl border border-white/10 bg-muted/10 p-4 sm:p-5">
                      <div>
                        <p className="dash-eyebrow">Step 2</p>
                        <h2 className="mt-1 text-xl font-semibold">What do you want to host?</h2>
                        <p className="mt-1 text-sm text-muted-foreground">A working plan is enough—you can refine it after approval.</p>
                      </div>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <Field label="Working event name" htmlFor="host-event-name" required className="sm:col-span-2">
                          <Input id="host-event-name" value={application.eventName} onChange={(event) => updateApplication("eventName", event.target.value)} placeholder="AI for Climate Hackathon 2026" />
                        </Field>
                        <Field label="Event type" htmlFor="host-event-type">
                          <select id="host-event-type" value={application.eventType} onChange={(event) => updateApplication("eventType", event.target.value)} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground">
                            <option>Hackathon</option><option>Ideathon</option><option>Innovation challenge</option><option>Startup competition</option><option>Workshop</option><option>Community event</option><option>Other</option>
                          </select>
                        </Field>
                        <Field label="Format" htmlFor="host-event-format">
                          <select id="host-event-format" value={application.format} onChange={(event) => updateApplication("format", event.target.value)} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground">
                            <option>Online</option><option>In person</option><option>Hybrid</option>
                          </select>
                        </Field>
                        <Field label="Who is it for?" htmlFor="host-audience" required className="sm:col-span-2">
                          <Textarea id="host-audience" rows={3} value={application.audience} onChange={(event) => updateApplication("audience", event.target.value)} placeholder="Students, early-stage founders, developers, local NGOs…" />
                        </Field>
                        <Field label="Expected attendees" htmlFor="host-attendees">
                          <Input id="host-attendees" value={application.expectedAttendees} onChange={(event) => updateApplication("expectedAttendees", event.target.value)} placeholder="About 100 people" />
                        </Field>
                        <Field label="Target date or month" htmlFor="host-date" required>
                          <Input id="host-date" value={application.targetDate} onChange={(event) => updateApplication("targetDate", event.target.value)} placeholder="October 2026 or 2026-10-15" />
                        </Field>
                        <Field label="Duration" htmlFor="host-duration">
                          <Input id="host-duration" value={application.duration} onChange={(event) => updateApplication("duration", event.target.value)} placeholder="2 days / 4 weeks" />
                        </Field>
                        <Field label="Location" htmlFor="host-location">
                          <Input id="host-location" value={application.location} onChange={(event) => updateApplication("location", event.target.value)} placeholder="City, venue, or online" />
                        </Field>
                        <Field label="Timezone" htmlFor="host-timezone" className="sm:col-span-2">
                          <Input id="host-timezone" value={application.timezone} onChange={(event) => updateApplication("timezone", event.target.value)} placeholder="Asia/Tokyo" />
                        </Field>
                      </div>
                    </div>
                  ) : null}

                  {signupStep === 2 ? (
                    <div className="space-y-5 rounded-xl border border-white/10 bg-muted/10 p-4 sm:p-5">
                      <div>
                        <p className="dash-eyebrow">Step 3</p>
                        <h2 className="mt-1 text-xl font-semibold">Purpose, success, and support</h2>
                        <p className="mt-1 text-sm text-muted-foreground">Help us understand the experience you want participants to have.</p>
                      </div>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <Field label="Theme or challenge" htmlFor="host-theme" required className="sm:col-span-2">
                          <Textarea id="host-theme" rows={3} value={application.theme} onChange={(event) => updateApplication("theme", event.target.value)} placeholder="What problem area or challenge will teams work on?" />
                        </Field>
                        <Field label="Main goals" htmlFor="host-goals" required className="sm:col-span-2">
                          <Textarea id="host-goals" rows={3} value={application.goals} onChange={(event) => updateApplication("goals", event.target.value)} placeholder="What should this event achieve for participants and the community?" />
                        </Field>
                        <Field label="What would success look like?" htmlFor="host-success">
                          <Textarea id="host-success" rows={3} value={application.successDefinition} onChange={(event) => updateApplication("successDefinition", event.target.value)} placeholder="Projects launched, people trained, partnerships formed…" />
                        </Field>
                        <Field label="Support needed from Cognisor" htmlFor="host-support">
                          <Textarea id="host-support" rows={3} value={application.supportNeeded} onChange={(event) => updateApplication("supportNeeded", event.target.value)} placeholder="Promotion, judges, mentors, platform setup, sponsors…" />
                        </Field>
                        <Field label="Previous hosting experience" htmlFor="host-experience" className="sm:col-span-2">
                          <Textarea id="host-experience" rows={3} value={application.experience} onChange={(event) => updateApplication("experience", event.target.value)} placeholder="Share past events or tell us this is your first one." />
                        </Field>
                      </div>
                      <div className="grid gap-2 rounded-xl border border-primary/20 bg-primary/[0.055] p-4 text-sm sm:grid-cols-3">
                        <span className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" />{application.eventType}</span>
                        <span className="flex items-center gap-2"><CalendarDays className="h-4 w-4 text-primary" />{application.targetDate || "Date pending"}</span>
                        <span className="flex items-center gap-2"><MapPin className="h-4 w-4 text-primary" />{application.format}</span>
                      </div>
                    </div>
                  ) : null}

                  {error ? <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p> : null}

                  <div className="flex flex-col-reverse gap-3 border-t border-white/10 pt-5 sm:flex-row sm:items-center sm:justify-between">
                    <Button type="button" variant="outline" disabled={signupStep === 0 || isLoading} onClick={() => { setError(null); setSignupStep((current) => Math.max(0, current - 1)); }}>
                      <ArrowLeft className="mr-2 h-4 w-4" />Back
                    </Button>
                    {signupStep < 2 ? (
                      <Button type="button" onClick={goToNextStep}>Continue<ArrowRight className="ml-2 h-4 w-4" /></Button>
                    ) : (
                      <Button type="button" className="gap-2" onClick={() => void continueWithGoogle()} disabled={isLoading}>
                        <GoogleIcon />{isLoading ? "Submitting request…" : "Submit request with Google"}
                      </Button>
                    )}
                  </div>
                </div>
              ) : null}

              {mode === "signin" ? (
                <>
                  {error ? <p className="text-sm text-destructive">{error}</p> : null}
                  <Button type="button" className="w-full gap-2 uppercase tracking-[0.16em]" onClick={() => void continueWithGoogle()} disabled={isLoading}>
                    <GoogleIcon />{isLoading ? "Please wait..." : "Continue with Google"}
                  </Button>
                </>
              ) : null}
            </CardContent>
          </Card>
        </section>
      </main>
    </div>
  );
}

function Field({
  label,
  htmlFor,
  required,
  className = "",
  children,
}: {
  label: string;
  htmlFor: string;
  required?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={`space-y-2 ${className}`}>
      <label htmlFor={htmlFor} className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        {label}{required ? <span className="ml-1 text-primary">*</span> : null}
      </label>
      {children}
    </div>
  );
}
