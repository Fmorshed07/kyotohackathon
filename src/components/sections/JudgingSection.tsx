import { motion } from "framer-motion";
import { useScrollReveal } from "@/hooks/useScrollReveal";
import { JUDGING_CRITERIA } from "@/components/dashboard/judgingCriteria";

const JudgingSection = () => {
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
            className="font-display text-xs tracking-[0.25em] text-secondary sm:text-sm sm:tracking-[0.3em]"
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
        </motion.div>

        <div className="space-y-4 sm:space-y-5">
          {JUDGING_CRITERIA.map((criterion, index) => {
            const { ref, isVisible } = useScrollReveal<HTMLDivElement>({
              threshold: 0.2,
            });

            return (
              <motion.div
                key={criterion.id}
                ref={ref}
                className="group relative overflow-hidden rounded-xl border border-border bg-card/30 p-4 backdrop-blur-sm transition-all duration-300 sm:p-6 md:p-8"
                initial={{ opacity: 0, y: 24 }}
                animate={isVisible ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.5, delay: index * 0.06, ease: [0.22, 1, 0.36, 1] }}
                whileHover={{
                  borderColor: "hsl(270 70% 60% / 0.4)",
                  backgroundColor: "hsl(270 70% 60% / 0.05)",
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
              </motion.div>
            );
          })}
        </div>

        <motion.p
          className="mt-8 text-center font-display text-xs tracking-[0.2em] text-muted-foreground/70 sm:mt-10 sm:text-sm"
          initial={{ opacity: 0 }}
          animate={headerVisible ? { opacity: 1 } : {}}
          transition={{ duration: 0.6, delay: 0.5 }}
        >
          TOTAL WEIGHT: 100%
        </motion.p>
      </div>
    </section>
  );
};

export default JudgingSection;
