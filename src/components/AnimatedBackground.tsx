import { motion, useReducedMotion } from "framer-motion";
import { useMemo } from "react";

const AnimatedBackground = () => {
  const shouldReduceMotion = useReducedMotion();
  const particles = useMemo(
    () =>
      Array.from({ length: 24 }).map(() => ({
        left: Math.random() * 100,
        top: Math.random() * 100,
        size: 1 + Math.random() * 2,
        duration: 6 + Math.random() * 8,
        delay: Math.random() * 6,
        opacity: 0.15 + Math.random() * 0.35,
      })),
    [],
  );

  return (
    <div className="fixed inset-0 -z-10 overflow-hidden">
      <div
        className="absolute inset-0"
        style={{ background: "var(--gradient-hero)" }}
      />

      <motion.div
        className="absolute -left-1/4 top-0 h-[700px] w-[700px] rounded-full opacity-25 blur-3xl"
        style={{
          background:
            "radial-gradient(circle, hsl(270 55% 45% / 0.45) 0%, transparent 70%)",
        }}
        animate={{
          x: shouldReduceMotion ? 0 : [0, 100, 0],
          y: shouldReduceMotion ? 0 : [0, 40, 0],
        }}
        transition={{ duration: 24, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute -bottom-1/4 -right-1/4 h-[600px] w-[600px] rounded-full opacity-20 blur-3xl"
        style={{
          background:
            "radial-gradient(circle, hsl(18 90% 50% / 0.35) 0%, transparent 70%)",
        }}
        animate={{
          x: shouldReduceMotion ? 0 : [0, -80, 0],
          y: shouldReduceMotion ? 0 : [0, -60, 0],
        }}
        transition={{ duration: 28, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute left-1/2 top-1/3 h-[500px] w-[500px] -translate-x-1/2 rounded-full opacity-15 blur-3xl"
        style={{
          background:
            "radial-gradient(circle, hsl(199 89% 68% / 0.25) 0%, transparent 70%)",
        }}
        animate={{
          scale: shouldReduceMotion ? 1 : [1, 1.2, 1],
          opacity: shouldReduceMotion ? 0.12 : [0.1, 0.2, 0.1],
        }}
        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
      />

      <motion.div
        className="absolute inset-0 opacity-30"
        style={{
          background:
            "linear-gradient(105deg, transparent 0%, hsl(199 89% 68% / 0.06) 40%, hsl(18 90% 50% / 0.08) 60%, transparent 100%)",
        }}
        animate={{ x: shouldReduceMotion ? 0 : ["-15%", "15%", "-15%"] }}
        transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
      />

      {particles.map((particle, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full"
          style={{
            left: `${particle.left}%`,
            top: `${particle.top}%`,
            width: `${particle.size}px`,
            height: `${particle.size}px`,
            opacity: particle.opacity,
            background:
              i % 3 === 0
                ? "hsl(199 89% 68%)"
                : i % 3 === 1
                  ? "hsl(270 55% 72%)"
                  : "hsl(18 95% 58%)",
          }}
          animate={{
            y: shouldReduceMotion ? 0 : [0, -30, 0],
            opacity: shouldReduceMotion
              ? particle.opacity
              : [particle.opacity, 0.7, particle.opacity],
          }}
          transition={{
            duration: particle.duration,
            repeat: Infinity,
            delay: particle.delay,
            ease: "easeInOut",
          }}
        />
      ))}

      <div
        className="absolute inset-0 opacity-[0.025]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />
    </div>
  );
};

export default AnimatedBackground;
