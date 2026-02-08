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
          { delay: 160, stage: 2 },
          { delay: 320, stage: 3 },
          { delay: 520, stage: 4 },
          { delay: 760, stage: 5 },
        ]
      : [
          { delay: 0, stage: 1 },
          { delay: 200, stage: 2 },
          { delay: 420, stage: 3 },
          { delay: 680, stage: 4 },
          { delay: 980, stage: 5 },
        ];

    const timers = stages.map(({ delay, stage }) =>
      setTimeout(() => setStage(stage), delay)
    );

    const completeTimer = setTimeout(onComplete, isMobile ? 1500 : 1900);

    return () => {
      timers.forEach(clearTimeout);
      clearTimeout(completeTimer);
    };
  }, [onComplete, isMobile]);

  const sparkles = [
    { x: "12%", y: "24%", delay: 0.1 },
    { x: "82%", y: "18%", delay: 0.3 },
    { x: "20%", y: "72%", delay: 0.5 },
    { x: "74%", y: "78%", delay: 0.2 },
    { x: "52%", y: "12%", delay: 0.4 },
  ];

  const pulseRings = [84, 108, 132];

  return (
    <AnimatePresence>
      {stage < 5 && (
        <motion.div
          className="fixed inset-0 z-50 flex flex-col items-center justify-center overflow-hidden bg-background"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.03, filter: "blur(8px)" }}
          transition={{ duration: 1.1, ease: "easeInOut" }}
        >
          {/* Ambient background */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(56,189,248,0.18),transparent_60%),radial-gradient(circle_at_bottom,rgba(147,51,234,0.18),transparent_55%)]" />
          <motion.div
            className="absolute inset-0 opacity-0"
            initial={{ opacity: 0 }}
            animate={stage >= 1 ? { opacity: 1 } : {}}
            transition={{ duration: 1.2, ease: "easeOut" }}
            style={{
              backgroundImage:
                "linear-gradient(rgba(59,130,246,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(168,85,247,0.08) 1px, transparent 1px)",
              backgroundSize: "44px 44px",
            }}
          />
          <div
            className="absolute inset-0 opacity-[0.02]"
            style={{
              backgroundImage:
                'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noise\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noise)\'/%3E%3C/svg%3E")',
            }}
          />

          {/* Floating sparkles */}
          {sparkles.map((sparkle) => (
            <motion.div
              key={`${sparkle.x}-${sparkle.y}`}
              className="absolute h-2 w-2 rounded-full bg-primary/60 blur-[1px]"
              style={{ left: sparkle.x, top: sparkle.y }}
              initial={{ opacity: 0, scale: 0.6 }}
              animate={stage >= 2 ? { opacity: [0.2, 0.7, 0.2], scale: [0.6, 1, 0.6] } : {}}
              transition={{
                duration: 2.6,
                delay: sparkle.delay,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
          ))}

          {/* Main Content */}
          <div className="relative z-10 flex flex-col items-center text-center">
            <motion.span
              className="mb-2 font-display text-xs tracking-[0.5em] text-primary/70"
              initial={{ opacity: 0, y: 18 }}
              animate={stage >= 2 ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, ease: "easeOut" }}
            >
              インパクト東京 2026
            </motion.span>
            <motion.h2
              className="font-display text-2xl tracking-[0.28em] text-foreground/90 sm:text-3xl"
              initial={{ opacity: 0, y: 18 }}
              animate={stage >= 2 ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.7, delay: 0.05, ease: "easeOut" }}
            >
              <span className="text-gradient-cyan">IMPACT</span>{" "}
              <span className="text-foreground">TOKYO</span>{" "}
              <span className="text-foreground/70">2026</span>
            </motion.h2>

            <motion.div
              className="relative"
              initial={{ opacity: 0, scale: 0.94 }}
              animate={stage >= 1 ? { opacity: 1, scale: 1 } : {}}
              transition={{ duration: 0.8, ease: "easeOut" }}
            >
              <div className="absolute -inset-16 -z-10 bg-gradient-to-b from-primary/10 via-transparent to-secondary/10 blur-3xl" />
              <div className="relative flex h-[300px] w-[300px] items-center justify-center sm:h-[340px] sm:w-[340px]">
                <motion.div
                  className="absolute inset-0"
                  initial={{ opacity: 0 }}
                  animate={stage >= 1 ? { opacity: 1 } : {}}
                  transition={{ duration: 0.9, ease: "easeOut" }}
                >
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(14,165,233,0.18),transparent_55%)]" />
                </motion.div>

                <motion.svg
                  viewBox="0 0 320 320"
                  className="relative h-full w-full"
                  initial={{ opacity: 0 }}
                  animate={stage >= 2 ? { opacity: 1 } : {}}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                >
                  <defs>
                    <linearGradient id="impactStroke" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="hsl(188 100% 60%)" />
                      <stop offset="100%" stopColor="hsl(24 95% 65%)" />
                    </linearGradient>
                    <linearGradient id="coreAccent" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="rgba(56,189,248,0.9)" />
                      <stop offset="100%" stopColor="rgba(168,85,247,0.8)" />
                    </linearGradient>
                  </defs>

                  {pulseRings.map((radius, index) => (
                    <motion.circle
                      key={radius}
                      cx="160"
                      cy="160"
                      r={radius}
                      fill="none"
                      stroke="url(#impactStroke)"
                      strokeWidth="1.4"
                      strokeDasharray="8 10"
                      initial={{ opacity: 0 }}
                      animate={stage >= 2 ? { opacity: [0.1, 0.5, 0.1], rotate: 360 } : {}}
                      transition={{
                        duration: 6 - index,
                        repeat: Infinity,
                        ease: "linear",
                      }}
                      style={{ transformOrigin: "160px 160px" }}
                    />
                  ))}

                  <motion.rect
                    x="108"
                    y="108"
                    width="104"
                    height="104"
                    rx="16"
                    fill="rgba(15,23,42,0.55)"
                    stroke="url(#coreAccent)"
                    strokeWidth="2.2"
                    initial={{ opacity: 0, scale: 0.85 }}
                    animate={stage >= 3 ? { opacity: 1, scale: 1 } : {}}
                    transition={{ duration: 0.9, ease: "easeOut" }}
                  />

                  <motion.path
                    d="M116 160 L204 160"
                    stroke="url(#impactStroke)"
                    strokeWidth="2.6"
                    strokeLinecap="round"
                    initial={{ pathLength: 0, opacity: 0 }}
                    animate={stage >= 3 ? { pathLength: 1, opacity: 1 } : {}}
                    transition={{ duration: 1.1, ease: "easeInOut" }}
                  />
                  <motion.path
                    d="M160 116 L160 204"
                    stroke="url(#impactStroke)"
                    strokeWidth="2.6"
                    strokeLinecap="round"
                    initial={{ pathLength: 0, opacity: 0 }}
                    animate={stage >= 3 ? { pathLength: 1, opacity: 1 } : {}}
                    transition={{ duration: 1.1, delay: 0.1, ease: "easeInOut" }}
                  />

                  {[
                    { x1: 128, y1: 128, x2: 192, y2: 128 },
                    { x1: 128, y1: 192, x2: 192, y2: 192 },
                    { x1: 128, y1: 128, x2: 128, y2: 192 },
                    { x1: 192, y1: 128, x2: 192, y2: 192 },
                  ].map((line, index) => (
                    <motion.line
                      key={`${line.x1}-${line.y1}`}
                      x1={line.x1}
                      y1={line.y1}
                      x2={line.x2}
                      y2={line.y2}
                      stroke="rgba(226,232,240,0.35)"
                      strokeWidth="1.4"
                      strokeLinecap="round"
                      initial={{ opacity: 0 }}
                      animate={stage >= 4 ? { opacity: [0.2, 0.8, 0.2] } : {}}
                      transition={{
                        duration: 2.2,
                        delay: 0.2 + index * 0.1,
                        repeat: Infinity,
                        ease: "easeInOut",
                      }}
                    />
                  ))}

                  <motion.path
                    d="M60 246 C110 232, 210 232, 260 246"
                    stroke="url(#coreAccent)"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    fill="none"
                    initial={{ pathLength: 0, opacity: 0 }}
                    animate={stage >= 4 ? { pathLength: 1, opacity: 1 } : {}}
                    transition={{ duration: 1.2, ease: "easeInOut" }}
                  />

                  <motion.path
                    d="M72 260 L248 260"
                    stroke="rgba(148,163,184,0.45)"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    initial={{ opacity: 0 }}
                    animate={stage >= 4 ? { opacity: 1 } : {}}
                    transition={{ duration: 0.9, delay: 0.2 }}
                  />
                </motion.svg>

                <motion.div
                  className="absolute bottom-10 left-1/2 h-2 w-44 -translate-x-1/2 rounded-full bg-gradient-to-r from-transparent via-primary/70 to-transparent"
                  initial={{ opacity: 0 }}
                  animate={stage >= 3 ? { opacity: [0.2, 0.8, 0.2] } : {}}
                  transition={{ duration: 2.1, repeat: Infinity, ease: "easeInOut" }}
                />
              </div>
            </motion.div>

            <motion.p
              className="mt-6 font-display text-lg tracking-[0.28em] text-secondary"
              initial={{ opacity: 0, y: 18 }}
              animate={stage >= 4 ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.7, ease: "easeOut" }}
            >
              Aligning Vision Streams
            </motion.p>

            <motion.div
              className="mt-6 h-1.5 w-56 overflow-hidden rounded-full bg-secondary/20"
              initial={{ opacity: 0 }}
              animate={stage >= 4 ? { opacity: 1 } : {}}
              transition={{ duration: 0.6, delay: 0.1 }}
            >
              <motion.div
                className="h-full w-24 rounded-full bg-gradient-to-r from-transparent via-primary to-transparent"
                animate={{ x: ["-50%", "140%"] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
              />
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default LoadingExperience;
