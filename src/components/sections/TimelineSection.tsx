import { motion } from "framer-motion";
import { useScrollReveal } from "@/hooks/useScrollReveal";
import tokyoStation from "@/assets/tokyo-station.jpg";

const milestones = [
  { phase: "Phase 1", title: "Registration Opens", time: "Early 2026", kanji: "登録開始" },
  { phase: "Phase 2", title: "Team Formation", time: "January 2026", kanji: "チーム結成" },
  { phase: "Phase 3", title: "Build Week", time: "February 2026", kanji: "開発週間" },
  { phase: "Phase 4", title: "Final Presentations", time: "February 2026", kanji: "最終発表" },
];

const TimelineSection = () => {
  const { ref: headerRef, isVisible: headerVisible } = useScrollReveal<HTMLDivElement>({
    threshold: 0.2,
  });
  const { ref: lineRef, isVisible: lineVisible } = useScrollReveal<HTMLDivElement>({
    threshold: 0.1,
  });

  return (
    <section className="relative min-h-screen overflow-hidden px-6 py-32" id="timeline">
      {/* Background Image */}
      <motion.div
        className="absolute inset-0 -z-10"
        initial={{ opacity: 0 }}
        animate={headerVisible ? { opacity: 1 } : {}}
        transition={{ duration: 1.5 }}
      >
        <img
          src={tokyoStation}
          alt=""
          className="h-full w-full object-cover opacity-15"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background via-background/95 to-background" />
      </motion.div>

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
            className="font-display text-sm tracking-[0.3em] text-primary"
            initial={{ opacity: 0, x: -20 }}
            animate={headerVisible ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            EVENT FORMAT
          </motion.span>
          <motion.h2
            className="mt-4 font-display text-4xl font-bold tracking-tight text-foreground md:text-5xl lg:text-6xl"
            initial={{ opacity: 0, y: 30 }}
            animate={headerVisible ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8, delay: 0.3 }}
          >
            The Journey
          </motion.h2>
          <motion.div
            className="mt-6 flex flex-wrap items-center gap-4"
            initial={{ opacity: 0 }}
            animate={headerVisible ? { opacity: 1 } : {}}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            <motion.span
              className="rounded-full border border-primary/30 bg-primary/5 px-4 py-1 font-display text-sm text-primary"
              whileHover={{ scale: 1.05, borderColor: "hsl(185 100% 50% / 0.6)" }}
            >
              February 2026
            </motion.span>
            <span className="rounded-full border border-border px-4 py-1 font-display text-sm text-muted-foreground">
              Tokyo, Japan
            </span>
            <span className="rounded-full border border-border px-4 py-1 font-display text-sm text-muted-foreground">
              In-Person
            </span>
          </motion.div>
        </motion.div>

        {/* Timeline */}
        <div ref={lineRef} className="relative">
          {/* Vertical Line */}
          <div className="absolute left-4 top-0 h-full w-[2px] overflow-hidden md:left-1/2 md:-translate-x-1/2">
            <motion.div
              className="h-full w-full bg-gradient-to-b from-primary via-secondary to-primary/20"
              initial={{ scaleY: 0 }}
              animate={lineVisible ? { scaleY: 1 } : {}}
              transition={{ duration: 1.5, ease: [0.22, 1, 0.36, 1] }}
              style={{ transformOrigin: "top" }}
            />
          </div>

          {/* Milestones */}
          <div className="space-y-16">
            {milestones.map((milestone, index) => {
              const { ref, isVisible } = useScrollReveal<HTMLDivElement>({
                threshold: 0.5,
              });
              const isEven = index % 2 === 0;

              return (
                <motion.div
                  key={milestone.phase}
                  ref={ref}
                  className="relative flex items-center"
                  initial={{ opacity: 0, x: isEven ? -50 : 50 }}
                  animate={isVisible ? { opacity: 1, x: 0 } : {}}
                  transition={{ duration: 0.6, delay: index * 0.15, ease: [0.22, 1, 0.36, 1] }}
                >
                  {/* Dot */}
                  <motion.div
                    className="absolute left-4 z-10 md:left-1/2 md:-translate-x-1/2"
                    initial={{ scale: 0 }}
                    animate={isVisible ? { scale: 1 } : {}}
                    transition={{ duration: 0.4, delay: index * 0.15 + 0.2 }}
                  >
                    <motion.div
                      className="h-4 w-4 rounded-full border-2 border-primary bg-background"
                      animate={isVisible ? {
                        boxShadow: [
                          "0 0 0px hsl(185 100% 50% / 0)",
                          "0 0 20px hsl(185 100% 50% / 0.5)",
                          "0 0 0px hsl(185 100% 50% / 0)",
                        ],
                      } : {}}
                      transition={{ duration: 2, repeat: Infinity, delay: index * 0.3 }}
                    />
                  </motion.div>

                  {/* Content */}
                  <div
                    className={`ml-12 md:ml-0 ${
                      isEven
                        ? "md:mr-auto md:pr-20 md:text-right md:w-1/2"
                        : "md:ml-auto md:pl-20 md:text-left md:w-1/2"
                    }`}
                  >
                    <span className="font-display text-xs tracking-[0.2em] text-primary/60">
                      {milestone.phase}
                    </span>
                    <h3 className="mt-1 font-display text-xl tracking-wide text-foreground md:text-2xl">
                      {milestone.title}
                    </h3>
                    <div className="mt-1 flex items-center gap-3 md:justify-end">
                      <p className="font-body text-sm text-muted-foreground">
                        {milestone.time}
                      </p>
                      <span className="text-xs text-muted-foreground/40">
                        {milestone.kanji}
                      </span>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};

export default TimelineSection;
