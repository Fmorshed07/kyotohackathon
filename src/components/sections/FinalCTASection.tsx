import { motion } from "framer-motion";
import { useScrollReveal } from "@/hooks/useScrollReveal";

const LUMA_URL = "https://luma.com/2f3omvqa";
const PARTNER_EMAIL = "mailto:cognisorai@gmail.com?subject=Impact%20Kyoto%202026%20Partnership";

const FinalCTASection = () => {
  const { ref, isVisible } = useScrollReveal<HTMLDivElement>({ threshold: 0.2 });

  return (
    <section
      className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6 py-32"
      id="cta"
    >
      <div ref={ref} className="absolute inset-0" />
      <motion.div
        className="absolute inset-0 -z-10"
        initial={{ opacity: 0 }}
        animate={isVisible ? { opacity: 1 } : {}}
        transition={{ duration: 1.5 }}
      >
        <img
          src="/banner.png"
          alt=""
          className="h-full w-full object-cover object-center opacity-[0.12]"
        />
        <div className="absolute inset-0 poster-section-bg opacity-95" />
        <div className="absolute inset-0 section-glow-top" />
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 50% 40% at 50% 100%, hsl(18 95% 58% / 0.1), transparent)",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/90 to-background/70" />
      </motion.div>

      <div className="max-w-4xl text-center">
        <motion.span
          className="mb-6 inline-block font-display text-sm tracking-[0.4em] text-primary/60"
          initial={{ opacity: 0, y: 20 }}
          animate={isVisible ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          JOIN IMPACT KYOTO 2026
        </motion.span>

        <motion.h2
          className="font-display text-4xl font-bold tracking-tight text-foreground md:text-5xl lg:text-6xl xl:text-7xl"
          initial={{ opacity: 0, y: 40 }}
          animate={isVisible ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
        >
          Building Japan&apos;s Next Generation
          <br />
          <motion.span
            className="text-gradient-sunset"
            animate={
              isVisible
                ? {
                    textShadow: [
                      "0 0 20px hsl(18 95% 58% / 0.3)",
                      "0 0 40px hsl(270 55% 72% / 0.35)",
                      "0 0 20px hsl(18 95% 58% / 0.3)",
                    ],
                  }
                : {}
            }
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          >
            of AI Innovators
          </motion.span>
        </motion.h2>

        <motion.div
          className="mx-auto mt-8 flex flex-wrap justify-center gap-3"
          initial={{ opacity: 0, y: 20 }}
          animate={isVisible ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.45 }}
        >
          {["Students", "Builders", "Researchers", "Founders"].map((label) => (
            <span
              key={label}
              className="rounded-full border border-primary/30 bg-primary/10 px-4 py-2 font-display text-sm tracking-wide text-primary"
            >
              {label}
            </span>
          ))}
        </motion.div>

        <motion.p
          className="mx-auto mt-8 max-w-2xl font-body text-lg text-muted-foreground md:text-xl"
          initial={{ opacity: 0, y: 20 }}
          animate={isVisible ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.5 }}
        >
          Together, we can create AI solutions that strengthen industries, empower communities,
          and shape the future.
        </motion.p>

        <motion.div
          className="mt-12 flex flex-col items-center gap-4 sm:flex-row sm:justify-center"
          initial={{ opacity: 0, y: 30 }}
          animate={isVisible ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.7 }}
        >
          <motion.a
            href={LUMA_URL}
            className="btn-poster-cta min-w-[220px]"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            target="_blank"
            rel="noreferrer"
          >
            <span className="relative z-10">Register Now</span>
          </motion.a>
          <motion.a
            href={PARTNER_EMAIL}
            className="inline-flex min-w-[220px] items-center justify-center rounded-md border border-secondary/70 bg-secondary/20 px-6 py-3 font-display text-sm font-medium tracking-[0.15em] text-secondary transition-colors hover:bg-secondary/30"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            Become a Partner
          </motion.a>
        </motion.div>

        <motion.p
          className="mt-16 font-body text-xs tracking-[0.2em] text-muted-foreground/50"
          initial={{ opacity: 0 }}
          animate={isVisible ? { opacity: 1 } : {}}
          transition={{ duration: 0.6, delay: 0.9 }}
        >
          IMPACT KYOTO 2026 • AGENTIC AI FOR JAPAN&apos;S FUTURE • ORGANIZED BY COGNISOR AI
        </motion.p>
      </div>
    </section>
  );
};

export default FinalCTASection;
