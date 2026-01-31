import { motion } from "framer-motion";
import { useScrollReveal } from "@/hooks/useScrollReveal";

const CognisorSection = () => {
  const { ref, isVisible } = useScrollReveal<HTMLDivElement>({ threshold: 0.2 });

  return (
    <section className="relative min-h-screen px-6 py-32" id="cognisor">
      <div ref={ref} className="mx-auto max-w-4xl text-center">
        {/* Organized By */}
        <motion.span
          className="font-display text-sm tracking-[0.3em] text-muted-foreground"
          initial={{ opacity: 0, y: 20 }}
          animate={isVisible ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
        >
          ORGANIZED BY
        </motion.span>

        {/* Logo / Brand */}
        <motion.h2
          className="mt-6 font-display text-5xl font-bold tracking-wide md:text-6xl lg:text-7xl"
          initial={{ opacity: 0, y: 30 }}
          animate={isVisible ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
        >
          <motion.span
            className="text-gradient-cyan"
            animate={isVisible ? {
              textShadow: [
                "0 0 20px hsl(185 100% 50% / 0.3)",
                "0 0 40px hsl(185 100% 50% / 0.5)",
                "0 0 20px hsl(185 100% 50% / 0.3)",
              ],
            } : {}}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          >
            Cognisor AI
          </motion.span>
        </motion.h2>

        {/* Description */}
        <motion.div
          className="mt-12 space-y-6"
          initial={{ opacity: 0, y: 30 }}
          animate={isVisible ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, delay: 0.4 }}
        >
          <p className="font-body text-xl leading-relaxed text-muted-foreground md:text-2xl">
            Cognisor AI is at the forefront of developing artificial intelligence
            solutions that prioritize human impact over technological novelty.
          </p>
          <p className="font-body text-lg text-muted-foreground/80">
            Based in Tokyo, we believe in building AI that serves humanity's most
            pressing needs—from healthcare accessibility to sustainable urban living.
            Impact Tokyo is our flagship initiative to empower the next generation of
            purpose-driven AI builders.
          </p>
        </motion.div>

        {/* Mission Statement */}
        <motion.div
          className="mt-16 overflow-hidden rounded-xl border border-border bg-card/30 p-8 backdrop-blur-sm md:p-12"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={isVisible ? { opacity: 1, scale: 1 } : {}}
          transition={{ duration: 0.8, delay: 0.6, ease: [0.22, 1, 0.36, 1] }}
          whileHover={{ borderColor: "hsl(185 100% 50% / 0.3)" }}
        >
          <motion.blockquote
            className="font-display text-xl italic tracking-wide text-foreground md:text-2xl"
            initial={{ opacity: 0 }}
            animate={isVisible ? { opacity: 1 } : {}}
            transition={{ duration: 0.6, delay: 0.8 }}
          >
            "Technology should solve problems that matter, not create problems to
            solve."
          </motion.blockquote>
          <motion.p
            className="mt-4 font-body text-sm text-muted-foreground"
            initial={{ opacity: 0 }}
            animate={isVisible ? { opacity: 1 } : {}}
            transition={{ duration: 0.6, delay: 1 }}
          >
            — The Cognisor AI Philosophy
          </motion.p>
        </motion.div>
      </div>
    </section>
  );
};

export default CognisorSection;
