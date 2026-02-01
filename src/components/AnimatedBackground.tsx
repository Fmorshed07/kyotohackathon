import { motion, useReducedMotion } from "framer-motion";
import { useMemo } from "react";

const AnimatedBackground = () => {
  const shouldReduceMotion = useReducedMotion();
  const particles = useMemo(
    () =>
      Array.from({ length: 28 }).map(() => ({
        left: Math.random() * 100,
        top: Math.random() * 100,
        size: 1 + Math.random() * 2,
        duration: 6 + Math.random() * 8,
        delay: Math.random() * 6,
        opacity: 0.2 + Math.random() * 0.4,
      })),
    []
  );

  return (
    <div className="fixed inset-0 -z-10 overflow-hidden">
      {/* Base gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-navy-800 to-background" />

      {/* Animated gradient orbs */}
      <motion.div
        className="absolute -left-1/4 -top-1/4 h-[800px] w-[800px] rounded-full opacity-20 blur-3xl"
        style={{
          background: "radial-gradient(circle, hsl(185 100% 50% / 0.3) 0%, transparent 70%)",
        }}
        animate={{
          x: shouldReduceMotion ? 0 : [0, 140, 0],
          y: shouldReduceMotion ? 0 : [0, 70, 0],
          rotate: shouldReduceMotion ? 0 : [0, 10, 0],
        }}
        transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute -bottom-1/4 -right-1/4 h-[600px] w-[600px] rounded-full opacity-15 blur-3xl"
        style={{
          background: "radial-gradient(circle, hsl(270 70% 60% / 0.3) 0%, transparent 70%)",
        }}
        animate={{
          x: shouldReduceMotion ? 0 : [0, -110, 0],
          y: shouldReduceMotion ? 0 : [0, -90, 0],
          rotate: shouldReduceMotion ? 0 : [0, -12, 0],
        }}
        transition={{ duration: 26, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute left-1/2 top-1/2 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-10 blur-3xl"
        style={{
          background: "radial-gradient(circle, hsl(200 100% 50% / 0.2) 0%, transparent 70%)",
        }}
        animate={{
          scale: shouldReduceMotion ? 1 : [1, 1.25, 1],
          opacity: shouldReduceMotion ? 0.1 : [0.08, 0.16, 0.08],
        }}
        transition={{ duration: 16, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Soft light sweep */}
      <motion.div
        className="absolute inset-0 opacity-40"
        style={{
          background:
            "linear-gradient(120deg, transparent 0%, hsl(185 100% 50% / 0.08) 45%, hsl(270 70% 60% / 0.12) 55%, transparent 100%)",
        }}
        animate={{
          x: shouldReduceMotion ? 0 : ["-20%", "20%", "-20%"],
        }}
        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Floating particles */}
      {particles.map((particle, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full bg-primary/40"
          style={{
            left: `${particle.left}%`,
            top: `${particle.top}%`,
            width: `${particle.size}px`,
            height: `${particle.size}px`,
            opacity: particle.opacity,
          }}
          animate={{
            y: shouldReduceMotion ? 0 : [0, -40, 0],
            x: shouldReduceMotion ? 0 : [0, 10, 0],
            opacity: shouldReduceMotion ? particle.opacity : [particle.opacity, 0.6, particle.opacity],
          }}
          transition={{
            duration: particle.duration,
            repeat: Infinity,
            delay: particle.delay,
            ease: "easeInOut",
          }}
        />
      ))}

      {/* Subtle noise overlay */}
      <div
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />
    </div>
  );
};

export default AnimatedBackground;
