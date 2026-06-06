import { motion } from "framer-motion";
import { useScrollReveal } from "@/hooks/useScrollReveal";

const capabilities = [
  { title: "Understand goals", kanji: "目標理解" },
  { title: "Create plans", kanji: "計画立案" },
  { title: "Use external tools and APIs", kanji: "ツール連携" },
  { title: "Execute complex workflows", kanji: "ワークフロー" },
  { title: "Collaborate with humans", kanji: "協働" },
  { title: "Coordinate multiple agents", kanji: "エージェント" },
  { title: "Learn and adapt", kanji: "学習適応" },
];

const JudgingSection = () => {
  const { ref: headerRef, isVisible: headerVisible } = useScrollReveal<HTMLDivElement>({
    threshold: 0.2,
  });

  return (
    <section className="relative min-h-screen px-6 py-32" id="why-agentic-ai">
      <div className="mx-auto max-w-5xl">
        <motion.div
          ref={headerRef}
          className="mb-20"
          initial={{ opacity: 0, y: 50 }}
          animate={headerVisible ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        >
          <motion.span
            className="font-display text-sm tracking-[0.3em] text-secondary"
            initial={{ opacity: 0, x: -20 }}
            animate={headerVisible ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            WHY AGENTIC AI
          </motion.span>
          <motion.h2
            className="mt-4 font-display text-4xl font-bold tracking-tight text-foreground md:text-5xl lg:text-6xl"
            initial={{ opacity: 0, y: 30 }}
            animate={headerVisible ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8, delay: 0.3 }}
          >
            The Next Generation of Artificial Intelligence
          </motion.h2>
          <motion.p
            className="mt-6 max-w-2xl font-body text-lg text-muted-foreground"
            initial={{ opacity: 0 }}
            animate={headerVisible ? { opacity: 1 } : {}}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            Agentic AI systems can:
          </motion.p>
        </motion.div>

        <div className="grid gap-4 md:grid-cols-2">
          {capabilities.map((item, index) => {
            const { ref, isVisible } = useScrollReveal<HTMLDivElement>({
              threshold: 0.4,
            });

            return (
              <motion.div
                key={item.title}
                ref={ref}
                className="group relative flex items-center gap-4 overflow-hidden rounded-xl border border-border bg-card/30 p-6 backdrop-blur-sm transition-all duration-300"
                initial={{ opacity: 0, y: 30 }}
                animate={isVisible ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.5, delay: index * 0.08, ease: [0.22, 1, 0.36, 1] }}
                whileHover={{
                  borderColor: "hsl(270 70% 60% / 0.4)",
                  backgroundColor: "hsl(270 70% 60% / 0.05)",
                }}
              >
                <span className="font-display text-sm text-primary/60">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <div className="flex flex-1 items-center justify-between gap-4">
                  <span className="font-display text-lg tracking-wide text-foreground md:text-xl">
                    {item.title}
                  </span>
                  <span className="hidden text-xs text-muted-foreground/40 md:block">
                    {item.kanji}
                  </span>
                </div>
              </motion.div>
            );
          })}
        </div>

        <motion.p
          className="mt-12 max-w-3xl font-body text-lg leading-relaxed text-muted-foreground md:text-xl"
          initial={{ opacity: 0, y: 20 }}
          animate={headerVisible ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.6 }}
        >
          From healthcare and education to tourism and business operations, Agentic AI has the
          potential to transform how work gets done.
        </motion.p>
      </div>
    </section>
  );
};

export default JudgingSection;
