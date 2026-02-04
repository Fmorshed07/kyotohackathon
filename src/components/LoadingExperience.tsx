import { useEffect, useState, useMemo } from "react";
import { motion, AnimatePresence, type Transition } from "framer-motion";
import tokyoAbstract from "@/assets/tokyo-abstract.jpg";
import { useIsMobile } from "@/hooks/use-mobile";

interface LoadingExperienceProps {
  onComplete: () => void;
}

const LoadingExperience = ({ onComplete }: LoadingExperienceProps) => {
  const [stage, setStage] = useState(0);
  const isMobile = useIsMobile();

  // Memoize particle positions to avoid recalculation
  const particleCount = isMobile ? 14 : 40;
  const particles = useMemo(() => 
    Array.from({ length: particleCount }).map((_, i) => ({
      id: i,
      x: Math.random() * 100,
      delay: Math.random() * (isMobile ? 1.2 : 2),
      duration: (isMobile ? 3.5 : 5) + Math.random() * (isMobile ? 2 : 4),
      blur: Math.random() * (isMobile ? 1.2 : 2),
      size: (isMobile ? 1 : 1) + Math.random() * (isMobile ? 1 : 2),
    })), [particleCount, isMobile]
  );

  useEffect(() => {
    const stages = isMobile ? [
      { delay: 200, stage: 1 },   // Particles appear
      { delay: 500, stage: 2 },   // Line draws
      { delay: 900, stage: 3 },   // Title appears
      { delay: 1200, stage: 4 },  // Subtitle appears
      { delay: 1500, stage: 5 },  // Start reveal
      { delay: 1700, stage: 6 },  // Complete
    ] : [
      { delay: 400, stage: 1 },   // Particles appear
      { delay: 1000, stage: 2 },  // Line draws
      { delay: 1800, stage: 3 },  // Title appears
      { delay: 2500, stage: 4 },  // Subtitle appears
      { delay: 3300, stage: 5 },  // Start reveal
      { delay: 4000, stage: 6 },  // Complete
    ];

    const timers = stages.map(({ delay, stage }) =>
      setTimeout(() => setStage(stage), delay)
    );

    const completeTimer = setTimeout(onComplete, isMobile ? 1900 : 4200);

    return () => {
      timers.forEach(clearTimeout);
      clearTimeout(completeTimer);
    };
  }, [onComplete, isMobile]);

  // Smooth spring transition
  const springTransition: Transition = {
    type: "spring" as const,
    stiffness: 100,
    damping: 20,
  };

  return (
    <AnimatePresence>
      {stage < 6 && (
        <motion.div
          className="fixed inset-0 z-50 flex flex-col items-center justify-center overflow-hidden bg-background"
          initial={{ opacity: 1 }}
          exit={{ 
            opacity: 0,
            scale: 1.05,
            filter: "blur(10px)",
          }}
          transition={{ duration: 1, ease: "easeInOut" }}
        >
          {/* Background Image with smooth reveal */}
          <motion.div
            className="absolute inset-0"
            initial={{ scale: 1.3, opacity: 0 }}
            animate={{ 
              scale: stage >= 1 ? 1.1 : 1.3, 
              opacity: stage >= 1 ? 0.25 : 0 
            }}
            transition={{ duration: 2.5, ease: "easeOut" }}
          >
            <img
              src={tokyoAbstract}
              alt=""
              className="h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-background/60" />
          </motion.div>

          {/* Floating Particles - Optimized */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {particles.map((particle) => (
              <motion.div
                key={particle.id}
                className="absolute rounded-full bg-primary/70"
                initial={{
                  x: `${particle.x}vw`,
                  y: "110vh",
                  opacity: 0,
                }}
                animate={stage >= 1 ? {
                  y: "-10vh",
                  opacity: [0, 0.8, 0.8, 0],
                } : {}}
                transition={{
                  duration: particle.duration,
                  delay: particle.delay,
                  repeat: Infinity,
                  ease: "linear",
                }}
                style={{
                  width: particle.size,
                  height: particle.size,
                  filter: `blur(${particle.blur}px)`,
                  willChange: "transform, opacity",
                }}
              />
            ))}
          </div>

          {!isMobile && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              {/* Main Horizontal Line */}
              <motion.div
                className="absolute h-[2px] bg-gradient-to-r from-transparent via-primary to-transparent"
                initial={{ width: 0, opacity: 0 }}
                animate={stage >= 2 ? { width: "85%", opacity: 1 } : {}}
                transition={{ duration: 1.5, ease: "easeOut" }}
                style={{
                  boxShadow: "0 0 40px hsl(185 100% 50% / 0.8), 0 0 80px hsl(185 100% 50% / 0.4)",
                }}
              />

              {/* Secondary horizontal lines */}
              <motion.div
                className="absolute h-[1px] w-[60%] bg-gradient-to-r from-transparent via-secondary/30 to-transparent"
                initial={{ opacity: 0, y: -40 }}
                animate={stage >= 2 ? { opacity: 1, y: -60 } : {}}
                transition={{ duration: 1, delay: 0.2, ease: "easeOut" }}
              />
              <motion.div
                className="absolute h-[1px] w-[60%] bg-gradient-to-r from-transparent via-secondary/30 to-transparent"
                initial={{ opacity: 0, y: 40 }}
                animate={stage >= 2 ? { opacity: 1, y: 60 } : {}}
                transition={{ duration: 1, delay: 0.3, ease: "easeOut" }}
              />

              {/* Vertical accent lines */}
              <motion.div
                className="absolute h-40 w-[1px] bg-gradient-to-b from-transparent via-primary/40 to-transparent"
                initial={{ scaleY: 0, opacity: 0 }}
                animate={stage >= 2 ? { scaleY: 1, opacity: 1 } : {}}
                transition={{ duration: 1, delay: 0.4, ease: "easeOut" }}
                style={{ left: "8%" }}
              />
              <motion.div
                className="absolute h-40 w-[1px] bg-gradient-to-b from-transparent via-primary/40 to-transparent"
                initial={{ scaleY: 0, opacity: 0 }}
                animate={stage >= 2 ? { scaleY: 1, opacity: 1 } : {}}
                transition={{ duration: 1, delay: 0.5, ease: "easeOut" }}
                style={{ right: "8%" }}
              />
            </div>
          )}

          {/* Main Content */}
          <div className="relative z-10 flex flex-col items-center">
            {/* Japanese Text */}
            <motion.span
              className="mb-4 font-display text-sm tracking-[0.5em] text-primary/70"
              initial={{ opacity: 0, y: 30, filter: "blur(10px)" }}
              animate={stage >= 3 ? { opacity: 1, y: 0, filter: "blur(0px)" } : {}}
              transition={{ duration: 0.8, ease: "easeOut" }}
            >
              インパクト東京
            </motion.span>

            {/* Title with smooth mask reveal */}
            <div className="overflow-hidden">
              <motion.h1
                className="font-display text-4xl font-bold tracking-[0.15em] sm:text-5xl md:text-7xl lg:text-8xl"
                initial={{ y: 120, opacity: 0 }}
                animate={stage >= 3 ? { y: 0, opacity: 1 } : {}}
                transition={{ 
                  duration: 1.2, 
                  ease: "easeOut",
                }}
              >
                <motion.span 
                  className="text-gradient-cyan inline-block"
                  animate={stage >= 3 ? {
                    textShadow: [
                      "0 0 20px hsl(185 100% 50% / 0.3)",
                      "0 0 50px hsl(185 100% 50% / 0.6)",
                      "0 0 20px hsl(185 100% 50% / 0.3)",
                    ],
                  } : {}}
                  transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                >
                  IMPACT
                </motion.span>{" "}
                <span className="text-foreground">TOKYO</span>
              </motion.h1>
            </div>

            {/* Year with staggered reveal */}
            <motion.div
              className="mt-3 overflow-hidden"
              initial={{ opacity: 0 }}
              animate={stage >= 3 ? { opacity: 1 } : {}}
              transition={{ duration: 0.8, delay: 0.4 }}
            >
              <motion.span
                className="font-display text-3xl font-light tracking-[0.4em] text-foreground/70 md:text-4xl"
                initial={{ y: 60, opacity: 0 }}
                animate={stage >= 3 ? { y: 0, opacity: 1 } : {}}
                transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
              >
                2026
              </motion.span>
            </motion.div>

            {/* Subtitle with glow */}
            <motion.p
              className="mt-8 font-display text-lg tracking-[0.25em] text-secondary md:text-xl"
              initial={{ opacity: 0, y: 30, filter: "blur(5px)" }}
              animate={stage >= 4 ? { opacity: 1, y: 0, filter: "blur(0px)" } : {}}
              transition={{ duration: 0.8, ease: "easeOut" }}
              style={{
                textShadow: stage >= 4 ? "0 0 40px hsl(270 70% 60% / 0.6)" : "none",
              }}
            >
              AI FOR GLOBAL GOOD
            </motion.p>

            {/* Elegant loading indicator */}
            <motion.div
              className="mt-14 flex items-center gap-3"
              initial={{ opacity: 0 }}
              animate={stage >= 4 ? { opacity: 1 } : {}}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  className="h-1.5 w-1.5 rounded-full bg-primary"
                  animate={{ 
                    scale: [1, 1.8, 1], 
                    opacity: [0.4, 1, 0.4],
                  }}
                  transition={{ 
                    duration: 1.2, 
                    repeat: Infinity, 
                    delay: i * 0.15,
                    ease: "easeInOut",
                  }}
                />
              ))}
            </motion.div>
          </div>

          {!isMobile && (
            <>
              {/* Corner decorations with smoother animation */}
              <motion.div
                className="absolute left-6 top-6 h-20 w-20 border-l-2 border-t-2 border-primary/40"
                initial={{ opacity: 0, scale: 0.5, rotate: -10 }}
                animate={stage >= 2 ? { opacity: 1, scale: 1, rotate: 0 } : {}}
                transition={{ ...springTransition, delay: 0.5 }}
              />
              <motion.div
                className="absolute bottom-6 right-6 h-20 w-20 border-b-2 border-r-2 border-primary/40"
                initial={{ opacity: 0, scale: 0.5, rotate: 10 }}
                animate={stage >= 2 ? { opacity: 1, scale: 1, rotate: 0 } : {}}
                transition={{ ...springTransition, delay: 0.6 }}
              />

              {/* Additional corner accents */}
              <motion.div
                className="absolute right-6 top-6 h-20 w-20 border-r-2 border-t-2 border-secondary/30"
                initial={{ opacity: 0, scale: 0.5 }}
                animate={stage >= 2 ? { opacity: 1, scale: 1 } : {}}
                transition={{ ...springTransition, delay: 0.7 }}
              />
              <motion.div
                className="absolute bottom-6 left-6 h-20 w-20 border-b-2 border-l-2 border-secondary/30"
                initial={{ opacity: 0, scale: 0.5 }}
                animate={stage >= 2 ? { opacity: 1, scale: 1 } : {}}
                transition={{ ...springTransition, delay: 0.8 }}
              />
            </>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default LoadingExperience;
