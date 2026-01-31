import { motion } from "framer-motion";
import { useScrollReveal } from "@/hooks/useScrollReveal";

const tracks = [
  {
    number: "01",
    title: "Aging Society & Care Tech",
    description: "AI solutions for elder care, accessibility, and intergenerational connection",
    kanji: "高齢社会",
  },
  {
    number: "02",
    title: "Smart Cities & Urban Resilience",
    description: "Building sustainable, intelligent infrastructure for tomorrow's cities",
    kanji: "都市開発",
  },
  {
    number: "03",
    title: "Education, Skills & Workforce",
    description: "Reimagining learning and work for the AI age",
    kanji: "教育改革",
  },
  {
    number: "04",
    title: "Human-Centered AI & Ethics",
    description: "Ensuring AI serves humanity with fairness and transparency",
    kanji: "人間中心",
  },
  {
    number: "05",
    title: "Open Impact",
    description: "Your wildcard—solve any global challenge with AI",
    kanji: "自由課題",
  },
];

const ThemeSection = () => {
  const { ref: headerRef, isVisible: headerVisible } = useScrollReveal<HTMLDivElement>({
    threshold: 0.2,
  });

  return (
    <section className="relative min-h-screen px-6 py-32" id="theme">
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
            THEME
          </motion.span>
          <motion.h2
            className="mt-4 font-display text-4xl font-bold tracking-tight text-foreground md:text-5xl lg:text-6xl"
            initial={{ opacity: 0, y: 30 }}
            animate={headerVisible ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8, delay: 0.3 }}
          >
            AI for Global Good
          </motion.h2>
          <motion.p
            className="mt-6 max-w-2xl font-body text-lg text-muted-foreground"
            initial={{ opacity: 0 }}
            animate={headerVisible ? { opacity: 1 } : {}}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            Five tracks. One mission. Build AI that creates lasting positive impact.
          </motion.p>
        </motion.div>

        {/* Tracks List */}
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
