import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import tokyoAbstract from "@/assets/tokyo-abstract.jpg";

interface LoadingExperienceProps {
  onComplete: () => void;
}

const LoadingExperience = ({ onComplete }: LoadingExperienceProps) => {
  const [stage, setStage] = useState(0);

  useEffect(() => {
    const stages = [
      { delay: 500, stage: 1 },   // Particles appear
      { delay: 1200, stage: 2 },  // Line draws
      { delay: 2000, stage: 3 },  // Title appears
      { delay: 2800, stage: 4 },  // Subtitle appears
      { delay: 3600, stage: 5 },  // Start reveal
      { delay: 4200, stage: 6 },  // Complete
    ];

    const timers = stages.map(({ delay, stage }) =>
      setTimeout(() => setStage(stage), delay)
    );

    const completeTimer = setTimeout(onComplete, 4500);

    return () => {
      timers.forEach(clearTimeout);
      clearTimeout(completeTimer);
    };
  }, [onComplete]);

  return (
    <AnimatePresence>
      {stage < 6 && (
        <motion.div
          className="fixed inset-0 z-50 flex flex-col items-center justify-center overflow-hidden"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.1 }}
          transition={{ duration: 0.8, ease: "easeInOut" }}
        >
          {/* Background Image */}
          <motion.div
            className="absolute inset-0"
            initial={{ scale: 1.2, opacity: 0 }}
            animate={{ scale: 1, opacity: 0.3 }}
            transition={{ duration: 2, ease: "easeOut" }}
          >
            <img
              src={tokyoAbstract}
              alt=""
              className="h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-background/60" />
          </motion.div>

          {/* Floating Particles */}
          <div className="absolute inset-0 overflow-hidden">
            {Array.from({ length: 30 }).map((_, i) => (
              <motion.div
                key={i}
                className="absolute h-1 w-1 rounded-full bg-primary/60"
                initial={{
                  x: Math.random() * (typeof window !== 'undefined' ? window.innerWidth : 1000),
                  y: (typeof window !== 'undefined' ? window.innerHeight : 800) + 50,
                  opacity: 0,
                }}
                animate={stage >= 1 ? {
                  y: -50,
                  opacity: [0, 1, 1, 0],
                } : {}}
                transition={{
                  duration: 4 + Math.random() * 3,
                  delay: Math.random() * 2,
                  repeat: Infinity,
                  ease: "linear",
                }}
                style={{
                  left: `${Math.random() * 100}%`,
                  filter: `blur(${Math.random() * 2}px)`,
                }}
              />
            ))}
          </div>

          {/* Animated Lines */}
          <div className="absolute inset-0 flex items-center justify-center">
            {/* Horizontal Line */}
            <motion.div
              className="absolute h-[1px] bg-gradient-to-r from-transparent via-primary to-transparent"
              initial={{ width: 0, opacity: 0 }}
              animate={stage >= 2 ? { width: "80%", opacity: 1 } : {}}
              transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
              style={{
                boxShadow: "0 0 30px hsl(185 100% 50% / 0.8), 0 0 60px hsl(185 100% 50% / 0.4)",
              }}
            />

            {/* Vertical accent lines */}
            <motion.div
              className="absolute h-32 w-[1px] bg-gradient-to-b from-transparent via-secondary/50 to-transparent"
              initial={{ scaleY: 0, opacity: 0 }}
              animate={stage >= 2 ? { scaleY: 1, opacity: 1 } : {}}
              transition={{ duration: 0.8, delay: 0.3, ease: "easeOut" }}
              style={{ left: "10%" }}
            />
            <motion.div
              className="absolute h-32 w-[1px] bg-gradient-to-b from-transparent via-secondary/50 to-transparent"
              initial={{ scaleY: 0, opacity: 0 }}
              animate={stage >= 2 ? { scaleY: 1, opacity: 1 } : {}}
              transition={{ duration: 0.8, delay: 0.5, ease: "easeOut" }}
              style={{ right: "10%" }}
            />
          </div>

          {/* Main Content */}
          <div className="relative z-10 flex flex-col items-center">
            {/* Japanese Text */}
            <motion.span
              className="mb-4 font-display text-sm tracking-[0.5em] text-primary/60"
              initial={{ opacity: 0, y: 20 }}
              animate={stage >= 3 ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, ease: "easeOut" }}
            >
              インパクト東京
            </motion.span>

            {/* Title with character animation */}
            <div className="overflow-hidden">
              <motion.h1
                className="font-display text-5xl font-bold tracking-[0.15em] md:text-7xl lg:text-8xl"
                initial={{ y: 100 }}
                animate={stage >= 3 ? { y: 0 } : {}}
                transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
              >
                <span className="text-gradient-cyan">IMPACT</span>{" "}
                <span className="text-foreground">TOKYO</span>
              </motion.h1>
            </div>

            {/* Year */}
            <motion.div
              className="mt-2 overflow-hidden"
              initial={{ opacity: 0 }}
              animate={stage >= 3 ? { opacity: 1 } : {}}
              transition={{ duration: 0.6, delay: 0.3 }}
            >
              <motion.span
                className="font-display text-3xl font-light tracking-[0.3em] text-foreground/80 md:text-4xl"
                initial={{ y: 50 }}
                animate={stage >= 3 ? { y: 0 } : {}}
                transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
              >
                2026
              </motion.span>
            </motion.div>

            {/* Subtitle */}
            <motion.p
              className="mt-6 font-display text-lg tracking-[0.2em] text-secondary md:text-xl"
              initial={{ opacity: 0, y: 20 }}
              animate={stage >= 4 ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, ease: "easeOut" }}
              style={{
                textShadow: "0 0 30px hsl(270 70% 60% / 0.5)",
              }}
            >
              AI FOR GLOBAL GOOD
            </motion.p>

            {/* Loading indicator */}
            <motion.div
              className="mt-12 flex items-center gap-2"
              initial={{ opacity: 0 }}
              animate={stage >= 4 ? { opacity: 1 } : {}}
              transition={{ duration: 0.4, delay: 0.3 }}
            >
              <motion.div
                className="h-1 w-1 rounded-full bg-primary"
                animate={{ scale: [1, 1.5, 1], opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 1, repeat: Infinity, delay: 0 }}
              />
              <motion.div
                className="h-1 w-1 rounded-full bg-primary"
                animate={{ scale: [1, 1.5, 1], opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 1, repeat: Infinity, delay: 0.2 }}
              />
              <motion.div
                className="h-1 w-1 rounded-full bg-primary"
                animate={{ scale: [1, 1.5, 1], opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 1, repeat: Infinity, delay: 0.4 }}
              />
            </motion.div>
          </div>

          {/* Corner decorations */}
          <motion.div
            className="absolute left-8 top-8 h-16 w-16 border-l-2 border-t-2 border-primary/30"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={stage >= 2 ? { opacity: 1, scale: 1 } : {}}
            transition={{ duration: 0.6, delay: 0.4 }}
          />
          <motion.div
            className="absolute bottom-8 right-8 h-16 w-16 border-b-2 border-r-2 border-primary/30"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={stage >= 2 ? { opacity: 1, scale: 1 } : {}}
            transition={{ duration: 0.6, delay: 0.5 }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default LoadingExperience;
