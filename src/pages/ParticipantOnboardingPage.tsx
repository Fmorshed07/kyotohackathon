import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { doc, getDoc, setDoc } from "firebase/firestore";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Check,
  Compass,
  Github,
  Globe,
  Linkedin,
  MapPin,
  MessageCircle,
  Sparkles,
  UserRound,
} from "lucide-react";
import AnimatedBackground from "@/components/AnimatedBackground";
import BrandLogo from "@/components/BrandLogo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { usePortalAuth } from "@/hooks/usePortalAuth";
import { getFirestoreDb } from "@/lib/firebaseClient";
import {
  SITE_HACKATHON_ID,
  getHackathonById,
  getJoinableHackathons,
  isHackathonId,
  isJoinableHackathon,
  type HackathonId,
} from "@/lib/hackathons";
import { getDashboardPathForUser, participantNeedsOnboarding } from "@/lib/portalRoutes";
import { queueParticipantEmail } from "@/lib/participantEmail";
import { cn } from "@/lib/utils";

const JOINABLE = getJoinableHackathons();

type OnboardingStep = 1 | 2 | 3;

type OnboardingForm = {
  fullName: string;
  headline: string;
  publicRole: string;
  experienceLevel: string;
  organization: string;
  location: string;
  bio: string;
  skills: string;
  interests: string;
  lookingFor: string;
  languages: string;
  githubUsername: string;
  linkedinUrl: string;
  portfolioUrl: string;
  xUrl: string;
  discordHandle: string;
};

const emptyForm: OnboardingForm = {
  fullName: "",
  headline: "",
  publicRole: "",
  experienceLevel: "",
  organization: "",
  location: "",
  bio: "",
  skills: "",
  interests: "",
  lookingFor: "",
  languages: "",
  githubUsername: "",
  linkedinUrl: "",
  portfolioUrl: "",
  xUrl: "",
  discordHandle: "",
};

const ROLE_OPTIONS = [
  {
    id: "Engineer",
    label: "Engineer",
    hint: "Full-stack, AI/ML, mobile, infra",
  },
  {
    id: "Designer",
    label: "Designer",
    hint: "Product, UX, visual, prototyping",
  },
  {
    id: "Product",
    label: "Product",
    hint: "PM, strategy, go-to-market",
  },
  {
    id: "Domain",
    label: "Domain expert",
    hint: "Health, climate, policy, research",
  },
  {
    id: "Founder",
    label: "Founder",
    hint: "Startup lead, operator, builder",
  },
  {
    id: "Other",
    label: "Other",
    hint: "Student, multi-hat, still exploring",
  },
] as const;

const SKILL_SUGGESTIONS = [
  "React",
  "Python",
  "TypeScript",
  "UI/UX",
  "Figma",
  "AI / LLMs",
  "Data",
  "Product",
  "Research",
  "Hardware",
];

const LOOKING_FOR_OPTIONS = [
  "Teammates",
  "A designer",
  "An engineer",
  "A domain partner",
  "A mentor",
  "Solo for now",
];

