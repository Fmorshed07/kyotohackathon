import { motion } from "framer-motion";
import { useScrollReveal } from "@/hooks/useScrollReveal";
import { ScrollRevealMotion } from "@/components/ScrollRevealMotion";
import { CriteriaOverviewStats } from "@/components/dashboard/JudgingStatsPanel";
import { useHackathonCriteria } from "@/hooks/useHackathonCriteria";
import { SITE_HACKATHON_ID } from "@/lib/hackathons";
import type { JudgingCriterion } from "@/components/dashboard/judgingCriteria";

function CriterionCard({ criterion, index }: { criterion: JudgingCriterion; index: number }) {
  return (
    <ScrollRevealMotion
      revealThreshold={0.2}
      className="group relative overflow-hidden rounded-xl border border-border bg-card/30 p-4 backdrop-blur-sm transition-all duration-300 sm:p-6 md:p-8"
      initial={{ opacity: 0, y: 24 }}
      visible={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.06, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{
        borderColor: "hsl(199 100% 50% / 0.45)",
        backgroundColor: "hsl(199 100% 50% / 0.06)",
      }}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="font-display text-xs text-primary/60 sm:text-sm">
          {String(index + 1).padStart(2, "0")}
        </span>
        <span className="shrink-0 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 font-display text-xs font-medium text-primary sm:px-3 sm:py-1 sm:text-sm">
          {criterion.weight}%
        </span>
      </div>

      <h3 className="mt-3 font-display text-lg font-semibold leading-snug tracking-wide text-foreground sm:mt-4 sm:text-xl md:text-2xl">
        {criterion.title}
      </h3>

      <ul className="mt-3 space-y-2.5 sm:mt-4 sm:space-y-3">
        {criterion.questions.map((question) => (
          <li
            key={question}
            className="flex gap-2.5 font-body text-sm leading-relaxed text-muted-foreground sm:gap-3 sm:text-base md:text-lg"
          >
            <span
              className="mt-[0.45rem] h-1.5 w-1.5 shrink-0 rounded-full bg-primary/70"
              aria-hidden
            />
            <span className="min-w-0 flex-1">{question}</span>
          </li>
        ))}
      </ul>
    </ScrollRevealMotion>
  );
}

const JudgingSection = () => {
  const { criteria, isLoading } = useHackathonCriteria(SITE_HACKATHON_ID);
  const totalWeight = criteria.reduce((sum, criterion) => sum + criterion.weight, 0);

  const { ref: headerRef, isVisible: headerVisible } = useScrollReveal<HTMLDivElement>({
    threshold: 0.2,
  });

  return (
    <section
      className="relative overflow-hidden px-4 py-24 sm:px-6 sm:py-28 md:py-32"
      id="judging-criteria"
    >
      <div className="mx-auto max-w-5xl">
        <motion.div
          ref={headerRef}
          className="mb-10 sm:mb-16 md:mb-20"
          initial={{ opacity: 0, y: 50 }}
          animate={headerVisible ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        >
          <motion.span
            className="font-display text-xs tracking-[0.25em] text-primary sm:text-sm sm:tracking-[0.3em]"
            initial={{ opacity: 0, x: -20 }}
            animate={headerVisible ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            JUDGING CRITERIA
          </motion.span>
          <motion.h2
            className="mt-3 font-display text-3xl font-bold tracking-tight text-foreground sm:mt-4 sm:text-4xl md:text-5xl lg:text-6xl"
            initial={{ opacity: 0, y: 30 }}
            animate={headerVisible ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8, delay: 0.3 }}
          >
            How Projects Are Evaluated
          </motion.h2>
          <motion.p
            className="mt-4 max-w-2xl font-body text-base leading-relaxed text-muted-foreground sm:mt-6 md:text-lg"
            initial={{ opacity: 0 }}
            animate={headerVisible ? { opacity: 1 } : {}}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            Projects will be evaluated based on the following criteria:
          </motion.p>
          <motion.div
            className="mt-6 sm:mt-8"
            initial={{ opacity: 0, y: 16 }}
            animate={headerVisible ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.5 }}
          >
            {!isLoading ? <CriteriaOverviewStats criteria={criteria} /> : null}
          </motion.div>
        </motion.div>

        {isLoading ? (
          <p className="text-center text-sm text-muted-foreground">Loading judging criteria...</p>
        ) : (
          <div className="space-y-4 sm:space-y-5">
            {criteria.map((criterion, index) => (
              <CriterionCard key={criterion.id} criterion={criterion} index={index} />
            ))}
          </div>
        )}

        <motion.p
          className="mt-8 text-center font-display text-xs tracking-[0.2em] text-muted-foreground/70 sm:mt-10 sm:text-sm"
          initial={{ opacity: 0 }}
          animate={headerVisible ? { opacity: 1 } : {}}
          transition={{ duration: 0.6, delay: 0.5 }}
        >
          TOTAL WEIGHT: {totalWeight}%
        </motion.p>
      </div>
    </section>
  );
};

export default JudgingSection;
