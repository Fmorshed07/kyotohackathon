import { motion } from "framer-motion";
import {
  Briefcase,
  CheckCircle2,
  ExternalLink,
  FileSearch,
  MessageSquare,
  Sparkles,
  Target,
  Upload,
} from "lucide-react";
import { useScrollReveal } from "@/hooks/useScrollReveal";

const PEER_PORTAL_URL = "https://peerportal.app";
const COGNISOR_URL = "https://www.cognisorai.com";
const PROMO_CODE = "PEER@STT";

const guideSteps = [
  {
    icon: Upload,
    title: "Create your free Peer Portal account",
    description:
      "Open peerportal.app and start free. Cognisor builders use Peer Portal—the official get-hired partner of Cognisor AI—to turn hackathon momentum into real Japan offers.",
    tips: [
      "Start on Starter to build your profile, parse your CV, and discover Japan-fit roles.",
      `Upgrade to Student Pro for auto-apply and interview coaching—use promo code ${PROMO_CODE} for 2 free months.`,
    ],
  },
  {
    icon: MessageSquare,
    title: "Import your Cognisor builder story",
    description:
      "Upload your CV or chat with Peer. Add Cognisor Impact projects, demos, and GitHub links so AI matching sees shipping proof—not a generic resume.",
    tips: [
      "State your hire goal clearly: Tokyo, nationwide 求人, internship, or full-time.",
      "Complete the profile checklist until your strength monitor looks offer-ready.",
    ],
  },
  {
    icon: FileSearch,
    title: "Score your CV for Japan-fit hires",
    description:
      "Run CV Analysis before you apply. Peer Portal shows strengths, gaps, and which Tokyo or nationwide tracks fit Cognisor-trained builders.",
    tips: [
      "Fix gaps first—role targeting, language readiness, and project proof.",
      "Polish English CVs and Japan-ready 履歴書・職務経歴書 when recruiters expect both.",
    ],
  },
  {
    icon: Sparkles,
    title: "Ship resume + portfolio assets",
    description:
      "Use AI Resume Maker and Portfolio Maker to turn hackathon builds into ATS-friendly materials that help you get hired faster.",
    tips: [
      "Target one role family at a time (AI engineer, product, research intern).",
      "Feature Cognisor hackathon outcomes and live demos from the Cognisor ecosystem.",
    ],
  },
  {
    icon: Target,
    title: "Match roles that can hire you",
    description:
      "Let semantic matching rank Tokyo careers, internships, remote roles, and Japan-first openings by skills, language, and trajectory.",
    tips: [
      "Prioritize high-fit matches over spray-and-pray applications.",
      "Filter internship tracks if you are early-career or post-hackathon.",
    ],
  },
  {
    icon: Briefcase,
    title: "Apply, interview, and get hired",
    description:
      "Use the application command center to apply or auto-apply, track every reply, and practice with AI interview coaching—the last mile from Cognisor events to signed offers.",
    tips: [
      "Keep applications, interviews, and follow-ups in one inbox.",
      "Use personalised learning paths to close gaps while replies come in.",
    ],
  },
];

const moduleLinks = [
  { label: "CV Analysis", href: PEER_PORTAL_URL },
  { label: "Role Matches", href: PEER_PORTAL_URL },
  { label: "AI Resume Maker", href: PEER_PORTAL_URL },
  { label: "Portfolio Maker", href: PEER_PORTAL_URL },
];

const partnershipSignals = [
  "Official get-hired partner of Cognisor AI",
  "Built so hackathon builders land Japan offers",
  "AI matching for Tokyo careers, internships & remote roles",
];

