import { motion } from "framer-motion";
import { useScrollReveal } from "@/hooks/useScrollReveal";
import kyotoAbstract from "@/assets/kyoto-abstract.jpg";

const deliverables = [
  { title: "Working Prototype", kanji: "試作品" },
  { title: "Problem Statement", kanji: "課題定義" },
  { title: "Impact Explanation", kanji: "影響説明" },
  { title: "AI Architecture", kanji: "AI設計" },
  { title: "Vision for Scale", kanji: "拡大計画" },
];

const DeliverablesSection = () => {
  const { ref: headerRef, isVisible: headerVisible } = useScrollReveal<HTMLDivElement>({
    threshold: 0.2,
  });

  return (
    <section className="relative min-h-screen overflow-hidden px-6 py-32" id="deliverables">
      {/* Background Image */}
      <motion.div
        className="absolute inset-0 -z-10"
        initial={{ opacity: 0 }}
        animate={headerVisible ? { opacity: 1 } : {}}
        transition={{ duration: 1.5 }}
      >
        <img
          src={kyotoAbstract}
          alt=""
          className="h-full w-full object-cover opacity-10"
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
            DELIVERABLES
          </motion.span>
          <motion.h2
            className="mt-4 font-display text-4xl font-bold tracking-tight text-foreground md:text-5xl lg:text-6xl"
            initial={{ opacity: 0, y: 30 }}
            animate={headerVisible ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8, delay: 0.3 }}
          >
            What You Ship
          </motion.h2>
        </motion.div>

        {/* Deliverables List */}
        <div className="space-y-4">
          {deliverables.map((item, index) => {
            const { ref, isVisible } = useScrollReveal<HTMLDivElement>({
              threshold: 0.5,
            });

            return (
              <motion.div
                key={item.title}
                ref={ref}
                className="group relative flex items-center gap-6 border-l-2 border-primary/30 py-5 pl-6 transition-all duration-300"
                initial={{ opacity: 0, x: -40 }}
                animate={isVisible ? { opacity: 1, x: 0 } : {}}
                transition={{ duration: 0.5, delay: index * 0.08, ease: [0.22, 1, 0.36, 1] }}
                whileHover={{ 
                  borderColor: "hsl(185 100% 50%)",
                  backgroundColor: "hsl(185 100% 50% / 0.05)",
                  x: 10,
                }}
              >
                <motion.span
                  className="font-display text-sm text-primary/60 transition-colors group-hover:text-primary"
                  whileHover={{ scale: 1.1 }}
                >
                  {String(index + 1).padStart(2, "0")}
                </motion.span>
                <span className="flex-1 font-display text-xl tracking-wide text-foreground md:text-2xl">
                  {item.title}
                </span>
                <span className="hidden text-sm text-muted-foreground/40 md:block">
                  {item.kanji}
                </span>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default DeliverablesSection;
