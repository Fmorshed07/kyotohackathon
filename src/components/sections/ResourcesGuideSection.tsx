import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  ExternalLink,
  LayoutDashboard,
  Rocket,
} from "lucide-react";
import { useScrollReveal } from "@/hooks/useScrollReveal";
import {
  PARTICIPANT_GUIDE_STEPS,
  PARTICIPANT_QUICK_LINKS,
} from "@/lib/participantGuide";

const ResourcesGuideSection = () => {
  const { ref, isVisible } = useScrollReveal<HTMLDivElement>({ threshold: 0.08 });

  return (
    <section className="relative overflow-hidden px-6 py-20 md:py-28" id="guide">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-b from-background via-background/95 to-background" />
        <motion.div
          className="absolute left-1/4 top-1/5 h-80 w-80 rounded-full bg-primary/10 blur-[130px]"
          animate={{ opacity: [0.2, 0.45, 0.2], scale: [1, 1.05, 1] }}
          transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute bottom-1/5 right-1/5 h-72 w-72 rounded-full bg-cyan/10 blur-[120px]"
          animate={{ opacity: [0.15, 0.38, 0.15] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      <div ref={ref} className="mx-auto max-w-5xl">
        <motion.div
          className="mb-14 max-w-3xl"
          initial={{ opacity: 0, y: 22 }}
          animate={isVisible ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
        >
          <p className="font-display text-xs font-semibold uppercase tracking-[0.32em] text-primary">
            Resources & guide
          </p>
          <h1 className="mt-4 font-display text-4xl font-semibold tracking-tight text-foreground sm:text-5xl md:text-6xl">
            Use the platform like a pro
          </h1>
          <p className="mt-5 max-w-2xl font-body text-base text-muted-foreground sm:text-lg">
            A short path from signup to submission—so you spend time building, not hunting for
            buttons.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link
              to="/signup"
              className="inline-flex min-w-[200px] items-center justify-center gap-2 rounded-lg bg-primary px-6 py-3 font-display text-sm font-semibold text-primary-foreground shadow-[0_0_24px_hsl(199_100%_50%/0.35)] transition hover:brightness-110"
            >
              Get started
              <Rocket className="h-4 w-4" aria-hidden />
            </Link>
            <Link
              to="/dashboard/participant"
              className="inline-flex min-w-[200px] items-center justify-center gap-2 rounded-lg border border-white/15 px-6 py-3 font-display text-sm font-semibold text-foreground transition hover:bg-white/5"
            >
              Open portal
              <LayoutDashboard className="h-4 w-4" aria-hidden />
            </Link>
          </div>
        </motion.div>

        <motion.div
          className="mb-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
          initial={{ opacity: 0, y: 18 }}
          animate={isVisible ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.55, delay: 0.08 }}
        >
          {PARTICIPANT_QUICK_LINKS.map((link) => {
            const className =
              "group flex flex-col rounded-xl border border-white/10 bg-white/[0.03] p-4 transition hover:border-primary/35 hover:bg-primary/5";
            const body = (
              <>
                <span className="flex items-center justify-between gap-2">
                  <span className="font-display text-sm font-semibold text-foreground">
                    {link.label}
                  </span>
                  {link.external ? (
                    <ExternalLink className="h-3.5 w-3.5 text-muted-foreground transition group-hover:text-primary" />
                  ) : (
                    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground transition group-hover:text-primary" />
                  )}
                </span>
                <span className="mt-2 font-body text-xs text-muted-foreground">
                  {link.description}
                </span>
              </>
            );

            if (link.external) {
              return (
                <a
                  key={link.id}
                  href={link.href}
                  target="_blank"
                  rel="noreferrer"
                  className={className}
                >
                  {body}
                </a>
              );
            }

            return (
              <Link key={link.id} to={link.href} className={className}>
                {body}
              </Link>
            );
          })}
        </motion.div>

        <motion.div
          className="mb-8 flex items-center gap-3"
          initial={{ opacity: 0 }}
          animate={isVisible ? { opacity: 1 } : {}}
          transition={{ duration: 0.4, delay: 0.12 }}
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-primary/40 bg-primary/10">
            <BookOpen className="h-5 w-5 text-primary" aria-hidden />
          </span>
          <div>
            <h2 className="font-display text-xl font-semibold tracking-tight text-foreground md:text-2xl">
              Participant playbook
            </h2>
            <p className="font-body text-sm text-muted-foreground">
              Six steps from first login to a polished submission.
            </p>
          </div>
        </motion.div>

        <ol className="space-y-4">
          {PARTICIPANT_GUIDE_STEPS.map((step, index) => (
            <motion.li
              key={step.id}
              id={step.id}
              className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur-md md:p-8"
              initial={{ opacity: 0, y: 22 }}
              animate={isVisible ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: 0.1 + index * 0.05 }}
            >
              <div className="flex flex-col gap-5 sm:flex-row sm:gap-6">
                <div className="flex shrink-0 items-center gap-3 sm:flex-col sm:items-center sm:gap-2">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-primary/40 bg-primary/10 font-display text-sm font-semibold text-primary">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-display text-xl font-semibold text-foreground md:text-2xl">
                    {step.title}
                  </h3>
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
          ))}
        </ol>

        <motion.div
          className="mt-12 rounded-2xl border border-primary/25 bg-gradient-to-br from-primary/15 via-background/40 to-transparent p-6 md:p-8"
          initial={{ opacity: 0, y: 18 }}
          animate={isVisible ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.55, delay: 0.4 }}
        >
          <h3 className="font-display text-lg font-semibold text-foreground md:text-xl">
            Ready to ship?
          </h3>
          <p className="mt-2 max-w-2xl font-body text-sm text-muted-foreground md:text-base">
            Open the portal, join your event, and keep your project details current before judging.
          </p>
          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <Link
              to="/dashboard/participant"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-5 py-2.5 font-display text-sm font-semibold text-primary-foreground transition hover:brightness-110"
            >
              Go to dashboard
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
            <Link
              to="/hackathons"
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/15 px-5 py-2.5 font-display text-sm font-semibold text-foreground transition hover:bg-white/5"
            >
              Browse hackathons
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default ResourcesGuideSection;
