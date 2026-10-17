import { motion, type HTMLMotionProps, type TargetAndTransition } from "framer-motion";
import { useScrollReveal } from "@/hooks/useScrollReveal";

type ScrollRevealMotionProps = Omit<HTMLMotionProps<"div">, "animate"> & {
  revealThreshold?: number;
  revealRootMargin?: string;
  visible?: TargetAndTransition;
};

export function ScrollRevealMotion({
  children,
  revealThreshold = 0.2,
  revealRootMargin,
  initial,
  visible,
  transition,
  style,
  ...rest
}: ScrollRevealMotionProps) {
  const { ref, isVisible, reducedMotion } = useScrollReveal<HTMLDivElement>({
    threshold: revealThreshold,
    rootMargin: revealRootMargin,
  });
  const instant = { type: false, duration: 0, delay: 0, repeat: 0 } as const;
  const finalTarget: TargetAndTransition | undefined = reducedMotion && visible
    ? {
      ...Object.fromEntries(Object.entries(visible).map(([key, value]) => [
        key,
        Array.isArray(value) ? [...value].reverse().find(item => item !== null) : value,
      ])),
      transition: instant,
    }
    : visible;

  return (
    <motion.div
      ref={ref}
      initial={reducedMotion ? false : initial}
      animate={isVisible ? finalTarget : {}}
      transition={reducedMotion ? instant : transition}
      style={reducedMotion ? { ...style, transition: "none" } : style}
      {...rest}
    >
      {children}
    </motion.div>
  );
}
