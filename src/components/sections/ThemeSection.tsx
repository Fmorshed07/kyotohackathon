import { motion } from "framer-motion";
import { useScrollReveal } from "@/hooks/useScrollReveal";
import kyotoTemple from "@/assets/kyoto-temple.jpg";

const tracks = [
  {
    number: "01",
    title: "Education & Career Development",
    description:
      "Create AI tutors, learning assistants, career advisors, and research agents that help students and lifelong learners succeed.",
    kanji: "教育",
  },
  {
    number: "02",
    title: "Tourism & Smart Cities",
    description:
      "Build intelligent travel assistants, multilingual support systems, local discovery platforms, and smart city solutions.",
    kanji: "観光",
  },
  {
    number: "03",
    title: "Healthcare & Aging Society",
    description:
      "Develop solutions that support elderly citizens, caregivers, healthcare professionals, and accessibility initiatives.",
    kanji: "医療",
  },
  {
    number: "04",
    title: "Startup & SME Productivity",
    description:
      "Create AI sales agents, operations assistants, market research tools, and workflow automation systems.",
    kanji: "起業",
  },
  {
    number: "05",
    title: "Sustainability & Social Impact",
    description:
      "Build solutions that address environmental challenges, disaster preparedness, resource management, and community support.",
    kanji: "社会",
  },
];

const ThemeSection = () => {
  const { ref: headerRef, isVisible: headerVisible } = useScrollReveal<HTMLDivElement>({
    threshold: 0.2,
  });

  return (
    <section className="relative min-h-screen overflow-hidden px-6 py-32" id="challenges">
      <motion.div
        className="absolute inset-0 -z-10"
        initial={{ opacity: 0 }}
        animate={headerVisible ? { opacity: 1 } : {}}
        transition={{ duration: 1.5 }}
      >
        <img
          src={kyotoTemple}
          alt=""
          className="h-full w-full object-cover opacity-15"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background via-background/95 to-background" />
      </motion.div>
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
            CHALLENGE AREAS
          </motion.span>
          <motion.h2
            className="mt-4 font-display text-4xl font-bold tracking-tight text-foreground md:text-5xl lg:text-6xl"
            initial={{ opacity: 0, y: 30 }}
            animate={headerVisible ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8, delay: 0.3 }}
          >
            Build Solutions That Matter
          </motion.h2>
        </motion.div>

        <div className="space-y-1">
          {tracks.map((track, index) => {
            const { ref, isVisible } = useScrollReveal<HTMLDivElement>({
              threshold: 0.3,
            });

            return (
              <motion.div
                key={track.number}
                ref={ref}
                className="group relative border-t border-border py-8 transition-all duration-500"
                initial={{ opacity: 0, x: -50 }}
                animate={isVisible ? { opacity: 1, x: 0 } : {}}
                transition={{ duration: 0.6, delay: index * 0.1, ease: [0.22, 1, 0.36, 1] }}
                whileHover={{ backgroundColor: "hsl(222 47% 8% / 0.5)", x: 10 }}
              >
                <div className="flex items-start gap-6">
                  <motion.span
                    className="font-display text-sm text-primary/60 transition-colors group-hover:text-primary"
                    whileHover={{ scale: 1.1 }}
                  >
                    {track.number}
                  </motion.span>
                  <div className="flex-1">
                    <div className="flex items-center gap-4">
                      <h3 className="font-display text-xl tracking-wide text-foreground transition-colors group-hover:text-primary md:text-2xl">
                        {track.title}
                      </h3>
                      <span className="hidden font-display text-sm text-muted-foreground/40 md:block">
                        {track.kanji}
                      </span>
                    </div>
                    <p className="mt-2 font-body text-sm text-muted-foreground md:text-base">
                      {track.description}
                    </p>
                  </div>
                  <motion.div
                    className="hidden h-8 w-8 items-center justify-center rounded-full border border-primary/30 text-primary/50 transition-all group-hover:border-primary group-hover:text-primary md:flex"
                    whileHover={{ scale: 1.2, rotate: 45 }}
                  >
                    →
                  </motion.div>
                </div>
              </motion.div>
            );
          })}
          <div className="border-t border-border" />
        </div>
      </div>
    </section>
  );
};

export default ThemeSection;
