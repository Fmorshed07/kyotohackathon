import { useEffect, useRef, useState } from "react";

interface UseScrollRevealOptions {
  threshold?: number;
  rootMargin?: string;
  triggerOnce?: boolean;
}

export function useScrollReveal<T extends HTMLElement = HTMLDivElement>(
  options: UseScrollRevealOptions = {}
) {
  const { threshold = 0.1, rootMargin = "-50px 0px", triggerOnce = true } = options;
  const ref = useRef<T>(null);
  const [reducedMotion, setReducedMotion] = useState(() =>
    typeof window !== "undefined" && typeof window.matchMedia === "function"
      ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
      : false,
  );
  const [isVisible, setIsVisible] = useState(() => reducedMotion || typeof IntersectionObserver === "undefined");
  const hasRevealed = useRef(isVisible);

  useEffect(() => {
    if (typeof window.matchMedia !== "function") return;
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = (event: MediaQueryListEvent) => setReducedMotion(event.matches);
    setReducedMotion(preference.matches);
    if (typeof preference.addEventListener === "function") {
      preference.addEventListener("change", onChange);
      return () => preference.removeEventListener("change", onChange);
    }
    preference.addListener?.(onChange);
    return () => preference.removeListener?.(onChange);
  }, []);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    if (reducedMotion || typeof IntersectionObserver === "undefined" || (triggerOnce && hasRevealed.current)) {
      hasRevealed.current = true;
      setIsVisible(true);
      return;
    }

    let active = true;
    let frame: number | null = null;
    const cancelReveal = () => {
      if (frame !== null) cancelAnimationFrame(frame);
      frame = null;
    };
    const observer = new IntersectionObserver(([entry]) => {
      if (!active || !entry || (triggerOnce && hasRevealed.current)) return;
      cancelReveal();
      if (!entry.isIntersecting || entry.intersectionRatio < threshold) {
        if (!triggerOnce) setIsVisible(false);
        return;
      }
      frame = requestAnimationFrame(() => {
        frame = null;
        if (!active) return;
        hasRevealed.current = true;
        setIsVisible(true);
        if (triggerOnce) observer.disconnect();
      });
    }, { threshold, rootMargin });

    observer.observe(element);

    return () => {
      active = false;
      cancelReveal();
      observer.disconnect();
    };
  }, [threshold, rootMargin, triggerOnce, reducedMotion]);

  return { ref, isVisible: reducedMotion || isVisible, reducedMotion };
}
