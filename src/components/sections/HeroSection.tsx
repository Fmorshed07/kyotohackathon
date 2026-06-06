import { motion } from "framer-motion";
import { useScrollReveal } from "@/hooks/useScrollReveal";

const LUMA_URL = "https://luma.com/2f3omvqa";
const PARTNER_EMAIL = "mailto:cognisorai@gmail.com?subject=Impact%20Kyoto%202026%20Partnership";

const HeroSection = () => {
  const { ref, isVisible } = useScrollReveal<HTMLDivElement>({ threshold: 0.1 });

  return (
    <section className="relative flex min-h-[100svh] flex-col overflow-hidden bg-[#1A1B4B]">
      <div ref={ref} className="absolute inset-0" aria-hidden />

      {/* Background */}
      <div className="absolute inset-0">
        <img
          src="/banner.png"
          alt=""
          className="h-full w-full object-cover object-center"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#1A1B4B]/50 via-[#1A1B4B]/20 to-[#1A1B4B]/70" />
      </div>

      {/* Hero content */}
      <div className="relative z-10 mx-auto flex min-h-[100svh] w-full max-w-5xl flex-col items-center justify-center px-6 pb-16 pt-24 text-center">
        <motion.p
          className="text-gradient-japanese font-display text-sm tracking-[0.35em] md:text-base"
          initial={{ opacity: 0, y: 16 }}
          animate={isVisible ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7, delay: 0.1 }}
        >
          インパクト京都 2026
        </motion.p>

        <motion.h1
          className="mt-4 font-display font-bold leading-[0.95] tracking-[0.06em]"
          initial={{ opacity: 0, y: 24 }}
          animate={isVisible ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.9, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
        >
          <span className="glow-impact block text-5xl text-gradient-impact sm:text-6xl md:text-7xl lg:text-8xl">
            IMPACT
          </span>
          <span className="mt-1 block text-5xl text-white drop-shadow-[0_4px_32px_rgba(0,0,0,0.6)] sm:text-6xl md:text-7xl lg:text-8xl">
            KYOTO
          </span>
        </motion.h1>

        <motion.p
          className="glow-violet mt-5 font-display text-base font-medium tracking-[0.15em] text-secondary sm:text-lg md:text-xl"
          initial={{ opacity: 0, y: 12 }}
          animate={isVisible ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.35 }}
        >
          Agentic AI for Japan&apos;s Future
        </motion.p>

        <motion.p
          className="mt-4 max-w-xl font-body text-sm text-white/90 sm:text-base md:text-lg"
          initial={{ opacity: 0 }}
          animate={isVisible ? { opacity: 1 } : {}}
          transition={{ duration: 0.6, delay: 0.42 }}
        >
          Building autonomous AI solutions for real world challenges.
        </motion.p>

        <motion.p
          className="mt-4 max-w-2xl font-body text-sm leading-relaxed text-white/75 sm:text-base"
          initial={{ opacity: 0 }}
          animate={isVisible ? { opacity: 1 } : {}}
          transition={{ duration: 0.6, delay: 0.48 }}
        >
          Join students, developers, founders, researchers, and innovators from across Japan
          to create the next generation of AI agents that can transform industries, support
          communities, and drive innovation.
        </motion.p>

        <motion.div
          className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center"
          initial={{ opacity: 0, y: 20 }}
          animate={isVisible ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7, delay: 0.55 }}
        >
          <motion.a
            href={LUMA_URL}
            className="btn-poster-cta min-w-[220px]"
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.98 }}
            target="_blank"
            rel="noreferrer"
          >
            Register Now
          </motion.a>
          <motion.a
            href={PARTNER_EMAIL}
            className="inline-flex min-w-[220px] items-center justify-center rounded-md border border-secondary/70 bg-secondary/20 px-6 py-3 font-display text-sm font-medium tracking-[0.15em] text-secondary transition-colors hover:bg-secondary/30"
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.98 }}
          >
            Become a Partner
          </motion.a>
        </motion.div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        className="absolute bottom-6 left-1/2 z-10 -translate-x-1/2"
        initial={{ opacity: 0 }}
        animate={isVisible ? { opacity: 1 } : {}}
        transition={{ delay: 0.9 }}
      >
        <motion.div
          className="flex flex-col items-center gap-2"
          animate={{ y: [0, 6, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        >
          <span className="text-[10px] tracking-[0.3em] text-white/40">SCROLL</span>
          <div className="h-8 w-px bg-gradient-to-b from-primary/60 to-transparent" />
        </motion.div>
      </motion.div>
    </section>
  );
};

export default HeroSection;
