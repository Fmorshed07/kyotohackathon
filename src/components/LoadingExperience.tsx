import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
          { delay: 200, stage: 2 },
          { delay: 450, stage: 3 },
        ]
      : [
          { delay: 0, stage: 1 },
          { delay: 250, stage: 2 },
          { delay: 550, stage: 3 },
        ];

    const timers = stages.map(({ delay, stage: s }) =>
      setTimeout(() => setStage(s), delay),
    );

    const completeTimer = setTimeout(onComplete, isMobile ? 1200 : 1500);

    return () => {
      timers.forEach(clearTimeout);
      clearTimeout(completeTimer);
    };
  }, [onComplete, isMobile]);

  return (
    <AnimatePresence>
      {stage < 3 && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-[#1A1B4B]"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, filter: "blur(4px)" }}
          transition={{ duration: 0.8, ease: "easeInOut" }}
        >
          <img
            src="/banner.png"
            alt=""
            className="absolute inset-0 h-full w-full object-cover object-center opacity-90"
          />
          <div className="absolute inset-0 bg-[#1A1B4B]/40" />

          <motion.div
            className="relative z-10 h-1 w-48 overflow-hidden rounded-full bg-white/15"
            initial={{ opacity: 0 }}
            animate={stage >= 2 ? { opacity: 1 } : {}}
          >
            <motion.div
              className="h-full w-20 rounded-full bg-gradient-to-r from-primary via-secondary to-accent"
              animate={{ x: ["-60%", "160%"] }}
              transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default LoadingExperience;
