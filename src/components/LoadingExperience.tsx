import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import BrandLogo from "@/components/BrandLogo";

interface LoadingExperienceProps {
  onComplete: () => void;
}

const BOOT_MS = 1450;
const BOOT_MS_REDUCED = 320;

const LoadingExperience = ({ onComplete }: LoadingExperienceProps) => {
  const [stage, setStage] = useState(0);
  const completedRef = useRef(false);

  useEffect(() => {
    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const timers = reduced
      ? [window.setTimeout(() => setStage(3), 40)]
      : [
          window.setTimeout(() => setStage(1), 60),
          window.setTimeout(() => setStage(2), 320),
          window.setTimeout(() => setStage(3), 620),
          window.setTimeout(() => setStage(4), 980),
        ];

    const completeTimer = window.setTimeout(() => {
      if (completedRef.current) return;
      completedRef.current = true;
      onComplete();
    }, reduced ? BOOT_MS_REDUCED : BOOT_MS);

    return () => {
      timers.forEach(clearTimeout);
      clearTimeout(completeTimer);
    };
  }, [onComplete]);

  return (
    <motion.div
      className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden bg-black"
      initial={{ opacity: 1 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, filter: "blur(6px)" }}
      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
      role="status"
      aria-live="polite"
      aria-label="Loading Cognisor"
    >
      <img
        src="/cognisor-horizon.png"
        alt=""
        aria-hidden
        decoding="async"
        className="absolute inset-0 h-full w-full scale-105 object-cover opacity-45"
      />
      <div className="absolute inset-0 bg-black/60" aria-hidden />
      <div className="starfield absolute inset-0 opacity-35" aria-hidden />

      <div className="relative z-10 flex flex-col items-center gap-5">
        <motion.div
          initial={{ opacity: 0, scale: 0.88, y: 12 }}
          animate={
            stage >= 1
              ? { opacity: 1, scale: 1, y: 0 }
              : { opacity: 0, scale: 0.88, y: 12 }
          }
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        >
          <BrandLogo size="xl" href={null} priority className="pointer-events-none" />
        </motion.div>

        <motion.p
          className="font-display text-sm font-semibold tracking-[0.4em] text-white"
          initial={{ opacity: 0, y: 10 }}
          animate={stage >= 2 ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        >
          COGNISOR
        </motion.p>

        <motion.div
          className="relative h-px w-44 overflow-hidden rounded-full bg-white/10"
          initial={{ opacity: 0, scaleX: 0.4 }}
          animate={
            stage >= 3
              ? { opacity: 1, scaleX: 1 }
              : { opacity: 0, scaleX: 0.4 }
          }
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          aria-hidden
        >
          <motion.div
            className="horizon-flare absolute inset-y-0 left-0 h-full origin-left"
            initial={{ scaleX: 0 }}
            animate={stage >= 4 ? { scaleX: 1 } : { scaleX: stage >= 3 ? 0.35 : 0 }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
            style={{ width: "100%" }}
          />
        </motion.div>
      </div>
    </motion.div>
  );
};

export default LoadingExperience;