const LookingForJobsSection = () => {
  const { ref, isVisible } = useScrollReveal<HTMLDivElement>({ threshold: 0.12 });

  return (
    <section
      className="relative overflow-hidden px-6 py-24 md:py-32"
      id="get-hired"
      aria-labelledby="get-hired-heading"
    >
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-b from-background via-background/95 to-background" />
        <motion.div
          className="absolute left-1/3 top-1/4 h-72 w-72 rounded-full bg-primary/12 blur-[120px]"
          animate={{ opacity: [0.2, 0.45, 0.2], scale: [1, 1.06, 1] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute bottom-1/4 right-1/4 h-64 w-64 rounded-full bg-secondary/12 blur-[110px]"
          animate={{ opacity: [0.15, 0.4, 0.15] }}
          transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      <div ref={ref} className="mx-auto max-w-5xl">
        <motion.div
          className="mb-10 text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={isVisible ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
        >
          <span className="font-display text-xs tracking-[0.3em] text-primary sm:text-sm sm:tracking-[0.4em]">
            GET HIRED
          </span>
          <h2
            id="get-hired-heading"
            className="mt-4 font-display text-3xl font-bold tracking-tight text-foreground md:text-5xl"
          >
            Get hired with Peer Portal
          </h2>
          <p className="mx-auto mt-5 max-w-3xl font-body text-base text-muted-foreground md:text-lg">
            <a
              href={PEER_PORTAL_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-foreground underline-offset-4 hover:text-primary hover:underline"
            >
              Peer Portal
            </a>{" "}
            <span className="text-foreground/90">(peerportal.app)</span> is the official get-hired
            partner of{" "}
            <a
              href={COGNISOR_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-foreground underline-offset-4 hover:text-primary hover:underline"
            >
              Cognisor AI
            </a>{" "}
            <span className="text-foreground/90">(www.cognisorai.com)</span>—helping builders move
            from hackathons to Tokyo careers, nationwide 求人, internships, and signed offers.
          </p>
        </motion.div>

        <motion.aside
          className="mb-12 rounded-2xl border border-primary/30 bg-primary/5 px-6 py-5 text-center backdrop-blur-md md:px-8"
          initial={{ opacity: 0, y: 16 }}
          animate={isVisible ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.55, delay: 0.08 }}
          aria-label="Partnership highlights"
        >
          <p className="font-display text-xs tracking-[0.22em] text-primary">
            FROM HACKATHON TO HIRED
          </p>
          <p className="mx-auto mt-3 max-w-2xl font-body text-sm text-foreground/90 md:text-base">
            Build at Cognisor Impact events. Get hired on Peer Portal—the AI career platform Cognisor
            trusts to help students, engineers, and founders land Japan roles with precision.
          </p>
          <ul className="mt-5 flex flex-col items-center gap-2 sm:flex-row sm:flex-wrap sm:justify-center sm:gap-x-6 sm:gap-y-2">
            {partnershipSignals.map((signal) => (
              <li
                key={signal}
                className="flex items-center gap-2 font-body text-xs text-muted-foreground md:text-sm"
              >
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden />
                {signal}
              </li>
            ))}
          </ul>
        </motion.aside>

        <motion.div
          className="mb-8 text-center"
          initial={{ opacity: 0, y: 12 }}
          animate={isVisible ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.12 }}
        >
          <h3 className="font-display text-2xl font-bold tracking-tight text-foreground md:text-3xl">
            How to get hired on Peer Portal
          </h3>
          <p className="mx-auto mt-3 max-w-2xl font-body text-sm text-muted-foreground md:text-base">
            Follow this path end-to-end—profile, Japan-fit scoring, materials, matching, then apply
            and interview prep—so Peer Portal helps you get hired, not just browse openings.
          </p>
        </motion.div>

        <motion.ol
          className="space-y-4"
          initial={{ opacity: 0 }}
          animate={isVisible ? { opacity: 1 } : {}}
          transition={{ duration: 0.4, delay: 0.14 }}
        >
          {guideSteps.map((step, index) => {
            const Icon = step.icon;
            return (
              <motion.li
                key={step.title}
                className="rounded-2xl border border-border/80 bg-card/30 p-6 backdrop-blur-md md:p-8"
                initial={{ opacity: 0, y: 24 }}
                animate={isVisible ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.5, delay: 0.14 + index * 0.06 }}
              >
                <div className="flex flex-col gap-5 sm:flex-row sm:gap-6">
                  <div className="flex shrink-0 items-start gap-4 sm:flex-col sm:items-center sm:gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-primary/40 bg-primary/10">
                      <Icon className="h-5 w-5 text-primary" aria-hidden />
                    </div>
                    <span className="font-display text-xs tracking-[0.22em] text-primary/80">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                  </div>

                  <div className="min-w-0 flex-1">
                    <h4 className="font-display text-xl font-bold text-foreground md:text-2xl">
                      {step.title}
                    </h4>
                    <p className="mt-3 font-body text-sm text-muted-foreground md:text-base">
                      {step.description}
                    </p>
                    <ul className="mt-4 space-y-2">
                      {step.tips.map((tip) => (
                        <li
                          key={tip}
                          className="flex gap-2.5 font-body text-sm text-foreground/85"
                        >
                          <CheckCircle2
                            className="mt-0.5 h-4 w-4 shrink-0 text-primary"
                            aria-hidden
                          />
                          <span>{tip}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </motion.li>
            );
          })}
        </motion.ol>

        <motion.div
          className="mt-10 rounded-2xl border border-border/80 bg-card/20 p-6 backdrop-blur-md md:p-8"
          initial={{ opacity: 0, y: 20 }}
          animate={isVisible ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.55, delay: 0.48 }}
        >
          <h3 className="font-display text-lg font-bold text-foreground md:text-xl">
            Tools that help Cognisor builders get hired
          </h3>
          <p className="mt-2 max-w-2xl font-body text-sm text-muted-foreground md:text-base">
            After you sign in at peerportal.app, open these modules in order—CV scoring, role
            matches, resume, and portfolio—so you stay offer-focused.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            {moduleLinks.map((module) => (
              <a
                key={module.label}
                href={module.href}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg border border-primary/35 bg-primary/10 px-3.5 py-2 font-display text-xs tracking-[0.12em] text-primary transition-colors hover:bg-primary/20"
              >
                {module.label}
                <ExternalLink className="h-3.5 w-3.5" aria-hidden />
              </a>
            ))}
          </div>
          <p className="mt-5 font-body text-sm text-muted-foreground">
            Student tip: start free, then upgrade when you are ready to auto-apply. Promo code{" "}
            <span className="font-medium text-foreground">{PROMO_CODE}</span> gives 2 free months on
            Student Pro.
          </p>
        </motion.div>

        <motion.div
          className="mt-12 flex flex-col items-center gap-4 text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={isVisible ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.55, delay: 0.52 }}
        >
          <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <motion.a
              href={PEER_PORTAL_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-poster-cta inline-flex min-w-[240px] items-center justify-center gap-2"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <span className="relative z-10">Get hired on Peer Portal</span>
              <ExternalLink className="relative z-10 h-4 w-4" aria-hidden />
            </motion.a>
            <a
              href={COGNISOR_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-w-[200px] items-center justify-center gap-2 rounded-md border border-primary/40 bg-primary/10 px-6 py-3.5 font-display text-sm font-medium tracking-[0.12em] text-primary transition-colors hover:bg-primary/20"
            >
              Visit Cognisor AI
              <ExternalLink className="h-4 w-4" aria-hidden />
            </a>
          </div>
          <p className="max-w-xl font-body text-xs leading-relaxed tracking-wide text-muted-foreground/80">
            Peer Portal (peerportal.app) — official get-hired partner of Cognisor AI
            (www.cognisorai.com) · Tokyo careers · AI matching · 求人 · internships · offers
          </p>
        </motion.div>
      </div>
    </section>
  );
};

export default LookingForJobsSection;
