import { motion } from "framer-motion";
import { useScrollReveal } from "@/hooks/useScrollReveal";
import tokyoNeonAlley from "@/assets/tokyo-neon-alley.jpg";

const participants = [
  {
    title: "Students & Researchers",
    description: "From universities and labs worldwide",
    icon: "◇",
    kanji: "学生",
  },
  {
    title: "Founders & Builders",
    description: "Turning ideas into impactful products",
    icon: "△",
    kanji: "創業者",
  },
  {
    title: "Designers & Product Thinkers",
    description: "Crafting human-centered experiences",
    icon: "○",
    kanji: "設計者",
  },
  {
    title: "AI Engineers & Specialists",
    description: "Pushing the boundaries of what's possible",
    icon: "□",
    kanji: "技術者",
  },
];

const ParticipantsSection = () => {
  const { ref: headerRef, isVisible: headerVisible } = useScrollReveal<HTMLDivElement>({
    threshold: 0.2,
  });

  return (
    <section className="relative min-h-screen overflow-hidden px-6 py-32" id="participants">
      {/* Background Image */}
      <motion.div
        className="absolute inset-0 -z-10"
        initial={{ opacity: 0 }}
        animate={headerVisible ? { opacity: 1 } : {}}
        transition={{ duration: 1.5 }}
      >
        <img
          src={tokyoNeonAlley}
          alt=""
          className="h-full w-full object-cover opacity-20"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background via-background/90 to-background" />
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
            className="font-display text-sm tracking-[0.3em] text-secondary"
            initial={{ opacity: 0, x: -20 }}
            animate={headerVisible ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            WHO
          </motion.span>
          <motion.h2
            className="mt-4 font-display text-4xl font-bold tracking-tight text-foreground md:text-5xl lg:text-6xl"
            initial={{ opacity: 0, y: 30 }}
            animate={headerVisible ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8, delay: 0.3 }}
          >
            Who Should Join
          </motion.h2>
        </motion.div>

        {/* Participants Grid */}
        <div className="grid gap-6 md:grid-cols-2">
          {participants.map((participant, index) => {
            const { ref, isVisible } = useScrollReveal<HTMLDivElement>({
              threshold: 0.3,
            });

            return (
              <motion.div
                key={participant.title}
                ref={ref}
                className="group relative overflow-hidden rounded-xl border border-border bg-card/30 p-8 backdrop-blur-sm transition-all duration-500"
                initial={{ opacity: 0, y: 30, scale: 0.95 }}
                animate={isVisible ? { opacity: 1, y: 0, scale: 1 } : {}}
                transition={{ duration: 0.6, delay: index * 0.1, ease: [0.22, 1, 0.36, 1] }}
                whileHover={{ 
                  borderColor: "hsl(185 100% 50% / 0.3)",
                  backgroundColor: "hsl(222 47% 8% / 0.8)",
                }}
              >
                {/* Icon */}
                <motion.div
                  className="mb-4 flex items-center gap-4"
                  whileHover={{ x: 5 }}
                >
                  <motion.span
                    className="text-2xl text-primary/50 transition-colors group-hover:text-primary"
                    whileHover={{ rotate: 180, scale: 1.2 }}
                    transition={{ duration: 0.4 }}
                  >
                    {participant.icon}
                  </motion.span>
                  <span className="text-xs text-muted-foreground/40">{participant.kanji}</span>
                </motion.div>
                
                <h3 className="font-display text-xl tracking-wide text-foreground transition-colors group-hover:text-primary">
                  {participant.title}
                </h3>
                <p className="mt-2 font-body text-sm text-muted-foreground">
                  {participant.description}
                </p>

                {/* Hover gradient */}
                <motion.div
                  className="absolute inset-0 -z-10 opacity-0 transition-opacity group-hover:opacity-100"
                  style={{
                    background: "radial-gradient(circle at 50% 50%, hsl(185 100% 50% / 0.05) 0%, transparent 70%)",
                  }}
                />
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default ParticipantsSection;
