import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { PlatformOpsConsole } from "@/components/dashboard/PlatformOpsConsole";
import { useScrollReveal } from "@/hooks/useScrollReveal";

const PlatformSection = () => {
  const { ref, isVisible } = useScrollReveal<HTMLDivElement>({ threshold: 0.08 });

  return (
    <section id="platform" className="relative overflow-hidden px-6 py-24 md:py-32">
      <div
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(ellipse 55% 45% at 80% 20%, hsl(185 100% 50% / 0.06), transparent 55%)",
        }}
      />

      <div ref={ref} className="mx-auto max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={isVisible ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.65 }}
        >
          <p className="font-display text-xs font-semibold uppercase tracking-[0.32em] text-primary">
            Platform
          </p>
          <h2 className="mt-3 max-w-3xl font-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl md:text-5xl">
            Try the stack. Every control works.
          </h2>
          <p className="mt-4 max-w-2xl font-body text-base text-muted-foreground sm:text-lg">
            Screen, match, score, and rank in this console — the same flows as the Cognisor portal.
          </p>
        </motion.div>

        <motion.div
          className="mt-14"
          initial={{ opacity: 0, y: 22 }}
          animate={isVisible ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.55, delay: 0.12 }}
        >
          <PlatformOpsConsole />
        </motion.div>

        <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:items-center">
          <Link
            to="/signin"
            className="inline-flex min-w-[190px] items-center justify-center gap-2 rounded-lg bg-primary px-6 py-3 font-display text-sm font-semibold text-primary-foreground shadow-[0_0_24px_hsl(199_100%_50%/0.35)] transition hover:brightness-110"
          >
            Open live portal
            <ArrowRight className="h-4 w-4" />
          </Link>
          <p className="font-body text-sm text-muted-foreground">
            Admins get a dedicated Screening Agent and Operations page on live participant data.
          </p>
        </div>
      </div>
    </section>
  );
};

export default PlatformSection;
