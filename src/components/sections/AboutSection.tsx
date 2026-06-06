import { motion } from "framer-motion";
import { useScrollReveal } from "@/hooks/useScrollReveal";
import kyotoSkyline from "@/assets/kyoto-skyline.jpg";

const AboutSection = () => {
  const { ref: sectionRef, isVisible: sectionVisible } = useScrollReveal<HTMLDivElement>({ threshold: 0.1 });

  return (
    <section className="relative min-h-screen overflow-hidden px-6 py-32" id="about">
      <div ref={sectionRef} className="absolute inset-0" />
      <motion.div
        className="absolute inset-0 -z-10"
        initial={{ opacity: 0 }}
        animate={sectionVisible ? { opacity: 1 } : {}}
        transition={{ duration: 1.5 }}
      >
        <img
          src={kyotoSkyline}
          alt=""
          className="h-full w-full object-cover opacity-20"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background via-background/90 to-background" />
      </motion.div>

      <div className="mx-auto max-w-5xl">
        <motion.div
          className="mb-20"
          initial={{ opacity: 0, y: 50 }}
          animate={sectionVisible ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        >
          <motion.span
            className="font-display text-sm tracking-[0.3em] text-primary"
            initial={{ opacity: 0, x: -20 }}
            animate={sectionVisible ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            ABOUT IMPACT KYOTO
          </motion.span>
          <motion.h2
            className="mt-4 font-display text-4xl font-bold tracking-tight text-foreground md:text-5xl lg:text-6xl"
            initial={{ opacity: 0, y: 30 }}
            animate={sectionVisible ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8, delay: 0.3 }}
          >
            Building AI That Creates Real Impact
          </motion.h2>
        </motion.div>

        <div className="space-y-12">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={sectionVisible ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8, delay: 0.4 }}
          >
            <p className="font-body text-xl leading-relaxed text-muted-foreground md:text-2xl">
              Japan is facing unprecedented challenges.
            </p>
            <p className="mt-6 font-body text-lg leading-relaxed text-muted-foreground md:text-xl">
              An aging population, workforce shortages, increasing tourism demands, and the
              urgent need for digital transformation are creating opportunities for new
              technologies to make a meaningful difference.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={sectionVisible ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8, delay: 0.5 }}
          >
            <p className="font-body text-lg leading-relaxed text-muted-foreground md:text-xl">
              Impact Kyoto 2026 is an{" "}
              <span className="text-foreground">Agentic AI Hackathon</span> designed to bring
              together talented builders and problem solvers to develop practical AI solutions
              that address these challenges.
            </p>
            <p className="mt-6 font-body text-lg leading-relaxed text-muted-foreground md:text-xl">
              Unlike traditional AI systems that simply respond to prompts, Agentic AI systems
              can <span className="text-secondary">reason, plan, make decisions, use tools</span>,
              and autonomously execute tasks.
            </p>
          </motion.div>

          <motion.div
            className="border-l-2 border-primary/40 pl-8"
            initial={{ opacity: 0, y: 40 }}
            animate={sectionVisible ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8, delay: 0.6 }}
          >
            <p className="font-body text-xl leading-relaxed text-muted-foreground md:text-2xl">
              The future belongs to AI that does not just generate answers.
            </p>
            <p className="mt-4 font-display text-2xl font-semibold tracking-wide text-gradient-cyan md:text-3xl">
              The future belongs to AI that creates impact.
            </p>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default AboutSection;
