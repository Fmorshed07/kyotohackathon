import { motion } from "framer-motion";
import { useScrollReveal } from "@/hooks/useScrollReveal";

const AboutSection = () => {
  const { ref: sectionRef, isVisible: sectionVisible } = useScrollReveal<HTMLDivElement>({
    threshold: 0.12,
  });

  return (
    <section className="relative overflow-hidden px-6 py-24 md:py-32" id="about">
      <div ref={sectionRef} className="absolute inset-0" aria-hidden />
      <div
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(ellipse 60% 50% at 20% 40%, hsl(199 100% 50% / 0.07), transparent 55%)",
        }}
      />

      <div className="mx-auto max-w-6xl">
        <div className="grid items-end gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:gap-20">
          <motion.div
            initial={{ opacity: 0, y: 36 }}
            animate={sectionVisible ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.75, ease: [0.22, 1, 0.36, 1] }}
          >
            <p className="font-display text-xs font-semibold uppercase tracking-[0.32em] text-primary">
              About
            </p>
            <h2 className="mt-4 font-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl md:text-5xl lg:text-[3.25rem] lg:leading-[1.05]">
              A home for every Cognisor Impact event.
            </h2>
            <p className="mt-6 max-w-xl font-body text-lg leading-relaxed text-muted-foreground">
              Cognisor Hackathons is the management layer behind our AI build events — Kyoto,
              Tokyo, Dhaka, and wherever Impact goes next.
            </p>
          </motion.div>

          <motion.div
            className="space-y-8 border-l border-primary/25 pl-8"
            initial={{ opacity: 0, y: 28 }}
            animate={sectionVisible ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.7, delay: 0.15 }}
          >
            <p className="font-body text-base leading-relaxed text-muted-foreground md:text-lg">
              Switch events in the portal. Submissions, judges, and rankings stay scoped to the
              hackathon you select — so each city feels local, while the stack stays one.
            </p>
            <p className="font-display text-xl font-semibold tracking-tight text-gradient-cyan md:text-2xl">
              AI that creates impact — not just answers.
            </p>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default AboutSection;
