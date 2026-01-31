import { motion } from "framer-motion";
import { useScrollReveal } from "@/hooks/useScrollReveal";

const criteria = [
  { title: "Problem Relevance & Social Impact", weight: "25%", kanji: "社会的影響" },
  { title: "Effectiveness of AI Usage", weight: "25%", kanji: "AI活用度" },
  { title: "Human-Centered Design", weight: "20%", kanji: "人間中心" },
  { title: "Clarity of Vision & Storytelling", weight: "15%", kanji: "ビジョン" },
  { title: "Technical Feasibility & Scalability", weight: "15%", kanji: "技術実現性" },
];

const JudgingSection = () => {
  const { ref: headerRef, isVisible: headerVisible } = useScrollReveal<HTMLDivElement>({
    threshold: 0.2,
  });

  return (
    <section className="relative min-h-screen px-6 py-32" id="judging">
      <div className="mx-auto max-w-5xl">
        {/* Section Header */}
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
            EVALUATION
          </motion.span>
          <motion.h2
            className="mt-4 font-display text-4xl font-bold tracking-tight text-foreground md:text-5xl lg:text-6xl"
            initial={{ opacity: 0, y: 30 }}
            animate={headerVisible ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8, delay: 0.3 }}
          >
            How It's Judged
          </motion.h2>
        </motion.div>

        {/* Criteria Grid */}
        <div className="grid gap-4">
          {criteria.map((item, index) => {
            const { ref, isVisible } = useScrollReveal<HTMLDivElement>({
              threshold: 0.4,
            });

            return (
              <motion.div
                key={item.title}
                ref={ref}
                className="group relative flex items-center justify-between overflow-hidden rounded-xl border border-border bg-card/30 p-6 backdrop-blur-sm transition-all duration-300"
                initial={{ opacity: 0, y: 30 }}
                animate={isVisible ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.5, delay: index * 0.08, ease: [0.22, 1, 0.36, 1] }}
                whileHover={{ 
                  borderColor: "hsl(270 70% 60% / 0.4)",
                  backgroundColor: "hsl(270 70% 60% / 0.05)",
                }}
              >
                <div className="flex items-center gap-4">
                  <span className="hidden text-xs text-muted-foreground/40 md:block">
                    {item.kanji}
                  </span>
                  <span className="font-display text-lg tracking-wide text-foreground md:text-xl">
                    {item.title}
                  </span>
                </div>
                <motion.span
                  className="font-display text-2xl text-secondary/80 md:text-3xl"
                  whileHover={{ scale: 1.1 }}
                >
                  {item.weight}
                </motion.span>

                {/* Progress bar */}
                <motion.div
                  className="absolute bottom-0 left-0 h-[2px] bg-gradient-to-r from-secondary/50 to-secondary"
                  initial={{ width: 0 }}
                  animate={isVisible ? { width: item.weight } : {}}
                  transition={{ duration: 1, delay: index * 0.1 + 0.3, ease: "easeOut" }}
                />
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default JudgingSection;
