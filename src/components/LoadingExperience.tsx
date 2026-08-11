import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import BrandLogo from "@/components/BrandLogo";
import { useIsMobile } from "@/hooks/use-mobile";

interface LoadingExperienceProps {
  onComplete: () => void;
}

const LoadingExperience = ({ onComplete }: LoadingExperienceProps) => {
  const [stage, setStage] = useState(0);
  const isMobile = useIsMobile();

  useEffect(() => {
    const stages = isMobile
      ? [
          { delay: 0, stage: 1 },
          { delay: 160, stage: 2 },
          { delay: 380, stage: 3 },
        ]
      : [
          { delay: 0, stage: 1 },
          { delay: 200, stage: 2 },
          { delay: 450, stage: 3 },
        ];

    const timers = stages.map(({ delay, stage: s }) =>
      setTimeout(() => setStage(s), delay),
    );

    const completeTimer = setTimeout(onComplete, isMobile ? 1000 : 1300);

    return () => {
      timers.forEach(clearTimeout);
      clearTimeout(completeTimer);
    };
  }, [onComplete, isMobile]);

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-black"
        initial={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.55, ease: "easeInOut" }}
      >
        <img
          src="/cognisor-horizon.png"
          alt=""
          className="absolute inset-0 h-full w-full object-cover opacity-50"
        />
        <div className="absolute inset-0 bg-black/55" />
        <div className="starfield absolute inset-0 opacity-40" />

        <div className="relative z-10 flex flex-col items-center gap-6">
          <motion.div
            initial={{ opacity: 0, scale: 0.82, y: 10 }}
            animate={stage >= 1 ? { opacity: 1, scale: 1, y: 0 } : {}}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          >
            <BrandLogo size="xl" href={null} priority className="pointer-events-none" />
          </motion.div>

          <motion.p
            className="font-display text-sm font-semibold tracking-[0.4em] text-white"
            initial={{ opacity: 0, y: 8 }}
            animate={stage >= 2 ? { opacity: 1, y: 0 } : {}}
          >
            COGNISOR
          </motion.p>

          <motion.div
            className="horizon-flare h-px w-48"
            initial={{ opacity: 0, scaleX: 0.3 }}
            animate={stage >= 3 ? { opacity: 1, scaleX: 1 } : {}}
            transition={{ duration: 0.7 }}
          />
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default LoadingExperience;
