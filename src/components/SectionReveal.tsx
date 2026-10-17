import { type CSSProperties, type ReactNode } from "react";
import { motion } from "framer-motion";
import { useScrollReveal } from "@/hooks/useScrollReveal";
import "./section-reveal.css";

interface SectionRevealProps {
  children: ReactNode;
  className?: string;
  delay?: number;
  direction?: "up" | "left" | "right";
  accent?: boolean;
  style?: CSSProperties;
}

export default function SectionReveal({ children, className = "", delay = 0, direction = "up", accent = false, style }: SectionRevealProps) {
  const { ref, isVisible, reducedMotion } = useScrollReveal<HTMLDivElement>({ threshold: 0.08, rootMargin: "0px 0px -24px 0px" });
  const hidden = { opacity: 0, x: direction === "left" ? -22 : direction === "right" ? 22 : 0, y: direction === "up" ? 24 : 0 };
  return (
    <motion.div ref={ref} className={`section-reveal${accent ? " section-reveal--accent" : ""} ${className}`}
      data-revealed={isVisible || reducedMotion ? "true" : "false"} style={style}
      initial={reducedMotion || isVisible ? false : hidden}
      animate={isVisible || reducedMotion ? { opacity: 1, x: 0, y: 0 } : hidden}
      transition={{ duration: reducedMotion ? 0 : .72, delay: reducedMotion ? 0 : Math.min(delay, .24), ease: [.22, 1, .36, 1] }}>
      {children}
    </motion.div>
  );
}
