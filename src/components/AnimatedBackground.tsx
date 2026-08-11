import { motion, useReducedMotion } from "framer-motion";

const AnimatedBackground = () => {
  const shouldReduceMotion = useReducedMotion();

  return (
    <div className="fixed inset-0 -z-10 overflow-hidden bg-black">
      <div className="absolute inset-0 bg-black" />
      <div className="starfield absolute inset-0 opacity-50" aria-hidden />

      <motion.div
        className="absolute left-1/2 top-[-20%] h-[70vmin] w-[140vmin] -translate-x-1/2 rounded-[100%] opacity-30 blur-3xl"
        style={{
          background:
            "radial-gradient(ellipse at center, hsl(199 100% 50% / 0.35) 0%, hsl(185 100% 50% / 0.12) 35%, transparent 70%)",
        }}
        animate={{
          opacity: shouldReduceMotion ? 0.25 : [0.2, 0.35, 0.2],
          scale: shouldReduceMotion ? 1 : [1, 1.05, 1],
        }}
        transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
      />

      <motion.div
        className="absolute bottom-[-35%] left-1/2 h-[55vmin] w-[120vmin] -translate-x-1/2 rounded-[100%] opacity-25 blur-3xl"
        style={{
          background:
            "radial-gradient(ellipse at center, hsl(185 100% 50% / 0.28) 0%, transparent 65%)",
        }}
        animate={{
          opacity: shouldReduceMotion ? 0.2 : [0.15, 0.3, 0.15],
        }}
        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
      />

      <div className="cognisor-grid absolute inset-0 opacity-30" aria-hidden />

      <div
        className="absolute inset-0 opacity-[0.035]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />
    </div>
  );
};

export default AnimatedBackground;
