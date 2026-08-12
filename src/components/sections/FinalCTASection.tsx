import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import BrandLogo from "@/components/BrandLogo";
import { useScrollReveal } from "@/hooks/useScrollReveal";

const FinalCTASection = () => {
  const { ref, isVisible } = useScrollReveal<HTMLDivElement>({ threshold: 0.2 });

  return (
    <section
      className="relative flex min-h-[70vh] flex-col items-center justify-center overflow-hidden px-4 py-20 sm:px-6 sm:py-28"
      id="cta"
    >
      <div ref={ref} className="absolute inset-0" />
      <div className="absolute inset-0 -z-10">
        <img
          src="/cognisor-horizon.png"
          alt=""
          className="h-full w-full object-cover object-[center_60%] opacity-40"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black via-black/75 to-black" />
        <div className="starfield absolute inset-0 opacity-30" />
      </div>

      <div className="relative max-w-3xl text-center">
        <motion.div
          className="mb-6 flex justify-center"
          initial={{ opacity: 0, y: 16, scale: 0.9 }}
          animate={isVisible ? { opacity: 1, y: 0, scale: 1 } : {}}
          transition={{ duration: 0.7 }}
        >
          <BrandLogo size="lg" href={null} className="pointer-events-none" />
        </motion.div>

        <motion.div
          className="horizon-flare mx-auto mb-8 w-40"
          initial={{ opacity: 0, scaleX: 0.3 }}
          animate={isVisible ? { opacity: 1, scaleX: 1 } : {}}
          transition={{ duration: 0.8, delay: 0.05 }}
        />

        <motion.p
          className="mb-5 font-display text-xs font-semibold tracking-[0.36em] text-primary"
          initial={{ opacity: 0, y: 16 }}
          animate={isVisible ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          COGNISOR HACKATHONS
        </motion.p>

        <motion.h2
          className="font-display text-3xl font-bold tracking-tight text-white sm:text-4xl md:text-5xl lg:text-6xl"
          initial={{ opacity: 0, y: 28 }}
          animate={isVisible ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7, delay: 0.12, ease: [0.22, 1, 0.36, 1] }}
        >
          Build beyond the horizon.
        </motion.h2>

        <motion.p
          className="mx-auto mt-6 max-w-xl font-body text-base text-white/65 sm:text-lg"
          initial={{ opacity: 0, y: 16 }}
          animate={isVisible ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.22 }}
        >
          Enter the portal to manage submissions, scoring, and rankings across every Cognisor
          Impact hackathon.
        </motion.p>

        <motion.div
          className="mt-10 flex flex-col items-center gap-3 sm:flex-row sm:justify-center"
          initial={{ opacity: 0, y: 20 }}
          animate={isVisible ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.32 }}
        >
          <Link to="/signin" className="btn-poster-cta w-full max-w-sm sm:w-auto sm:min-w-[200px]">
            Enter portal
          </Link>
          <a
            href="https://www.cognisorai.com"
            target="_blank"
            rel="noreferrer"
            className="inline-flex w-full max-w-sm items-center justify-center rounded-md border border-white/20 bg-black/40 px-6 py-3.5 font-display text-sm font-medium tracking-[0.1em] text-white backdrop-blur-md transition-colors hover:border-primary/50 sm:w-auto sm:min-w-[200px]"
          >
            cognisorai.com
          </a>
        </motion.div>

        <motion.p
          className="mt-16 font-body text-xs tracking-[0.18em] text-white/35"
          initial={{ opacity: 0 }}
          animate={isVisible ? { opacity: 1 } : {}}
          transition={{ duration: 0.5, delay: 0.45 }}
        >
          ORGANIZED BY COGNISOR AI · TOKYO · GET HIRED WITH{" "}
          <a
            href="https://peerportal.app"
            target="_blank"
            rel="noopener noreferrer"
            className="text-white/50 transition-colors hover:text-primary"
          >
            PEERPORTAL.APP
          </a>
        </motion.p>
      </div>
    </section>
  );
};

export default FinalCTASection;