const normalizeGithubUsername = (value: string) =>
  value
    .trim()
    .replace(/^@/, "")
    .replace(/^https?:\/\/(www\.)?github\.com\//i, "")
    .split(/[/?#]/)[0] ?? "";

const normalizeHandleOrUrl = (value: string, hostHint?: string) => {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (hostHint && trimmed.includes(hostHint)) return `https://${trimmed.replace(/^\/+/, "")}`;
  if (hostHint === "linkedin.com" && !trimmed.includes("/")) {
    return `https://linkedin.com/in/${trimmed.replace(/^@/, "")}`;
  }
  if (hostHint === "x.com") {
    const handle = trimmed.replace(/^@/, "");
    return `https://x.com/${handle}`;
  }
  return trimmed;
};

const parseSkillList = (value: string) =>
  value
    .split(/[,;\n]/)
    .map((part) => part.trim())
    .filter(Boolean);

const stepMeta: Record<OnboardingStep, { title: string; subtitle: string }> = {
  1: {
    title: "Confirm your event",
    subtitle: "Pick the open hackathon you are joining. Past editions stay hidden.",
  },
  2: {
    title: "Who are you on the team?",
    subtitle: "Name + what you do is enough. Everything else is optional.",
  },
  3: {
    title: "Skills & socials",
    subtitle: "Optional — help teammates find you. GitHub and socials can wait.",
  },
};

export default function ParticipantOnboardingPage() {
  const navigate = useNavigate();
  const db = getFirestoreDb();
  const { sessionUser, loading: authLoading, signOut } = usePortalAuth();

  const [step, setStep] = useState<OnboardingStep>(1);
  const [hackathonId, setHackathonId] = useState<HackathonId>(
    JOINABLE[0]?.id ?? SITE_HACKATHON_ID
  );
  const [form, setForm] = useState<OnboardingForm>(emptyForm);
  const [customRole, setCustomRole] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedHackathon = useMemo(() => getHackathonById(hackathonId), [hackathonId]);
  const selectedSkills = useMemo(() => parseSkillList(form.skills), [form.skills]);
  const knownRoleIds = useMemo(() => new Set(ROLE_OPTIONS.map((role) => role.id)), []);

  useEffect(() => {
    if (authLoading) return;
    if (!sessionUser || sessionUser.role !== "participant") return;

    let cancelled = false;
    const load = async () => {
      setIsLoading(true);
      try {
        const snap = await getDoc(doc(db, "users", sessionUser.id));
        const data = snap.data() ?? {};
        const enrolled =
          typeof data.hackathon_id === "string" && isHackathonId(data.hackathon_id)
            ? data.hackathon_id
            : Array.isArray(data.hackathon_ids) &&
                typeof data.hackathon_ids[0] === "string" &&
                isHackathonId(data.hackathon_ids[0])
              ? data.hackathon_ids[0]
              : sessionUser.hackathonId;

        const nextId =
          enrolled && isJoinableHackathon(getHackathonById(enrolled))
            ? enrolled
            : (JOINABLE[0]?.id ?? SITE_HACKATHON_ID);

        const loadedRole = typeof data.publicRole === "string" ? data.publicRole : "";

        if (!cancelled) {
          setHackathonId(nextId);
          setForm({
            fullName: typeof data.fullName === "string" ? data.fullName : "",
            headline: typeof data.headline === "string" ? data.headline : "",
            publicRole: loadedRole,
            experienceLevel:
              typeof data.experienceLevel === "string" ? data.experienceLevel : "",
            organization: typeof data.organization === "string" ? data.organization : "",
            location: typeof data.location === "string" ? data.location : "",
            bio: typeof data.bio === "string" ? data.bio : "",
            skills: typeof data.skills === "string" ? data.skills : "",
            interests: typeof data.interests === "string" ? data.interests : "",
            lookingFor: typeof data.lookingFor === "string" ? data.lookingFor : "",
            languages: typeof data.languages === "string" ? data.languages : "",
            githubUsername:
              typeof data.githubUsername === "string" ? data.githubUsername : "",
            linkedinUrl: typeof data.linkedinUrl === "string" ? data.linkedinUrl : "",
            portfolioUrl: typeof data.portfolioUrl === "string" ? data.portfolioUrl : "",
            xUrl: typeof data.xUrl === "string" ? data.xUrl : "",
            discordHandle:
              typeof data.discordHandle === "string" ? data.discordHandle : "",
          });
          if (loadedRole && !knownRoleIds.has(loadedRole as (typeof ROLE_OPTIONS)[number]["id"])) {
            setCustomRole(loadedRole);
          }
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [authLoading, db, knownRoleIds, sessionUser]);

  if (authLoading || isLoading) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">Loading onboarding…</p>
      </div>
    );
  }

  if (!sessionUser) {
    return <Navigate to="/signup" replace />;
  }

  if (sessionUser.role !== "participant") {
    return (
      <Navigate
        to={getDashboardPathForUser(sessionUser.role, sessionUser.judgeApprovalStatus)}
        replace
      />
    );
  }

  if (!participantNeedsOnboarding(sessionUser)) {
    return <Navigate to="/dashboard/participant" replace />;
  }

  const updateField = <K extends keyof OnboardingForm>(key: K, value: OnboardingForm[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setError(null);
  };

  const selectRole = (roleId: string) => {
    setCustomRole("");
    updateField("publicRole", roleId);
    setForm((prev) => ({
      ...prev,
      publicRole: roleId,
      headline: prev.headline.trim()
        ? prev.headline
        : roleId === "Other"
          ? ""
          : `${roleId} joining ${selectedHackathon.shortName}`,
    }));
  };

  const toggleSkill = (skill: string) => {
    const current = new Set(selectedSkills);
    if (current.has(skill)) current.delete(skill);
    else current.add(skill);
    updateField("skills", Array.from(current).join(", "));
  };

  const toggleLookingFor = (value: string) => {
    const current = new Set(parseSkillList(form.lookingFor));
    if (current.has(value)) current.delete(value);
    else current.add(value);
    updateField("lookingFor", Array.from(current).join(", "));
  };

  const validateStep = (current: OnboardingStep): string | null => {
    if (current === 1) {
      if (!hackathonId || !isJoinableHackathon(selectedHackathon)) {
        return "Choose an open hackathon event to continue.";
      }
      return null;
    }
    if (current === 2) {
      if (!form.fullName.trim()) return "Your full name is required.";
      const role =
        form.publicRole === "Other" ? customRole.trim() || "Other" : form.publicRole.trim();
      if (!role) return "Pick what you are — engineer, designer, and so on.";
      return null;
    }
    // Step 3 is fully optional.
    return null;
  };

  const goNext = () => {
    const message = validateStep(step);
    if (message) {
      setError(message);
      return;
    }
    setError(null);
    setStep((current) => (current < 3 ? ((current + 1) as OnboardingStep) : current));
  };

  const goBack = () => {
    setError(null);
    setStep((current) => (current > 1 ? ((current - 1) as OnboardingStep) : current));
  };

  const resolvedRole = () => {
    if (form.publicRole === "Other") return customRole.trim() || "Other";
    return form.publicRole.trim();
  };

  const finishOnboarding = async (options?: { skip?: boolean }) => {
    const skip = options?.skip === true;
    if (!skip) {
      const message = validateStep(step);
      if (message) {
        setError(message);
        return;
      }
      // If finishing from step 2 somehow, still require basics.
      const basics = validateStep(2);
      if (basics && step >= 2) {
        setError(basics);
        setStep(2);
        return;
      }
    } else {
      const eventError = validateStep(1);
      if (eventError) {
        setError(eventError);
        setStep(1);
        return;
      }
      if (!form.fullName.trim() || !resolvedRole()) {
        setError("Add your name and role first — socials can stay empty.");
        setStep(2);
        return;
      }
    }

    setIsSaving(true);
    setError(null);
    try {
      const githubUsername = normalizeGithubUsername(form.githubUsername);
      const role = resolvedRole();
      const now = new Date().toISOString();
      await setDoc(
        doc(db, "users", sessionUser.id),
        {
          fullName: form.fullName.trim(),
          headline:
            form.headline.trim() ||
            (role ? `${role} at ${selectedHackathon.shortName}` : ""),
          publicRole: role,
          experienceLevel: form.experienceLevel.trim(),
          organization: form.organization.trim(),
          location: form.location.trim(),
          bio: form.bio.trim(),
          skills: form.skills.trim(),
          interests: form.interests.trim(),
          lookingFor: form.lookingFor.trim(),
          languages: form.languages.trim(),
          githubUsername,
          githubProfileUrl: githubUsername ? `https://github.com/${githubUsername}` : "",
          linkedinUrl: normalizeHandleOrUrl(form.linkedinUrl, "linkedin.com"),
          portfolioUrl: normalizeHandleOrUrl(form.portfolioUrl),
          xUrl: normalizeHandleOrUrl(form.xUrl, "x.com"),
          discordHandle: form.discordHandle.trim().replace(/^@/, ""),
          hackathon_id: hackathonId,
          hackathon_ids: [hackathonId],
          profileUpdatedAt: now,
          onboardingCompletedAt: now,
        },
        { merge: true }
      );
      queueParticipantEmail({
        type: "welcome",
        hackathonName: selectedHackathon.name,
      });
      navigate("/dashboard/participant", { replace: true });
    } catch (err: unknown) {
      const msg =
        typeof err === "object" && err && "message" in err
          ? String((err as { message?: string }).message)
          : "Could not save your profile. Please try again.";
      setError(msg);
    } finally {
      setIsSaving(false);
    }
  };

  const meta = stepMeta[step];
  const selectedRoleId = knownRoleIds.has(form.publicRole as (typeof ROLE_OPTIONS)[number]["id"])
    ? form.publicRole
    : form.publicRole
      ? "Other"
      : "";

  return (
    <div className="min-h-screen bg-background text-foreground">
      <AnimatedBackground />

      <main className="relative mx-auto max-w-3xl px-6 pb-20 pt-10">
        <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <BrandLogo size="md" href="/" />
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="truncate max-w-[180px]">{sessionUser.email}</span>
            <button
              type="button"
              className="underline underline-offset-2 hover:text-foreground"
              onClick={() => void signOut()}
            >
              Sign out
            </button>
          </div>
        </header>

        <section className="rounded-2xl border border-border bg-card/90 p-6 shadow-sm sm:p-8">
          <div className="mb-6 flex flex-wrap items-center gap-2">
            {([1, 2, 3] as OnboardingStep[]).map((value) => {
              const done = step > value;
              const active = step === value;
              return (
                <div key={value} className="flex items-center gap-2">
                  <span
                    className={cn(
                      "inline-flex h-8 w-8 items-center justify-center rounded-full border text-xs font-semibold",
                      done
                        ? "border-primary bg-primary text-primary-foreground"
                        : active
                          ? "border-primary/60 bg-primary/15 text-primary"
                          : "border-border text-muted-foreground"
                    )}
                  >
                    {done ? <Check className="h-3.5 w-3.5" /> : value}
                  </span>
                  {value < 3 ? (
                    <span className="hidden h-px w-6 bg-border sm:block" aria-hidden />
                  ) : null}
                </div>
              );
            })}
          </div>

          <p className="font-display text-xs font-semibold uppercase tracking-[0.22em] text-primary">
            Participant onboarding
          </p>
          <h1 className="mt-2 font-display text-2xl font-semibold tracking-tight sm:text-3xl">
            {meta.title}
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{meta.subtitle}</p>

          <div className="mt-8 space-y-6">
            {step === 1 ? (
              <div className="space-y-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  {JOINABLE.map((hackathon) => {
                    const selected = hackathon.id === hackathonId;
                    return (
                      <button
                        key={hackathon.id}
                        type="button"
                        onClick={() => setHackathonId(hackathon.id)}
                        className={cn(
                          "rounded-xl border p-4 text-left transition",
                          selected
                            ? "border-primary bg-primary/10"
                            : "border-border/70 bg-background/50 hover:border-primary/40"
                        )}
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-display text-base font-semibold">
                            {hackathon.name}
                          </span>
                          <Badge variant={hackathon.status === "active" ? "default" : "secondary"}>
                            {hackathon.status}
                          </Badge>
                        </div>
                        <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                          <MapPin className="h-3.5 w-3.5" />
                          {hackathon.location}
                        </p>
                        <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                          <CalendarDays className="h-3.5 w-3.5" />
                          {hackathon.eventDate}
                        </p>
                        <p className="mt-3 text-sm leading-relaxed text-foreground/80">
                          {hackathon.theme}
                        </p>
                      </button>
                    );
                  })}
                  <Link
                    to="/hackathons"
                    className="rounded-xl border border-dashed border-border/80 bg-background/30 p-4 text-left transition hover:border-primary/50 hover:bg-primary/5"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-primary/30 bg-primary/10 text-primary">
                        <Compass className="h-3.5 w-3.5" />
                      </span>
                      <span className="font-display text-base font-semibold">Explore events</span>
                      <Badge variant="outline">browse</Badge>
                    </div>
                    <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                      Not sure yet? Browse every Cognisor Impact hub, then come back and join the one
                      that fits.
                    </p>
                    <p className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-primary">
                      Open hackathons
                      <ArrowRight className="h-3.5 w-3.5" />
                    </p>
                  </Link>
                </div>
                <p className="rounded-lg border border-border/50 bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
                  You are joining <strong className="text-foreground">{selectedHackathon.name}</strong>.
                </p>
              </div>
            ) : null}

            {step === 2 ? (
              <div className="space-y-5">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    Full name *
                  </label>
                  <Input
                    value={form.fullName}
                    onChange={(e) => updateField("fullName", e.target.value)}
                    placeholder="How you want to appear on the board"
                    autoComplete="name"
                  />
                </div>

                <div>
                  <p className="mb-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    I am joining as *
                  </p>
                  <p className="mb-3 text-xs text-muted-foreground">
                    Tap the closest fit — engineer, designer, product, domain, founder, or other.
                  </p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {ROLE_OPTIONS.map((role) => {
                      const selected = selectedRoleId === role.id;
                      return (
                        <button
                          key={role.id}
                          type="button"
                          onClick={() => selectRole(role.id)}
                          className={cn(
                            "rounded-xl border px-3 py-3 text-left transition",
                            selected
                              ? "border-primary bg-primary/10"
                              : "border-border/70 bg-background/40 hover:border-primary/40"
                          )}
                        >
                          <span className="font-display text-sm font-semibold text-foreground">
                            {role.label}
                          </span>
                          <span className="mt-1 block text-xs text-muted-foreground">{role.hint}</span>
                        </button>
                      );
                    })}
                  </div>
                  {selectedRoleId === "Other" ? (
                    <Input
                      className="mt-3"
                      value={customRole}
                      onChange={(e) => {
                        setCustomRole(e.target.value);
                        updateField("publicRole", "Other");
                      }}
                      placeholder="Describe your role (optional)"
                    />
                  ) : null}
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                      Experience
                    </label>
                    <Select
                      value={form.experienceLevel || undefined}
                      onValueChange={(value) => updateField("experienceLevel", value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Optional" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Student">Student</SelectItem>
                        <SelectItem value="Early career">Early career</SelectItem>
                        <SelectItem value="Mid-level">Mid-level</SelectItem>
                        <SelectItem value="Senior">Senior</SelectItem>
                        <SelectItem value="Founder">Founder / lead</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                      School / org
                    </label>
                    <Input
                      value={form.organization}
                      onChange={(e) => updateField("organization", e.target.value)}
                      placeholder="Optional"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                      Location
                    </label>
                    <Input
                      value={form.location}
                      onChange={(e) => updateField("location", e.target.value)}
                      placeholder="City (optional)"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                      Short headline
                    </label>
                    <Input
                      value={form.headline}
                      onChange={(e) => updateField("headline", e.target.value)}
                      placeholder="Optional one-liner"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    Quick intro
                  </label>
                  <Textarea
                    value={form.bio}
                    onChange={(e) => updateField("bio", e.target.value)}
                    placeholder="Optional — what you want to build or who you want to meet"
                    rows={3}
                  />
                </div>
              </div>
            ) : null}

            {step === 3 ? (
              <div className="space-y-6">
                <div>
                  <p className="mb-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    Skills <span className="normal-case tracking-normal text-muted-foreground/80">(optional)</span>
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {SKILL_SUGGESTIONS.map((skill) => {
                      const active = selectedSkills.includes(skill);
                      return (
                        <button
                          key={skill}
                          type="button"
                          onClick={() => toggleSkill(skill)}
                          className={cn(
                            "rounded-full border px-3 py-1.5 text-xs transition",
                            active
                              ? "border-primary bg-primary/15 text-primary"
                              : "border-border/70 text-muted-foreground hover:border-primary/40"
                          )}
                        >
                          {skill}
                        </button>
                      );
                    })}
                  </div>
                  <Input
                    className="mt-3"
                    value={form.skills}
                    onChange={(e) => updateField("skills", e.target.value)}
                    placeholder="Or type your own, comma separated"
                  />
                </div>

                <div>
                  <p className="mb-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    Looking for <span className="normal-case tracking-normal text-muted-foreground/80">(optional)</span>
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {LOOKING_FOR_OPTIONS.map((option) => {
                      const active = parseSkillList(form.lookingFor).includes(option);
                      return (
                        <button
                          key={option}
                          type="button"
                          onClick={() => toggleLookingFor(option)}
                          className={cn(
                            "rounded-full border px-3 py-1.5 text-xs transition",
                            active
                              ? "border-primary bg-primary/15 text-primary"
                              : "border-border/70 text-muted-foreground hover:border-primary/40"
                          )}
                        >
                          {option}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="rounded-xl border border-border/60 bg-muted/15 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    Socials <span className="normal-case tracking-normal">(all optional)</span>
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Handles only — no need for full URLs. Skip anything you do not use.
                  </p>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <label className="space-y-1.5">
                      <span className="flex items-center gap-1.5 text-xs font-medium text-foreground">
                        <MessageCircle className="h-3.5 w-3.5 text-muted-foreground" />
                        Discord
                      </span>
                      <Input
                        value={form.discordHandle}
                        onChange={(e) => updateField("discordHandle", e.target.value)}
                        placeholder="username"
                        autoComplete="off"
                      />
                    </label>

                    <label className="space-y-1.5">
                      <span className="flex items-center gap-1.5 text-xs font-medium text-foreground">
                        <Github className="h-3.5 w-3.5 text-muted-foreground" />
                        GitHub
                        <Badge variant="outline" className="text-[0.6rem] uppercase">
                          optional
                        </Badge>
                      </span>
                      <Input
                        value={form.githubUsername}
                        onChange={(e) => updateField("githubUsername", e.target.value)}
                        placeholder="username"
                        autoComplete="off"
                      />
                    </label>

                    <label className="space-y-1.5">
                      <span className="flex items-center gap-1.5 text-xs font-medium text-foreground">
                        <Linkedin className="h-3.5 w-3.5 text-muted-foreground" />
                        LinkedIn
                      </span>
                      <Input
                        value={form.linkedinUrl}
                        onChange={(e) => updateField("linkedinUrl", e.target.value)}
                        placeholder="in/yourname or paste link"
                        autoComplete="off"
                      />
                    </label>

                    <label className="space-y-1.5">
                      <span className="flex items-center gap-1.5 text-xs font-medium text-foreground">
                        X / Twitter
                      </span>
                      <Input
                        value={form.xUrl}
                        onChange={(e) => updateField("xUrl", e.target.value)}
                        placeholder="@handle"
                        autoComplete="off"
                      />
                    </label>

                    <label className="space-y-1.5 sm:col-span-2">
                      <span className="flex items-center gap-1.5 text-xs font-medium text-foreground">
                        <Globe className="h-3.5 w-3.5 text-muted-foreground" />
                        Portfolio / website
                      </span>
                      <Input
                        value={form.portfolioUrl}
                        onChange={(e) => updateField("portfolioUrl", e.target.value)}
                        placeholder="yoursite.com"
                        autoComplete="off"
                      />
                    </label>
                  </div>
                </div>

                <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
                  <div className="flex items-start gap-3">
                    <span className="mt-0.5 rounded-full border border-primary/30 bg-primary/10 p-2 text-primary">
                      <Sparkles className="h-4 w-4" />
                    </span>
                    <div>
                      <p className="font-display text-sm font-semibold">
                        Ready for {selectedHackathon.shortName}
                      </p>
                      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                        You can finish with just your name and role. Skills and socials can be edited
                        anytime from your profile page.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          {error ? <p className="mt-4 text-sm text-destructive">{error}</p> : null}

          <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-border/50 pt-6">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <UserRound className="h-3.5 w-3.5" />
              Step {step} of 3
            </div>
            <div className="flex flex-wrap gap-2">
              {step > 1 ? (
                <Button type="button" variant="outline" onClick={goBack} disabled={isSaving}>
                  <ArrowLeft className="mr-1.5 h-4 w-4" />
                  Back
                </Button>
              ) : (
                <Button type="button" variant="ghost" asChild>
                  <Link to="/">Cancel</Link>
                </Button>
              )}
              {step < 3 ? (
                <Button type="button" onClick={goNext}>
                  Continue
                  <ArrowRight className="ml-1.5 h-4 w-4" />
                </Button>
              ) : (
                <>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => void finishOnboarding({ skip: true })}
                    disabled={isSaving}
                  >
                    Skip socials
                  </Button>
                  <Button type="button" onClick={() => void finishOnboarding()} disabled={isSaving}>
                    {isSaving ? "Saving…" : "Finish & open dashboard"}
                    <ArrowRight className="ml-1.5 h-4 w-4" />
                  </Button>
                </>
              )}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
