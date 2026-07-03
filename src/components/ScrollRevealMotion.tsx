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
  ...rest
}: ScrollRevealMotionProps) {
  const { ref, isVisible } = useScrollReveal<HTMLDivElement>({
    threshold: revealThreshold,
    rootMargin: revealRootMargin,
  });

  return (
    <motion.div
      ref={ref}
      initial={initial}
      animate={isVisible ? visible : {}}
      transition={transition}
      {...rest}
    >
      {children}
    </motion.div>
  );
}
